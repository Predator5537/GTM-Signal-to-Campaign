# QuadSci GTM Engineer Exercise — Full Context Transfer Prompt
**Use this prompt to continue the project on any AI platform (ChatGPT, Gemini, etc.) if Claude credits run out.**

---

## HOW TO USE THIS PROMPT

Copy everything from the line "=== START PROMPT ===" to "=== END PROMPT ===" and paste it as your first message on any AI platform. The AI will have everything it needs to help you finish the project.

---

=== START PROMPT ===

# Context: QuadSci GTM Engineer Interview Assignment

I am completing a GTM Engineer technical interview assignment for QuadSci. The assignment is due on 2026-05-29. I need your help to finish it. Please read all of this before responding.

---

## WHO I AM

My name is Prasun. I am non-technical. All instructions must be in plain English with exact copy-paste steps — never say "adjust as needed" or "configure appropriately." Always pre-fill every value, field name, and setting.

My email (used for all demo sends and test data): pmukhopadhyay5537@gmail.com

---

## WHAT THE EXERCISE ASKS FOR

QuadSci is an AI-native revenue intelligence platform for B2B SaaS companies. They ingest product telemetry and predict churn/growth 12 months ahead. Their ICP: B2B SaaS companies with 200+ employees, Series B or later, $100M+ ARR, with existing CS and RevOps teams. Primary buyer: CRO, SVP Sales, VP RevOps.

The assignment asks me to build a 4-stage agentic signal-to-campaign workflow:
1. **Detect Signal Cluster** — monitor signals from web sources (job boards, G2, Reddit, HN) and cluster them by company
2. **Score and Filter Accounts** — score each clustered company against QuadSci's ICP rubric
3. **Generate Personalized Copy** — write AI outbound email copy referencing the specific signals that fired
4. **Stage the Campaign** — human approval gate, then send

The evaluation criteria: ICP fluency, agentic workflow design (connected system, not 4 disconnected exercises), resourcefulness (free tools only), copy quality, prompt craft, and honesty about limits.

**Tooling constraint: $0/month. No ZoomInfo, Apollo Pro, LinkedIn Sales Navigator, or Phantombuster.**

---

## WHAT I BUILT

I built a 6-workflow n8n automation pipeline. n8n is a free, self-hosted workflow automation tool running at http://localhost:5678 on my machine.

### The Stack
- **n8n** (self-hosted, localhost:5678) — 6 workflows, all coded as JSON files
- **Google Sheets** — the data layer (spreadsheet ID: `1_hKjUHNR_h27QrITATMeFLgHaEvzbWnRiP3qSF-jCyk`)
- **OpenRouter** (model: `moonshotai/kimi-k2-0905`) — AI scoring in WF4, AI copy generation in WF5, domain extraction in WF1
- **Clay** (free tier) — buyer contact enrichment (Find Person, Find Email, BuiltWith); writes to Buyer Contacts tab
- **Gmail OAuth** — email sending in WF6

### Google Sheets Structure (4 tabs)
| Tab | Purpose |
|---|---|
| **Signal Log** | Raw signals from all sources. Columns: Date, Company Domain, Company Name, Signal Type (1–5), Signal Summary, Source URL, Status |
| **Scored Accounts** | Companies that passed clustering. Columns: Date Flagged, Company Domain, Company Name, Signal Count, Signal Types, Signal Summaries, Employee Count, Funding Stage, Estimated ARR, CS Headcount, Tech Stack, Buyer Name, Buyer Title, Buyer Email, Status, Score columns |
| **Buyer Contacts** | Clay enrichment output. Columns: Company Domain, Buyer Name, Buyer Title, Buyer Email |
| **Review Queue** | Drafted emails awaiting human approval. Columns: Company Domain, Company Name, Buyer Name, Buyer Title, Buyer Email, Total Score, Tier, Email Copy, Your Action, Send Date |

### Signal Types Used
- Type 1: Job posting mentioning Gainsight/ChurnZero/CS migration
- Type 2: G2 review mentioning forecast accuracy or surprise churn ← ANCHOR signal
- Type 3: Reddit/LinkedIn post about NRR pain
- Type 4: Leadership hire (VP CS, Head of RevOps, Director+)
- Type 5: Earnings/investor statement mentioning churn or NRR ← ANCHOR signal

