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


# Global variables initialized on demand
embeddings = init_embeddings()
store = load_store(embeddings)
llm = init_llm()

class ChatRequest(BaseModel):
    message: str
    filters: Optional[Dict] = None
    history: Optional[List[Dict[str, str]]] = None

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    if store is None:
        raise HTTPException(status_code=500, detail="FAISS vector store is not initialized.")

    # 1. Fetch retrieval function
    # Reranking defaults to what's defined in .env
    rerank_method = os.getenv("RERANK_METHOD", "bm25")
    get_context = make_retrieval_fn(store, rerank_method=rerank_method)

    # 2. Retrieve document chunks with filters
    filters_dict = {
        "lease_no": req.filters.get("leaseNo") if req.filters and req.filters.get("leaseNo") else None,
        "page": req.filters.get("page") if req.filters and req.filters.get("page") else None,
        "page_min": req.filters.get("pageMin") if req.filters and req.filters.get("pageMin") else None,
        "page_max": req.filters.get("pageMax") if req.filters and req.filters.get("pageMax") else None,
    }

    # Remove None values
    filters_dict = {k: v for k, v in filters_dict.items() if v is not None}
    if not filters_dict:
        filters_dict = None

    context, docs, note = get_context(req.message, filters_dict)

    # 3. Formulate history prompt
    recent_history = ""
    if req.history:
        recent_history = "\n".join([f"{h['role']}: {h['content']}" for h in req.history[-6:]])

    # 4. Prepare stream generator
    async def event_generator():
        # System instructions
        system_note_str = note if note else "No special filtering errors."
        
        # Prepare prompts
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_QA),
            ("human", 
             "SYSTEM NOTE:\n{system_note}\n\n"
             "Recent conversation:\n{recent_history}\n\n"
             "Retrieved lease context:\n{context}\n\n"
             "User question:\n{question}")
        ])
        
        # Call OpenRouter streaming
        messages = prompt_template.format_messages(
            system_note=system_note_str,
            recent_history=recent_history or "(no prior history)",
            context=context or "(no matching lease chunks found)",
            question=req.message
        )
        
        # Stream from DeepSeek model
        answer_text = ""
        try:
            # We wrap the generator to yield items
            for chunk in llm.stream(messages):
                token = chunk.content
                answer_text += token
                yield f"data: {json.dumps({'token': token})}\n\n"
                await asyncio.sleep(0.01) # Yield to event loop
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
            summary_text = summary_res.content.strip()
        except Exception:
            summary_text = "Analysis completed for referenced terms."

        # Convert documents references list
        citations_list = []
        for d in docs:
            m = d.metadata or {}
            citations_list.append({
                "doc": m.get("file_name", "Lease Document"),
                "page": m.get("page", 1),
                "text": d.page_content,
                "score": 0.95
              })

        # Yield metadata packet containing final values
        final_meta = {
            "summary": summary_text,
            "citations": citations_list
        }
        yield f"data: {json.dumps({'done': True, 'metadata': final_meta})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
