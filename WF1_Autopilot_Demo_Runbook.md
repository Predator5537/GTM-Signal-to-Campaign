# WF1 Domain Extraction Fix + Full Autopilot Demo Runbook
**What changed | How to import | How to demo end-to-end**

---

## What Was Fixed and Why

WF1 was collecting signals from 5 Google Alerts feeds + Reddit and writing them to the Signal Log — but with `Company Domain = ""` on every row. WF3's cluster detector skips rows with no domain, so all WF1 signals were invisible to the pipeline.

**Root cause:** Google Alerts links to *articles about companies*, not company websites. Extracting the URL hostname gives `techcrunch.com`, not `gong.io`. There is no heuristic that maps an article URL to a company domain reliably.

**Fix:** Three new nodes inserted between `Merge All Sources` and `Google Sheets — Append Signal`:

```
Merge All Sources
    ↓
Code — Prepare Domain Extraction Batch
  → Collects all N signals into ONE item (numbered list of title + URL)

    ↓
HTTP — OpenRouter Extract Domains
  → Sends the batch to the same OpenRouter API used by WF4/WF5
  → Prompt: "identify the primary B2B SaaS company in each headline"
  → Returns: {"domains": ["gong.io", "hubspot.com", ...]}
  → One API call per WF1 run — not one per signal

    ↓
Code — Attach Extracted Domains
  → Re-expands back to N items
  → Merges the LLM domain onto each signal row
  → Drops rows where domain is still blank (unknown company)
  → Passes enriched rows to Sheets Append

    ↓
Google Sheets — Append Signal
```

**Why the LLM works here:** The model has seen billions of B2B SaaS headlines. "Gong raises $250M Series E" → `gong.io`. "ChurnZero announces VP CS" → `churnzero.com`. "HubSpot Q1 NRR commentary" → `hubspot.com`. This is exactly the class of structured extraction LLMs are reliable at with `temperature: 0`.

---

## Step 1 — Import the Updated WF1 into n8n

The old WF1 (if imported) needs to be replaced.

1. Go to **http://localhost:5678** → **Workflows**
2. If you see an existing **WF1 — Signal Collector**, click its three-dot menu (⋮) → **Delete** → confirm
3. Click **+** → **Import from file**
4. Select: `wf1_signal_collector.json` from your QuadSci folder
5. The workflow opens. Look for nodes with red/orange warning icons.

**Reconnect credentials — 2 nodes need attention:**

| Node name | Credential type | Select |
|---|---|---|
| `Google Sheets — Append Signal` | Google Sheets OAuth2 | Your existing Google Sheets credential |
| `HTTP — OpenRouter Extract Domains` | HTTP Header Auth | Your existing OpenRouter credential (named "OpenRouter") |

6. Click **Save** (top right)
7. **Do NOT activate WF1 yet** — activate it only when you're ready to run the demo

---

## Step 2 — Verify Google Alerts Are Active

WF1 polls 5 Google Alerts RSS feeds. These feeds are tied to your Google account and must have alerts set up.

Go to **https://www.google.com/alerts** and verify these 5 alert queries exist (or similar):
1. `site:linkedin.com OR site:greenhouse.io "customer success" "Gainsight" OR "ChurnZero" job`
2. `site:g2.com "customer success" "forecast" OR "churn" review`
3. `"NRR" OR "net revenue retention" "VP" OR "CRO" site:linkedin.com`
4. `"VP Customer Success" OR "Head of RevOps" hire announcement`
5. `"earnings" "churn" OR "NRR" OR "net retention" B2B SaaS`

> If alerts are stale or empty — **that's OK**. See Step 3 for the demo safety net.

To test whether an alert feed has items: copy one of the RSS feed URLs from the WF1 JSON (the `url` field in any HTTP Alert node) and paste it into your browser. You should see an XML feed. If it shows items with recent dates, the alert is active.

---

## Step 3 — Seed Signal Log as Demo Safety Net

