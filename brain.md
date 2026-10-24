# Project Brain (Context & Memory)

> **Purpose:** Single source of truth for project context, current status, and key decisions. Updated at the end of every conversation to maintain continuity.

---

## 1. Project Overview
- **Name:** Oil & Gas Lease Assistant (Streamlit Project)
- **Repository:** `https://github.com/Prabhat12112002/Strealit_Lease_Agent.git` (branch: `main`)
- **Core Functionality:** RAG-powered AI assistant that ingests oil & gas lease agreements (PDFs), enables hybrid search (FAISS + BM25), reranking, and natural language question-answering with citation and filtering.
- **Interfaces:**
  - **Streamlit App:** `streamlit_app.py` (primary interactive UI with `st.chat_input` & cited sources)
  - **FastAPI Backend:** `api.py` (REST/SSE streaming endpoints `/api/chat` for external frontends)
  - **Web UIs:** `lease-assistant-ui/` (React + Vite) & `ui/` (Vanilla HTML/JS)

---

## 2. Tech Stack & Key Services
| Layer | Technology | Details |
|---|---|---|
| **LLM** | Groq API (`ChatGroq`) | `llama-3.1-8b-instant` (high speed, accurate extraction) |
| **Embeddings** | HuggingFace | `all-MiniLM-L6-v2` (runs locally, CPU) |
| **Vector Database** | FAISS | Persisted in `faiss_index/` (1-based page metadata) |
| **Search & RAG** | LangChain, LangGraph | Hybrid retrieval (FAISS + BM25 RRF) + BGE/BM25 reranker |
| **Backend / App** | Python 3.10+, FastAPI, Streamlit | `streamlit_app.py`, `api.py` |
| **Frontend** | Streamlit / React (Vite) | Multi-session chat, PDF upload, metadata filters, citation cards |

---

## 3. Directory Map
```text
Stremlit_Project/
├── agent/
│   ├── ingestion.py       # PDF parsing (1-based page indexing), chunking, FAISS index creation
│   └── retrieve_ag.py     # ChatGroq init, hybrid RRF retrieval, LangGraph agent, persistence
├── docs/                  # Source PDF lease agreements (Lease 2-6)
├── faiss_index/           # Persisted FAISS vector index files (1-based pages)
├── lease-assistant-ui/    # React/Vite frontend client
├── ui/                    # Standalone HTML/JS/CSS client & integration guide
├── api.py                 # FastAPI backend exposing /api/chat with SSE streaming
├── streamlit_app.py       # Streamlit web application with modern chat interface
├── requirements.txt       # Python dependencies (includes langchain-groq)
├── vercel.json            # Deployment configuration
└── brain.md               # Context and memory ledger (this file)
```

---

## 4. Current Status & Known Decisions
- **LLM Engine:** Groq `llama-3.1-8b-instant` with temperature `0.1` for grounded, hallucination-resistant answers. Supported via `.env` (`GROQ_API_KEY`) or direct entry in Streamlit UI sidebar.
- **RAG & Hybrid Search:** RRF keying uses content/metadata hashes (resolved `id()` object identity bug). Page numbers are unified to 1-based indexing across ingestion, index, and retrieval filters.
- **LangGraph Routing:** Separates document QA / document summarization (`qa`) from session history recaps (`summarize`), ensuring lease documents are always retrieved for lease queries.
- **FastAPI Backend:** Supports `/api/chat` with SSE token streaming, safe lazy LLM loading, and metadata citations.
- **Deployment & Sync:** Changes are synced directly to remote repository `origin/main`.

---

## 5. Maintenance Protocol
*After every conversation:*
1. **Update Current Status / Decisions** if features, architecture, or configurations change.
2. **Add an entry to the Session Log below** with timestamp, what was done, and immediate next steps.
3. Keep the file concise, avoiding bloat.

---

## 6. Session Log
- **2026-10-24 (Session 1):**
  - Initialized `brain.md` context file for persistent workspace memory.
- **2026-10-24 (Session 2):**
  - Switched LLM from OpenRouter/DeepSeek to Groq `llama-3.1-8b-instant` (`ChatGroq`).
  - Added `langchain-groq` to `requirements.txt` and `.env`.
  - Fixed `api.py` missing `load_store` import; exported `load_store` and `save_store` in `agent/retrieve_ag.py`.
  - Fixed RRF fusion bug where `id(d)` caused vector and BM25 document duplicates and failed score merging.
  - Fixed `apply_filters_docs` discarding page filters when `lease_no` was None.
  - Migrated `faiss_index` metadata and `ingestion.py` from 0-based to 1-based page indexing.
  - Fixed Streamlit filter bug where default number input values forced `page=1` filter on all queries.
  - Fixed LangGraph router routing document summaries to conversation history node without retrieving lease text.
  - Upgraded Streamlit UI with `st.chat_input`, citation source drawers, and sidebar Groq API key configuration.
- **2026-10-24 (Session 3):**
  - Pushed all fixes, configuration updates, and `brain.md` to GitHub remote `origin/main` (`https://github.com/Prabhat12112002/Strealit_Lease_Agent.git`).
