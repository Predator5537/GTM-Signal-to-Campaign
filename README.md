# QuadSci GTM Signal-to-Campaign Automation

> **A fully functional, end-to-end B2B outbound automation system** that detects public buying signals, clusters them into intent events, scores accounts against an ICP, generates personalized outbound copy, and enforces a human approval gate before any email is sent.

---

## 🧠 What This Is

This project is a **GTM Engineering showcase** built as a technical exercise for QuadSci. It demonstrates a production-quality signal-to-campaign pipeline using:

- **n8n** (self-hosted) for orchestration across 6 workflows
- **Google Sheets** as the system of record (Signal Log, Scored Accounts, Review Queue)
- **OpenRouter** (`moonshotai/kimi-k2:0905`) for AI scoring and copy generation
- **Clay** for enrichment (company + buyer + email lookup)
- **Gmail** for safe demo-mode send with human approval gate

The core thesis: **a single signal is noise; a cluster of signals from the same account in a short time window is materially more predictive of real buyer intent.**

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

| File / Folder | Description |
|---|---|
| `wf1_signal_collector.json` | n8n workflow — collects signals from RSS, Reddit, and LLM domain extraction |
| `wf2_apify_scraper.json` | n8n workflow — Hacker News signal collection via Apify |
| `wf3_cluster_detector.json` | n8n workflow — detects signal clusters and routes qualified accounts |
| `wf4_ai_scorer.json` | n8n workflow — ICP scoring via OpenRouter |
| `wf4_ai_scorer_FIXED_2026-05-28.json` | Patched version of WF4 (use this) |
| `wf5_copy_generator.json` | n8n workflow — personalized email generation per buyer |
| `wf6_approval_monitor.json` | n8n workflow — polls Review Queue and sends approved emails via Gmail |
| `setup_google_sheet.gs` | Google Apps Script — sets up the 3-tab Google Sheet workbook |
| `QuadSci_SendShim.gs` | Google Apps Script — send shim with APPROVE gate and demo-mode routing |
| `QuadSci_GTM_PRD.md` | Full Product Requirements Document (Principal PM framework) |
| `QuadSci_Build_Checklist.md` | Step-by-step build checklist (Phase A–E) |
| `WF1_Autopilot_Demo_Runbook.md` | Demo runbook for live interview walkthrough |
| `AI_Context_Transfer_Prompt.md` | AI context prompt used during build |
| `QuadSci_Submission.html` | Full submission document (rendered HTML) |
| `QuadSci_Build_Roadmap.html` | Visual build roadmap |
| `QuadSci_Setup_Guide.html` | Setup guide (rendered HTML) |
| `QuadSci_PRD_v2_Clay.html` | Clay-native PRD reference |
| `QuadSci_Clay_Build_Guide.html` | Clay table build guide |
| `Agent Skill/` | AI agent skill prompts used in the build process |

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
5. Confirm 3 tabs: **Signal Log**, **Scored Accounts**, **Review Queue**

### Step 2 — Send Shim

1. In the same Apps Script project, add a new file `QuadSci_SendShim`
2. Paste the contents of `QuadSci_SendShim.gs`
3. Add Script Properties:
   - `SHEET_ID` — your Spreadsheet ID
   - `DEMO_EMAIL` — your safe demo email address
   - `DEMO_MODE` — `true`
4. Run `setupTriggers` and authorize

### Step 3 — Import n8n Workflows

Import the JSON files in order: WF1 → WF2 → WF3 → WF4 (use the FIXED version) → WF5 → WF6.

Set credentials for:
- OpenRouter API
- Google Sheets OAuth
- Gmail OAuth

### Step 4 — Clay Table

Follow `QuadSci_Clay_Build_Guide.html` to build the enrichment + scoring table.

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

Every email draft is written to the **Review Queue** tab in Google Sheets. The send shim (WF6) will only deliver emails where the operator has explicitly typed `APPROVE` in the `action` column. `REJECT` rows are permanently skipped. This ensures zero accidental sends.

---

## 📊 ICP Scoring Rubric

| Dimension | Max Points |
|---|---|
| Firmographic (ARR, headcount, growth stage) | 40 |
| Signal strength (cluster size, recency, signal types) | 40 |
| Tech stack fit | 20 |
| **Total** | **100** |

Tier assignment: **Tier 1** ≥ 75 · **Tier 2** 55–74 · **Tier 3** 35–54 · **Discard** < 35

---

## 📄 Documentation

- [**PRD (Markdown)**](QuadSci_GTM_PRD.md) — full product requirements and architecture decisions
- [**Build Checklist**](QuadSci_Build_Checklist.md) — step-by-step setup guide
- [**Demo Runbook**](WF1_Autopilot_Demo_Runbook.md) — interview demo walkthrough

---

## 👤 Author

**Prasun Mukhopadhyay** — GTM Engineer / AI Automation Architect  
[GitHub](https://github.com/Predator5537) · [Portfolio](https://prasunmukhopadhyay.my.canva.site/) · New York, NY

---

*Built May 2026 as a GTM Engineering technical exercise demonstrating signal intelligence, workflow automation, and human-gated outbound.*
