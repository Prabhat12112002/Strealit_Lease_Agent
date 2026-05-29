import os
from typing import Dict, List, Optional, Tuple
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langgraph.graph import StateGraph, END
from langchain_core.documents import Document

try:
    from langchain_community.retrievers import BM25Retriever
    BM25_AVAILABLE = True
except Exception:
    BM25_AVAILABLE = False

try:
    from langchain_community.cross_encoders import HuggingFaceCrossEncoder
except Exception:
    HuggingFaceCrossEncoder = None

# LLM
def init_llm() -> ChatOpenAI:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set. Please set it in your environment or .env file.")
    model_name = os.environ.get("OPENROUTER_MODEL", "deepseek/deepseek-v4-flash:free")

    return ChatOpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        model=model_name,
        temperature=0,
        model_kwargs={
            "extra_body": {
                "reasoning": {
                    "enabled": True
                }
            }
        }
    )

# System prompts
SYSTEM_ROUTER = """You are the Router for the Oil & Gas Lease Assistant.
Decide strictly 'qa' or 'summarize'. Return only one word."""

SYSTEM_QA = """You are the Retrieval-QA role for the Oil & Gas Lease Assistant.
Answer strictly using the retrieved context. If insufficient, say:
'I need more details from the document.'
Start your answer with the SYSTEM NOTE if provided.
Reference file name(s) and page number(s) used."""

SYSTEM_SUMMARIZER = """You are the Summarizer role for the Oil & Gas Lease Assistant.
Create a concise, accurate running summary suitable for future context."""

# Helpers
def get_all_docs_from_store(store: FAISS) -> List[Document]:
    """Pull all documents from the FAISS docstore."""
    ids = list(store.index_to_docstore_id.values())
    docs = []
    for i in ids:
        d = store.docstore.search(i)
        if d is not None:
            docs.append(d)
    return docs

def apply_filters_docs(docs: List[Document], filters: Optional[Dict]) -> List[Document]:
    """Filter plain docs list by lease_no and optional page/page_min/page_max."""
    if not filters:
        return docs
    lease_no = filters.get("lease_no", None)
    page = filters.get("page", None)
    page_min = filters.get("page_min", None)
    page_max = filters.get("page_max", None)

    if lease_no is None:
        return docs

    def ok(d: Document) -> bool:
        m = d.metadata or {}
        if m.get("lease_no") != lease_no:
            return False
        p = m.get("page")
        if page is not None:
            return p == int(page)
        if (page_min is not None) or (page_max is not None):
            if (page_min is not None) and (p is not None) and (p < int(page_min)):
                return False
            if (page_max is not None) and (p is not None) and (p > int(page_max)):
                return False
        return True

    return [d for d in docs if ok(d)]

def rrf_fuse_lists(vec_docs: List[Document], bm_docs: List[Document], k: int) -> List[Document]:
    """Reciprocal Rank Fusion over two ranked lists (vector + BM25)."""
    k0 = 60
    vec_pos = {id(d): i for i, d in enumerate(vec_docs)}
    bm_pos = {id(d): i for i, d in enumerate(bm_docs)}
    uniq_map = {id(d): d for d in (vec_docs + bm_docs)}
    scored = []
    for _id, d in uniq_map.items():
        i = vec_pos.get(_id, 10**6)
        j = bm_pos.get(_id, 10**6)
        score = (1.0 / (k0 + i)) + (1.0 / (k0 + j))
        scored.append((d, score))
    return [d for d, _ in sorted(scored, key=lambda x: x[1], reverse=True)][:k]