WF3 requires: **3+ signals AND at least one anchor signal (Type 2 or Type 5)** to qualify a company as a cluster.

### Status State Machine (Status column in Scored Accounts)
`Pending Enrichment → Enriched → Scoring In Progress → Scored → In Review Queue → Missing Buyer Data → Sent`

WF4 only processes rows with Status = **Enriched**.

---

## THE 6 WORKFLOWS — WHAT EACH DOES

### WF1 — Signal Collector (Daily 7am)
File: `wf1_signal_collector.json`

Polls 5 Google Alerts RSS feeds + Reddit r/CustomerSuccess. After merging, passes ALL signals as a batch to OpenRouter which extracts the company domain from each headline (LLM-powered, since Alerts link to articles not company sites). Writes enriched signals (with domain) to Signal Log tab.

**Signal sources:**
- Alert 1: Job postings mentioning Gainsight/ChurnZero → Signal Type 1
- Alert 2: G2 reviews about forecast/churn → Signal Type 2
- Alert 3: NRR/LinkedIn pain posts → Signal Type 3
- Alert 4: Leadership hires → Signal Type 4
- Alert 5: Earnings/investor churn mentions → Signal Type 5
- Reddit r/CustomerSuccess: NRR/churn/renewal keyword filter → Signal Type 3

**Key architecture:** Three new nodes after `Merge All Sources`:
1. `Code — Prepare Domain Extraction Batch`: collapses all signals into one item (one LLM call per run)
2. `HTTP — OpenRouter Extract Domains`: sends batch, gets back `{"domains": ["gong.io", ...]}`
3. `Code — Attach Extracted Domains`: re-expands to N items with domains; drops signals where domain is unknown

### WF2 — HN Collector (Weekly Monday 9am)
File: `wf2_apify_scraper.json`

Queries Hacker News Algolia API (free, no auth) for: `Gainsight OR ChurnZero OR "customer success operations" OR "renewal intelligence" OR "churn prediction"`. Extracts domain from article URLs. Writes to Signal Log as Signal Type 1.

### WF3 — Cluster Detector (Every 6 hours)
File: `wf3_cluster_detector.json`

Reads Signal Log (Status = New), groups by Company Domain, applies cluster threshold (3+ signals within 21 days + anchor signal). Deduplicates against Scored Accounts. Writes qualifying companies to Scored Accounts with Status = `Pending Enrichment`.

### WF4 — AI Scorer (Webhook-triggered by WF5 fan-out, or manual Execute)
File: `wf4_ai_scorer.json`

Reads one `Enriched` row from Scored Accounts (limit: 1). Joins with Buyer Contacts to get buyer fields. Sanitizes text (prevents JSON corruption from G2 quotes). Calls OpenRouter with scoring rubric. Parses score. Fan-out node splits into one item per buyer contact. Triggers WF5 once per contact.

**Scoring rubric:**
- Firmographic fit (max 40 pts): employees, funding stage, ARR, CS headcount
- Signal strength (max 45 pts): earnings churn mentions, G2 reviews, NRR posts, leadership hires, job postings
- Tech stack fit (max 15 pts): Gainsight/ChurnZero = 10pts, Segment/Amplitude/Mixpanel = 5pts, Salesforce = 5pts
- Tier 1: 80+, Tier 2: 60–79, Tier 3: 40–59, Discard: <40

**DEMO SAFETY RULE — NEVER CHANGE:** All emails route to pmukhopadhyay5537@gmail.com ONLY. The `sendTo` field in WF6 is hardcoded. Never change it to `$json['Buyer Email']`.

### WF5 — Copy Generator (Webhook-triggered by WF4)
File: `wf5_copy_generator.json`

Receives one buyer contact from WF4. Validates 5 required fields (Company Name, Buyer Name, Buyer Title, Buyer Email, Tier). If any are missing → marks account as "Missing Buyer Data" and stops. If valid → calls OpenRouter to write personalized email copy referencing the signals that fired. Writes to Review Queue tab.

### WF6 — Approval Monitor (Every 15 min, or manual Execute)
File: `wf6_approval_monitor.json`

Reads Review Queue. Filters rows where `Your Action` = APPROVE (case-insensitive) AND `Send Date` is empty. Sends via Gmail. Subject prefix: `[DEMO — CompanyName]`. Updates Send Date in the row. Only rows explicitly typed APPROVE send — REJECT, blank, EDIT are all silently skipped.

