import os
import hashlib
from typing import Dict, List, Optional, Tuple
from langchain_community.vectorstores import FAISS
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
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

INDEX_DIR = os.getenv("FAISS_INDEX_DIR", "faiss_index")

# Store persistence helpers
def save_store(store: FAISS, index_dir: Optional[str] = None) -> None:
    target_dir = index_dir or INDEX_DIR
    if store is not None:
        store.save_local(target_dir)

def load_store(embeddings, index_dir: Optional[str] = None) -> Optional[FAISS]:
    target_dir = index_dir or INDEX_DIR
    try:
        return FAISS.load_local(target_dir, embeddings, allow_dangerous_deserialization=True)
    except Exception:
        return None

# LLM Initialization
def init_llm(api_key: Optional[str] = None, model_name: Optional[str] = None) -> ChatGroq:
    """Initialize Groq chat model (defaults to llama-3.1-8b-instant)."""
    key = api_key or os.environ.get("GROQ_API_KEY")
    if not key:
        raise ValueError("GROQ_API_KEY is not set. Please set it in your .env file or enter it in the app.")
    model = model_name or os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")

    return ChatGroq(
        groq_api_key=key,
        model_name=model,
        temperature=0.1,
    )

SYSTEM_QA = """You are an expert AI Assistant specialized in Oil & Gas Lease Agreements.
Your job is to answer questions thoroughly, factually, and accurately using the retrieved lease context.

Guidelines:
1. Base your answer strictly on the provided 'Retrieved lease context'.
2. Always cite the document name and page number for facts and quotes (e.g., [Lease 6.pdf, Page 3]).
3. If the user asks for a summary of a lease or a specific clause (e.g., royalty, granting, termination), provide a clear, well-structured breakdown including percentages, amounts, deadlines, and key terms.
4. If the retrieved context does not contain the specific information needed to answer the question, clearly state what information is available and what is missing.
5. If a SYSTEM NOTE is present, address it appropriately."""

# Document helpers
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
    """Filter documents list by lease_no and optional page/page_min/page_max."""
    if not filters:
        return docs

    lease_no = filters.get("lease_no")
    page = filters.get("page")
    page_min = filters.get("page_min")
    page_max = filters.get("page_max")

    if lease_no is None and page is None and page_min is None and page_max is None:
        return docs

    def ok(d: Document) -> bool:
        m = d.metadata or {}
        # Lease filter
        if lease_no is not None:
            doc_lease = m.get("lease_no")
            if doc_lease != int(lease_no):
                return False

        # Page filter (support exact match)
        p = m.get("page")
        if page is not None and p is not None:
            target = int(page)
            if p != target:
                return False

        # Page range filter
        if page_min is not None and p is not None:
            if p < int(page_min):
                return False
        if page_max is not None and p is not None:
            if p > int(page_max):
                return False

        return True

    return [d for d in docs if ok(d)]

def doc_key(d: Document) -> str:
    """Generate stable unique identity for document chunk to properly fuse RRF scores."""
    m = d.metadata or {}
    text_hash = hashlib.md5(d.page_content.encode("utf-8", errors="ignore")).hexdigest()[:12]
    return f"{m.get('file_name', '')}:{m.get('page', '')}:{text_hash}"

def rrf_fuse_lists(vec_docs: List[Document], bm_docs: List[Document], k: int) -> List[Document]:
    """Reciprocal Rank Fusion over two ranked lists (vector + BM25)."""
    k0 = 60
    vec_pos = {doc_key(d): i for i, d in enumerate(vec_docs)}
    bm_pos = {doc_key(d): i for i, d in enumerate(bm_docs)}
    uniq_map = {doc_key(d): d for d in (vec_docs + bm_docs)}
    scored = []
    for key, d in uniq_map.items():
        score = 0.0
        if key in vec_pos:
            score += 1.0 / (k0 + vec_pos[key])
        if key in bm_pos:
            score += 1.0 / (k0 + bm_pos[key])
        scored.append((d, score))
    return [d for d, _ in sorted(scored, key=lambda x: x[1], reverse=True)][:k]

