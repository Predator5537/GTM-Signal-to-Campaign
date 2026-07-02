# QuadSci — GTM Engineer Exercise
## Signal-to-Campaign Workflow — Product Requirements Document

*May 2026 | Confidential | Principal PM Framework Applied*

> This PRD documents the current v1 system that is built and functional today: a six-workflow n8n + Google Sheets signal-to-campaign demo with simulated enrichment and a human approval gate. There is no Clay-native v2 in scope.

---

# 1. Executive Summary

This document defines the QuadSci signal-to-campaign workflow that is currently built, testable, and demo-ready. The purpose of the system is simple: detect public buying signals from high-fit B2B SaaS accounts, identify when those signals form a meaningful cluster, score the account against QuadSci's ICP, generate personalized outbound copy, and require an explicit human approval before any email is sent.

The strategic assertion behind the build is unchanged: a single signal is noise; a cluster of signals from the same account inside a short time window is materially more predictive of real buyer intent. The current v1 system operationalizes that thesis end-to-end using six n8n workflows, Google Sheets as the system of record, OpenRouter for scoring and copy generation, and Gmail for safe demo-mode sending.

The system is deliberately scoped for clarity and capital efficiency. It proves the core loop works without pretending unfinished pieces are live. The only intentional manual seam is enrichment: buyer data is pre-populated for the demo, and the operator manually advances qualified accounts from Pending Enrichment to Enriched so the rest of the pipeline runs deterministically.

---

# 1.5 What Is Built and Working Today

This section describes only the version that exists and functions now. It excludes deprecated concepts, speculative architecture, and any Clay-native migration narrative.

| Layer | Tool | What it does in the current functional build |
|---|---|---|
| **Orchestration** | n8n (self-hosted, local) | Six workflows: WF1 signal collection, WF2 Hacker News collection, WF3 cluster detection, WF4 AI scoring, WF5 copy generation, WF6 approval monitoring and send. |
| **Data layer** | Google Sheets | Three tabs are the working system of record: **Signal Log**, **Scored Accounts**, and **Review Queue**. |
| **Signal sources** | Google Alerts RSS, Reddit JSON, Hacker News Algolia API | Free public sources feed the workflow with job-posting, G2 review, NRR / renewal-pain, leadership-hire, and earnings-style signals. |
| **Domain extraction** | OpenRouter via n8n | WF1 uses an LLM step to map article headlines to company domains so signals can be attributed to actual accounts instead of publisher URLs. |
| **Enrichment** | Simulated in v1 | Buyer Contacts is pre-filled for the demo. After WF3 writes a qualified account to Scored Accounts as **Pending Enrichment**, the operator manually changes status to **Enriched**. This is the only intentional manual seam in the current build. |
| **Scoring** | OpenRouter `moonshotai/kimi-k2-0905` via n8n | WF4 reads one Enriched account at a time, applies the ICP scoring rubric, returns a total score and tier, and routes qualified accounts forward. |
| **Copy generation** | OpenRouter `moonshotai/kimi-k2-0905` via n8n | WF5 generates one personalized email per buyer using the account's actual observed signals and the buyer's role context. |
| **Approval gate** | Google Sheets Review Queue | WF5 writes draft emails to Review Queue. A human must type **APPROVE** before any email can be sent. **REJECT** rows are skipped. |
| **Send** | Gmail via n8n OAuth | WF6 polls Review Queue, sends only approved rows with empty Send Date, appends a deterministic signature, and writes back the send state. Demo-mode routing sends to a safe inbox instead of a real prospect. |

### Live demo surface area

The current v1 demo can show the full working loop in plain English:

1. WF1 and WF2 collect public signals and write them into Signal Log.
2. WF3 detects when a company has a valid cluster of signals and writes the company to Scored Accounts as **Pending Enrichment**.
3. The operator advances the row to **Enriched** after confirming the pre-filled buyer/contact data is present.
4. WF4 scores the account and routes Tier 1 / Tier 2 accounts to WF5.
5. WF5 writes one email draft per buyer to Review Queue.
6. WF6 sends only rows explicitly marked **APPROVE** and ignores **REJECT** rows.

### Demo configuration used now

The current demo configuration uses two accounts:

