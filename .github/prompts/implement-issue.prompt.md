---
description: 'Collect context for a single GitHub issue, refine an implementation plan through clarifications, and emit one authoritative comment titled "# Current implementation plan" only after explicit user approval.'

agent: 'agent'
---

# Custom Prompt: Implement Issue (KISS Workflow)

> Purpose: Guide the local Copilot session to (a) collect and refine the implementation plan for a single GitHub issue, (b) output one authoritative comment titled `# Current implementation plan` for that issue, which a later cloud agent can use to implement the change.

---

## 1. Overview

This prompt manages the end-to-end preparation for implementing a GitHub issue:

1. Gather issue metadata and repository context.
2. Ask clarifying questions until the plan is sufficiently detailed.
3. Produce a single, editable comment body (no markers, no versioning) whose first line is exactly `# Current implementation plan`.
4. Wait for user approval before emitting the final plan.
5. After approval, output ONLY the final plan (and do not start code changes unless explicitly requested later).

The cloud agent will later be invoked with a minimal prompt such as:  
`Implement issue #<issueNumber>. Use the issue comment whose first line is "# Current implementation plan".`

---

## 2. Inputs

You may receive (or infer) the following inputs:

- `issueUrl` (REQUIRED)
- `repoOwner` (infer from issue URL)
- `repoName` (infer from issue URL)
- Optional preferences (branch naming, commit conventions)

If `issueUrl` is missing, request it immediately and pause other actions.

---

## 3. Core Responsibilities

The agent must:

- Retrieve issue metadata (title, number, body).
- Extract or ask for:
  - Acceptance criteria (testable statements)
  - Files expected to change
  - Ordered implementation steps
  - Test plan (unit, integration, docs, edge/regression)
  - Examples (configuration/use cases)
  - Risks & mitigations
  - Definition of Done checklist
  - Proposed branch name
  - Optional conventional commit messages
- Validate completeness before finalizing.
- Wait for explicit user approval (`approved`, `go ahead`, `looks good`, etc.).
- Emit the final comment content starting with `# Current implementation plan` (nothing precedes that heading).
- Avoid beginning code changes until the user asks for implementation separately.

---

## 4. Interaction Phases

### Phase A: Initialization
1. Parse/infer `issueUrl` → derive `issueNumber`, `repoOwner`, `repoName`.
2. Confirm detection with the user.
3. Fetch issue metadata; summarize title and body.

### Phase B: Context Refinement
Ask targeted questions for missing fields:
- “List files expected to change.”
- “Provide acceptance criteria as verifiable bullet points.”
- “Confirm branch name or approve suggested one.”

Iterate until all required data is gathered.

### Phase C: Draft Plan
Present a draft (NOT the final comment) summarizing:
- Goal
- Acceptance criteria
- File list
- Steps
- Test plan outline

Invite user adjustments.

### Phase D: Approval Check
On explicit approval (“approved”), proceed. If ambiguous, ask for confirmation.

### Phase E: Final Plan Emission
Output ONLY the final comment body (format spec below). No extra commentary afterward.

### Phase F (Optional)
If user later says “Start implementation,” offer next steps or prepare a separate implementation PR prompt—do not implement prematurely.

---

## 5. Required Data Fields

| Field | Description | Validation |
|-------|-------------|-----------|
| issueNumber | Derived from URL | Positive integer |
| repoOwner | Owner org/user | Non-empty |
| repoName | Repository name | Non-empty |
| branchName | Feature branch (kebab-case) | Non-empty |
| acceptanceCriteria[] | Testable bullets | ≥1 |
| files[] | Relative paths | ≥1 (unless user explicitly says none) |
| implementationSteps[] | Ordered list | ≥3 typical steps |
| testPlan | Unit/Integration/Docs/Edge | Each addressed |
| examples[] | Configs/usages | ≥1 |
| risks[] | Paired with mitigations | Optional but recommended |
| definitionOfDone[] | Completion checklist | ≥3 |
| commitMessages[] | Conventional commits | Optional |

Missing items → ask user. Do not guess uncertain details.

---

## 6. Final Comment Format Specification

First line MUST be exactly:
```
# Current implementation plan
```
No blank lines before it.

Structure:

~~~markdown
# Current implementation plan

```json
{
  "issue": <issueNumber>,
  "repo": "<repoOwner>/<repoName>",
  "branch": "<branchName>",
  "acceptanceCriteria": [
    ...
  ],
  "files": [
    ...
  ],
  "status": "approved"
}
```

## Summary
(Concise rationale and goal.)

## Implementation Steps
1. ...
2. ...
3. ...

