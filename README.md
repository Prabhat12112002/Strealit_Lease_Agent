# 🛢️ Oil & Gas Lease Assistant

An AI-powered chatbot built with **Streamlit** that lets you upload oil & gas lease PDFs and ask questions about them using natural language. It uses **Retrieval-Augmented Generation (RAG)** with hybrid search and reranking for accurate, context-grounded answers.

---

## Features

- **PDF Ingestion** — Upload lease PDFs via the UI or auto-ingest from the `docs/` folder on startup
- **Hybrid Retrieval** — Combines FAISS vector search + BM25 keyword search with Reciprocal Rank Fusion (RRF)
- **Reranking** — Optional BGE cross-encoder or BM25 reranking for improved relevance
- **Metadata Filtering** — Filter by lease number, page number, or page range
- **Multi-Session Chat** — Create and manage multiple conversation sessions with history
- **Running Summaries** — Automatic conversation summarization to maintain context over long chats
- **LangGraph Agent** — Routes queries to QA or Summarization nodes via a state-based graph
- **100% Free** — Uses Groq (free LLM API) + HuggingFace embeddings (runs locally)

---

## Architecture

```
User Query
    │
    ▼
┌──────────┐     ┌────────────────────────────────┐
│  Router  │────▶│  QA Node / Summarize Node      │
└──────────┘     │  (LangGraph StateGraph)         │
                 └──────────┬─────────────────────┘
                            │
                 ┌──────────▼─────────────────────┐
                 │  Hybrid Retrieval               │
                 │  ┌─────────┐  ┌──────────┐     │
                 │  │  FAISS  │  │  BM25    │     │
                 │  │ (vector)│  │(keyword) │     │
                 │  └────┬────┘  └────┬─────┘     │
                 │       └──── RRF ───┘           │
                 │            │                    │
                 │     ┌──────▼──────┐             │
                 │     │  Reranker   │             │
                 │     └─────────────┘             │
                 └─────────────────────────────────┘
```

| Component        | Technology                                     |
| ---------------- | ---------------------------------------------- |
| **LLM**          | Groq API (`llama-3.3-70b-versatile`) — free    |
| **Embeddings**   | HuggingFace (`all-MiniLM-L6-v2`) — local, free |
| **Vector Store** | FAISS (CPU)                                    |
| **Framework**    | LangChain + LangGraph                          |
| **Frontend**     | Streamlit                                      |

---

## Project Structure

```
Stremlit_Project/
├── streamlit_app.py          # Main Streamlit application
├── agent/
│   ├── __init__.py
│   ├── ingestion.py          # PDF loading, chunking, FAISS indexing
│   └── retrieve_ag.py        # LLM init, retrieval agent (LangGraph)
├── docs/                     # Place lease PDFs here
│   ├── Lease 2.pdf
│   ├── Lease 3.pdf
│   ├── Lease 4.pdf
│   ├── Lease 5.pdf
│   └── Lease 6.pdf
├── faiss_index/              # Auto-generated FAISS index (persisted)
├── .env                      # API keys and config
├── requirements.txt          # Python dependencies
└── README.md
```

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Stremlit_Project
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
pip install langchain-groq
```

### 3. Get a free Groq API key

1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Sign up (free) and click **Create API Key**
3. Copy the key (starts with `gsk_...`)

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
# Groq API Key (FREE)
GROQ_API_KEY=gsk_your_api_key_here

# Groq Model (free options: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768)
GROQ_MODEL=llama-3.3-70b-versatile

# Embeddings (runs locally, no API needed)
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# App Settings
DOCS_FOLDER=docs
FAISS_INDEX_DIR=faiss_index
LEASE_CHUNK_SIZE=1200
LEASE_CHUNK_OVERLAP=150
RERANK_METHOD=bm25
MAX_TURNS=40
KEEP_RECENT=8
```

### 5. Add your PDFs

Place your oil & gas lease PDF files in the `docs/` folder. Name them like `Lease 6.pdf` for automatic lease number detection.

### 6. Run the application

```bash
streamlit run streamlit_app.py
```

The app will open at **http://localhost:8501**.

---

## Usage

### Upload PDFs

- Use the **Upload New Lease (PDF)** section to upload PDFs through the UI
- Files are saved to `docs/` and auto-ingested into the FAISS index

### Chat

1. Click **New session** to start a conversation
2. Type a question in the **Message** box, e.g.:
   - _"What is the royalty clause in Lease 6?"_
   - _"Summarize the key terms of Lease 3"_
   - _"Tell me about page 3 of Lease 5"_
3. Use **metadata filters** to narrow results by lease number or page range

### Reranking Options

| Method | Description                                                |
| ------ | ---------------------------------------------------------- |
| `bm25` | BM25 keyword-based reranking (default, fast)               |
| `bge`  | BGE cross-encoder neural reranking (more accurate, slower) |
| `none` | No reranking, use raw hybrid results                       |

---

## Environment Variables

| Variable              | Default                                  | Description                                 |
| --------------------- | ---------------------------------------- | ------------------------------------------- |
| `GROQ_API_KEY`        | _(required)_                             | Your Groq API key                           |
| `GROQ_MODEL`          | `llama-3.3-70b-versatile`                | Groq chat model                             |
| `EMBEDDING_MODEL`     | `sentence-transformers/all-MiniLM-L6-v2` | HuggingFace embedding model                 |
| `DOCS_FOLDER`         | `docs`                                   | Directory for lease PDFs                    |
| `FAISS_INDEX_DIR`     | `faiss_index`                            | Directory to persist FAISS index            |
| `LEASE_CHUNK_SIZE`    | `1200`                                   | Document chunk size (characters)            |
| `LEASE_CHUNK_OVERLAP` | `150`                                    | Overlap between chunks                      |
| `RERANK_METHOD`       | `bm25`                                   | Default reranking method                    |
| `MAX_TURNS`           | `40`                                     | Max conversation turns before summarization |
| `KEEP_RECENT`         | `8`                                      | Recent messages to keep after compression   |

---

## Tech Stack

- **Python 3.11+**
- **Streamlit** — Web UI
- **LangChain** — Document loading, chunking, embeddings, prompts
- **LangGraph** — Stateful agent graph (Router → QA / Summarize)
- **FAISS** — Vector similarity search
- **Groq** — Free LLM inference (Llama 3.3 70B)
- **HuggingFace** — Local sentence embeddings
- **BM25** — Keyword-based retrieval
- **PyPDF** — PDF parsing

---

## License

This project is for educational and internal use.