- **Gong (`gong.io`)** with **2 buyer contacts**.
- **HubSpot (`hubspot.com`)** with **1 buyer contact**.

That means a complete current demo run produces **3 Review Queue rows total**: two for Gong and one for HubSpot.

---

# 2. Problem Definition

QuadSci sells into B2B SaaS revenue teams that are trying to forecast renewals and churn using signals that often arrive too late to change the outcome. Publicly observable behavior can reveal that pain before a formal buying process begins, but finding those signals manually across multiple sources is slow, inconsistent, and difficult to operationalize.

The problem this project solves is not generic outbound automation. The problem is how QuadSci's GTM team can systematically detect accounts that are likely feeling forecast blind spots or NRR pressure, convert that signal cluster into a prioritized account, and turn it into specific, signal-grounded outreach without creating unacceptable brand risk.

## 2.1 What We Are Not Doing

- **Not building a general marketing automation platform.** This system is intentionally narrow: signal detection, qualification, drafting, approval, and send.
- **Not pretending enrichment is fully automated.** In the current build, enrichment is simulated to keep the rest of the system deterministic and demoable.
- **Not optimizing for high-volume outbound.** The design favors precision and relevance over volume.
- **Not introducing paid tooling or speculative architecture into the working story.** The interview panel should evaluate the built system, not roadmap fiction.

---

# 3. Target Customer Segment (ICP)

| ATTRIBUTE | QUALIFICATION CRITERIA |
|---|---|
| Company type | B2B SaaS with product telemetry that can, in principle, support usage-based renewal intelligence |
| Company size | 200+ employees preferred; 100+ minimum for scoring consideration |
| Funding stage | Series B minimum; Series C+ preferred |
| Revenue | $50M+ ARR preferred |
| Primary buyers | CRO, VP Revenue Operations, VP Customer Success, Chief Customer Officer |
| Problem signal | Public evidence of NRR pressure, renewal forecasting pain, CS tooling strain, or leadership change tied to CS / RevOps |
| Geography | North America primary |

## 3.1 Hard Disqualifiers

- Sub-scale companies with weak GTM complexity
- Pre-Series B companies
- Non-B2B products
- Accounts already known to be active customers or active opportunities

---

# 4. Strategic Thesis

A single external signal rarely justifies outbound action. Multiple relevant signals from the same account in a short window are far more useful because they reduce noise and increase confidence that the company is experiencing a real, current problem.

The build encodes that thesis in a simple, inspectable way: monitor public sources, normalize signals into a common structure, group them by company domain, require a minimum cluster threshold, then route only qualified accounts into scoring and outbound drafting. The architecture is intentionally simple because trust, explainability, and demo reliability matter more than theoretical completeness at this stage.

---

# 5. Opportunity Quantification

The immediate opportunity is not full market capture. The immediate opportunity is to prove that a small, capital-efficient system can identify a narrower pool of higher-intent accounts than generic cold outbound and move them into human-reviewed outreach with much less manual research time.

If the system can repeatedly surface qualified accounts with better relevance and better reply quality than baseline outbound, it creates leverage in three places: account prioritization, personalization quality, and GTM operator time. The current build is therefore a validation harness for the signal-cluster thesis, not a claim of scaled production coverage.

---

# 6. Workflow Architecture

The current system consists of six workflows and one shared Google Sheet. Each workflow owns a discrete step in the signal-to-campaign loop.

| Workflow | Purpose | Current behavior |
|---|---|---|
| **WF1 — Signal Collector** | Collect signals from Google Alerts and Reddit | Ingests signals, batches headlines, extracts company domains with an LLM, and appends normalized rows to Signal Log. |
| **WF2 — Hacker News Collector** | Add HN / Algolia discussions to the same schema | Polls HN-related discussions and writes them into Signal Log. |
| **WF3 — Cluster Detector** | Detect account-level intent clusters | Groups signals by company domain, applies the cluster threshold, and writes qualifying accounts to Scored Accounts as **Pending Enrichment**. |
| **WF4 — AI Scorer** | Score enriched accounts against the ICP rubric | Processes one Enriched account per run, calculates score and tier, and routes Tier 1 / Tier 2 accounts to WF5. |
| **WF5 — Copy Generator** | Generate personalized email drafts | Produces one draft per buyer and writes results into Review Queue. |
| **WF6 — Approval Monitor** | Enforce human approval before send | Sends only APPROVE rows with no Send Date, writes the send date, and prevents duplicate sends. |