def make_retrieval_fn(store: FAISS, rerank_method: str = "bge"):
    """
    Stage-1: Hybrid (Vector + BM25) -> top-10
    Stage-2: Optional filters
    Stage-3: Rerank with BGE cross-encoder (if available) -> top-5
    """
    # Build BM25 over full corpus if available
    corpus_docs = get_all_docs_from_store(store)
    bm25_global = BM25Retriever.from_documents(corpus_docs) if BM25_AVAILABLE and corpus_docs else None

    # Prepare BGE cross-encoder (optional)
    bge_model_name = os.getenv("BGE_RERANKER_MODEL", "BAAI/bge-reranker-large")
    bge = None
    if rerank_method.lower() == "bge" and HuggingFaceCrossEncoder is not None:
        try:
            bge = HuggingFaceCrossEncoder(model_name=bge_model_name)
        except Exception:
            bge = None 

    def get_context(query: str, filters: Optional[Dict] = None, k: int = 5) -> Tuple[str, List[Document], Optional[str]]:
        # Stage-1: Hybrid top-10
        vec_top = [d for d, _ in store.similarity_search_with_score(query, k=10)]
        bm_top = []
        if bm25_global is not None:
            bm25_global.k = 10
            bm_top = bm25_global.invoke(query) 

        hybrid10 = rrf_fuse_lists(vec_top, bm_top, k=10) if bm_top else vec_top[:10]

        # Stage-2: Filters
        filtered = apply_filters_docs(hybrid10, filters)
        system_note = None
        lease_requested = bool(filters and filters.get("lease_no") is not None)
        if lease_requested and not filtered:
            system_note = "NOTE: Requested lease not found — responding based on overall best matches."
        candidates = filtered or hybrid10
        if not candidates:
            return "", [], system_note

        # Stage-3: Rerank
        method = (rerank_method or "bge").lower()
        if method == "bge" and bge is not None:
            pairs = [(query, d.page_content) for d in candidates]
            scores = bge.score(pairs) 
            scored_docs = list(zip(candidates, scores))
            final_docs = [d for d, s in sorted(scored_docs, key=lambda x: x[1], reverse=True)][:k]
        elif method == "bm25" and BM25_AVAILABLE:
            bm_local = BM25Retriever.from_documents(candidates)
            bm_local.k = min(k, len(candidates))
            final_docs = bm_local.invoke(query) 
        else:
            final_docs = candidates[:k]

        # Build context string
        blocks = []
        for d in final_docs:
            m = d.metadata or {}
            header = (
                f"### {m.get('file_name')} "
                f"lease #{m.get('lease_no')} "
                f"page {m.get('page')} "
                f"src {m.get('source_path')}"
            )
            blocks.append(f"{header}\n{d.page_content}")
        return "\n\n".join(blocks), final_docs, system_note

    return get_context

class AgentState(dict):
    question: str
    answer: Optional[str]
    route: Optional[str]
    history: Optional[List[Dict[str, str]]]
    summary: Optional[str]
    filters: Optional[Dict]
    documents: Optional[List[Document]] # Keep track of retrieved docs for citations

def build_agent(store: FAISS, llm: ChatOpenAI, rerank_method: str = "bm25"):
    get_context = make_retrieval_fn(store, rerank_method=rerank_method)

    router_prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_ROUTER),
        ("human", "Question:\n{question}\nReturn 'qa' or 'summarize' only.")
    ])
    router_chain = router_prompt | llm | StrOutputParser()

    def route_node(state: AgentState) -> AgentState:
        route = router_chain.invoke({"question": state["question"]}).strip().lower()
        if route not in ["qa", "summarize"]:
            route = "qa"
        return {"route": route}

    qa_prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_QA),
        ("human",
         "SYSTEM NOTE:\n{system_note}\n\n"
         "Running summary:\n{summary}\n\n"
         "Recent conversation:\n{recent_history}\n\n"
         "Retrieved lease context:\n{context}\n\n"
         "User question:\n{question}")
    ])
    qa_chain = qa_prompt | llm | StrOutputParser()

    def qa_node(state: AgentState) -> AgentState:
        ctx, docs, note = get_context(state["question"], state.get("filters", None))
        msgs = state.get("history", [])
        recent = msgs[-6:]
        recent_text_lines = [f"{m['role']}: {m['content']}" for m in recent]
        recent_text = "\n".join(recent_text_lines) if recent_text_lines else "(no prior messages)"
        answer = qa_chain.invoke({
            "question": state["question"],
            "context": ctx or "(no matching context found)",
            "recent_history": recent_text,
            "summary": state.get("summary", "") or "(no summary yet)",
            "system_note": note or "",
        })
        return {"answer": answer, "documents": docs}

    summary_prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_SUMMARIZER),
        ("human",
         "Existing running summary:\n{summary}\n\n"
         "Full conversation messages:\n{history}\n\n"
         "Return only the improved summary.")
    ])
    summary_chain = summary_prompt | llm | StrOutputParser()

    def summarize_node(state: AgentState) -> AgentState:
        hist_text = "\n".join([f"{m['role']}: {m['content']}" for m in state.get("history", [])])
        new_summary = summary_chain.invoke({
            "summary": state.get("summary", "") or "",
            "history": hist_text
        })
        return {"answer": new_summary}

    graph = StateGraph(AgentState)
    graph.add_node("router", route_node)
    graph.add_node("qa", qa_node)
    graph.add_node("summarize", summarize_node)
    graph.set_entry_point("router")
    graph.add_conditional_edges("router", lambda s: s["route"], {
        "qa": "qa",
        "summarize": "summarize",
    })
    graph.add_edge("qa", END)
    graph.add_edge("summarize", END)
    return graph.compile()