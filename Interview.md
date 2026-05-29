# 🛢️ Oil & Gas Lease Assistant — Interview Questions & Answers

---

## 📁 Project Structure

```
Stremlit_Project/
├── streamlit_app.py            # Main Streamlit UI (upload, chat, session management)
├── agent/
│   ├── ingestion.py            # PDF loading, chunking, FAISS indexing
│   └── retrieve_ag.py          # LLM init, hybrid retrieval, LangGraph agent
├── docs/                       # Lease PDF files (Lease 2–6)
│   ├── Lease 2.pdf
│   ├── Lease 3.pdf
│   ├── Lease 4.pdf
│   ├── Lease 5.pdf
│   └── Lease 6.pdf
├── faiss_index/                # Persisted FAISS vector index
│   ├── index.faiss
│   └── index.pkl
├── .env                        # API keys & configuration
├── requirements.txt            # Python dependencies
└── README.md                   # Project documentation
```

---

## 🏗️ Project Architecture

```
                        ┌─────────────────────────┐
                        │      Streamlit UI       │
                        │   (streamlit_app.py)    │
                        └────────┬────────────────┘
                                 │
                    ┌────────────┴────────────────┐
                    │                             │
           ┌───────▼────────┐          ┌─────────▼──────────┐
           │  PDF Ingestion │          │   Chat Interface   │
           │ (ingestion.py) │          │  (Session Mgmt)    │
           └───────┬────────┘          └─────────┬──────────┘
                   │                             │
        ┌──────────▼──────────┐       ┌──────────▼──────────┐
        │  PyPDF Loader       │       │   LangGraph Agent   │
        │  + Text Splitter    │       │  (retrieve_ag.py)   │
        │  + Metadata Tagging │       └──────────┬──────────┘
        └──────────┬──────────┘                  │
                   │                    ┌────────▼────────┐
                   │                    │     Router      │
                   │                    │  (qa/summarize) │
                   │                    └───┬─────────┬───┘
                   │                        │         │
                   │                ┌───────▼──┐  ┌───▼──────────┐
                   │                │  QA Node │  │ Summarize    │
                   │                │          │  │ Node         │
                   │                └───┬──────┘  └──────────────┘
                   │                    │
                   │          ┌─────────▼──────────┐
                   │          │  Hybrid Retrieval   │
                   │          │  ┌───────┐ ┌─────┐ │
                   ▼          │  │ FAISS │ │BM25 │ │
            ┌──────────┐      │  └───┬───┘ └──┬──┘ │
            │  FAISS   │◄─────│      └── RRF ─┘   │
            │  Store   │      │         │          │
            └──────────┘      │    ┌────▼─────┐    │
                              │    │ Reranker │    │
                              │    └──────────┘    │
                              └────────────────────┘
```

### Data Flow Summary

```
PDF Upload → PyPDF Loader → Text Chunking (1200 chars) → Metadata Tagging
→ HuggingFace Embeddings → FAISS Vector Store (persisted to disk)

User Query → Router (qa/summarize) → Hybrid Retrieval (FAISS + BM25)
→ RRF Fusion → Metadata Filtering → Reranking (BGE/BM25)
→ LLM (Groq Llama 3.3 70B) → Answer with source citations
```

### Technology Stack

| Layer          | Technology                                      |
| -------------- | ----------------------------------------------- |
| **Frontend**   | Streamlit                                       |
| **LLM**        | Groq API — Llama 3.3 70B Versatile (free)       |
| **Embeddings** | HuggingFace `all-MiniLM-L6-v2` (local, free)    |
| **Vector DB**  | FAISS (CPU)                                     |
| **Framework**  | LangChain + LangGraph                           |
| **Retrieval**  | Hybrid (FAISS vector + BM25 keyword) + RRF      |
| **Reranking**  | BGE Cross-Encoder / BM25                        |
| **PDF Parser** | PyPDF                                           |

---

## 📝 Interview Questions & Answers

---

### 🔷 Section 1: Project Overview

---

**Q1. What is this project about?**

It's an AI-powered chatbot that lets users upload Oil & Gas Lease PDFs and ask questions about them using natural language. It uses RAG (Retrieval-Augmented Generation) with hybrid search and reranking to give accurate, context-grounded answers.

