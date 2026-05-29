import os
from typing import List, Optional, Tuple
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

# Embeddings (free, runs locally)
def init_embeddings() -> HuggingFaceEmbeddings:
    model_name = os.environ.get("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    return HuggingFaceEmbeddings(model_name=model_name)

def extract_lease_no(file_name: str) -> Optional[int]:
    """
    Parse lease number from filename.
    Examples:
      'Lease 6.pdf' -> 6
      'Lease_102.pdf' -> 102
      'Lease-007.pdf' -> 7
      'Gas Lease.pdf' -> None
    """
    base = os.path.splitext(file_name)[0].strip()
    parts = base.split()
    if parts and parts[-1].isdigit():
        return int(parts[-1])
    digits = ''.join(ch for ch in base if ch.isdigit())
    return int(digits) if digits.isdigit() else None

# Load PDFs -> Documents
def load_pdf_docs(folder: str) -> List[Document]:
    docs: List[Document] = []
    if not os.path.isdir(folder):
        return docs
    for file in os.listdir(folder):
        if file.lower().endswith(".pdf"):
            loader = PyPDFLoader(os.path.join(folder, file))
            file_docs = loader.load()
            lease_no = extract_lease_no(file)
            for d in file_docs:
                src_path = os.path.join(folder, file)
                meta = d.metadata or {}
                meta.update({
                    "source_path": src_path,
                    "file_name": file,
                    "page": meta.get("page", meta.get("page_number", None)),
                    "lease_no": lease_no,
                })
                docs.append(Document(page_content=d.page_content, metadata=meta))
    return docs

def load_pdfs_from_filepaths(file_paths: List[str]) -> List[Document]:
    docs: List[Document] = []
    for path in file_paths:
        if not (path and os.path.isfile(path) and path.lower().endswith('.pdf')):
            continue
        file = os.path.basename(path)
        loader = PyPDFLoader(path)
        file_docs = loader.load()
        lease_no = extract_lease_no(file)
        for d in file_docs:
            meta = d.metadata or {}
            meta.update({
                "source_path": path,
                "file_name": file,
                "page": meta.get("page", meta.get("page_number", None)),
                "lease_no": lease_no,
            })
            docs.append(Document(page_content=d.page_content, metadata=meta))
    return docs

# Chunking
def chunk_docs(docs: List[Document], chunk_size: int = 1200, chunk_overlap: int = 150) -> List[Document]:
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    chunks = splitter.split_documents(docs)
    for c in chunks:
        m = c.metadata or {}
        c.metadata = {
            "source_path": m.get("source_path"),
            "file_name": m.get("file_name"),
            "page": m.get("page"),
            "lease_no": m.get("lease_no"),
        }
    return chunks

# FAISS helpers
def create_store(chunks: List[Document], embeddings: HuggingFaceEmbeddings) -> FAISS:
    return FAISS.from_documents(chunks, embeddings)

def add_to_store(store: FAISS, chunks: List[Document]) -> None:
    store.add_documents(chunks)

# Ingestion APIs
def ingest_folder(folder: str, chunk_size: int, chunk_overlap: int, store: Optional[FAISS]) -> Tuple[Optional[FAISS], int]:
    """Load PDFs from folder -> chunk -> (create or add to) FAISS store."""
    docs = load_pdf_docs(folder)
    if not docs:
        return store, 0
    chunks = chunk_docs(docs, chunk_size, chunk_overlap)
    if store is None:
        embeddings = init_embeddings()
        store = create_store(chunks, embeddings)
    else:
        add_to_store(store, chunks)
    return store, len(chunks)

def ingest_files(file_paths: List[str], chunk_size: int, chunk_overlap: int, store: Optional[FAISS]) -> Tuple[Optional[FAISS], int]:
    """Load specific PDF file paths -> chunk -> (create or add to) FAISS store."""
    docs = load_pdfs_from_filepaths(file_paths)
    if not docs:
        return store, 0
    chunks = chunk_docs(docs, chunk_size, chunk_overlap)
    if store is None:
        embeddings = init_embeddings()
        store = create_store(chunks, embeddings)
    else:
        add_to_store(store, chunks)
    return store, len(chunks)