### State model

The current working status flow is:

`Pending Enrichment -> Enriched -> Scoring In Progress -> Scored -> In Review Queue -> Sent`

This state model matters because it makes the system inspectable in Sheets and easy to explain during the interview.

## 6.1 Cluster Definition

| CLUSTER CRITERION | CURRENT RULE |
|---|---|
| Minimum signals | 3 signals from the same account |
| Time window | 21 days |
| Required anchor signal | At least one anchor signal such as a G2-style review or public NRR / churn pressure statement |
| Output | Write the account to Scored Accounts for downstream handling |

---

# 7. Scoring and Enrichment

## 7.1 Current enrichment model

Enrichment is not automated end-to-end in the current build. That is intentional, and the PRD should state it plainly.

For the demo, buyer contact data is already present in the Buyer Contacts tab. Once WF3 has created a qualified account in Scored Accounts, the operator verifies the contact data and manually changes the account status from **Pending Enrichment** to **Enriched**. That action is the handoff into WF4.

This design keeps the live demo honest. It shows exactly where automation exists, exactly where it does not, and avoids presenting unfinished infrastructure as if it were operational.

## 7.2 Scoring model

WF4 applies a weighted rubric that combines:

- Firmographic fit
- Signal strength
- Tech-stack fit

The output is a total score and a priority tier. Tier 1 and Tier 2 accounts continue to personalized copy generation; lower-quality accounts do not proceed into the review queue.

## 7.3 Current buyer-contact configuration

The system supports multiple buyers per account because WF5 writes one row per buyer into Review Queue. The current functional demo is configured as follows:

- Gong: 2 buyers
- HubSpot: 1 buyer

This matters because it demonstrates that the workflow can fan out from one qualified account into multiple buyer-specific drafts while keeping scoring at the account level.

---

# 8. Personalized Copy Generation

The goal of copy generation is not to produce generic cold email at scale. The goal is to produce short, role-aware outreach that references the actual signals observed on the account and connects them to QuadSci's value proposition in plain language.

WF5 is triggered by WF4 for qualified accounts and uses the same OpenRouter model as scoring: `moonshotai/kimi-k2-0905`. There is no separate Python pipeline, no Claude-based side system, and no off-workflow copy engine in the current build. Copy generation happens inside n8n.

The prompt is designed to enforce a few hard rules: reference real signals, avoid generic AI phrasing, avoid invented numbers, and keep the tone specific and credible. This is a quality-control mechanism, not a stylistic preference.

## 8.1 Output behavior

For each buyer attached to a scored account, WF5 writes a Review Queue row containing:

- Company domain and company name
- Buyer name, title, and email
- Total score and tier
- Generated email copy
- Empty approval fields for human action

---

# 9. Review and Send Mechanism

A workflow that generates copy but sends without controls is not acceptable. The approval layer is therefore part of the product logic, not an afterthought.

## 9.1 Review Queue

Review Queue is the operator-facing control surface. It is where the GTM user sees generated drafts and decides what happens next.

The current working behavior is straightforward:

- If **Your Action = APPROVE** and **Send Date is empty**, WF6 sends the email.
- If **Your Action = REJECT**, WF6 does nothing.
- After send, WF6 writes back the send state so the same row is not processed twice.

In demo mode, all sends are routed to a safe inbox rather than a live prospect inbox. This protects brand risk during evaluation and makes the system safe to demonstrate repeatedly.

## 9.2 Approval logic

The human gate exists for three reasons:

- Prevent false positives from sending automatically
- Catch copy issues or factual drift before send
- Preserve brand trust when using AI-assisted outbound

This is the correct tradeoff for the current stage of the system.

---

# 10. Tradeoffs

## 10.1 What we chose deliberately

- **Precision over volume.** The system is built to surface fewer, better accounts rather than automate mass outbound.
- **Inspectability over hidden complexity.** Google Sheets as the system of record makes every step easy to inspect during the interview.
- **Manual seam over fake automation.** Simulated enrichment is preferable to claiming a closed loop that does not actually exist.
- **Safety over full autonomy.** Human approval remains mandatory before send.