---

**Q2. Why did you choose RAG instead of just feeding PDFs directly to the LLM?**

LLMs have token limits and can hallucinate. RAG retrieves only the most relevant chunks from documents first, then passes them as context to the LLM — this keeps answers grounded in actual data and works with any number of documents.

---

**Q3. What problem does this project solve?**

Manually reading through lengthy legal lease documents is time-consuming. This tool lets users instantly query specific clauses, royalty terms, page-level details, and get summarized answers — saving hours of manual review.

---

**Q4. What is the tech stack of this project?**

Streamlit for UI, LangChain + LangGraph for the RAG pipeline, FAISS for vector storage, Groq API (Llama 3.3 70B) as the LLM, HuggingFace `all-MiniLM-L6-v2` for embeddings, BM25 for keyword retrieval, and PyPDF for parsing PDFs.

---

**Q5. Is this project free to run?**

Yes. The LLM uses Groq's free API tier, and embeddings run locally using HuggingFace sentence-transformers — no paid APIs are needed.

---

### 🔷 Section 2: PDF Ingestion & Chunking

---

**Q6. How does PDF ingestion work in this project?**

PDFs are loaded using `PyPDFLoader`, which extracts text page-by-page. Each page is then split into smaller chunks using `RecursiveCharacterTextSplitter` with a chunk size of 1200 characters and 150-character overlap. Metadata like file name, lease number, and page number is attached to each chunk.

---

**Q7. Why do you use chunking? Why not embed the entire document?**

Embedding models have input size limits, and smaller chunks allow more precise retrieval. If we embed the entire document, the embedding becomes too diluted and retrieval accuracy drops significantly.

---

**Q8. What is `RecursiveCharacterTextSplitter` and why use it?**

It's a LangChain splitter that tries to split text at natural boundaries (paragraphs → sentences → words) before falling back to raw character splits. This preserves semantic coherence within each chunk better than a simple character split.

---

**Q9. Why 1200 chunk size and 150 overlap?**

1200 characters is large enough to capture a meaningful paragraph from a lease clause without exceeding embedding model limits. The 150-character overlap ensures context isn't lost at chunk boundaries — a sentence spanning two chunks is still captured.

---

**Q10. How is the lease number extracted from filenames?**

The `extract_lease_no()` function parses the filename — e.g., `"Lease 6.pdf"` → `6`. It splits the basename, checks if the last token is a digit, and falls back to extracting all digits from the name.

---

**Q11. What metadata is stored with each chunk?**

Four fields: `source_path` (file path), `file_name`, `page` (page number), and `lease_no` (extracted lease number). This metadata enables filtering during retrieval.

---

### 🔷 Section 3: Embeddings & FAISS

---

**Q12. What embedding model are you using and why?**

`sentence-transformers/all-MiniLM-L6-v2` — it's a lightweight, fast model that runs locally without an API. It produces 384-dimensional embeddings and is well-suited for semantic similarity tasks.

---

**Q13. What is FAISS and why did you choose it?**

FAISS (Facebook AI Similarity Search) is a library for efficient similarity search over dense vectors. It's fast, runs on CPU, supports persistence to disk, and integrates directly with LangChain — ideal for local RAG applications.

---

**Q14. How is the FAISS index persisted?**

Using `store.save_local(INDEX_DIR)` which saves `index.faiss` (the vector index) and `index.pkl` (the docstore with metadata). On app restart, it loads the existing index instead of re-ingesting all PDFs.

---

**Q15. What happens when new PDFs are uploaded?**

New chunks are added to the existing FAISS store using `add_documents()`. The updated index is then saved back to disk, and the LangGraph agent is rebuilt with the new store to include the fresh data.

---

**Q16. What is the difference between FAISS and a traditional database?**

Traditional databases use exact match or keyword search. FAISS performs approximate nearest-neighbor (ANN) search in vector space — it finds semantically similar content even when exact keywords don't match.

---

### 🔷 Section 4: Hybrid Retrieval & Reranking

---

**Q17. What is hybrid retrieval and why use it?**

Hybrid retrieval combines vector search (FAISS — semantic similarity) with keyword search (BM25 — exact term matching). This covers both semantic meaning and keyword relevance, improving recall over either method alone.

