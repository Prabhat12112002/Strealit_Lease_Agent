// -------------------------------------------------------------
// Pre-populated realistic conversation turns (Oil & Gas Lease Context)
// -------------------------------------------------------------
const INITIAL_CONVERSATION = [
  {
    role: "user",
    content: "What is the primary term of Lease 6?"
  },
  {
    role: "assistant",
    content: "The primary term of Lease 6 is <strong>3 years</strong> from the effective date, as stipulated in Section 2 on Page 1. The lease will expire at the end of this term unless oil or gas is produced in paying quantities, or drilling operations are actively conducted on the leased premises.",
    summary: "Primary term is 3 years. Continuation requires active production or drilling.",
    citations: [
      { doc: "Lease 6.pdf", page: 1, text: "SECTION 2. PRIMARY TERM: This lease shall remain in force for a term of three (3) years from the effective date hereof, and as long thereafter as oil, gas, or other liquid hydrocarbons are produced from said land in paying quantities.", score: 0.98 }
    ]
  },
  {
    role: "user",
    content: "What are the delay rental terms in Lease 3?"
  },
  {
    role: "assistant",
    content: "Lease 3, Page 2, Paragraph 4 outlines delay rentals of <strong>$5.00 per acre</strong>. This payment must be paid to the Lessor or deposited in the depository bank on or before each anniversary date during the primary term to defer drilling operations for an additional 12-month period.",
    summary: "Delay rentals are $5.00/acre, payable annually to defer drilling.",
    citations: [
      { doc: "Lease 3.pdf", page: 2, text: "Paragraph 4: If operations for drilling are not commenced on said land on or before one year from date hereof, the lease shall terminate as to both parties, unless on or before such anniversary date Lessee shall pay or tender to Lessor the sum of Five Dollars ($5.00) per acre, which shall operate as a rental and cover the privilege of deferring the commencement of drilling for a period of one year.", score: 0.95 }
    ]
  },
  {
    role: "user",
    content: "Does Lease 2 have a shut-in royalty clause?"
  },
  {
    role: "assistant",
    content: "Yes, Lease 2 contains a shut-in royalty clause in Section 7 on Page 4. If a gas well is completed and capable of production, but is shut-in due to lack of market or pipeline access, the Lessee may pay a shut-in royalty of <strong>$1.00 per acre annually</strong> to maintain the lease in force.",
    summary: "Shut-in royalty clause active. Lessee can pay $1.00/acre annually to maintain lease when wells are shut-in.",
    citations: [
      { doc: "Lease 2.pdf", page: 4, text: "Section 7. SHUT-IN ROYALTIES: Where gas from a well producing gas only is not sold or used, Lessee may pay as royalty One Dollar ($1.00) per acre per year, and upon such payment it will be considered that gas is being produced within the meaning of this lease.", score: 0.92 }
    ]
  },
  {
    role: "user",
    content: "What is the royalty percentage in Lease 4?"
  },
  {
    role: "assistant",
    content: "The royalty percentage in Lease 4 is <strong>20% (1/5th)</strong> of all oil and gas produced, as specified in the royalty clause on Page 3. This applies to both oil, casinghead gas, and gas produced from any wells.",
    summary: "Royalty is set at 1/5th (20%) for both oil and gas production.",
    citations: [
      { doc: "Lease 4.pdf", page: 3, text: "ROYALTY CLAUSE: The royalties to be paid by Lessee are: (a) on oil, one-fifth (1/5) of that produced and saved from said land; (b) on gas, including casinghead gas or other gaseous substances, one-fifth (1/5) of the market value at the well.", score: 0.99 }
    ]
  },
  {
    role: "user",
    content: "Are there any pooling restrictions in Lease 5?"
  },
  {
    role: "assistant",
    content: "Yes. Lease 5, Page 6 restricts pooling units to a maximum size of <strong>80 acres</strong> for oil wells and <strong>640 acres</strong> for gas wells. A tolerance of 10% is allowed, or larger units may be formed if required by state regulatory authorities.",
    summary: "Pooling limits: Oil units capped at 80 acres; Gas units capped at 640 acres. 10% tolerance permitted.",
    citations: [
      { doc: "Lease 5.pdf", page: 6, text: "POOLING PROVISION: Lessee is hereby granted the right to pool or unitize the acreage. Provided, however, that no unit for oil shall exceed eighty (80) acres plus a tolerance of ten percent (10%), and no unit for gas shall exceed six hundred forty (640) acres plus a tolerance of ten percent (10%).", score: 0.97 }
    ]
  },
  {
    role: "user",
    content: "Can you list the warranty clause details for Lease 6?"
  },
  {
    role: "assistant",
    content: "Lease 6 includes a <strong>special warranty</strong> rather than a general warranty on Page 8. The Lessor warrants and agrees to defend title to the leased premises solely against claims arising by, through, or under the Lessor, but not otherwise.",
    summary: "Special warranty clause limited to claims arising through the Lessor only.",
    citations: [
      { doc: "Lease 6.pdf", page: 8, text: "WARRANTY: Lessor hereby warrants and agrees to defend the title to the lands herein described against the lawful claims of all persons claiming by, through, or under Lessor, but not otherwise.", score: 0.94 }
    ]
  },
  {
    role: "user",
    content: "Explain the Assignment clause in Lease 2."
  },
  {
    role: "assistant",
    content: "The assignment provisions in Lease 2 (Page 5, Paragraph 10) state that the rights of either party may be assigned in whole or in part. Crucially, no change in ownership of the land or royalties will bind the Lessee until <strong>30 days after the Lessee is furnished with written notice</strong> and certified copies of the recorded instruments of transfer.",
    summary: "Assignment permitted. Ownership changes only bind Lessee 30 days after receiving certified written notice.",
    citations: [
      { doc: "Lease 2.pdf", page: 5, text: "Paragraph 10. ASSIGNMENTS: The rights of either party hereunder may be assigned in whole or in part. No change or division in the ownership of the land, rentals, or royalties shall operate to enlarge the obligations or diminish the rights of Lessee, and no change in ownership shall be binding on Lessee until thirty (30) days after Lessee has been furnished with a written transfer or assignment.", score: 0.96 }
    ]
  },
  {
    role: "user",
    content: "What is the shut-in payment frequency for Lease 3?"
  },
  {
    role: "assistant",
    content: "Under Lease 3, Section 6 on Page 3, shut-in royalty payments must be paid <strong>annually</strong>. Payments are due within 90 days after the date the well is shut-in, and subsequent payments are due on the anniversary of the first payment date.",
    summary: "Shut-in payment is annual. Initial payment due within 90 days of shut-in.",
    citations: [
      { doc: "Lease 3.pdf", page: 3, text: "Section 6. SHUT-IN: While gas is not being sold or used, Lessee may pay as royalty a sum equal to One Dollar ($1.00) per acre annually, payable on or before ninety (90) days after the date on which said well is shut in, and annually thereafter.", score: 0.91 }
    ]
  },
  {
    role: "user",
    content: "What constitutes 'paying quantities' under Lease 4?"
  },
  {
    role: "assistant",
    content: "Lease 4 does not explicitly define 'paying quantities' mathematically in the text. However, standard legal interpretation referenced in the Lease 4 Habendum Clause (Page 2) requires the well to produce sufficient revenues to yield a profit over operating expenses, even if the drilling costs are never fully recovered.",
    summary: "'Paying quantities' is not explicitly defined in Lease 4, but defaults to industry standard profit-over-operating-costs rule.",
    citations: [
      { doc: "Lease 4.pdf", page: 2, text: "HABENDUM CLAUSE: This lease shall remain in force for a primary term of five years and as long thereafter as oil or gas is produced from the leased premises in paying quantities.", score: 0.89 }
    ]
  },
  {
    role: "user",
    content: "What is the force majeure clause in Lease 6?"
  },
  {
    role: "assistant",
    content: "The force majeure clause in Lease 6 (Page 9, Section 14) suspends the Lessee's obligations if compliance is prevented by <strong>acts of God, strikes, war, lockouts, or inability to obtain equipment/regulatory permits</strong>. Crucially, the primary term will be extended for a period equal to the delay.",
    summary: "Obligations suspended during Force Majeure. Leases extended by the duration of the delay.",
    citations: [
      { doc: "Lease 6.pdf", page: 9, text: "Section 14. FORCE MAJEURE: If Lessee is prevented from complying with any express or implied covenant of this lease by reason of scarcity of or inability to obtain equipment or material, or by war, strike, acts of God, or regulatory order, then Lessee's obligation shall be suspended and the term of this lease shall be extended by the time Lessee is so prevented.", score: 0.98 }
    ]
  }
];