---

## ALL BUGS THAT WERE FIXED

### WF4 fixes
- **Domain normalization:** `normalizeDomain()` function strips `https://`, `www.`, trailing paths — so Clay-formatted domains match n8n-formatted ones
- **Sanitization node:** New `Code — Sanitize Account for Scoring` inserted before OpenRouter — G2 review text has double quotes that broke JSON body
- **Code — Parse Score Result:** Added `mode: runOnceForEachItem`, fixed `$input.first().json` → `$input.item.json`
- **Code — Split Per Contact:** Fan-out node emits one item per buyer contact for the scored company. Also has `normalizeDomain()`. Sits between `IF — Tier 1 or 2?` and `HTTP — Trigger WF5`
- **HTTP — Trigger WF5:** `jsonBody` changed to use `$json` (per-contact item) not a named node reference

### WF5 fixes
- **Code — Sanitize + Validate:** Replaces old sanitize node. Validates 5 required fields + tier eligibility. Returns `{__skip: true}` if invalid → routes to Mark Missing Buyer Data
- **IF — Required Fields Valid?:** New node routing valid vs invalid
- **Sheets — Mark Missing Buyer Data:** New node updating status
- **Code — Assemble Review Queue Row:** `total_score || ''` → `total_score ?? ''` (|| treats 0 as falsy)
- **OpenRouter — Write Email Copy:** References changed from `$json.body.*` to `$json.*`

### WF6 fixes
- **Code — Filter Unsent:** Now checks BOTH `Your Action.toUpperCase() === 'APPROVE'` AND `Send Date === ''`. Previously only checked Send Date.

### WF1 fix (most recent — done tonight)
- **Three new nodes added** after `Merge All Sources`:
  - `Code — Prepare Domain Extraction Batch`
  - `HTTP — OpenRouter Extract Domains`
  - `Code — Attach Extracted Domains`
- All 5 Google Alerts normalize nodes previously set `Company Domain: ''` — WF3 ignored all WF1 signals. Now LLM extracts domains from headlines.

---

## TEST ACCOUNTS (pre-seeded for demo)

Two companies are set up for the demo:
- **gong.io** — 2 contacts in Buyer Contacts tab, Status = Enriched in Scored Accounts
- **hubspot.com** — 2 contacts in Buyer Contacts tab, Status = Enriched in Scored Accounts

Running WF4 twice (once per company) should produce 4 Review Queue rows.

---

## WORKFLOW ACTIVATION ORDER (CRITICAL)

**ALWAYS activate in this order:** WF5 → WF6 → WF4

WF5 must be active BEFORE WF4 runs, because WF4's HTTP node calls WF5's Production webhook URL. If WF5 is inactive when WF4 runs, WF4 fails at the HTTP trigger step.

WF1, WF2, WF3 can be activated in any order.

---

## FILE LOCATIONS

