import os
import uuid
import streamlit as st
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from agent.ingestion import ingest_folder, ingest_files, init_embeddings
from agent.retrieve_ag import init_llm, build_agent, load_store, save_store
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Config
DOCS_FOLDER = os.getenv("DOCS_FOLDER", "docs")
UPLOAD_DIR = DOCS_FOLDER
CHUNK_SIZE = int(os.getenv("LEASE_CHUNK_SIZE", "1200"))
CHUNK_OVERLAP = int(os.getenv("LEASE_CHUNK_OVERLAP", "150"))
DEFAULT_RERANK_METHOD = os.getenv("RERANK_METHOD", "bm25")
INDEX_DIR = os.getenv("FAISS_INDEX_DIR", "faiss_index")
MAX_TURNS = int(os.getenv("MAX_TURNS", "40"))
KEEP_RECENT = int(os.getenv("KEEP_RECENT", "8"))
DEFAULT_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

# Init page
st.set_page_config(page_title="Oil & Gas Lease Assistant", layout="wide", page_icon="🛢️")
st.title("🛢️ Oil & Gas Lease Assistant")

# Initialize session_state keys
if "groq_api_key" not in st.session_state:
    st.session_state.groq_api_key = os.getenv("GROQ_API_KEY", "")

if "groq_model" not in st.session_state:
    st.session_state.groq_model = DEFAULT_MODEL

if "llm" not in st.session_state:
    st.session_state.llm = None
    if st.session_state.groq_api_key:
        try:
            st.session_state.llm = init_llm(
                api_key=st.session_state.groq_api_key, 
                model_name=st.session_state.groq_model
            )
        except Exception:
            st.session_state.llm = None

if "embeddings" not in st.session_state:
    st.session_state.embeddings = init_embeddings()

if "sessions" not in st.session_state:
    st.session_state.sessions: Dict[str, List[Dict[str, any]]] = {}

if "session_summaries" not in st.session_state:
    st.session_state.session_summaries: Dict[str, str] = {}

if "store" not in st.session_state:
    st.session_state.store = load_store(st.session_state.embeddings, INDEX_DIR)
    if st.session_state.store is None:
        os.makedirs(DOCS_FOLDER, exist_ok=True)
        store, added = ingest_folder(DOCS_FOLDER, CHUNK_SIZE, CHUNK_OVERLAP, None)
        st.session_state.store = store
        if store is not None:
            save_store(store, INDEX_DIR)
        if added > 0:
            st.toast(f"Auto-ingested {added} chunks from '{DOCS_FOLDER}'", icon="✅")

if "current_rerank" not in st.session_state:
    st.session_state.current_rerank = DEFAULT_RERANK_METHOD

if "agent_graph" not in st.session_state:
    st.session_state.agent_graph = (
        build_agent(st.session_state.store, st.session_state.llm, rerank_method=st.session_state.current_rerank)
        if (st.session_state.store and st.session_state.llm) else None
    )

def ensure_agent(rerank: str):
    """Rebuild agent only if configuration changed or agent is None."""
    needs_rebuild = (
        st.session_state.agent_graph is None or 
        st.session_state.current_rerank != rerank
    )
    if needs_rebuild and st.session_state.store and st.session_state.llm:
        st.session_state.current_rerank = rerank
        st.session_state.agent_graph = build_agent(
            st.session_state.store, 
            st.session_state.llm, 
            rerank_method=rerank
        )

# Running summary chain
memory_prompt = ChatPromptTemplate.from_messages([
    ("system", "You maintain a concise running summary of the conversation, capturing key decisions, facts, definitions, dates, and unresolved questions. Focus on oil & gas lease topics when present."),
    ("human",
     "Update the running summary with the latest conversation.\n\n"
     "Previous summary:\n{summary}\n\n"
     "Full conversation messages (include latest turn):\n{history}\n\n"
     "Return only the improved summary.")
])

def compress_history_if_needed(sid: str):
    messages = st.session_state.sessions.get(sid, [])
    if len(messages) <= MAX_TURNS or not st.session_state.llm:
        return
    prev_summary = st.session_state.session_summaries.get(sid, "")
    hist_text = "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')}" for m in messages])
    try:
        memory_chain = memory_prompt | st.session_state.llm | StrOutputParser()
        new_summary = memory_chain.invoke({"summary": prev_summary, "history": hist_text})
    except Exception:
        new_summary = prev_summary
    st.session_state.session_summaries[sid] = new_summary
    st.session_state.sessions[sid] = messages[-KEEP_RECENT:]