def make_retrieval_fn(store: FAISS, rerank_method: str = "bm25"):
    """
    Stage-1: Hybrid (Vector + BM25) -> top-20 candidates
    Stage-2: Metadata filtering
    Stage-3: Rerank with BGE cross-encoder or BM25 -> top-k
    """
    corpus_docs = get_all_docs_from_store(store)
    bm25_global = BM25Retriever.from_documents(corpus_docs) if BM25_AVAILABLE and corpus_docs else None

    bge_model_name = os.getenv("BGE_RERANKER_MODEL", "BAAI/bge-reranker-large")
    bge = None
    if (rerank_method or "").lower() == "bge" and HuggingFaceCrossEncoder is not None:
        try:
            bge = HuggingFaceCrossEncoder(model_name=bge_model_name)
        except Exception:
            bge = None

    def get_context(query: str, filters: Optional[Dict] = None, k: int = 5) -> Tuple[str, List[Document], Optional[str]]:
        # Stage-1: Hybrid retrieval with top candidates
        candidate_count = max(20, k * 3)
        vec_top = [d for d, _ in store.similarity_search_with_score(query, k=candidate_count)]
        bm_top = []
        if bm25_global is not None:
            bm25_global.k = candidate_count
            bm_top = bm25_global.invoke(query)

        hybrid_pool = rrf_fuse_lists(vec_top, bm_top, k=candidate_count) if bm_top else vec_top[:candidate_count]

        # Stage-2: Filters
        filtered = apply_filters_docs(hybrid_pool, filters)
        system_note = None
        has_filter = bool(filters and any(v is not None for v in filters.values()))
        if has_filter and not filtered:
            system_note = "NOTE: Requested lease/page filter produced no direct matches — falling back to overall best matches."
            candidates = hybrid_pool
        else:
            candidates = filtered or hybrid_pool

        if not candidates:
            return "", [], system_note

        # Stage-3: Rerank
        method = (rerank_method or "bm25").lower()
        if method == "bge" and bge is not None:
            try:
                pairs = [(query, d.page_content) for d in candidates]
                scores = bge.score(pairs)
                scored_docs = list(zip(candidates, scores))
                final_docs = [d for d, s in sorted(scored_docs, key=lambda x: x[1], reverse=True)][:k]
            except Exception:
                final_docs = candidates[:k]
        elif method == "bm25" and BM25_AVAILABLE and len(candidates) > 1:
            try:
                bm_local = BM25Retriever.from_documents(candidates)
                bm_local.k = min(k, len(candidates))
                reranked = bm_local.invoke(query)
                final_docs = reranked if reranked else candidates[:k]
            except Exception:
                final_docs = candidates[:k]
        else:
            final_docs = candidates[:k]

        # Build context string
        blocks = []
        for d in final_docs:
            m = d.metadata or {}
            header = (
                f"### {m.get('file_name', 'Unknown')} "
                f"(Lease #{m.get('lease_no', 'N/A')}, "
                f"Page {m.get('page', 'N/A')})"
            )
            blocks.append(f"{header}\n{d.page_content}")

        return "\n\n".join(blocks), final_docs, system_note

    return get_context

# Pure LangChain RAG Pipeline (No LangGraph)
def build_rag_chain(store: FAISS, llm: Optional[ChatGroq] = None, rerank_method: str = "bm25"):
    """Build a pure LangChain RAG pipeline using Groq LLM."""
    get_context = make_retrieval_fn(store, rerank_method=rerank_method)

    qa_prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_QA),
        ("human",
         "SYSTEM NOTE:\n{system_note}\n\n"
         "Recent conversation:\n{recent_history}\n\n"
         "Retrieved lease context:\n{context}\n\n"
         "User question:\n{question}")
    ])
    chain = (qa_prompt | llm | StrOutputParser()) if llm is not None else None

    def rag_query(
        question: str, 
        history: Optional[List[Dict[str, str]]] = None, 
        filters: Optional[Dict] = None
    ) -> Dict:
        ctx, docs, note = get_context(question, filters)
        if chain is None:
            return {"answer": "LLM is not initialized. Please configure GROQ_API_KEY.", "documents": docs}

        msgs = history or []
        recent = msgs[-6:]
        recent_text_lines = [f"{m.get('role', 'user')}: {m.get('content', '')}" for m in recent if m.get('content')]
        recent_text = "\n".join(recent_text_lines) if recent_text_lines else "(no prior messages)"

        answer = chain.invoke({
            "question": question,
            "context": ctx or "(no matching lease context found)",
            "recent_history": recent_text,
            "system_note": note or "None",
        })
        return {"answer": answer, "documents": docs}

    return rag_query