All workflow JSON files are in the folder: `C:\Users\smukh\OneDrive\Documents\Claude\Projects\QuadSci\`

| File | Status |
|---|---|
| `wf1_signal_collector.json` | ✅ Fixed (LLM domain extraction added) |
| `wf2_apify_scraper.json` | ✅ Working as-is |
| `wf3_cluster_detector.json` | ✅ Working as-is |
| `wf4_ai_scorer.json` | ✅ All bugs fixed |
| `wf5_copy_generator.json` | ✅ All bugs fixed |
| `wf6_approval_monitor.json` | ✅ All bugs fixed |

Supporting files (also in the same folder):
- `Phases_1_3_Runbook.md` — step-by-step guide for re-importing WF4/5/6 and running the end-to-end test
- `WF1_Autopilot_Demo_Runbook.md` — guide for importing WF1, seeding Signal Log, running WF1→WF3 live
- `QuadSci_Submission.html` — the interview submission document (needs review/update)
- `QuadSci_GTM_PRD.html` — full PRD (already written)

---

## CREDENTIALS NEEDED IN n8n

When you import any workflow, n8n will show red/orange warning icons on nodes that need credentials reconnected. The credential NAMES to use:

| Credential | n8n Type | Used by |
|---|---|---|
| Google Sheets OAuth2 | `googleSheetsOAuth2Api` | WF1, WF2, WF3, WF4, WF5, WF6 — all Sheet read/write nodes |
| OpenRouter API key | `httpHeaderAuth` (named **"OpenRouter"**) | WF1, WF4, WF5 — all OpenRouter HTTP nodes |
| Gmail OAuth | `gmailOAuth2` | WF6 — Gmail send node |

---

## WHAT IS DONE vs WHAT IS PENDING

### ✅ Done
- All 6 workflow JSON files built and fixed
- WF1 LLM domain extraction added
- Phases 1–3 runbook written
- WF1 autopilot demo runbook written
- Submission document exists (QuadSci_Submission.html)
- PRD exists (QuadSci_GTM_PRD.html)

### ❌ Still Pending (to complete tomorrow)
1. **Import all 6 workflows** into n8n (delete old ones, import fresh JSONs)
2. **Reconnect credentials** on all imported workflows
3. **Fix Google Sheets data:**
   - Buyer Contacts tab: verify 4 rows (2 gong.io, 2 hubspot.com), domains as bare `gong.io` / `hubspot.com`
   - Review Queue tab: delete all data rows (header row only)
   - Scored Accounts tab: set gong.io and hubspot.com Status = `Enriched`
4. **Seed Signal Log** with 6 rows (3 for gong.io, 3 for hubspot.com) including anchor signals — exact rows are in `WF1_Autopilot_Demo_Runbook.md`
5. **Activate in order:** WF5 → WF6 → WF1 → WF2 → WF3 → WF4
6. **Run WF1 manually** and verify Signal Log gets new rows with Company Domain populated
7. **Run WF3 manually** and verify Scored Accounts gets gong.io + hubspot.com detected as clusters
8. **Run WF4 twice** and verify 4 Review Queue rows appear with non-zero scores and full buyer data
9. **Test APPROVE path:** Type APPROVE in one Review Queue row → verify email arrives at pmukhopadhyay5537@gmail.com with `[DEMO —` subject
10. **Test REJECT path:** Type REJECT in another row → verify nothing sends
11. **Take screenshots** of each stage for the submission document
12. **Update QuadSci_Submission.html** with actual screenshots and verified email copy examples
13. **Final review** of the submission document before sending

---

## KNOWN GAP TO ACKNOWLEDGE IN THE DEMO

The Clay enrichment step (Pending Enrichment → Enriched) is currently manual. Clay's free tier doesn't offer outbound webhooks, so there's no automation for this transition. For the demo, you manually set Status = Enriched after WF3 fires.

**How to frame this to the panel:**
> "The Clay enrichment step is currently operator-triggered. Clay's free tier doesn't support outbound webhooks, so the Pending Enrichment → Enriched transition requires a manual step today. The production design replaces this with a Clay webhook that fires when a new row appears in Scored Accounts — the state machine is already built to receive it. With a $20/month Clay plan, this step disappears entirely."

The exercise explicitly rewards "honesty about limits." Candidates who can clearly articulate where their system's seams are score higher than those who oversell.

---

## DEMO STORY (30 seconds, memorize this)

"Five signal sources — Google Alerts, Reddit, Hacker News — feed a daily signal collector. An LLM layer extracts company domains from article headlines. A cluster detector fires when three signals hit the same account within 21 days, with at least one anchor signal tied to QuadSci's core USP: forecast blind spots or NRR pressure. Clustered accounts are enriched via Clay, scored by a rubric that maps to QuadSci's ICP, and passed to a copy generator that writes personalized outbound referencing the specific signals that fired. The operator sees a review queue, clicks Approve, and the email goes out. The whole loop runs on a schedule — 7am daily for signals, every 6 hours for clustering, continuous for scoring and sending."

---

## HOW TO HELP ME

Given all of this context, please help me with [DESCRIBE YOUR SPECIFIC TASK HERE].

Some things you might be asked to help with:
- Debugging an n8n workflow that errored during execution
- Fixing a specific node's JavaScript code
- Updating the submission document
- Writing demo scripts or talking points
- Seeding data into Google Sheets
- Any other part of completing this project

Always ask if you need more detail about any specific workflow before making changes. All JSON edits must be exact — show the exact old text and the exact new text, never "update the code to do X."

=== END PROMPT ===