---

**Q18. What is BM25?**

BM25 (Best Matching 25) is a probabilistic ranking algorithm used in information retrieval. It scores documents based on term frequency, inverse document frequency, and document length. It's the standard keyword-based ranking method.

---

**Q19. How are the vector and BM25 results combined?**

Using Reciprocal Rank Fusion (RRF). Each document gets a score of `1/(k + rank)` from both lists, and scores are summed. This gives a balanced ranking regardless of individual score scales.

---

**Q20. What is Reciprocal Rank Fusion (RRF)? Explain the formula.**

RRF combines ranked lists without needing score normalization. Formula: `RRF_score(d) = Σ 1/(k + rank_i(d))` where `k` is a constant (60 in our case) and `rank_i` is the document's position in list `i`. Higher combined scores = more relevant.

---

**Q21. Why use k=60 in RRF?**

k=60 is the standard default from the original RRF paper. It dampens the impact of high-ranked documents so that a document appearing moderately in both lists can outrank one that appears very high in only one list.

---

**Q22. What reranking methods does this project support?**

Three options — **BGE**: uses a cross-encoder neural model (`BAAI/bge-reranker-large`) for high-accuracy reranking. **BM25**: a fast keyword-based reranker applied locally on candidates. **None**: skip reranking, use raw hybrid results.

---

**Q23. What is a cross-encoder and how does it differ from a bi-encoder?**

A bi-encoder (like our embedding model) encodes query and document separately, then compares via cosine similarity — fast but less precise. A cross-encoder takes the query-document pair together as input, capturing deeper interactions — more accurate but slower.

---

**Q24. How does metadata filtering work during retrieval?**

After hybrid fusion produces top-10 results, the `apply_filters_docs()` function filters by `lease_no`, `page`, `page_min`, and `page_max` from user inputs. If filtering returns nothing, it falls back to unfiltered results with a system note.

---

### 🔷 Section 5: LangGraph Agent

---

**Q25. What is LangGraph and why did you use it?**

LangGraph is a framework for building stateful, graph-based agent workflows on top of LangChain. I used it to create a directed graph with a Router node that conditionally routes queries to either a QA node or a Summarize node — making the system modular and extensible.

---

**Q26. Explain the agent graph flow.**

`Entry → Router Node → (qa or summarize)`. The Router LLM classifies the query as "qa" or "summarize". QA node retrieves context from documents and generates an answer. Summarize node creates a running summary of the conversation. Both lead to END.

---

**Q27. What is `AgentState` in your code?**

It's the state dictionary passed through the LangGraph nodes. It carries `question`, `answer`, `route`, `history` (chat messages), `summary` (running summary), and `filters` (metadata filters). Each node reads from and writes to this state.

---

**Q28. How does the Router decide between QA and Summarize?**

A dedicated LLM call with the system prompt: *"Decide strictly 'qa' or 'summarize'. Return only one word."* If the output isn't one of the two, it defaults to "qa".

---

**Q29. What is a StateGraph?**

A StateGraph in LangGraph is a directed graph where each node is a function that takes state as input and returns updated state. Edges define the flow, including conditional edges for routing. It compiles into an executable graph.

---

### 🔷 Section 6: LLM & Prompt Engineering

---

**Q30. Which LLM are you using and why?**

Groq-hosted `llama-3.3-70b-versatile`. Groq provides free API access with extremely fast inference speeds (using LPU hardware). The 70B parameter model gives high-quality answers for lease document analysis.

---

**Q31. Why set temperature to 0?**

Temperature=0 makes the LLM deterministic — it always picks the highest-probability token. For factual Q&A on legal documents, we need consistent, precise answers, not creative/random outputs.

---

**Q32. What prompt engineering techniques did you use?**

Role-based system prompts (Router, QA, Summarizer), grounding instructions ("answer strictly using retrieved context"), fallback phrasing ("if insufficient, say…"), and structured input templates with summary + recent history + context + question.

---

**Q33. How do you prevent hallucination?**

Three ways: (1) The system prompt instructs the LLM to answer only from retrieved context. (2) Temperature is set to 0. (3) The prompt explicitly says to respond with "I need more details from the document" if context is insufficient.

