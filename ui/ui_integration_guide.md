# 🛢️ Lease Assistant UI — Integration & Customization Guide

This directory contains a complete, premium, responsive UI design package for the **Lease Assistant** Oil & Gas RAG chatbot. The interface uses a clean, industrial slate-and-teal theme tailored for the legal and energy sectors.

## 📁 UI File Structure

All UI assets are saved under the `ui/` directory:
- [ui/index.html](file:///c:/Users/Realme/Desktop/Website/Stremlit_Project/ui/index.html): The complete HTML5 structure, featuring responsive grids, SVG icons, collapsible summary widgets, dynamic citation controls, and a metadata filter panel.
- [ui/style.css](file:///c:/Users/Realme/Desktop/Website/Stremlit_Project/ui/style.css): Custom CSS properties for light/dark themes, transitions, keyframe animations, chat bubbles, custom scrollbars, and active slide-out reference panels.
- [ui/app.js](file:///c:/Users/Realme/Desktop/Website/Stremlit_Project/ui/app.js): Interactive logic simulating RAG generation cycles, loading indicators, toggle states, filter math, and side-panel content injections.

---

## 🔌 Integration Options

You can implement this premium UI with your Python backend in one of two ways:

### Option A: Connect Custom HTML UI to Python Backend (Recommended)
You can expose your LangGraph RAG agent via a simple **FastAPI** web server, allowing this static HTML dashboard to query it in real-time.

1. **Create a FastAPI Server** (`api.py`):
   ```python
   from fastapi import FastAPI, HTTPException
   from fastapi.middleware.cors import CORSMiddleware
   from pydantic import BaseModel
   from typing import Dict, Optional, List
   import streamlit as st
   
   # Import your existing agent logic
   from agent.retrieve_ag import build_agent, init_llm
   from agent.ingestion import init_embeddings
   from streamlit_app import load_store
   
   app = FastAPI()
   
   # Enable CORS for the static frontend
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"], # In production, lock this down to your frontend domain
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   
   # Load store & compile graph
   embeddings = init_embeddings()
   store = load_store(embeddings)
   llm = init_llm()
   agent = build_agent(store, llm)
   
   class QueryRequest(BaseModel):
       question: str
       filters: Optional[Dict] = None
       history: Optional[List[Dict[str, str]]] = None
       summary: Optional[str] = ""
   
   @app.post("/query")
   def query_agent(req: QueryRequest):
       if not agent:
           raise HTTPException(status_code=500, detail="FAISS vector index not initialized.")
       
       state = {
           "question": req.question,
           "filters": req.filters or {},
           "history": req.history or [],
           "summary": req.summary or ""
       }
       result = agent.invoke(state)
       return {
           "answer": result.get("answer", ""),
           "summary": result.get("summary", ""),
           # Ensure retrieve_ag.py returns the raw retrieved document chunks inside the state
           "citations": [{"doc": d.metadata.get("file_name"), "page": d.metadata.get("page"), "text": d.page_content, "score": 0.95} for d in result.get("documents", [])]
       }
   ```

2. **Update `ui/app.js` to Fetch API**:
   Modify the form submit event handler inside [app.js](file:///c:/Users/Realme/Desktop/Website/Stremlit_Project/ui/app.js) to query your server:
   ```javascript
   // Replace simulated timeout inside submit event listener:
   fetch("http://localhost:8000/query", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       question: text,
       filters: {
         lease_no: document.getElementById("filter-lease").value ? parseInt(document.getElementById("filter-lease").value) : null,
         page: document.getElementById("filter-page").value ? parseInt(document.getElementById("filter-page").value) : null,
         page_min: document.getElementById("filter-page-min").value ? parseInt(document.getElementById("filter-page-min").value) : null,
         page_max: document.getElementById("filter-page-max").value ? parseInt(document.getElementById("filter-page-max").value) : null
       },
       history: [], // Pass chat state if desired
       summary: ""
     })
   })
   .then(res => res.json())
   .then(response => {
     removeLoadingBubble(loadingId);
     renderMessage("assistant", response.answer, response.summary, response.citations);
     scrollToBottom();
   })
   .catch(err => {
     removeLoadingBubble(loadingId);
     renderMessage("assistant", "Connection to backend failed. Please verify API server is active.");
   });
   ```

---

### Option B: Inject Custom CSS/Layout into Native Streamlit
If you prefer to keep the Streamlit Python framework, you can inject styles directly into `streamlit_app.py` to match the exact aesthetic styles.

Add the following to the top of your `streamlit_app.py` directly after `st.set_page_config`:

```python
st.markdown("""
<style>
/* App Background & Global Colors */
.stApp {
    background-color: #0b0f19;
    color: #f8fafc;
}

/* Sidebar Custom Styling */
section[data-testid="stSidebar"] {
    background-color: #030712;
    border-right: 1px solid #1e293b;
}

/* Chat Input Bar Styling */
[data-testid="stChatInput"] {
    background-color: #0b0f19;
    border: 1px solid #1e293b;
    border-radius: 8px;
}

/* Assistant Chat Bubble overrides */
div[data-testid="stChatMessage"] {
    border-radius: 12px;
    padding: 15px;
    border: 1px solid #1e293b;
}

div[data-testid="stChatMessage"][data-classname="stChatMessage-assistant"] {
    background-color: #0f1c24;
    border-color: #115e59;
}

div[data-testid="stChatMessage"][data-classname="stChatMessage-user"] {
    background-color: #1e293b;
}

/* Custom badges/citations */
.citation-tag {
    background-color: #115e59;
    color: #14b8a6;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    margin-right: 6px;
    display: inline-block;
    font-weight: 600;
}
</style>
""", unsafe_allow_html=True)
```

---

## 🎨 Design Specifications

### Palette (Dark Theme Default)
- **Primary Background**: `#030712` (Slate-950)
- **Card/Surface Background**: `#0b0f19` (Slate-900)
- **Accent Highlight**: `#14b8a6` (Teal-500)
- **Border Trim**: `#1e293b` (Slate-800)
- **Assistant bubble**: `#0f1c24` (Teal Tint/Deep Blue)

### Palette (Light Theme Override)
- **Primary Background**: `#f1f5f9` (Slate-100)
- **Card/Surface Background**: `#ffffff` (White)
- **Accent Highlight**: `#0f766e` (Teal-700)
- **Border Trim**: `#e2e8f0` (Slate-200)
- **Assistant bubble**: `#f0fdfa` (Emerald-50)
