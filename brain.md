# Project Brain (Context & Memory)

> **Purpose:** Single source of truth for project context, current status, and key decisions. Updated at the end of every conversation to maintain continuity.

---

## 1. Project Overview
- **Name:** Oil & Gas Lease Assistant (Streamlit Project)
- **Repository:** `https://github.com/Prabhat12112002/Strealit_Lease_Agent.git` (branch: `main`)
- **Live Vercel Site:** `https://strealit-lease-agent.vercel.app/`
- **Core Functionality:** RAG-powered AI assistant that ingests oil & gas lease agreements (PDFs), enables hybrid search (FAISS + BM25), reranking, and natural language question-answering with citation and filtering.
- **Interfaces:**
  - **Live Web App (Vercel):** `lease-assistant-ui/` (React + Vite) with direct in-browser Groq RAG streaming over 218 pre-indexed lease chunks.
  - **Streamlit App:** `streamlit_app.py` (Python desktop/cloud UI with `st.chat_input` & cited sources).
  - **FastAPI Backend:** `api.py` (REST/SSE streaming endpoints `/api/chat` for optional local/decoupled deployment).

---

## 2. Tech Stack & Key Services
| Layer | Technology | Details |
|---|---|---|
| **LLM** | Groq API (`ChatGroq` / Groq REST) | `llama-3.1-8b-instant` (ultra-fast, hallucination-resistant) |
| **Embeddings** | HuggingFace | `all-MiniLM-L6-v2` (runs locally, CPU) |
| **Vector Database** | FAISS | Persisted in `faiss_index/` (1-based page metadata, committed to git) |
| **Search & RAG** | Pure LangChain | Streamlined LangChain RAG pipeline (no LangGraph overhead) |
| **Backend / App** | Python 3.10+, FastAPI, Streamlit | `streamlit_app.py`, `api.py` |
| **Frontend / Web** | React (Vite) on Vercel | Real-time token streaming, citation badges, key config modal |

---

## 3. Directory Map
```text
Stremlit_Project/
├── agent/
│   ├── ingestion.py       # PDF parsing (1-based page indexing), chunking, FAISS index creation
│   └── retrieve_ag.py     # Pure LangChain RAG pipeline (ChatGroq, FAISS + BM25 hybrid search)
├── docs/                  # Source PDF lease agreements (Lease 2-6) + lease_chunks.json
├── faiss_index/           # Persisted FAISS vector index files (1-based pages, committed)
├── lease-assistant-ui/    # React/Vite frontend client with client-side Groq RAG engine
├── api.py                 # FastAPI backend exposing /api/chat with SSE streaming
├── streamlit_app.py       # Streamlit web application with modern chat interface
├── requirements.txt       # Python dependencies (includes langchain-groq)
├── vercel.json            # Deployment configuration for Vercel
├── package.json           # Root build orchestration for Vercel
└── brain.md               # Context and memory ledger (this file)
```

---

## 4. Current Status & Known Decisions
- **RAG Architecture:** Fully migrated to a **pure LangChain RAG pipeline** using Groq `llama-3.1-8b-instant`. LangGraph has been completely removed to eliminate complexity and routing failures.
- **Live Vercel Site:** Operates directly on Vercel (`https://strealit-lease-agent.vercel.app/`). The React UI uses in-memory RAG over 218 pre-chunked lease passages (`lease_chunks.json`) and streams live answers from Groq API token-by-token.
- **Key Management:** Groq API key is configurable directly in the web UI via the "Set Groq Key" modal and saved to browser `localStorage`, or read from `VITE_GROQ_API_KEY` / `GROQ_API_KEY`.
- **Git Sync:** All changes are maintained directly on branch `main` with zero branch fragmentation.

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
  - Upgraded Streamlit UI with `st.chat_input`, citation source drawers, and sidebar Groq API key configuration.
- **2026-10-24 (Session 3):**
  - Pushed all fixes, configuration updates, and `brain.md` to GitHub remote `origin/main` (`https://github.com/Prabhat12112002/Strealit_Lease_Agent.git`).
- **2026-10-24 (Session 4):**
  - Tracked pre-indexed `faiss_index/` in git for instant startup on live cloud deployments.
  - Updated React UI (`lease-assistant-ui`) to support dynamic `VITE_API_URL` configuration and verified clean production build.
- **2026-10-25 (Session 5):**
  - Completely removed LangGraph and replaced with a pure LangChain RAG pipeline (`build_rag_chain`) using Groq `llama-3.1-8b-instant`.
  - Exported all 218 lease chunks to `docs/lease_chunks.json` and `lease-assistant-ui/src/data/lease_chunks.json`.
  - Implemented real-time client-side RAG and Groq streaming in `lease-assistant-ui/src/App.jsx` so the live Vercel site works without requiring a separate Python server.
  - Added "Set Groq Key" modal in the React UI with `localStorage` persistence and direct link to get free Groq keys.
  - Added root `package.json` for Vercel deployment orchestration.
  - Pushed all changes directly to GitHub `main` branch.
