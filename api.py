import os
import json
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Optional, List
from dotenv import load_dotenv

# Load variables
load_dotenv()

from agent.ingestion import init_embeddings
from agent.retrieve_ag import init_llm, load_store, make_retrieval_fn, SYSTEM_QA
from langchain_core.prompts import ChatPromptTemplate

app = FastAPI(title="Lease Assistant API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    )

# Global resources initialized safely
embeddings = init_embeddings()
store = load_store(embeddings)

def get_active_llm():
    try:
        return init_llm()
    except Exception as e:
        return None

class ChatRequest(BaseModel):
    message: str
    filters: Optional[Dict] = None
    history: Optional[List[Dict[str, str]]] = None

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    global store
    if store is None:
        store = load_store(embeddings)
    if store is None:
        raise HTTPException(status_code=500, detail="FAISS vector store is not initialized. Please ingest PDFs first.")

    llm = get_active_llm()
    if llm is None:
        raise HTTPException(
            status_code=500, 
            detail="Groq LLM is not initialized. Please ensure GROQ_API_KEY is configured in your environment or .env file."
        )

    # 1. Fetch retrieval function
    rerank_method = os.getenv("RERANK_METHOD", "bm25")
    get_context = make_retrieval_fn(store, rerank_method=rerank_method)

    # 2. Retrieve document chunks with filters (support camelCase & snake_case)
    f = req.filters or {}
    filters_dict = {
        "lease_no": f.get("leaseNo") if f.get("leaseNo") is not None else f.get("lease_no"),
        "page": f.get("page"),
        "page_min": f.get("pageMin") if f.get("pageMin") is not None else f.get("page_min"),
        "page_max": f.get("pageMax") if f.get("pageMax") is not None else f.get("page_max"),
    }
    filters_dict = {k: v for k, v in filters_dict.items() if v is not None}
    if not filters_dict:
        filters_dict = None

    context, docs, note = get_context(req.message, filters_dict)

    # 3. Formulate history prompt
    recent_history = ""
    if req.history:
        recent_history = "\n".join([f"{h.get('role', 'user')}: {h.get('content', '')}" for h in req.history[-6:]])

    # 4. Prepare stream generator
    async def event_generator():
        system_note_str = note if note else "None"
        
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_QA),
            ("human", 
             "SYSTEM NOTE:\n{system_note}\n\n"
             "Recent conversation:\n{recent_history}\n\n"
             "Retrieved lease context:\n{context}\n\n"
             "User question:\n{question}")
        ])
        
        messages = prompt_template.format_messages(
            system_note=system_note_str,
            recent_history=recent_history or "(no prior history)",
            context=context or "(no matching lease chunks found)",
            question=req.message
        )
        
        answer_text = ""
        try:
            for chunk in llm.stream(messages):
                token = chunk.content if hasattr(chunk, "content") else str(chunk)
                answer_text += token
                yield f"data: {json.dumps({'token': token})}\n\n"
                await asyncio.sleep(0.005)
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        # 5. Generate dynamic summary key takeaways
        summary_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are the Summarizer. Summarize the answer in one concise key takeaway bullet point (max 15 words)."),
            ("human", "Answer to summarize:\n{answer}")
        ])
        summary_chain = summary_prompt | llm
        
        try:
            summary_res = await summary_chain.ainvoke({"answer": answer_text})
            summary_text = summary_res.content.strip() if hasattr(summary_res, "content") else str(summary_res).strip()
        except Exception:
            summary_text = "Analysis completed for referenced lease terms."

        citations_list = []
        for d in docs:
            m = d.metadata or {}
            citations_list.append({
                "doc": m.get("file_name", "Lease Document"),
                "page": m.get("page", 1),
                "text": d.page_content,
                "score": 0.95
            })

        final_meta = {
            "summary": summary_text,
            "citations": citations_list
        }
        yield f"data: {json.dumps({'done': True, 'metadata': final_meta})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