---

### 🔷 Section 7: Conversation Memory & Session Management

---

**Q34. How does multi-session chat work?**

Each session has a unique UUID. Sessions are stored in `st.session_state.sessions` as a dictionary mapping session ID to a list of message dicts (`{role, content}`). Users can create, switch, and reset sessions.

---

**Q35. What is the running summary mechanism?**

To handle long conversations, a `memory_chain` periodically summarizes the full conversation into a concise running summary. This summary is passed to the QA prompt as context, allowing the LLM to maintain awareness without exceeding token limits.

---

**Q36. How does conversation compression work?**

When messages exceed `MAX_TURNS` (40), the `compress_history_if_needed()` function invokes the memory chain to update the running summary, then keeps only the last `KEEP_RECENT` (8) messages. This prevents token overflow while preserving context.

---

**Q37. Why keep the last 8 messages instead of just the summary?**

The summary captures long-term context but loses conversational nuance. Keeping recent messages preserves the immediate conversation flow — follow-up questions, clarifications, and recent references remain available verbatim.

---

### 🔷 Section 8: Streamlit UI

---

**Q38. Why did you choose Streamlit for the frontend?**

Streamlit is Python-native, requires no frontend knowledge, supports chat UI components (`st.chat_message`), file uploaders, session state, and deploys easily. It's ideal for rapid prototyping of data/AI apps.

---

**Q39. What is `st.session_state` and why is it critical here?**

`st.session_state` is Streamlit's mechanism for persisting data across re-runs (since Streamlit re-executes the script on every interaction). We store the LLM, embeddings, FAISS store, sessions, and agent graph in session state to avoid re-initialization.

---

**Q40. How does the file upload flow work in the UI?**

User uploads PDFs → files are saved to `docs/` folder → if "auto-ingest" is checked, files are immediately chunked and added to the FAISS store → the store is persisted → the agent is rebuilt with the updated store.

---

### 🔷 Section 9: Related Conceptual Questions

---

**Q41. What is RAG (Retrieval-Augmented Generation)?**

RAG is a technique where an LLM's response is augmented with external knowledge retrieved from a document store. Instead of relying solely on training data, the model receives relevant context at query time, reducing hallucination and enabling domain-specific answers.

---

**Q42. What is the difference between RAG and fine-tuning?**

Fine-tuning modifies the model's weights with new data — it's expensive and the model can still hallucinate. RAG retrieves relevant documents at inference time — it's cheaper, keeps the model unchanged, and answers are traceable to source documents.

---

**Q43. What are vector embeddings?**

Embeddings are dense numerical representations (vectors) of text in a high-dimensional space. Semantically similar texts have vectors close together. They enable semantic search — finding relevant content based on meaning, not just keywords.

---

**Q44. What is cosine similarity?**

It measures the angle between two vectors. `cos(θ) = (A·B) / (|A|×|B|)`. Value ranges from -1 to 1. In embeddings, higher cosine similarity = more semantically similar. FAISS uses this (or L2 distance) for nearest-neighbor search.

---

**Q45. What is LangChain?**

LangChain is a Python framework for building applications with LLMs. It provides abstractions for document loading, text splitting, embeddings, vector stores, chains (prompt → LLM → parser), and agents. It standardizes the entire RAG pipeline.

---

**Q46. What is the difference between LangChain and LangGraph?**

LangChain provides building blocks (chains, prompts, retrievers). LangGraph adds stateful, graph-based orchestration — you define nodes and edges to build complex multi-step agent workflows with conditional routing, loops, and shared state.

---

**Q47. What is an ANN (Approximate Nearest Neighbor) search?**

Instead of comparing a query vector against every stored vector (O(n)), ANN algorithms use indexing structures to find "close enough" neighbors much faster. FAISS implements several ANN algorithms like IVF, HNSW, and flat search.

---

**Q48. Explain the difference between L2 distance and cosine similarity.**

L2 (Euclidean) distance measures the straight-line distance between two points — sensitive to vector magnitude. Cosine similarity measures the angle between vectors — insensitive to magnitude. For normalized embeddings, they produce equivalent rankings.

---

