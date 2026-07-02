# GTM Signal-to-Campaign Automation

> **End-to-end B2B outbound pipeline** — detects public buying signals, clusters them into account-level intent events, scores against an ICP, generates personalized outbound copy, and enforces a human approval gate before any email is sent.

---

## 🧠 What This Is

A production-quality **GTM Engineering showcase** demonstrating a full signal-to-campaign pipeline using:

- **n8n** (self-hosted) for orchestration across 6 workflows
- **Google Sheets** as the system of record (Signal Log, Scored Accounts, Review Queue)
- **OpenRouter** (`moonshotai/kimi-k2:0905`) for AI scoring and copy generation
- **Clay** for enrichment (company + buyer + email lookup)
- **Gmail** for safe demo-mode send with human approval gate

**Core thesis:** a single signal is noise; a cluster of signals from the same account in a short time window is materially more predictive of real buyer intent.

---

## 🏗️ Architecture

```
Public Signals (RSS / Reddit / HN)
        ↓
   WF1: Signal Collector  ──→  Signal Log (Google Sheets)
   WF2: Apify HN Scraper  ──→  Signal Log
        ↓
   WF3: Cluster Detector  ──→  Scored Accounts (Pending Enrichment)
        ↓
   [Operator: advance to Enriched]  ←── Clay Enrichment (company + buyer + email)
        ↓
   WF4: AI Scorer         ──→  ICP score + tier (Tier 1 / 2 / 3 / Discard)
        ↓
   WF5: Copy Generator    ──→  Review Queue (draft emails)
        ↓
   [Human types APPROVE]
        ↓
   WF6: Approval Monitor  ──→  Gmail send (demo-mode routing)
```

---

## 📁 Repository Structure

| File | Description |
|---|---|
| `wf1_signal_collector.json` | n8n workflow — collects signals from RSS, Reddit, LLM domain extraction |
| `wf2_apify_scraper.json` | n8n workflow — Hacker News signal collection via Apify |
| `wf3_cluster_detector.json` | n8n workflow — detects signal clusters, routes qualified accounts |
| `wf4_ai_scorer.json` | n8n workflow — ICP scoring via OpenRouter |
| `wf5_copy_generator.json` | n8n workflow — personalized email generation per buyer |
| `wf6_approval_monitor.json` | n8n workflow — polls Review Queue, sends approved emails via Gmail |
| `setup_google_sheet.gs` | Google Apps Script — sets up the 3-tab Google Sheet workbook |
| `QuadSci_GTM_PRD.md` | Full Product Requirements Document (Principal PM framework) |
| `QuadSci_Submission.html` | Full project submission document (rendered HTML) |

---

## ⚡ Quick Start

### Prerequisites

- n8n instance (self-hosted or cloud)
- Google account (Sheets + Gmail)
- OpenRouter API key
- Clay account (free tier works)

### Step 1 — Google Sheets Setup

1. Create a new Google Spreadsheet
2. Open **Extensions → Apps Script**
3. Paste the contents of `setup_google_sheet.gs`
4. Run `createQuadSciWorkbook` and authorize permissions
5. Confirm 3 tabs exist: **Signal Log**, **Scored Accounts**, **Review Queue**

### Step 2 — Import n8n Workflows

Import the JSON files in order: WF1 → WF2 → WF3 → WF4 → WF5 → WF6.

Set credentials for:
- OpenRouter API
- Google Sheets OAuth
- Gmail OAuth

### Step 3 — Clay Enrichment Table

Build a Clay table connected to your Google Sheet's Scored Accounts tab. Configure:
- Company enrichment (firmographics)
- Buyer/contact lookup
- Email find (optional for demo)

---

## 🎯 Signal Sources

| Signal Type | Source | How Detected |
|---|---|---|
| Job postings (CS / rev ops / churn roles) | Google Alerts RSS | WF1 keyword match |
| G2 reviews mentioning churn / CSM pain | Reddit JSON / Google Alerts | WF1 LLM domain extraction |
| Leadership hires (VP CS / CCO) | Google Alerts RSS | WF1 pattern match |
| HN "Who is hiring" / product posts | Hacker News Algolia API | WF2 keyword filter |
| NRR / renewal pain signals | Reddit, Google Alerts | WF1 LLM extraction |

---

## 🤖 AI Components

| Workflow | Model | Purpose |
|---|---|---|
| WF1 | `moonshotai/kimi-k2:0905` via OpenRouter | Domain extraction from article headlines |
| WF4 | `moonshotai/kimi-k2:0905` via OpenRouter | ICP scoring rubric (firmographic + signal + tech stack) |
| WF5 | `moonshotai/kimi-k2:0905` via OpenRouter | Personalized email generation per buyer + role |

---

## 🛡️ Human-in-the-Loop Design

Every email draft is written to the **Review Queue** tab in Google Sheets. WF6 will only deliver emails where the operator has explicitly typed `APPROVE` in the `action` column. `REJECT` rows are permanently skipped — zero accidental sends.

---

## 📊 ICP Scoring Rubric

| Dimension | Max Points |
|---|---|
| Firmographic (ARR, headcount, growth stage) | 40 |
| Signal strength (cluster size, recency, signal types) | 40 |
| Tech stack fit | 20 |
| **Total** | **100** |

**Tier assignment:** Tier 1 ≥ 75 · Tier 2: 55–74 · Tier 3: 35–54 · Discard < 35

---

## 📄 Documentation

- [**PRD**](QuadSci_GTM_PRD.md) — full product requirements, architecture decisions, tradeoffs, and metrics framework
- [**Submission**](QuadSci_Submission.html) — complete project writeup (rendered HTML)

---

## 👤 Author

**Prasun Mukhopadhyay** — GTM Engineer / AI Automation Architect
[GitHub](https://github.com/Predator5537) · [Portfolio](https://prasunmukhopadhyay.my.canva.site/) · New York, NY

---

*Built May 2026 — demonstrating signal intelligence, workflow automation, ICP scoring, and human-gated outbound.*
