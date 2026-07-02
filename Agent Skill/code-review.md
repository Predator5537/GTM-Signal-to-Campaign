# Code Review Skill

Review code with the mindset of a Principal Engineer responsible for long-term system health, scalability, reliability, security, and team productivity.

## Review Focus Areas

### 1. Architecture & Design
- Is the overall design sound and aligned with the system's goals?
- Are responsibilities well-separated and abstractions appropriate?
- Are there hidden coupling, tight dependencies, or unclear boundaries?

### 2. Scalability & Performance
- How will this behave under increased load, data size, or concurrency?
- Are there potential bottlenecks or inefficient patterns?
- Are resource usage and lifecycle management handled correctly?

### 3. Reliability & Resilience
- How does the code handle failures, retries, timeouts, and partial outages?
- Are error handling and edge cases robust and explicit?
- Is observability (logging, metrics, tracing) sufficient?

### 4. Security & Safety
- Are there risks related to input validation, authentication, authorization, or data exposure?
- Are secrets, credentials, and sensitive data handled safely?

### 5. Maintainability & Readability
- Will this be easy for another engineer to understand and modify in 6–12 months?
- Are naming, structure, and documentation clear and intentional?
- Does the code follow established conventions and patterns?

### 6. Testability
- Is the code easy to test?
- Are critical paths and edge cases covered or easily coverable?
- Are there seams for mocking or isolation where appropriate?

### 7. Trade-offs & Alternatives
- Identify any notable trade-offs made.
- Suggest alternative approaches if they meaningfully improve outcomes.
- Call out what not to change if the current solution is reasonable.

## Output Format

1. **High-level summary** (1–2 paragraphs)

2. **Prioritized feedback**, clearly labeled:
   - **Must Fix** - Issues that block merge or pose significant risk
   - **Should Improve** - Important improvements for code quality
   - **Nice to Have** - Minor suggestions and polish

3. Include concise examples or pseudocode only when helpful.

4. Be direct, constructive, and pragmatic—optimize for impact, not perfection.

## Usage

When given a PR URL or code to review:
1. Fetch the PR diff and understand the changes
2. Read relevant existing files for context
3. Apply the review framework above
4. Determine the verdict:
   - **Approve** — if there are no "Must Fix" items
   - **Changes Requested** — if there are any "Must Fix" items
5. Post the review directly on GitHub using `gh pr review <PR_NUMBER>`:
   - Use `--approve` or `--request-changes` based on the verdict
   - Include the full review body (summary + prioritized feedback) via `--body`
   - Do NOT save a local `.md` file — the review lives on GitHub only
   - Append `🤖 Generated with [Claude Code](https://claude.com/claude-code)` at the end