## 10.2 What we are not doing

- Building a Clay-native operating model
- Claiming production-grade enrichment automation
- Adding speculative roadmap items to the demo story
- Optimizing Tier 2 / Tier 3 sequence automation in this project

---

# 11. Risk Register

| RISK | WHY IT MATTERS | CURRENT MITIGATION |
|---|---|---|
| Missing or weak public signals | Some good accounts will never enter the workflow | Accept lower coverage in exchange for free tooling and explainable logic |
| Incorrect domain attribution | Bad attribution breaks cluster quality | WF1 uses an LLM extraction step and drops rows where the company domain remains unknown |
| False-positive account clusters | Poor clusters create wasted scoring and poor outreach | WF3 requires multiple signals in a 21-day window and at least one anchor signal |
| Buyer/contact mismatch | Wrong contacts create poor drafts or failed sends | Buyer Contacts is verified in the sheet before advancing to Enriched |
| AI factual drift in copy | Brand risk if the email invents facts | Human review is required before send |
| Duplicate sends | Reprocessing a row damages trust | WF6 sends only rows with empty Send Date and writes back send state |

---

# 12. Kill Criteria

The current build should be reconsidered if any of the following become persistently true in live use:

- Signal quality is too weak to produce enough valid clusters to justify operator time
- The false-positive rate is high enough that most drafts are rejected
- Review burden outweighs the value of the generated drafts
- The workflow cannot consistently produce trustworthy, signal-grounded copy
- Safety controls fail or the system risks sending to unintended recipients

These are not theoretical concerns. They are the actual failure modes of this design.

---

# 13. Metrics Framework

The metrics that matter for this build are the ones that test the core thesis, not vanity throughput.

| METRIC | WHY IT MATTERS |
|---|---|
| Signal rows with usable company domains | Tests whether the ingestion layer creates attributable account data |
| Qualified clusters created | Tests whether the cluster logic produces enough downstream candidates |
| Enriched accounts advanced to scoring | Tests handoff health across the manual seam |
| Review Queue rows with complete buyer and score data | Tests that WF4 and WF5 are functioning correctly |
| Approval-to-send success rate | Tests whether WF6 reliably executes the final step |
| Rejection rate | Tests signal quality, scoring quality, and copy quality together |

---

# 14. Financial Impact

## 14.1 Current cost structure

The current working system is intentionally capital efficient.

| TOOL | CURRENT COST | ROLE IN THE FUNCTIONAL BUILD |
|---|---|---|
| n8n (self-hosted, local) | $0 | Orchestration across all six workflows |
| Google Sheets | $0 | System of record and operator UI |
| Google Alerts, Reddit JSON, Hacker News Algolia | $0 | Public signal collection |
| OpenRouter (`moonshotai/kimi-k2-0905`) | $0 in current setup | Scoring and copy generation |
| Gmail via n8n OAuth | $0 | Safe demo-mode send |
| Simulated enrichment | $0 | Manual seam used to keep the demo deterministic |
| **Total** | **$0/month** | **Functional v1 demo build** |

## 14.2 Economic logic

The economic argument for this project is straightforward: if a zero-hard-cost workflow can surface better-fit accounts and produce better outreach than generic outbound, then the operator time required to review and approve those drafts is economically justified. The purpose of the current version is to validate that thesis, not to claim fully scaled production ROI.

---

# 15. Honest Assessment of Limits

This build has real limitations and the PRD should state them plainly.

- **Coverage is incomplete.** Accounts that do not emit public signals will not be discovered.
- **Enrichment is manual in practice.** The system does not currently close the loop automatically.
- **Scoring quality is only as good as the rubric and available account data.**
- **Copy still requires human judgment.** The approval gate is necessary, not optional.

Those limitations do not invalidate the build. They define the boundary of what is actually working today.

---

# 16. Out of Scope

The following are explicitly out of scope for this PRD and should not appear in the interview narrative as if they are part of the current build:

- Clay-native v2 architecture
- Full closed-loop enrichment callback automation
- Paid data providers or paid signal expansion
- Automated multi-step sequencing beyond the current approval-and-send flow

This document is intentionally constrained to the system that exists and runs now.
