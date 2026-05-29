import os
import uuid
import streamlit as st
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from agent.ingestion import ingest_folder, ingest_files, init_embeddings
from agent.retrieve_ag import init_llm, build_agent
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Config
DOCS_FOLDER = os.getenv("DOCS_FOLDER", "docs")
UPLOAD_DIR = DOCS_FOLDER  # uploads go directly into docs/
CHUNK_SIZE = int(os.getenv("LEASE_CHUNK_SIZE", "1200"))
CHUNK_OVERLAP = int(os.getenv("LEASE_CHUNK_OVERLAP", "150"))
DEFAULT_RERANK_METHOD = os.getenv("RERANK_METHOD", "bm25")
INDEX_DIR = os.getenv("FAISS_INDEX_DIR", "faiss_index")
MAX_TURNS = int(os.getenv("MAX_TURNS", "40"))
KEEP_RECENT = int(os.getenv("KEEP_RECENT", "8"))


# Persist FAISS
def save_store(store: FAISS):
    if store:
        store.save_local(INDEX_DIR)

def load_store(embeddings) -> Optional[FAISS]:
    try:
        return FAISS.load_local(INDEX_DIR, embeddings, allow_dangerous_deserialization=True)
    except Exception:
        return None

# Init page
st.set_page_config(page_title="Oil & Gas Lease Assistant", layout="wide")
st.title("🛢️ Oil & Gas Lease Assistant")

# Initialize session_state
if "llm" not in st.session_state:
    st.session_state.llm = init_llm()  # DeepSeek v4 Flash via OpenRouter

if "embeddings" not in st.session_state:
    st.session_state.embeddings = init_embeddings()  # HuggingFace local embeddings (free)

if "sessions" not in st.session_state:
    st.session_state.sessions: Dict[str, List[Dict[str, str]]] = {}

if "session_summaries" not in st.session_state:
    st.session_state.session_summaries: Dict[str, str] = {}

if "store" not in st.session_state:
    # Try loading persisted FAISS index
    st.session_state.store = load_store(st.session_state.embeddings)

    # AUTO-INGEST: if no persisted index found
    if st.session_state.store is None:
        os.makedirs(DOCS_FOLDER, exist_ok=True)
        store, added = ingest_folder(DOCS_FOLDER, CHUNK_SIZE, CHUNK_OVERLAP, None)
        st.session_state.store = store if store is not None else None

        # Persist for future runs
        if st.session_state.store is not None:
            st.session_state.store.save_local(INDEX_DIR)

        # Show status in UI
        if added > 0:
            st.toast(f"Auto-ingested {added} chunks from '{DOCS_FOLDER}'", icon="✅")
        else:
            st.toast(f"No PDFs found in '{DOCS_FOLDER}' to ingest.", icon="⚠️")

