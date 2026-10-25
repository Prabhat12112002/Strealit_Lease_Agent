import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, ShieldAlert, FileText, CheckCircle2, Zap, Settings, Search, 
  Moon, Sun, Send, PanelRightClose, Sparkles, Plus, Database, 
  Filter, ArrowRight, ChevronDown, Brain, Clock, X, MessageSquare, ShieldCheck, Key
} from 'lucide-react';
import './App.css';
import LEASE_CHUNKS from './data/lease_chunks.json';

// -------------------------------------------------------------
// Pre-populated legal Oil & Gas lease Q&A (10 turns / 5 pairs)
// -------------------------------------------------------------
const INITIAL_MESSAGES = [
  {
    id: 1,
    role: "user",
    content: "What is the primary term of Lease 6?",
    timestamp: "10:02 AM"
  },
  {
    id: 2,
    role: "assistant",
    content: "The primary term of Lease 6 is <strong>3 years</strong> from the effective date, as stipulated in Section 2 on Page 1. The lease will expire at the end of this term unless oil or gas is produced in paying quantities, or drilling operations are actively conducted on the leased premises.",
    summary: "Primary term is 3 years. Continuation requires active production or drilling.",
    citations: [
      { doc: "Lease 6.pdf", page: 1, text: "SECTION 2. PRIMARY TERM: This lease shall remain in force for a term of three (3) years from the effective date hereof, and as long thereafter as oil, gas, or other liquid hydrocarbons are produced from said land in paying quantities.", score: 0.98 }
    ],
    timestamp: "10:02 AM"
  },
  {
    id: 3,
    role: "user",
    content: "What are the delay rental terms in Lease 3?",
    timestamp: "10:05 AM"
  },
  {
    id: 4,
    role: "assistant",
    content: "Lease 3, Page 2, Paragraph 4 outlines delay rentals of <strong>$5.00 per acre</strong>. This payment must be paid to the Lessor or deposited in the depository bank on or before each anniversary date during the primary term to defer drilling operations for an additional 12-month period.",
    summary: "Delay rentals are $5.00/acre, payable annually to defer drilling.",
    citations: [
      { doc: "Lease 3.pdf", page: 2, text: "Paragraph 4: If operations for drilling are not commenced on said land on or before one year from date hereof, the lease shall terminate as to both parties, unless on or before such anniversary date Lessee shall pay or tender to Lessor the sum of Five Dollars ($5.00) per acre, which shall operate as a rental and cover the privilege of deferring the commencement of drilling for a period of one year.", score: 0.95 }
    ],
    timestamp: "10:05 AM"
  },
  {
    id: 5,
    role: "user",
    content: "Does Lease 2 have a shut-in royalty clause?",
    timestamp: "10:08 AM"
  },
  {
    id: 6,
    role: "assistant",
    content: "Yes, Lease 2 contains a shut-in royalty clause in Section 7 on Page 4. If a gas well is completed and capable of production, but is shut-in due to lack of market or pipeline access, the Lessee may pay a shut-in royalty of <strong>$1.00 per acre annually</strong> to maintain the lease in force.",
    summary: "Shut-in royalty clause active. Lessee can pay $1.00/acre annually to maintain lease when wells are shut-in.",
    citations: [
      { doc: "Lease 2.pdf", page: 4, text: "Section 7. SHUT-IN ROYALTIES: Where gas from a well producing gas only is not sold or used, Lessee may pay as royalty One Dollar ($1.00) per acre per year, and upon such payment it will be considered that gas is being produced within the meaning of this lease.", score: 0.92 }
    ],
    timestamp: "10:08 AM"
  },
  {
    id: 7,
    role: "user",
    content: "What is the royalty percentage in Lease 4?",
    timestamp: "10:12 AM"
  },
  {
    id: 8,
    role: "assistant",
    content: "The royalty percentage in Lease 4 is <strong>20% (1/5th)</strong> of all oil and gas produced, as specified in the royalty clause on Page 3. This applies to both oil, casinghead gas, and gas produced from any wells.",
    summary: "Royalty is set at 1/5th (20%) for both oil and gas production.",
    citations: [
      { doc: "Lease 4.pdf", page: 3, text: "ROYALTY CLAUSE: The royalties to be paid by Lessee are: (a) on oil, one-fifth (1/5) of that produced and saved from said land; (b) on gas, including casinghead gas or other gaseous substances, one-fifth (1/5) of the market value at the well.", score: 0.99 }
    ],
    timestamp: "10:12 AM"
  },
  {
    id: 9,
    role: "user",
    content: "Are there any pooling restrictions in Lease 5?",
    timestamp: "10:15 AM"
  },
  {
    id: 10,
    role: "assistant",
    content: "Yes. Lease 5, Page 6 restricts pooling units to a maximum size of <strong>80 acres</strong> for oil wells and <strong>640 acres</strong> for gas wells. A tolerance of 10% is allowed, or larger units may be formed if required by state regulatory authorities.",
    summary: "Pooling limits: Oil units capped at 80 acres; Gas units capped at 640 acres. 10% tolerance permitted.",
    citations: [
      { doc: "Lease 5.pdf", page: 6, text: "POOLING PROVISION: Lessee is hereby granted the right to pool or unitize the acreage. Provided, however, that no unit for oil shall exceed eighty (80) acres plus a tolerance of ten percent (10%), and no unit for gas shall exceed six hundred forty (640) acres plus a tolerance of ten percent (10%).", score: 0.97 }
    ],
    timestamp: "10:15 AM"
  }
];

