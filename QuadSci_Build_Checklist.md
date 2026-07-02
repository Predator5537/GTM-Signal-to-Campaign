# QuadSci GTM Demo — Build Checklist
**Interview in 2 days. Complete in order. Do not skip steps.**

---

## PHASE A: Google Sheets (30 min)

- [ ] Open Google Sheets → create a new blank spreadsheet
- [ ] Extensions → Apps Script → delete placeholder code
- [ ] Paste entire contents of `QuadSci_SheetSetup.gs`
- [ ] Click Run → `createQuadSciWorkbook`
- [ ] Authorize Sheets permissions when prompted
- [ ] Confirm 3 tabs exist: **Accounts**, **Signal Log**, **Send Queue**
- [ ] Confirm 3 rows in Accounts: acme.com (T1), betatech.com (T2), gammasaas.com (T3)
- [ ] Confirm Send Queue row 2 (Acme Corp) has `send_status = queued` and `action = APPROVE`
- [ ] Copy the Spreadsheet ID from the URL → save it somewhere (needed for both Apps Script files)

---

## PHASE B: Apps Script Send Shim (30 min)

- [ ] In the SAME Google Sheet: Extensions → Apps Script → add a new script file (name it `QuadSci_SendShim`)
- [ ] Paste entire contents of `QuadSci_SendShim.gs` into that file
- [ ] Go to **Project Settings** (gear icon, left sidebar) → **Script Properties** → add these 3 properties:

  | Property | Value |
  |---|---|
  | `SHEET_ID` | (paste your Spreadsheet ID from Phase A) |
  | `DEMO_EMAIL` | `pmukhopadhyay5537@gmail.com` |
  | `DEMO_MODE` | `true` |

- [ ] Click **Run → `setupTriggers`** — authorize Gmail + Sheets permissions when prompted
- [ ] Confirm "Triggers installed" message appears
- [ ] Check Apps Script → Triggers (left sidebar) — should see `sendQueuedEmails` (every 5 min) and `checkForReplies` (every 15 min)

---

## PHASE C: Clay Table (2–2.5 hours — follow QuadSci_Clay_Build_Guide.html)

- [ ] Log into clay.com (free tier)
- [ ] New Table → Import from Google Sheets → select the spreadsheet from Phase A → choose **Accounts** tab → primary key = `domain`
- [ ] Confirm 3 rows appear: acme.com, betatech.com, gammasaas.com
- [ ] **Phase 1 — Cluster / ICP formulas (cols 14–15)**
  - [ ] `cluster_qualified` formula column
  - [ ] `icp_pass` formula column
  - [ ] Verify: all 3 rows show TRUE for both (they all pass for the demo)
- [ ] **Phase 2 — Enrichment (cols 16–18)** — SET CONDITIONAL BEFORE ENRICHING
  - [ ] `find_company_enrichment` — conditional: `icp_pass = true` → Enrich All
  - [ ] `buyer_found` formula column = `{find_person.name} != ""`
  - [ ] `find_person` — conditional: `icp_pass = true` → Enrich All
  - [ ] `find_email` — conditional: `buyer_found = true` → Enrich All (optional for demo)
  - [ ] Confirm all 3 accounts found a buyer (should find Jane Park, Marcus Lee, Alex Torres or similar)
- [ ] **Phase 3 — Scoring (cols 19–23)**
  - [ ] `firmographic_score` formula
  - [ ] `signal_score` formula
  - [ ] `tech_score` formula
  - [ ] `total_score` formula
  - [ ] `tier` formula
  - [ ] **Verify scores:** Acme Corp ~83 (Tier 1), Beta Tech ~68 (Tier 2), Gamma SaaS ~47 (Tier 3)
- [ ] **Phase 4 — AI Columns (cols 24–25)** — CHECK CONDITIONAL BEFORE RUNNING
  - [ ] `email_subject` AI column — conditional: `tier != "Discard" AND buyer_found = true` → Run All
  - [ ] `email_body` AI column — same conditional → Run All
  - [ ] **Read the Tier 1 email out loud** — check it references the G2 review or earnings call
  - [ ] **Read the Tier 2 email** — check it opens with a pattern observation, NOT a signal callout
  - [ ] **Read the Tier 3 email** — check it's educational, no meeting request
- [ ] **Phase 5 — Review columns (cols 26–28)**
  - [ ] Add `action` dropdown column (values: APPROVE, REJECT, EDIT)
  - [ ] Add `your_edits` text column
  - [ ] Add `send_status` text column
  - [ ] Set Acme Corp's `action` = APPROVE (for demo)

---

## PHASE D: End-to-End Test (30 min)

- [ ] In Google Sheet → Send Queue tab → confirm Acme Corp row has `send_status = queued`
- [ ] In Apps Script editor → Run → `runDemoSendNow`
- [ ] Confirm execution log shows: "SENT: row 2 | to: pmukhopadhyay5537@gmail.com"
- [ ] Open Gmail → Sent folder → confirm email is there
- [ ] Open Gmail → Inbox → confirm email arrived at pmukhopadhyay5537@gmail.com
- [ ] Read the email — confirm subject is "When Gainsight catches it too late"
- [ ] Confirm NO em-dashes in the email body
- [ ] Confirm closing line: "Surprise churn is a visibility problem, not a CSM skill problem."
- [ ] Back in Google Sheet → Send Queue → Acme Corp row shows `send_status = sent`
- [ ] Confirm Beta Tech and Gamma SaaS rows still show `send_status = not_sent_mvp_watchlist`

---

## PHASE E: Demo Day Prep (15 min, day before interview)

- [ ] Reset Acme Corp Send Queue row: change `send_status` back to `queued` (so you can demo the live send)
- [ ] Clear `sent_at`, `delivery_status`, `thread_id` fields on Acme Corp row
- [ ] Confirm Clay table still loads with all 3 accounts and correct scores
- [ ] Open the demo runbook (§11 of the PRD) and do one dry run out loud, timer on
- [ ] Keep this tab open during interview: Google Sheets Send Queue (you'll switch to it during step 3 of demo)
- [ ] Keep this tab open: Apps Script editor (you'll click Run → runDemoSendNow during step 7)

---

## If Something Breaks

| Problem | Fix |
|---|---|
| Clay formula returns error | Column names are case-sensitive. Check `{signal_count}` exactly matches the column name in Clay. |
| Find Person returns no results | For demo, it's fine — buyer data is pre-populated in the Send Queue sheet. Skip enrichment, demo still works. |
| Apps Script can't find sheet | Double-check SHEET_ID in Script Properties. It's the string between `/d/` and `/edit` in the Google Sheets URL. |
| Email not in inbox | Gmail has a 1–2 min delay. Check Spam folder. Also confirm DEMO_EMAIL property is set correctly. |
| Clay AI column produces em-dashes | The demo email in Send Queue is already clean (pre-written from the PRD). You can demo from the Send Queue copy instead of the Clay-generated copy. |