# Build agent graph
if "agent_graph" not in st.session_state:
    st.session_state.agent_graph = (
        build_agent(st.session_state.store, st.session_state.llm, rerank_method=DEFAULT_RERANK_METHOD)
        if st.session_state.store else None
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
memory_chain = memory_prompt | st.session_state.llm | StrOutputParser()

def compress_history_if_needed(sid: str):
    messages = st.session_state.sessions.get(sid, [])
    if len(messages) <= MAX_TURNS:
        return
    prev_summary = st.session_state.session_summaries.get(sid, "")
    hist_text = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
    try:
        new_summary = memory_chain.invoke({"summary": prev_summary, "history": hist_text})
    except Exception:
        new_summary = prev_summary
    st.session_state.session_summaries[sid] = new_summary
    st.session_state.sessions[sid] = messages[-KEEP_RECENT:]

# SIDEBAR: Conversations + Active Session Selector
with st.sidebar:
    st.markdown("### 💬 Conversations")

    all_sids = list(st.session_state.sessions.keys())
    default_sid = st.session_state.get("active_sid") if st.session_state.get("active_sid") in all_sids else None
    selected_sid = st.selectbox(
        "Active session",
        options=all_sids if all_sids else ["(none)"],
        index=(all_sids.index(default_sid) if (default_sid and default_sid in all_sids) else 0) if all_sids else 0,
        help="Select which session is currently active"
    )

    # Update active session from sidebar choice
    if all_sids and selected_sid in all_sids:
        st.session_state.active_sid = selected_sid

    st.markdown("---")
    st.markdown("#### 📑 All Conversation Histories")

    if not all_sids:
        st.info("No sessions yet. Click **New session** in main area and start chatting.")
    else:
        for sid_item in all_sids:
            with st.expander(f"Session: {sid_item}", expanded=False):
                msgs = st.session_state.sessions.get(sid_item, [])
                if not msgs:
                    st.write("_(empty)_")
                else:
                    # Render with chat bubbles
                    for m in msgs:
                        bubble_role = "user" if m["role"] == "user" else "assistant"
                        with st.chat_message(bubble_role):
                            st.markdown(m["content"])

# Ingestion (Upload-only)
st.subheader("📥 Upload New Lease (PDF)")
st.write(f"Uploaded files will be saved to: **{UPLOAD_DIR}**. If a file already exists, it won't be overwritten unless you allow it.")

uploads = st.file_uploader("Select PDF(s)", type=["pdf"], accept_multiple_files=True)
col_up1, col_up2, col_up3 = st.columns([1, 1, 1])
with col_up1:
    auto_ingest = st.checkbox("Auto-ingest after save", value=True)
with col_up2:
    allow_overwrite = st.checkbox("Allow overwrite if exists", value=False)
with col_up3:
    rerank_default = st.selectbox("Default rerank", options=["bge", "bm25", "none"], index=["bge","bm25","none"].index(DEFAULT_RERANK_METHOD))

if st.button("Save (and Ingest if selected)"):
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
        st.success(f"Saved: {len(saved_paths)}, Skipped (exists): {skipped}")

        if auto_ingest and saved_paths:
            store, added = ingest_files(saved_paths, CHUNK_SIZE, CHUNK_OVERLAP, st.session_state.store)
            st.session_state.store = store
            save_store(store)
            st.session_state.agent_graph = build_agent(store, st.session_state.llm, rerank_method=rerank_default)
            st.success(f"Ingested newly saved PDFs ➜ Added chunks: {added}")

# Chat
st.subheader("💬 Chat")
sid_col1, sid_col2 = st.columns([3, 1])
with sid_col1:
    sid = st.text_input("Session ID (optional)", value=st.session_state.get("active_sid", ""))
with sid_col2:
    if st.button("New session"):
        sid = str(uuid.uuid4())
        st.session_state.active_sid = sid
        st.session_state.sessions[sid] = []
        st.session_state.session_summaries[sid] = ""
        st.info(f"New session started: {sid}")

if not sid:
    sid = st.session_state.get("active_sid")
    if not sid:
        sid = str(uuid.uuid4())
        st.session_state.active_sid = sid
        st.session_state.sessions[sid] = []
        st.session_state.session_summaries[sid] = ""

msg = st.text_input("Message", placeholder="e.g., Tell me rotalty clause from page 3 of Lease 6")

with st.expander("Optional metadata filters"):
    lease_no = st.number_input("Lease No", min_value=0, step=1, format="%d", value=0)
    page = st.number_input("Page", min_value=1, step=1, format="%d")
    page_min = st.number_input("Page Min", min_value=1, step=1, format="%d")
    page_max = st.number_input("Page Max", min_value=1, step=1, format="%d")
    rerank_method = st.selectbox("Rerank (per request)", options=["(default)", "bge", "bm25", "none"], index=0)

send_col1, send_col2 = st.columns([1, 1])
with send_col1:
    send_clicked = st.button("Send")
with send_col2:
    reset_clicked = st.button("Reset session state")

if reset_clicked:
    st.session_state.sessions[sid] = []
    st.session_state.session_summaries[sid] = ""
    st.info("Session cleared.")

answer_box = st.empty()

if send_clicked:
    if st.session_state.agent_graph is None or st.session_state.store is None:
        answer = "No documents ingested yet. Please upload and ingest PDFs first."
        st.session_state.sessions[sid].append({"role": "assistant", "content": answer})
        answer_box.code(answer)
    else:
        chosen_rerank = None
        if rerank_method in ["bge", "bm25", "none"]:
            chosen_rerank = rerank_method
            st.session_state.agent_graph = build_agent(st.session_state.store, st.session_state.llm, rerank_method=chosen_rerank)

        filters = {
            "lease_no": int(lease_no) if lease_no else None,
            "page": int(page) if page else None,
            "page_min": int(page_min) if page_min else None,
            "page_max": int(page_max) if page_max else None,
        }

        st.session_state.sessions[sid].append({"role": "user", "content": msg})
        state_in = {
            "question": msg,
            "history": st.session_state.sessions[sid],
            "summary": st.session_state.session_summaries.get(sid, ""),
            "filters": filters,
        }
        result = st.session_state.agent_graph.invoke(state_in)
        answer = result.get("answer", "")
        st.session_state.sessions[sid].append({"role": "assistant", "content": answer})
        compress_history_if_needed(sid)
        answer_box.code(answer)

# Current Conversation (Active Session) - Chat History in main area
st.subheader("🧾 Current Conversation (Active Session)")
active_sid = st.session_state.get("active_sid", sid)
if active_sid and (active_sid in st.session_state.sessions):
    for m in st.session_state.sessions[active_sid]:
        bubble_role = "user" if m["role"] == "user" else "assistant"
        with st.chat_message(bubble_role):
            st.markdown(m["content"])
else:
    st.info("No messages yet for the active session.")


with st.expander("🔧 Health"):
    total_msgs = sum(len(v) for v in st.session_state.sessions.values()) if st.session_state.sessions else 0
    st.write({
        "store_initialized": st.session_state.store is not None,
        "sessions": len(st.session_state.sessions),
        "total_messages": total_msgs,
        "default_rerank": DEFAULT_RERANK_METHOD,
        "docs_folder": DOCS_FOLDER,
        "faiss_index_dir": INDEX_DIR
    })