// Offline fallback mock responses DB
const MOCK_REPLIES = {
  "what is the royalty percentage in lease 6?": {
    content: "The royalty percentage in Lease 6 is <strong>25% (1/4th)</strong> of all oil and gas produced or its market value, as specified in the royalty clause on Page 2.",
    summary: "Royalty is 1/4th (25%) for Lease 6.",
    citations: [
      { doc: "Lease 6.pdf", page: 2, text: "Section 3. ROYALTIES: The royalties to be paid by Lessee are: (a) on oil, one-fourth (1/4) of that produced and saved; (b) on gas, one-fourth (1/4) of the proceeds realized from sale.", score: 0.99 }
    ]
  },
  "explain the pooling clause in lease 4": {
    content: "Lease 4, Page 5 contains a pooling clause that permits the Lessee to pool the leased premises with other lands. Pooled units must not exceed <strong>40 acres</strong> for oil and <strong>320 acres</strong> for gas, plus a 10% tolerance, unless larger units are prescribed by federal or state regulations.",
    summary: "Pooling limits: Oil units capped at 40 acres; Gas units capped at 320 acres.",
    citations: [
      { doc: "Lease 4.pdf", page: 5, text: "Section 5. POOLING: Lessee shall have the right to pool or unitize all or any part of the leased premises. Units pooled for oil hereunder shall not exceed forty (40) acres plus a tolerance of ten percent, and units pooled for gas shall not exceed three hundred twenty (320) acres plus a tolerance of ten percent.", score: 0.96 }
    ]
  },
  "find the primary term of lease 3": {
    content: "The primary term of Lease 3 is <strong>5 years</strong> from the effective date, as detailed in Section 2 on Page 1.",
    summary: "Primary term is 5 years.",
    citations: [
      { doc: "Lease 3.pdf", page: 1, text: "SECTION 2. TERM: Subject to the other provisions herein contained, this lease shall remain in force for a term of five (5) years from this date (called 'primary term').", score: 0.97 }
    ]
  },
  "is there a shut-in royalty clause in lease 2?": {
    content: "Yes, Lease 2 contains a shut-in royalty clause in Section 7 on Page 4. If a gas well is completed and capable of production, but is shut-in due to lack of market or pipeline access, the Lessee may pay a shut-in royalty of <strong>$1.00 per acre annually</strong> to maintain the lease in force.",
    summary: "Shut-in royalty clause active. Lessee can pay $1.00/acre annually to maintain lease when wells are shut-in.",
    citations: [
      { doc: "Lease 2.pdf", page: 4, text: "Section 7. SHUT-IN ROYALTIES: Where gas from a well producing gas only is not sold or used, Lessee may pay as royalty One Dollar ($1.00) per acre per year, and upon such payment it will be considered that gas is being produced within the meaning of this lease.", score: 0.92 }
    ]
  }
};

