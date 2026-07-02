---
allowed-tools: Bash(gh:*), Bash(date:*), Bash(git:*)
description: Generate daily standup summary from recent GitHub PR activity
---

## Context

- Today's date: !`date "+%B %-d, %Y"`
- GitHub username: !`gh api user --jq '.login'`

### Recent PR activity across all repos

#### typescript-monorepo PRs (last 7 days):
!`gh pr list --repo fasteroutcomes/typescript-monorepo --author @me --state all --limit 20 --json number,title,state,url,mergedAt,updatedAt,isDraft,headRefName --jq '.[] | "PR #\(.number): \(.title) | state: \(.state) | merged: \(.mergedAt // "no") | url: \(.url)"'`

#### python-monorepo PRs (last 7 days):
!`gh pr list --repo fasteroutcomes/python-monorepo --author @me --state all --limit 20 --json number,title,state,url,mergedAt,updatedAt,isDraft,headRefName --jq '.[] | "PR #\(.number): \(.title) | state: \(.state) | merged: \(.mergedAt // "no") | url: \(.url)"'`

#### integrations-service PRs (last 7 days):
!`gh pr list --repo fasteroutcomes/integrations-service --author @me --state all --limit 20 --json number,title,state,url,mergedAt,updatedAt,isDraft,headRefName --jq '.[] | "PR #\(.number): \(.title) | state: \(.state) | merged: \(.mergedAt // "no") | url: \(.url)"'`

## Your task

Generate a standup summary using EXACTLY this format. Use the PR data above to populate it. Categorize each PR's status as one of: `merged`, `needs a review`, `working`, `in review`, `draft`.

For "What I am working on today", infer from the open/in-progress PRs and any patterns in the work. If you're unsure, ask.

```
<date as "Dth Month Year" e.g. "3rd April 2026">

What I worked on:
<PR URL> -> <status>
<PR URL> -> <status>
...

What I am working on today:
<brief description of planned work>

Blockers:
<any blockers, or "NA">
```

Output ONLY the standup text in a copy-pasteable format. No extra commentary.