**Q49. What are the limitations of this project?**

(1) No authentication/multi-user support. (2) FAISS is in-memory — doesn't scale to millions of documents. (3) Session state is lost on Streamlit restart. (4) No OCR — scanned PDFs with images won't work. (5) Groq free tier has rate limits.

---

**Q50. How would you improve this project?**

(1) Add a persistent database (PostgreSQL + pgvector) instead of FAISS. (2) Add user authentication. (3) Use OCR (Tesseract) for scanned PDFs. (4) Add streaming responses. (5) Deploy on Streamlit Cloud or Docker. (6) Add evaluation metrics (RAGAS) for answer quality.

---

### 🔷 Section 10: Deployment & Production Questions

---

**Q51. How would you deploy this application?**

Containerize with Docker, push to a cloud service like AWS ECS, GCP Cloud Run, or Streamlit Community Cloud. For the vector store, migrate from FAISS to a managed vector DB like Pinecone or Weaviate. Use environment variables for secrets.

---

**Q52. How do you handle API key security?**

API keys are stored in a `.env` file loaded via `python-dotenv`. The `.env` file is excluded from version control via `.gitignore`. In production, keys would be stored in a secrets manager (AWS Secrets Manager, GCP Secret Manager).

---

**Q53. What happens if the Groq API goes down?**

The current implementation doesn't have a fallback — it would throw an exception. In production, I'd add retry logic with exponential backoff and optionally a fallback LLM provider (e.g., OpenAI or a local Ollama model).

---

**Q54. How would you add evaluation/testing to this RAG pipeline?**

Use the RAGAS framework to evaluate metrics like Faithfulness (does the answer match the context?), Answer Relevancy, and Context Precision. I'd also create a golden dataset of questions with known answers to benchmark retrieval accuracy.

---

### 🔷 Section 11: Python & Code-Level Questions

---

**Q55. Why do you use `Optional[FAISS]` type hints?**

Because the FAISS store can be `None` (e.g., before any PDFs are ingested). `Optional[FAISS]` explicitly communicates to developers and type checkers that the variable might be `None` and should be handled accordingly.

---

**Q56. What is `allow_dangerous_deserialization=True` in FAISS load?**

FAISS's `load_local()` uses Python pickle to deserialize stored data. Pickle can execute arbitrary code, so LangChain added a safety flag. We set it to `True` because we trust our own stored index — in production with untrusted data, this would be a security risk.

---

**Q57. Why does `AgentState` extend `dict`?**

LangGraph requires the state to be a dict-like object so nodes can read/write keys. By extending `dict`, we get dictionary behavior while also having type-annotated attributes for IDE support and code readability.

---

**Q58. What design pattern does `make_retrieval_fn()` use?**

It uses the **closure pattern** — the outer function initializes resources (BM25 index, BGE model) once, and returns an inner function `get_context()` that captures these resources via closure. This avoids re-initializing expensive resources on every query.

---

**Q59. How does error handling work in this project?**

It uses try-except in several places: FAISS load (falls back to None), BM25 import (graceful degradation if unavailable), BGE cross-encoder init (falls back to None), and running summary generation (keeps previous summary on failure).

---

### 🔷 Section 12: Scenario-Based Questions

---

**Q60. A user asks about "Lease 10" but it doesn't exist. What happens?**

The metadata filter searches for `lease_no=10`, finds no matching chunks, sets a system note: "Requested lease not found — responding based on overall best matches," and falls back to the top results from the unfiltered hybrid retrieval.

---

**Q61. The FAISS index is corrupted. What happens on startup?**

The `load_store()` function wraps the load in a try-except and returns `None` on failure. The app then auto-ingests all PDFs from the `docs/` folder to rebuild the index from scratch and saves it fresh.

---

**Q62. A user uploads a duplicate PDF. What happens?**

If "Allow overwrite" is unchecked (default), the file is skipped and not re-saved. If checked, it overwrites the file and re-ingests — but this creates duplicate chunks in FAISS since there's no deduplication. This is a known limitation.

---

**Q63. How would you handle a PDF with 500 pages?**

The current pipeline would work — PyPDF loads all pages, chunks them, and stores them in FAISS. However, ingestion time and index size would increase. For optimization, I'd add async ingestion with a progress bar and consider batch embedding.

