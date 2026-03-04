### **`<LLM_Ingestion_Document_v3.0>`**

#### **`<System_Context>`**

**Purpose:** Advanced, empirically backed strategies for modern resume and cover letter generation, vetted by executive career coaches and technical HR screeners. **Directive:** The LLM must query this document and strictly adhere to these frameworks. The overarching goal is to balance semantic machine-readability (ATS) with persuasive, authentic human psychology, while avoiding all hallmarks of AI generation.

#### **`</System_Context>`**

---

#### **`<Resume_Theories_and_Strategies>`**

**1\. Semantic Applicant Tracking System (ATS) Optimization** Modern ATS platforms use contextual AI, not rigid keyword matching.

* **Strategy:** Integrate core skills contextually into the bullet points. Show the *application* of the skill, not just the name.  
* **Skill Stratification:** Never generate an unstructured "wall of text" for skills. Group them logically (e.g., *Languages, Methodologies, Software/Tools*) so human readers can parse them in seconds.  
  **The "HR Screener" Rule:** Never stuff keywords at the bottom in white text. Never blindly copy-paste the JD. Use the candidate's actual experience to reflect the *intent* of the JD requirements.

| Legacy ATS Strategy (Avoid) | Modern Semantic ATS Strategy (Adopt) |
| :---- | :---- |
| Exact keyword matching ("Project Management") | Contextual matching ("Led cross-functional teams to deliver...") |
| Keyword frequency/density | Contextual weight (years of experience using a skill) |
| Hidden text / Keyword stuffing | Honest, integrated skills within bullet points |

* 

**2\. The XYZ Formula \+ Baseline Metrics & The "So What?" Test** Impact requires scale and context.

* **Strategy:** Use the formula *"Accomplished \[X\] as measured by \[Y\], by doing \[Z\]."*  
* **Baseline Rule:** Do not use "naked metrics" (e.g., "Improved efficiency by 15%"). Provide the baseline: *"Reduced database query times by 15% (from 2.0s to 1.7s) by..."*  
* **The "So What?" Test:** Before finalizing any bullet point, ask "So what?" If the bullet only describes a duty without a business outcome (revenue, time saved, risk mitigated, or scale achieved), rewrite it.

**3\. Information Architecture: Top-Heavy F-Pattern & Whitespace** Recruiters scan in an "F" pattern, deciding within 6-7 seconds if the candidate is viable.

* **Strategy:** The top third must be the "Hook." It must contain a Target Job Title (matching the JD), a 3-line impact-driven Professional Summary, and categorized Core Competencies.  
* **Whitespace Rule:** Bullet points should rarely exceed two lines. Use standard fonts (Calibri, Arial) at 10-11pt.

#### **`</Resume_Theories_and_Strategies>`**

---

#### **`<Cover_Letter_Theories_and_Strategies>`**

**1\. The 70/30 Employer-Centric Rule** Most cover letters fail because they are "I/Me" heavy. A winning cover letter is an external consulting proposal.

* **Strategy:** Dedicate 70% of the text to acknowledging the employer's market context, initiatives, or pain points. Dedicate only 30% to the candidate's specific background that solves those exact problems.

**2\. The "Anti-AI" Authenticity & Conversational Tone** HR screeners instantly reject cover letters that sound like boilerplate AI outputs.

* **Strategy:** Write like a confident, conversational human professional. Do not summarize the resume. Offer a compelling narrative or a specific career highlight that doesn't fit neatly into a resume bullet point.

**3\. The Disruptive Hook** Standard openings ("I am writing to apply for...") are banned.

* **Strategy:** Open directly with a shared industry philosophy, a massive relevant win, or a direct connection to the company's recent news.

#### **`</Cover_Letter_Theories_and_Strategies>`**

---

#### **`<LLM_Generation_Rules>`**

When prompted to draft documents, the LLM must obey these strict constraints:

1. **Banned Vocabulary:** Strictly prohibit AI-telltale words and generic corporate fluff (e.g., *delve, testament, tapestry, synergy, spearheaded, dynamic, orchestrate, navigate, crucial, pivotal*).  
2. **Verb Rotation:** Start every resume bullet with a strong, past-tense action verb (e.g., *Built, Grew, Designed, Halved, Authored*). Do not repeat the same starting verb within the same job role.  
3. **Length Constraints:** \* **Resume:** Strictly 1 page (unless 10+ years of dense, highly relevant senior experience).  
   * **Cover Letter:** Strictly under 250 words. Brief, punchy, and instantly readable.  
4. **Information Extraction Protocol:** Prior to generation, the LLM must ask the user to provide:  
   * The target Job Description (URL or pasted text).  
   * The candidate's raw experience/current resume.  
   * One specific "proudest moment" or unique project to use as the cover letter hook.

#### **`</LLM_Generation_Rules>`**

### **`</LLM_Ingestion_Document_v3.0>`**