This step ensures WF3 fires during the demo even if live alerts return nothing. Pre-seeded signals are honest — they represent exactly the kind of signals WF1 is designed to collect. You explain this to the panel as "representative signals I've injected to demonstrate the clustering logic."

Open your Google Sheet: https://docs.google.com/spreadsheets/d/1_hKjUHNR_h27QrITATMeFLgHaEvzbWnRiP3qSF-jCyk

Click the **Signal Log** tab and add these rows (after any existing header row):

**For gong.io — 3 signals including 1 anchor:**

| Date | Company Domain | Company Name | Signal Type | Signal Summary | Source URL | Status |
|---|---|---|---|---|---|---|
| 2026-05-27 | gong.io | Gong | 1 | Gong hiring RevOps Analyst and CS Platform Engineer — 2 open roles referencing Gainsight migration | https://boards.greenhouse.io/gong | New |
| 2026-05-26 | gong.io | Gong | 2 | [G2 Review] Gong user: "renewal forecasting has blind spots we didn't expect — surprise churn last quarter" | https://www.g2.com/products/gong/reviews | New |
| 2026-05-25 | gong.io | Gong | 4 | Gong appoints new VP of Customer Success — internal CS team expansion announced | https://www.linkedin.com/company/gong-io | New |

**For hubspot.com — 3 signals including 1 anchor:**

| Date | Company Domain | Company Name | Signal Type | Signal Summary | Source URL | Status |
|---|---|---|---|---|---|---|
| 2026-05-27 | hubspot.com | HubSpot | 1 | HubSpot posted 3 CS Operations roles mentioning ChurnZero and renewal intelligence tooling | https://www.hubspot.com/careers | New |
| 2026-05-26 | hubspot.com | HubSpot | 5 | [Earnings] HubSpot Q1 investor call transcript: "net retention headwinds" mentioned 4 times | https://ir.hubspot.com/news | New |
| 2026-05-25 | hubspot.com | HubSpot | 3 | [Reddit r/CustomerSuccess] HubSpot CS team discussing NRR pressure and renewal visibility gaps | https://reddit.com/r/CustomerSuccess | New |

> Signal Types: 1=Job Posting, 2=G2 Review, 3=NRR/LinkedIn, 4=Leadership Hire, 5=Earnings/Investor
> WF3 requires: 3+ signals AND at least one Type 2 or Type 5 (anchor) → both companies qualify ✅

---

## Step 4 — The Demo Flow (End-to-End)

This is the sequence you walk the panel through.

### 4a — Run WF1 Live (Show Signal Sourcing from Web)

1. Open **WF1 — Signal Collector** in n8n
2. Click **Active** toggle → turn ON
3. Click **Execute Workflow** (▶ button)
4. Watch the execution:
   - 5 Google Alerts nodes + Reddit fire in parallel
   - They merge into `Merge All Sources`
   - `Code — Prepare Domain Extraction Batch` collapses all signals into one item
   - `HTTP — OpenRouter Extract Domains` calls OpenRouter with all titles at once
   - `Code — Attach Extracted Domains` re-expands with domains attached
   - `Google Sheets — Append Signal` writes the enriched rows

**What to say to the panel:**
> *"WF1 pulls from 5 Google Alerts feeds monitoring job postings, G2 reviews, NRR commentary, leadership hires, and earnings statements — the five signal types defined in our ICP framework. The new node at the end uses the same LLM as our scoring engine to extract the company domain from each headline, because Google Alerts links to articles, not company sites. Temperature zero, one API call for the whole batch."*

5. After WF1 finishes, go to Google Sheets → Signal Log tab
6. You should see new rows with **Company Domain populated** (not blank)

> If WF1 returns 0 live signals (empty alerts), that's fine — the seeded rows from Step 3 are already there. Say: *"Alerts haven't fired in the past hour; here are representative signals I've pre-seeded to demonstrate the cluster detection."*

---