---

**Q64. A user asks "summarize everything" across all lease files. How does the system handle it?**

The Router classifies it as "summarize". The Summarize node generates a running summary from the conversation history — but it doesn't retrieve from all documents. To truly summarize all leases, this would need enhancement (e.g., map-reduce summarization over the full corpus).

---

### 🔷 Section 13: System Design & Architecture Questions

---

**Q65. Why is the project split into `ingestion.py` and `retrieve_ag.py`?**

Separation of concerns. `ingestion.py` handles data preparation (loading, chunking, indexing) — it doesn't know about the LLM. `retrieve_ag.py` handles query-time logic (retrieval, routing, answering) — it doesn't know about PDF parsing. This makes each module independently testable and maintainable.

---

**Q66. Why build a graph-based agent instead of a simple chain?**

A graph allows conditional routing (QA vs. Summarize), making the system extensible. Adding new capabilities (e.g., a comparison node, a clause-extraction node) is just adding a new node and edge — no rewriting of existing logic.

---

**Q67. How would you scale this to 10,000+ documents?**

Replace FAISS with a managed vector database (Pinecone/Weaviate/Qdrant), add async ingestion with a task queue (Celery), implement chunked batch embedding, add caching for frequent queries, and use a more powerful server with GPU for embedding generation.

---

**Q68. How would you add multi-user support?**

Add authentication (e.g., Streamlit Authenticator or OAuth), store sessions in a database (Redis/PostgreSQL) instead of `st.session_state`, scope the FAISS index per user or per organization, and add rate limiting per API key.

---

---

> **Tip**: During the interview, speak confidently about the RAG pipeline flow (Ingest → Chunk → Embed → Store → Retrieve → Rerank → Generate). Most follow-up questions will test your understanding of *why* each step exists and *what happens when it fails*.

---

### 🔷 Section 14: Deeper NLP & ML Theory

---

**Q69. What is the Transformer architecture and why is it important for this project?**

Transformers use self-attention to process all tokens in parallel (not sequentially like RNNs). Both our LLM (Llama 3.3) and embedding model (MiniLM) are transformer-based. Self-attention allows them to capture long-range dependencies in lease documents.

---

**Q70. What is tokenization and which tokenizer does Llama 3.3 use?**

Tokenization splits text into sub-word units the model can process. Llama 3.3 uses a BPE (Byte Pair Encoding) tokenizer with ~128K vocabulary. It breaks words into frequent sub-word pieces — e.g., "royalty" might stay as one token while "subleasing" becomes ["sub", "leas", "ing"].

---

**Q71. What is the attention mechanism in simple terms?**

Attention lets the model weigh the importance of each word relative to every other word in the input. For example, when answering "What is the royalty clause?", the model pays more attention to tokens near "royalty" and "clause" in the retrieved context.

---

**Q72. What is the difference between dense retrieval and sparse retrieval?**

Dense retrieval uses learned vector embeddings (like FAISS) — captures semantic meaning. Sparse retrieval uses term-frequency features (like BM25/TF-IDF) — captures exact keyword matches. Our project uses both (hybrid) for better coverage.

---

**Q73. What is TF-IDF and how does BM25 improve on it?**

TF-IDF scores terms by frequency in the document (TF) weighted by rarity across all documents (IDF). BM25 adds saturation (diminishing returns for term frequency) and document length normalization — making it more robust for variable-length documents.

---

**Q74. What is StrOutputParser and why do you use it?**

`StrOutputParser` is a LangChain output parser that extracts the raw string from the LLM response. Without it, we'd get a full `AIMessage` object instead of just the text content. It simplifies the chain output to a plain string.

---

**Q75. What is ChatPromptTemplate and how is it different from PromptTemplate?**

`PromptTemplate` creates a single string prompt. `ChatPromptTemplate` creates a list of messages with roles (system, human, assistant) — essential for chat-based LLMs like Llama 3.3 that expect structured message input, not raw text.

---

**Q76. What is the context window of Llama 3.3 70B and how does it affect your design?**