// -------------------------------------------------------------
// Interactive responses lookup database for dynamic queries
// -------------------------------------------------------------
const MOCK_ANSWERS_DB = {
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

const DEFAULT_ANSWER = {
  content: "I have analyzed the indexed leases matching your query. The documents indicate that typical compliance requires written consent from the Lessor for assignments and restricts pooling units to statutory limits. For specific numbers, please specify which Lease (e.g., Lease 2 to 6) you are referring to.",
  summary: "Query analyzed. Explicit consent is standard. Specify lease number for exact parameters.",
  citations: [
    { doc: "Lease 2.pdf", page: 5, text: "Paragraph 10. ASSIGNMENTS: The rights of either party hereunder may be assigned in whole or in part.", score: 0.72 },
    { doc: "Lease 5.pdf", page: 6, text: "POOLING PROVISION: Lessee is hereby granted the right to pool or unitize the acreage.", score: 0.68 }
  ]
};

// -------------------------------------------------------------
// UI State Management & Handlers
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const chatMessages = document.getElementById("chat-messages");
  const chatForm = document.getElementById("chat-form");
  const messageInput = document.getElementById("message-input");
  const themeToggle = document.getElementById("theme-toggle");
  const newChatBtn = document.getElementById("new-chat-btn");
  const suggestionsContainer = document.getElementById("suggestions-container");
  const sourcePanel = document.getElementById("source-panel");
  const closeSourceBtn = document.getElementById("close-source-btn");
  const sourcePanelBody = document.getElementById("source-panel-body");
  
  // Filters elements
  const filterBtn = document.getElementById("filter-btn");
  const filterPanel = document.getElementById("filter-panel");
  const resetFiltersBtn = document.getElementById("reset-filters");
  const filterCount = document.getElementById("filter-count");
  const filterLease = document.getElementById("filter-lease");
  const filterPage = document.getElementById("filter-page");
  const filterPageMin = document.getElementById("filter-page-min");
  const filterPageMax = document.getElementById("filter-page-max");

  // Load initial conversation turns with staggered animation
  let delay = 0;
  INITIAL_CONVERSATION.forEach(msg => {
    setTimeout(() => {
      renderMessage(msg.role, msg.content, msg.summary, msg.citations);
      scrollToBottom();
    }, delay);
    delay += 250; // Stagger effect
  });

  // Theme Toggle Logic
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    
    const sunIcon = themeToggle.querySelector(".sun-icon");
    const moonIcon = themeToggle.querySelector(".moon-icon");
    
    if (newTheme === "light") {
      sunIcon.style.display = "none";
      moonIcon.style.display = "block";
    } else {
      sunIcon.style.display = "block";
      moonIcon.style.display = "none";
    }
  });

  // Initialize theme from storage
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
    const sunIcon = themeToggle.querySelector(".sun-icon");
    const moonIcon = themeToggle.querySelector(".moon-icon");
    if (savedTheme === "light") {
      sunIcon.style.display = "none";
      moonIcon.style.display = "block";
    }
  }

  // Filter Panel Toggle
  filterBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    filterPanel.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!filterPanel.contains(e.target) && e.target !== filterBtn) {
      filterPanel.classList.remove("open");
    }
  });

  // Calculate Active Filters
  const updateFilterCount = () => {
    let count = 0;
    if (filterLease.value) count++;
    if (filterPage.value) count++;
    if (filterPageMin.value || filterPageMax.value) count++;
    
    if (count > 0) {
      filterCount.textContent = count;
      filterCount.classList.add("active");
    } else {
      filterCount.classList.remove("active");
    }
  };

  [filterLease, filterPage, filterPageMin, filterPageMax].forEach(elem => {
    elem.addEventListener("change", updateFilterCount);
    elem.addEventListener("input", updateFilterCount);
  });

  resetFiltersBtn.addEventListener("click", () => {
    filterLease.value = "";
    filterPage.value = "";
    filterPageMin.value = "";
    filterPageMax.value = "";
    updateFilterCount();
  });

  // Close Source Reference Panel
  closeSourceBtn.addEventListener("click", () => {
    sourcePanel.classList.remove("open");
  });

  // New Chat Session Button
  newChatBtn.addEventListener("click", () => {
    chatMessages.innerHTML = "";
    renderMessage("assistant", "New conversation session initialized. Ready to query legal O&G leases.", null, null);
    scrollToBottom();
  });

  // Suggestion tags selection
  suggestionsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("suggestion-tag")) {
      messageInput.value = e.target.textContent;
      messageInput.focus();
    }
  });

  // Submit Query
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    // 1. Render User Message Bubble
    renderMessage("user", text);
    messageInput.value = "";
    scrollToBottom();

    // 2. Show Loading Generating Spinner Bubble
    const loadingId = showLoadingBubble();
    scrollToBottom();

    // 3. Simulate API Delay (Groq Query speed simulation)
    setTimeout(() => {
      removeLoadingBubble(loadingId);
      
      // Select mock answer or default
      const cleanText = text.toLowerCase();
      const response = MOCK_ANSWERS_DB[cleanText] || DEFAULT_ANSWER;
      
      renderMessage("assistant", response.content, response.summary, response.citations);
      scrollToBottom();
    }, 1200);
  });

  // -------------------------------------------------------------
  // Rendering Helpers
  // -------------------------------------------------------------
  function renderMessage(role, text, summary = null, citations = null) {
    const bubble = document.createElement("div");
    bubble.classList.add("message-bubble", role);
    
    // Avatar
    const avatar = document.createElement("div");
    avatar.classList.add("bubble-avatar");
    if (role === "user") {
      avatar.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>`;
    } else {
      avatar.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="10" rx="2"/>
          <path d="M12 2v3M5 5l2 2m10-2l-2 2"/>
        </svg>`;
    }

    const content = document.createElement("div");
    content.classList.add("message-content");

    const body = document.createElement("div");
    body.classList.add("bubble-body");
    body.innerHTML = `<p>${text}</p>`;
    content.appendChild(body);

    // Expandable Summary card if present
    if (summary) {
      const summaryCard = document.createElement("div");
      summaryCard.classList.add("summary-card", "collapsed");
      
      const summaryHeader = document.createElement("div");
      summaryHeader.classList.add("summary-header");
      summaryHeader.innerHTML = `
        <div class="summary-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <span>Key Takeaways</span>
        </div>
        <svg class="summary-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>`;
      
      const summaryBody = document.createElement("div");
      summaryBody.classList.add("summary-body");
      summaryBody.textContent = summary;

      // Expand/Collapse Click Listener
      summaryHeader.addEventListener("click", () => {
        summaryCard.classList.toggle("collapsed");
      });

      summaryCard.appendChild(summaryHeader);
      summaryCard.appendChild(summaryBody);
      content.appendChild(summaryCard);
    }

    // Citation tags if present
    if (citations && citations.length > 0) {
      const citWrapper = document.createElement("div");
      citWrapper.classList.add("citations-wrapper");
      citWrapper.innerHTML = `<span class="citation-label">Sources:</span>`;
      
      citations.forEach(c => {
        const tag = document.createElement("button");
        tag.classList.add("citation-tag");
        tag.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>${c.doc} (P. ${c.page})</span>`;
        
        tag.addEventListener("click", () => {
          openCitationPanel(c.doc, c.page, c.text, c.score);
        });
        citWrapper.appendChild(tag);
      });
      content.appendChild(citWrapper);
    }

    bubble.appendChild(avatar);
    bubble.appendChild(content);
    chatMessages.appendChild(bubble);
  }

  function showLoadingBubble() {
    const loadingId = "loader_" + Date.now();
    const bubble = document.createElement("div");
    bubble.classList.add("message-bubble", "assistant", "loading-bubble");
    bubble.id = loadingId;
    bubble.innerHTML = `
      <div class="bubble-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="10" rx="2"/>
          <path d="M12 2v3M5 5l2 2m10-2l-2 2"/>
        </svg>
      </div>
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>`;
    chatMessages.appendChild(bubble);
    return loadingId;
  }

  function removeLoadingBubble(id) {
    const loader = document.getElementById(id);
    if (loader) loader.remove();
  }

  function openCitationPanel(doc, page, text, score) {
    sourcePanelBody.innerHTML = `
      <div class="citation-detail-card">
        <div class="citation-meta-badge">
          <span class="doc-title">${doc}</span>
          <span class="page-badge">Page ${page}</span>
        </div>
        <div>
          <span class="citation-chunk-title">Retrieved Chunk Content</span>
          <div class="citation-text-block">${text}</div>
        </div>
        <div class="citation-sim-score">
          <span>Vector Similarity Relevance:</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="score-bar-bg">
              <div class="score-bar-fill" style="width: ${score * 100}%"></div>
            </div>
            <strong>${(score * 100).toFixed(0)}%</strong>
          </div>
        </div>
      </div>`;
    sourcePanel.classList.add("open");
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});