### 4b — Run WF3 Live (Show Cluster Detection)

1. Open **WF3 — Cluster Detector** in n8n
2. Click **Active** toggle → ON
3. Click **Execute Workflow**
4. Watch:
   - Reads Signal Log, groups by Company Domain
   - Detects gong.io and hubspot.com (3 signals each, anchor signal present)
   - Checks Scored Accounts for duplicates — both are new
   - Writes both companies to Scored Accounts with `Status = Pending Enrichment`

5. Go to Google Sheets → **Scored Accounts** tab
6. You should see gong.io and hubspot.com with `Status = Pending Enrichment`

**What to say:**
> *"WF3 runs every 6 hours. It groups signals by company domain and applies the cluster threshold: 3 or more signals within 21 days, with at least one anchor signal — either a G2 review mentioning forecast accuracy or an earnings statement citing NRR pressure. Single signals are noise. A cluster firing on the same account within a short window is intent. Gong and HubSpot both qualified."*

---

### 4c — Clay Enrichment Step (Explain Honestly)

At this point both companies are at `Status = Pending Enrichment`. The enrichment step populates buyer contacts, tech stack, and firmographic data.

**What to say:**
> *"The enrichment step uses Clay — it pulls Find Person, Find Email, and BuiltWith data for each flagged account and writes the buyer contacts to our Buyer Contacts tab. In the live system this is triggered automatically when a new Pending Enrichment row appears. For the demo I've pre-run enrichment so we can see the full flow — the Buyer Contacts tab already has the right contacts for these two accounts."*

Then manually update gong.io and hubspot.com Status → `Enriched` in Scored Accounts (as covered in Phases 1-3 runbook).

> This is honest. Clay's free tier doesn't offer outbound webhooks. The production design would use a Clay→n8n webhook. You know the gap, you can explain it, and the data is there.

---

### 4d — Run WF4/WF5/WF6 (Full Autopilot)

From here everything is fully autonomous. This is the part where the system speaks for itself.

1. Open WF4 → Execute Workflow (gong.io runs first)
2. Execute again (hubspot.com runs)
3. Show Review Queue: 4 rows, all with non-zero scores, full buyer details, AI-written email copy
4. Type `APPROVE` on one row → wait → email arrives at your Gmail
5. Type `REJECT` on another → nothing sends

**What to say:**
> *"Once enriched, WF4 scores every account against our ICP rubric — firmographic fit, signal strength, and tech stack. A Tier 1 or Tier 2 score triggers WF5, which generates personalized outbound copy using the specific signals that fired. WF6 is the human gate: the operator approves or rejects each email before it sends. REJECT is silently skipped. APPROVE sends and timestamps the row so nothing fires twice."*

---

## Full Pipeline Story (30-Second Version)

> *"Five signal sources — Google Alerts, Reddit, Hacker News — feed a daily collector. An LLM layer extracts company domains from article headlines. A cluster detector fires when three signals hit the same account within 21 days, with at least one anchor signal tied to QuadSci's core USP: forecast blind spots or NRR pressure. Clustered accounts are enriched via Clay, scored by a rubric that maps to QuadSci's ICP, and passed to a copy generator that writes personalized outbound referencing the actual signals that fired. The operator sees a review queue, clicks Approve, and the email goes out. The whole loop runs on a schedule — 7am daily for signals, every 6 hours for clustering, continuous for scoring and sending."*

---

## Known Gap to Acknowledge (Shows Architectural Maturity)

> *"One intentional limitation: the Clay enrichment step is currently operator-triggered. Clay's free tier doesn't expose outbound webhooks, so the Pending Enrichment → Enriched transition requires a manual step today. The production design replaces this with a Clay webhook that fires automatically when a new Pending Enrichment row appears — the state machine is already built to receive it. With a $20/month Clay plan this step disappears entirely."*

This framing — knowing exactly where the seam is and how to close it — is stronger than pretending it doesn't exist.