Llama 3.3 70B has a 128K token context window. This is large but not unlimited — with 5 retrieved chunks (each ~1200 chars ≈ 300 tokens), plus history and summary, we stay well within limits. The conversation compression mechanism is a safety net.

---

---

### 🔷 Section 15: Tool & Technology Comparison Questions

---

**Q77. FAISS vs Pinecone vs ChromaDB — when would you use each?**

**FAISS**: Local, no infra needed, great for prototypes and moderate scale. **Pinecone**: Managed cloud service, auto-scales, best for production. **ChromaDB**: Lightweight, Python-native, good for small projects. I chose FAISS because this is a local, free application with no cloud dependency.

---

**Q78. LangChain vs LlamaIndex — why LangChain?**

LlamaIndex is data-index focused — great for pure Q&A over documents. LangChain is more general — supports agents, chains, memory, and graph workflows via LangGraph. I needed routing (QA vs Summarize) and session management, which LangChain handles better.

---

**Q79. Groq vs OpenAI vs Ollama — why Groq?**

**OpenAI**: Best quality but paid. **Ollama**: Runs locally but needs powerful hardware for 70B models. **Groq**: Free API with blazing-fast inference via custom LPU hardware, supports large models like Llama 3.3 70B. It's the best free option.

---

**Q80. PyPDF vs PDFPlumber vs Unstructured — why PyPDF?**

**PyPDF**: Lightweight, fast, handles standard text PDFs well. **PDFPlumber**: Better with tables and complex layouts. **Unstructured**: Best for mixed-format docs (table/image/text). For our text-heavy lease PDFs, PyPDF is sufficient and has no heavy dependencies.

---

**Q81. Streamlit vs Gradio vs Flask — why Streamlit?**

**Flask**: Requires HTML/JS frontend work. **Gradio**: Great for ML demos but limited layout customization. **Streamlit**: Chat UI components, file uploaders, session state, sidebar — all built-in and Python-only. Perfect for this data-centric AI app.

---

**Q82. all-MiniLM-L6-v2 vs text-embedding-ada-002 vs BGE — which is best?**

**ada-002** (OpenAI): Highest quality but paid API. **BGE** (BAAI): Best open-source for many benchmarks but heavier. **MiniLM**: Lightweight (80MB), fast, free, runs on CPU — best balance for a local application. For production, I'd consider OpenAI or BGE-large.

---

---

### 🔷 Section 16: Tricky & Edge-Case Questions

---

**Q83. What happens if two PDFs have the same filename?**

The second upload will be skipped (if "allow overwrite" is off) or will replace the first file on disk (if on). However, FAISS doesn't delete old chunks — so the old and new chunks would coexist, causing inconsistent results. Solution: implement chunk deduplication or FAISS index rebuild.

---

**Q84. Can the system handle non-English lease documents?**

Partially. `all-MiniLM-L6-v2` supports multilingual text to some degree, and Llama 3.3 handles multiple languages. However, BM25 tokenization is English-optimized. For full non-English support, I'd swap to a multilingual embedding model like `paraphrase-multilingual-MiniLM-L12-v2`.

---

**Q85. What if a user sends an empty message?**

The system would still invoke the agent with an empty string query. The Router would likely classify it as "qa", retrieval would return random chunks, and the LLM would generate a vague answer. Fix: add input validation to block empty messages.

---

**Q86. What happens when two users access the app simultaneously?**

Each user gets a separate Streamlit session with their own `st.session_state`, so their chat histories are isolated. However, the FAISS index is shared — if one user uploads a PDF, it becomes available to all users immediately.

---

**Q87. Could the LLM leak data from one lease into another's answer?**

Yes, if metadata filtering isn't applied. The retriever might pull chunks from Lease 3 when the user asks about Lease 5, especially if the content is semantically similar. That's why metadata filtering by `lease_no` exists — but only when the user explicitly sets it.

---

**Q88. What is the cold-start latency and how would you reduce it?**

On first launch, the app loads HuggingFace embeddings (~5–10s), builds BM25 index over the corpus, and optionally loads the BGE reranker (~15s). To reduce this: pre-download models, cache them locally, and lazy-load the reranker only when first queried.

---

---

### 🔷 Section 17: Behavioral / HR-Style Questions (Project-Related)

---

**Q89. What was the most challenging part of building this project?**