## Test Plan
- Unit: ...
- Integration: ...
- Docs: ...
- Edge / Regression: ...
- (Optional) Performance: ...

## Examples
- Example A (minimal): ...
- Example B (alternate usage): ...
- Example C (legacy/backward-compatible): ...

## Risks & Mitigations
- Risk: ...
  - Mitigation: ...
- Risk: ...
  - Mitigation: ...

## Definition of Done
- Item 1
- Item 2
- Item 3
- ...

## Commit Messages (Optional)
- feat(...): ...
- test(...): ...
- docs(...): ...
- chore(...): ...
~~~

Ensure valid JSON and no trailing commentary afterward.

---

## 7. Cloud Agent Retrieval Instructions

Later prompt to cloud agent:
`Implement issue #<issueNumber>. Use the issue comment whose first line is "# Current implementation plan". If absent, request it before proceeding.`

Agent behavior:
- Fetch issue comments.
- Locate the single comment whose first line matches exactly.
- Parse JSON block for structured guidance.
- Execute steps and open PR.

---

## 8. Branch Naming Guidance

Suggested pattern:
- Lowercase
- Replace spaces/non-alphanumerics with hyphens
- Prefix with `feat/`, `fix/`, or `chore/`.

Example:
Issue title: “Allow optional icsUrl for templates using only extraData”  
Suggested: `feat/optional-icsurl-extra-data`  
Accept user override.

---

## 9. Acceptance Criteria Pattern

Each must be:
- Binary (pass/fail).
- Clear and specific.

Example:
- Configuration without `icsUrl` validates.
- Empty events array passed when `icsUrl` absent.
- Existing `icsUrl` configs remain unaffected.
- Documentation marks `icsUrl` optional.
- Tests cover both presence/absence scenarios.

---

## 10. Test Plan Pattern

Encourage coverage:
- Unit: schema changes, utility functions.
- Integration: handler / worker conditional logic.
- Docs: examples align with new behavior.
- Edge: minimal config, legacy config, invalid config missing `template`.
- (Optional) Performance: verify no added latency.

---

## 11. Clarification Prompts

Use concise targeted questions:
- “List the exact files to modify.”
- “Provide at least three acceptance criteria.”
- “Confirm branch name: `<suggestedBranch>` or propose another.”
- “Any risks or non-goals?”

---

## 12. Guardrails

- Do NOT emit final plan before explicit approval.
- Do NOT produce multiple plan comments.
- Restate everything; do not rely on hidden prior context.
- Resolve ambiguities before finalizing.

---

## 13. User Instructions Post-Emission

After final plan output:
1. Paste/edit it into a single issue comment.
2. Avoid creating additional comments with same heading—edit existing.
3. Invoke cloud agent with the minimal kickoff prompt.

---

## 14. Example (For Illustration Only—Do Not Emit Without Request)

~~~markdown
# Current implementation plan

```json
{
  "issue": 3,
  "repo": "jantielens/ha-calendar2image",
  "branch": "feat/optional-icsurl",
  "acceptanceCriteria": [
    "Config validates without icsUrl",
    "Events array [] when icsUrl absent",
    "Backward compatibility maintained",
    "Docs updated marking icsUrl optional",
    "Tests cover both paths"
  ],
  "files": [
    "src/config/schema.js",
    "src/api/handler.js",
    "src/image/worker.js",
    "tests/config/schema.test.js",
    "tests/api/handler.test.js",
    "docs-user/CONFIGURATION.md",
    "config-sample-README.md",
    "CHANGELOG.md"
  ],
  "status": "approved"
}
```
## Summary
...

(Etc.)
~~~

---

## 15. Final Output Rule

Only output the final comment body after approval. Drafts must be clearly labeled (e.g., “Draft plan”) and must NOT start with the heading `# Current implementation plan`.

---

## 16. Approval Keywords

Trigger final emission on:
- `approved`
- `go ahead`
- `looks good`
- `ship it`

Revision triggers:
- `change`
- `adjust`
- `revise`
- `modify`

---

## 17. Non-Goals

If user supplies non-goals, include them in Summary or a brief “Non-Goals” subsection inside the plan (optional).

---

## 18. Error Handling

If issue metadata fetch fails:
- Prompt user to verify URL or supply owner/repo manually.

If acceptance criteria too vague:
- Ask: “Please restate acceptance criteria as clear, testable bullet points.”

---

## 19. Termination

Planning phase ends ONLY after:
- All required fields gathered.
- User approval confirmed.
- Final plan comment emitted cleanly.

---

## 20. Internal Summary

Single authoritative implementation plan comment; heading = `# Current implementation plan`; emit only after explicit user approval; cloud agent later uses that comment verbatim.

---