# SIDEBAR: Configuration & Sessions
with st.sidebar:
    st.markdown("### 🔑 Model Configuration")
    api_key_input = st.text_input(
        "Groq API Key", 
        type="password", 
        value=st.session_state.groq_api_key,
        help="Free key from console.groq.com/keys"
    )
    model_choice = st.selectbox(
        "Model",
        options=["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
        index=0,
        help="Llama 3.1 8B Instant provides lightning fast and accurate answers."
    )
    if (api_key_input != st.session_state.groq_api_key) or (model_choice != st.session_state.groq_model):
        st.session_state.groq_api_key = api_key_input
        st.session_state.groq_model = model_choice
        if api_key_input:
            try:
                st.session_state.llm = init_llm(api_key=api_key_input, model_name=model_choice)
                if st.session_state.store:
                    st.session_state.agent_graph = build_agent(
                        st.session_state.store, 
                        st.session_state.llm, 
                        rerank_method=st.session_state.current_rerank
                    )
                st.success("Groq LLM initialized!")
            except Exception as e:
                st.error(f"Error initializing Groq LLM: {e}")
        else:
            st.session_state.llm = None
            st.session_state.agent_graph = None

    st.markdown("---")
    st.markdown("### 💬 Conversations")

    all_sids = list(st.session_state.sessions.keys())
    default_sid = st.session_state.get("active_sid") if st.session_state.get("active_sid") in all_sids else None
    selected_sid = st.selectbox(
        "Active session",
        options=all_sids if all_sids else ["(none)"],
        index=(all_sids.index(default_sid) if (default_sid and default_sid in all_sids) else 0) if all_sids else 0,
        help="Select which session is currently active"
    )

    if all_sids and selected_sid in all_sids:
        st.session_state.active_sid = selected_sid

    st.markdown("---")
    st.markdown("#### 📑 Session History")

    if not all_sids:
        st.info("No sessions yet. Type a question to start.")
    else:
        for sid_item in all_sids:
            with st.expander(f"Session: {sid_item[:8]}...", expanded=False):
                msgs = st.session_state.sessions.get(sid_item, [])
                if not msgs:
                    st.write("_(empty)_")
                else:
                    for m in msgs:
                        role = m.get("role", "user")
                        with st.chat_message(role):
                            st.markdown(m.get("content", ""))

# Notice if API key is missing
if not st.session_state.llm:
    st.warning("⚠️ **Groq API Key Required:** Please enter your Groq API key in the sidebar (or configure `GROQ_API_KEY` in `.env`) to enable AI question answering.")

# Ingestion Section
with st.expander("📥 Upload & Ingest Lease PDFs", expanded=False):
    st.write(f"Source folder: **{UPLOAD_DIR}**")
    uploads = st.file_uploader("Select PDF(s)", type=["pdf"], accept_multiple_files=True)
    col_up1, col_up2, col_up3 = st.columns([1, 1, 1])
    with col_up1:
        auto_ingest = st.checkbox("Auto-ingest after save", value=True)
    with col_up2:
        allow_overwrite = st.checkbox("Allow overwrite if exists", value=False)
    with col_up3:
        rerank_default = st.selectbox(
            "Default rerank", 
            options=["bm25", "bge", "none"], 
            index=["bm25", "bge", "none"].index(DEFAULT_RERANK_METHOD) if DEFAULT_RERANK_METHOD in ["bm25", "bge", "none"] else 0
        )

    col_btn1, col_btn2 = st.columns([1, 1])
    with col_btn1:
        if st.button("Save & Ingest Uploaded PDFs"):
            if not uploads:
                st.warning("Please select at least one PDF.")
            else:
                os.makedirs(UPLOAD_DIR, exist_ok=True)
                saved_paths, skipped = [], 0
                for f in uploads:
                    out_path = os.path.join(UPLOAD_DIR, f.name)
                    if (not allow_overwrite) and os.path.exists(out_path):
                        skipped += 1
                        continue
                    with open(out_path, "wb") as w:
                        w.write(f.read())
                    saved_paths.append(out_path)
                st.success(f"Saved: {len(saved_paths)}, Skipped: {skipped}")

                if auto_ingest and saved_paths:
                    store, added = ingest_files(saved_paths, CHUNK_SIZE, CHUNK_OVERLAP, st.session_state.store)
                    st.session_state.store = store
                    save_store(store, INDEX_DIR)
                    if st.session_state.llm:
                        st.session_state.agent_graph = build_agent(store, st.session_state.llm, rerank_method=rerank_default)
                    st.success(f"Ingested newly saved PDFs ➜ Added {added} chunks!")

    with col_btn2:
        if st.button("🔄 Sync & Re-index 'docs/' Folder"):
            with st.spinner("Indexing all PDFs in docs/ folder..."):
                store, total = ingest_folder(DOCS_FOLDER, CHUNK_SIZE, CHUNK_OVERLAP, None)
                st.session_state.store = store
                if store:
                    save_store(store, INDEX_DIR)
                    if st.session_state.llm:
                        st.session_state.agent_graph = build_agent(store, st.session_state.llm, rerank_method=rerank_default)
                st.success(f"Successfully synced index! Total chunks: {total}")

# Chat Section
sid_col1, sid_col2 = st.columns([4, 1])
with sid_col1:
    if "active_sid" not in st.session_state or not st.session_state.active_sid:
        st.session_state.active_sid = str(uuid.uuid4())
    sid = st.session_state.active_sid
    st.caption(f"Active Session: `{sid}`")
with sid_col2:
    if st.button("➕ New session"):
        new_sid = str(uuid.uuid4())
        st.session_state.active_sid = new_sid
        st.session_state.sessions[new_sid] = []
        st.session_state.session_summaries[new_sid] = ""
        st.rerun()

if sid not in st.session_state.sessions:
    st.session_state.sessions[sid] = []
    st.session_state.session_summaries[sid] = ""

# Metadata Filters Expander
with st.expander("🔍 Optional Metadata Filters", expanded=False):
    f_col1, f_col2, f_col3, f_col4 = st.columns(4)
    with f_col1:
        lease_no = st.number_input("Lease No (0 = all)", min_value=0, value=0, step=1)
    with f_col2:
        page = st.number_input("Page (0 = all)", min_value=0, value=0, step=1)
    with f_col3:
        page_min = st.number_input("Page Min (0 = none)", min_value=0, value=0, step=1)
    with f_col4:
        page_max = st.number_input("Page Max (0 = none)", min_value=0, value=0, step=1)

    rerank_method = st.selectbox("Rerank Method", options=["bm25", "bge", "none"], index=0)

# Render Chat History for Active Session
for m in st.session_state.sessions[sid]:
    role = m.get("role", "user")
    content = m.get("content", "")
    with st.chat_message(role):
        st.markdown(content)
        # Display citations if available
        citations = m.get("citations")
        if citations:
            with st.expander(f"📚 Cited Sources ({len(citations)})", expanded=False):
                for idx, c in enumerate(citations, 1):
                    meta = c.metadata if hasattr(c, "metadata") else c.get("metadata", {})
                    st.markdown(f"**[{idx}] {meta.get('file_name', 'Lease')} — Page {meta.get('page', 'N/A')}**")
                    st.caption(c.page_content if hasattr(c, "page_content") else c.get("text", ""))

# Chat Input Box
user_query = st.chat_input("Ask a question about your leases (e.g., 'What is the royalty clause in Lease 6?')...")

if user_query:
    if not st.session_state.llm:
        st.error("Please enter a valid Groq API Key in the sidebar to ask questions.")
    elif not st.session_state.store:
        st.error("No documents indexed. Please upload or sync PDFs from the docs folder above.")
    else:
        # Build filter dict properly (avoid defaulting to 1)
        filters = {}
        if lease_no > 0:
            filters["lease_no"] = int(lease_no)
        if page > 0:
            filters["page"] = int(page)
        if page_min > 0:
            filters["page_min"] = int(page_min)
        if page_max > 0:
            filters["page_max"] = int(page_max)
        filters_to_pass = filters if filters else None

        # Ensure agent graph matches rerank choice
        ensure_agent(rerank_method)

        # Append user message
        st.session_state.sessions[sid].append({"role": "user", "content": user_query})

        # Render immediately
        with st.chat_message("user"):
            st.markdown(user_query)

        # Run agent
        with st.chat_message("assistant"):
            with st.spinner("Analyzing lease documents..."):
                state_in = {
                    "question": user_query,
                    "history": st.session_state.sessions[sid],
                    "summary": st.session_state.session_summaries.get(sid, ""),
                    "filters": filters_to_pass,
                }
                result = st.session_state.agent_graph.invoke(state_in)
                answer = result.get("answer", "No response generated.")
                docs = result.get("documents", [])

                st.markdown(answer)
                if docs:
                    with st.expander(f"📚 Cited Sources ({len(docs)})", expanded=False):
                        for idx, d in enumerate(docs, 1):
                            m = d.metadata or {}
                            st.markdown(f"**[{idx}] {m.get('file_name', 'Lease')} — Page {m.get('page', 'N/A')}**")
                            st.caption(d.page_content)

        # Store in session state
        st.session_state.sessions[sid].append({
            "role": "assistant", 
            "content": answer,
            "citations": docs
        })
        compress_history_if_needed(sid)

# Health & Metrics Expander
with st.expander("🔧 System Status & Health", expanded=False):
    total_msgs = sum(len(v) for v in st.session_state.sessions.values()) if st.session_state.sessions else 0
    st.json({
        "llm_connected": st.session_state.llm is not None,
        "model": st.session_state.groq_model,
        "store_initialized": st.session_state.store is not None,
        "active_session": sid,
        "total_sessions": len(st.session_state.sessions),
        "total_messages": total_msgs,
        "rerank_method": st.session_state.current_rerank,
        "docs_folder": DOCS_FOLDER,
        "faiss_index_dir": INDEX_DIR,
    })