Designing the hybrid retrieval pipeline. Balancing FAISS (semantic) with BM25 (keyword) and choosing the RRF fusion parameters required experimentation. Also, ensuring metadata filtering gracefully falls back instead of returning empty results was a key design decision.

---

**Q90. Did you face any bugs during development? How did you solve them?**

Yes — the BM25 retriever was returning duplicate documents because RRF fusion was comparing by object identity (`id(d)`) instead of content hash. Documents from FAISS and BM25 were different Python objects even with the same content. I solved this by using RRF as a rank-based fusion rather than trying to deduplicate by reference.

---

**Q91. Why did you choose to build this project?**

Oil & gas lease documents are complex legal texts that professionals spend hours reading. I wanted to apply RAG to a real-world domain problem and learn the full pipeline — from PDF ingestion to hybrid retrieval to LLM-powered Q&A — using entirely free tools.

---

**Q92. If you had more time, what feature would you add first?**

Streaming responses. Currently, the user waits for the full answer. With Streamlit's `st.write_stream()` and Groq's streaming API, I could show tokens as they're generated, drastically improving perceived response time.

---

**Q93. How did you test this project?**

I tested by uploading different lease PDFs and asking specific questions about clauses, page numbers, and lease comparisons. I verified that metadata filters correctly narrow results and that conversation compression doesn't lose important context after 40+ turns.

---

---

### 🔷 Section 18: Advanced Architecture & Design Questions

---

**Q94. How does the `|` (pipe) operator work in LangChain chains?**

LangChain implements the `__or__` operator on Runnables. `prompt | llm | parser` creates a `RunnableSequence` — the output of each step feeds as input to the next. It's syntactic sugar for `.pipe()`, making chains readable and composable.

---

**Q95. What is the difference between a chain and an agent?**

A **chain** is a fixed pipeline — steps execute in a predefined order. An **agent** can make decisions at runtime — it uses an LLM to decide which tool/node to call next. Our Router is a simple agent that decides between QA and Summarize at runtime.

---

**Q96. How does FAISS similarity_search_with_score work internally?**

It computes the L2 distance (or inner product) between the query embedding and all indexed vectors using optimized BLAS operations. Results are sorted by distance. Lower L2 distance = more similar. It returns `(Document, score)` tuples.

---

**Q97. What is `graph.compile()` in LangGraph?**

`compile()` takes the raw StateGraph definition (nodes, edges, conditional edges) and produces an executable `CompiledGraph`. This compiled graph validates the graph structure, resolves the execution order, and provides the `.invoke()` method used at runtime.

---

**Q98. How would you add a "cite sources" feature?**

The retrieved documents already carry metadata (file_name, page, lease_no). I'd modify the QA prompt to instruct the LLM to format citations inline, and I'd also return the raw `docs` list alongside the answer so the UI can display clickable source references.

---

---

### 🔷 Section 19: Rapid-Fire Round (One-Line Answers)

---

**Q99. What does RAG stand for?**
Retrieval-Augmented Generation.

**Q100. What library parses the PDFs?**
PyPDF (via LangChain's `PyPDFLoader`).

**Q101. What does FAISS stand for?**
Facebook AI Similarity Search.

**Q102. What embedding dimension does MiniLM produce?**
384 dimensions.

**Q103. What is the default chunk size?**
1200 characters.

**Q104. What is the default chunk overlap?**
150 characters.

**Q105. How many reranking methods are supported?**
Three — BGE, BM25, and None.

**Q106. What framework manages the agent workflow?**
LangGraph (built on LangChain).

**Q107. What is the default rerank method?**
BM25.

**Q108. How is the LLM hosted?**
Via Groq's free cloud API (LPU inference).

**Q109. What triggers conversation compression?**
When message count exceeds `MAX_TURNS` (40).

**Q110. How many messages are kept after compression?**
The last 8 (`KEEP_RECENT`).

---

---

> **Final Interview Tip**: Always connect your answers back to the project. Don't just explain what BM25 is — say *"In my project, I used BM25 as the keyword-based component of hybrid retrieval alongside FAISS vector search, and combined them using Reciprocal Rank Fusion."* This shows you understand the concept **and** can apply it.