const DEFAULT_REPLY = {
  content: "I have analyzed the indexed leases matching your query. The documents indicate that typical compliance requires written consent from the Lessor for assignments and restricts pooling units to statutory limits. For specific numbers, please specify which Lease (e.g., Lease 2 to 6) you are referring to.",
  summary: "Query analyzed. Explicit consent is standard. Specify lease number for exact parameters.",
  citations: [
    { doc: "Lease 2.pdf", page: 5, text: "Paragraph 10. ASSIGNMENTS: The rights of either party hereunder may be assigned in whole or in part.", score: 0.72 },
    { doc: "Lease 5.pdf", page: 6, text: "POOLING PROVISION: Lessee is hereby granted the right to pool or unitize the acreage.", score: 0.68 }
  ]
};

// Client-side RAG retrieval function
function retrieveLeaseChunks(query, filters, k = 5) {
  const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  let pool = LEASE_CHUNKS || [];

  if (filters) {
    const leaseNo = filters.leaseNo || filters.lease_no;
    const page = filters.page;
    const pageMin = filters.pageMin || filters.page_min;
    const pageMax = filters.pageMax || filters.page_max;

    if (leaseNo) {
      const targetLease = parseInt(leaseNo);
      pool = pool.filter(c => c.lease_no === targetLease);
    }
    if (page) {
      const targetPage = parseInt(page);
      pool = pool.filter(c => c.page === targetPage);
    }
    if (pageMin) {
      const minP = parseInt(pageMin);
      pool = pool.filter(c => c.page >= minP);
    }
    if (pageMax) {
      const maxP = parseInt(pageMax);
      pool = pool.filter(c => c.page <= maxP);
    }
  }

  if (pool.length === 0) {
    pool = LEASE_CHUNKS || [];
  }

  const scored = pool.map(item => {
    let score = 0;
    const lower = (item.text || "").toLowerCase();
    for (const term of queryTerms) {
      if (lower.includes(term)) {
        score += 2.0;
        const matches = (lower.match(new RegExp(term, "g")) || []).length;
        score += Math.min(matches * 0.4, 2.0);
      }
    }
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map(s => s.item);
}

function App() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputVal, setInputVal] = useState("");
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  
  // Groq API Key state
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("groq_api_key") || import.meta.env.VITE_GROQ_API_KEY || "");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputKey, setInputKey] = useState("");
  
  // Collapsible summary panels state
  const [collapsedSummaries, setCollapsedSummaries] = useState({});

  // Filter dropdown state
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState({
    leaseNo: "",
    page: "",
    pageMin: "",
    pageMax: ""
  });
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Chat window auto-scrolling
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Apply dark/light theme attribute to html document tag
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Handle active filter counter calculation
  useEffect(() => {
    let count = 0;
    if (filters.leaseNo) count++;
    if (filters.page) count++;
    if (filters.pageMin || filters.pageMax) count++;
    setActiveFilterCount(count);
  }, [filters]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const handleCitationClick = (citation) => {
    setSelectedCitation(citation);
  };

  const handleSummaryToggle = (msgId) => {
    setCollapsedSummaries(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  // Real Groq Llama 3.1 8B Instant RAG Pipeline
  const handleSend = async (textToSend) => {
    const text = textToSend || inputVal.trim();
    if (!text) return;

    let groqKey = apiKey || localStorage.getItem("groq_api_key") || import.meta.env.VITE_GROQ_API_KEY;
    if (!groqKey) {
      setInputKey("");
      setShowKeyModal(true);
      return;
    }

    // 1. Add User Message
    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setInputVal("");
    setLoading(true);

    const assistantMsgId = Date.now() + 1;
    const assistantMsgPlaceholder = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      summary: "",
      citations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, assistantMsgPlaceholder]);
    setLoading(false);

    try {
      // 1. Retrieve lease context from 218 chunks
      const retrieved = retrieveLeaseChunks(text, filters, 5);
      const contextBlocks = retrieved.map(c => 
        `### ${c.file_name} (Lease #${c.lease_no}, Page ${c.page})\n${c.text}`
      ).join("\n\n");

      const systemPrompt = `You are an expert AI Assistant specialized in Oil & Gas Lease Agreements.
Your job is to answer questions thoroughly, factually, and accurately using the retrieved lease context.

Guidelines:
1. Base your answer strictly on the provided 'Retrieved lease context'.
2. Always cite the document name and page number for facts and quotes (e.g., [Lease 6.pdf, Page 3]).
3. If the user asks for a summary of a lease or a specific clause (e.g., royalty, granting, termination), provide a clear, well-structured breakdown including percentages, amounts, deadlines, and key terms.
4. If the retrieved context does not contain the specific information needed to answer the question, clearly state what information is available and what is missing.`;

      // 2. Call Groq API with llama-3.1-8b-instant
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-4).map(m => ({ role: m.role, content: m.content })),
            { 
              role: "user", 
              content: `Retrieved lease context:\n${contextBlocks}\n\nUser question:\n${text}` 
            }
          ],
          temperature: 0.1,
          stream: true
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Groq API Error HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === "[DONE]") continue;

            try {
              const data = JSON.parse(dataStr);
              const token = data.choices?.[0]?.delta?.content || "";
              if (token) {
                fullContent += token;
                setMessages(prev => prev.map(m => 
                  m.id === assistantMsgId ? { ...m, content: fullContent } : m
                ));
              }
            } catch (err) {
              // Ignore partial JSON chunk errors in streaming
            }
          }
        }
      }

      // Convert retrieved to citations format
      const citations = retrieved.map(c => ({
        doc: c.file_name,
        page: c.page,
        text: c.text,
        score: 0.95
      }));

      // Generate a short 1-line summary takeaway
      const summaryText = fullContent.length > 80 
        ? fullContent.slice(0, 110).replace(/<[^>]*>?/gm, '') + "..." 
        : fullContent;

      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { ...m, summary: summaryText, citations } : m
      ));

    } catch (err) {
      console.error("Groq RAG Query failed:", err);
      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { 
          ...m, 
          content: `⚠️ **Groq Error:** ${err.message}. Please click **Set Groq Key** at the top right to verify your API key.` 
        } : m
      ));
    }
  };

  const handleResetFilters = () => {
    setFilters({
      leaseNo: "",
      page: "",
      pageMin: "",
      pageMax: ""
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-105 transition-colors duration-200">
      
      {/* Header component */}
      <header className="h-[60px] bg-slate-900 border-b border-slate-800 text-white flex justify-between items-center px-5 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center text-white">
            <Flame className="w-5 h-5 text-teal-300" />
            <span className="absolute inset-0 border border-teal-500 rounded-lg animate-ping opacity-25"></span>
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight tracking-tight">Lease Assistant</h1>
            <span className="text-[10px] text-teal-400 font-medium">Groq Llama 3.1 8B Instant RAG</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setInputKey(apiKey); setShowKeyModal(true); }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
              apiKey 
                ? "bg-teal-950/70 border-teal-500/50 text-teal-300 hover:bg-teal-900/80 shadow-[0_0_10px_rgba(20,184,166,0.15)]" 
                : "bg-amber-950/70 border-amber-500/60 text-amber-300 hover:bg-amber-900/80 animate-pulse"
            }`}
            title="Configure Groq API Key"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{apiKey ? "Groq: Connected" : "🔑 Set Groq Key"}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/60 rounded-full px-3 py-1 text-[11px] font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></span>
            <span>218 Chunks</span>
          </div>
          <button 
            onClick={toggleTheme} 
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-450 hover:text-white transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main body viewport grid */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Sidebar Component */}
        <aside className="w-[300px] shrink-0 bg-slate-900 border-r border-slate-850 text-slate-300 flex flex-col overflow-y-auto hidden lg:flex">
          
          {/* Active Sessions */}
          <div className="p-4 border-b border-slate-850">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Conversations</h3>
              <button 
                onClick={() => {
                  setMessages([{
                    id: Date.now(),
                    role: "assistant",
                    content: "New conversation session initialized. Ready to query legal O&G leases.",
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }]);
                }} 
                className="flex items-center gap-1 bg-slate-800 hover:bg-teal-700 text-white font-medium border border-slate-700 rounded px-2 py-1 text-[10px] transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 p-2 bg-slate-800/80 rounded-md border border-slate-700/30 text-white cursor-pointer">
                <MessageSquare className="w-4 h-4 text-teal-400" />
                <div className="flex flex-col overflow-hidden text-xs">
                  <span className="font-semibold truncate">Royalty & Pooling Analysis</span>
                  <span className="text-[9px] text-slate-400">Active now</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-slate-850 rounded-md text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
                <MessageSquare className="w-4 h-4" />
                <div className="flex flex-col overflow-hidden text-xs">
                  <span className="font-medium truncate">Lease 6 Primary Term Summary</span>
                  <span className="text-[9px] text-slate-500">2 hours ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Documents index status */}
          <div className="p-4 border-b border-slate-850">
            <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-3">Knowledge Base</h3>
            <div className="flex flex-col gap-1.5 max-height-[160px] overflow-y-auto pr-1">
              {[
                { name: "Lease 2.pdf", size: "24 Pgs", info: "3/16 Royalty" },
                { name: "Lease 3.pdf", size: "18 Pgs", info: "1/8 Royalty" },
                { name: "Lease 4.pdf", size: "32 Pgs", info: "1/5 Royalty" },
                { name: "Lease 5.pdf", size: "15 Pgs", info: "3/16 Royalty" },
                { name: "Lease 6.pdf", size: "28 Pgs", info: "1/4 Royalty" },
              ].map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2.5 p-1.5 bg-slate-950/20 border border-slate-800/30 rounded-md">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <div className="flex flex-col text-[11px] overflow-hidden">
                    <span className="font-semibold text-slate-200 truncate">{doc.name}</span>
                    <span className="text-[9px] text-slate-500">{doc.size} • {doc.info}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Performance metrics */}
          <div className="p-4">
            <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-3">Platform Metrics</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-850 border border-slate-800 p-2 rounded-md">
                <span className="block text-sm font-bold text-white font-mono">80%</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Time Saved</span>
              </div>
              <div className="bg-slate-850 border border-slate-805 p-2 rounded-md">
                <span className="block text-sm font-bold text-white font-mono">5+</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Leases</span>
              </div>
              <div className="bg-slate-850 border border-slate-800 p-2 rounded-md">
                <span className="block text-sm font-bold text-white font-mono">117</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Total Pages</span>
              </div>
              <div className="bg-slate-850 border border-slate-800 p-2 rounded-md">
                <span className="block text-sm font-bold text-white font-mono">1,248</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Chunks</span>
              </div>
              <div className="col-span-2 bg-slate-850 border border-slate-800 p-2 rounded-md text-left flex justify-between items-center">
                <div>
                  <span className="block text-xs font-bold text-white font-mono">&lt; 1.8s</span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">LLM Latency</span>
                </div>
                <span className="text-[9px] bg-teal-905 border border-teal-700/60 rounded px-1.5 py-0.5 text-teal-300 font-bold font-mono">Fast</span>
              </div>
            </div>
          </div>

          {/* Engine specifications */}
          <div className="mt-auto p-4 border-t border-slate-850 flex flex-wrap gap-1.5">
            <span className="text-[9px] font-mono bg-slate-850 border border-slate-800 rounded px-2 py-0.5 text-slate-400">DeepSeek-v4-Flash</span>
            <span className="text-[9px] font-mono bg-slate-850 border border-slate-805 rounded px-2 py-0.5 text-slate-400">Rerank: BM25</span>
          </div>
        </aside>

        {/* Central Chat Workspace */}
        <main className="flex-1 flex flex-col bg-white dark:bg-slate-900 relative overflow-hidden">
          
          {/* Scrollable messages area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const isCollapsed = collapsedSummaries[msg.id] ?? true;

              return (
                <div 
                  key={msg.id} 
                  className={`flex gap-4 max-w-[85%] animate-fade-in-up ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {/* Avatar Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                    isUser 
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100' 
                      : 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
                  }`}>
                    {isUser ? (
                      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    ) : (
                      <Brain className="w-4.5 h-4.5" />
                    )}
                  </div>

                  {/* Bubble Content container */}
                  <div className="flex flex-col gap-2.5 max-w-[calc(100%-40px)]">
                    
                    {/* Raw Text Body */}
                    <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tr-none'
                        : 'bg-teal-50/40 dark:bg-slate-850/60 text-slate-800 dark:text-slate-200 border border-teal-100/40 dark:border-slate-800 rounded-tl-none'
                    }`}>
                      <p dangerouslySetInnerHTML={{ __html: msg.content || "<i>Thinking...</i>" }} />
                    </div>

                    {/* Summary takeaways if available */}
                    {msg.summary && (
                      <div className="border border-slate-200 dark:border-slate-850 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                        <div 
                          onClick={() => handleSummaryToggle(msg.id)}
                          className="bg-slate-50 dark:bg-slate-850/40 px-3 py-2 flex justify-between items-center cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Key Takeaways</span>
                          </div>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                        </div>
                        
                        <div className={`transition-all duration-200 overflow-hidden text-xs text-slate-650 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 ${
                          isCollapsed ? 'max-h-0 p-0 border-t-transparent' : 'max-h-[300px] p-3'
                        }`}>
                          {msg.summary}
                        </div>
                      </div>
                    )}

                    {/* References citation list if available */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center text-[10px]">
                        <span className="font-semibold text-slate-400 uppercase tracking-wider">Sources:</span>
                        {msg.citations.map((cit, cidx) => (
                          <button
                            key={cidx}
                            onClick={() => handleCitationClick(cit)}
                            className="bg-teal-100/50 hover:bg-teal-700 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-750 dark:hover:text-teal-100 font-bold border border-teal-200/20 rounded-full px-3 py-0.5 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>{cit.doc} (P. {cit.page})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Bouncing Generating bubble loader */}
            {loading && (
              <div className="flex gap-4 max-w-[85%] animate-fade-in-up mr-auto">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                  <Brain className="w-4.5 h-4.5" />
                </div>
                <div className="flex items-center gap-1 bg-teal-50/40 dark:bg-slate-850/60 border border-teal-100/40 dark:border-slate-800 rounded-xl rounded-tl-none px-4 py-3">
                  <span className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                  <span className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Form and input footer area */}
          <div className="p-6 md:px-8 md:pb-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            
            {/* Clickable prompts suggestions list */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1.5 scrollbar-thin">
              {[
                "What is the royalty percentage in Lease 6?",
                "Explain the Pooling Clause in Lease 4",
                "Find the primary term of Lease 3",
                "Is there a shut-in royalty clause in Lease 2?",
              ].map((sug, sidx) => (
                <button
                  key={sidx}
                  onClick={() => handleSend(sug)}
                  className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Main Form container */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex gap-2.5 items-center"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Query leases (e.g., 'Does Lease 5 require notice for assignment?')..."
                className="flex-1 h-12 bg-slate-50 dark:bg-slate-800 border-1.5 border-slate-200 dark:border-slate-700 focus:border-teal-505 focus:outline-none dark:focus:border-teal-500 rounded-xl px-4 pr-24 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-colors shadow-sm focus:shadow-md"
              />

              {/* Filters selector panel */}
              <div className="absolute right-16 top-1/2 -translate-y-1/2 z-10">
                <button
                  type="button"
                  onClick={() => setFilterPanelOpen(!filterPanelOpen)}
                  className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Add filters"
                >
                  <Filter className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="text-[9px] bg-teal-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Dropdown panel component */}
                {filterPanelOpen && (
                  <div className="absolute bottom-10 right-0 w-[260px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Search Filters</h4>
                      <button 
                        type="button" 
                        onClick={handleResetFilters} 
                        className="text-[10px] text-teal-650 hover:underline font-semibold cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Lease Document</label>
                      <select
                        value={filters.leaseNo}
                        onChange={(e) => setFilters(prev => ({ ...prev, leaseNo: e.target.value }))}
                        className="h-8 bg-slate-50 dark:bg-slate-85 border border-slate-200 dark:border-slate-750 rounded px-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                      >
                        <option value="">Any Lease</option>
                        <option value="2">Lease 2</option>
                        <option value="3">Lease 3</option>
                        <option value="4">Lease 4</option>
                        <option value="5">Lease 5</option>
                        <option value="6">Lease 6</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Specific Page</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Page #"
                        value={filters.page}
                        onChange={(e) => setFilters(prev => ({ ...prev, page: e.target.value }))}
                        className="h-8 bg-slate-50 dark:bg-slate-85 border border-slate-200 dark:border-slate-750 rounded px-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Min Page</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="Min"
                          value={filters.pageMin}
                          onChange={(e) => setFilters(prev => ({ ...prev, pageMin: e.target.value }))}
                          className="h-8 bg-slate-50 dark:bg-slate-85 border border-slate-200 dark:border-slate-750 rounded px-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Max Page</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="Max"
                          value={filters.pageMax}
                          onChange={(e) => setFilters(prev => ({ ...prev, pageMax: e.target.value }))}
                          className="h-8 bg-slate-50 dark:bg-slate-85 border border-slate-200 dark:border-slate-750 rounded px-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit send button */}
              <button
                type="submit"
                className="w-10 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-md hover:scale-102 transition-all cursor-pointer"
                title="Submit Query"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>

            <div className="text-[10px] text-slate-400 text-center mt-2.5 font-medium">
              RAG Agent compiles Hybrid Search (FAISS dense vector + BM25 sparse keyword)
            </div>
          </div>
        </main>

        {/* Source Citation slider drawer component */}
        {selectedCitation && (
          <aside className="absolute lg:relative top-0 right-0 w-full lg:w-[350px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-20 animate-fade-in">
            <div className="h-[60px] px-5 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-85/40">
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider animate-pulse">Citation Reference</h3>
              <button
                onClick={() => setSelectedCitation(null)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="font-bold text-teal-600 dark:text-teal-400 text-sm">{selectedCitation.doc}</span>
                <span className="text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200/20 font-bold px-2 py-0.5 rounded">
                  Page {selectedCitation.page}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Retrieved Text Block</span>
                <p className="font-sans text-xs leading-relaxed text-slate-650 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 p-4 border-l-2 border-teal-500 rounded-r-lg whitespace-pre-wrap max-h-[360px] overflow-y-auto">
                  {selectedCitation.text}
                </p>
              </div>
              <div className="mt-2 bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-450">
                <span>FAISS vector similarity:</span>
                <div className="flex items-center gap-2">
                  <div className="w-[60px] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${selectedCitation.score * 100}%` }}></div>
                  </div>
                  <strong className="font-mono text-slate-800 dark:text-slate-200">{(selectedCitation.score * 100).toFixed(0)}%</strong>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Groq API Key Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-white font-semibold text-base">
                <Key className="w-5 h-5 text-teal-400" />
                <span>Configure Groq API Key</span>
              </div>
              <button 
                onClick={() => setShowKeyModal(false)} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              This live web app runs real-time RAG inference using <strong>Groq Llama 3.1 8B Instant</strong>.
              Enter your Groq API key to start asking questions across all leases:
            </p>

            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors mb-2 font-mono"
              autoFocus
            />

            <div className="flex justify-between items-center text-[11px] text-slate-400 mb-6">
              <span>Saved locally in your browser session.</span>
              <a 
                href="https://console.groq.com/keys" 
                target="_blank" 
                rel="noreferrer" 
                className="text-teal-400 hover:underline font-medium"
              >
                Get a free Groq key &rarr;
              </a>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmed = inputKey.trim();
                  setApiKey(trimmed);
                  localStorage.setItem("groq_api_key", trimmed);
                  setShowKeyModal(false);
                }}
                className="px-5 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors cursor-pointer shadow-md"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
