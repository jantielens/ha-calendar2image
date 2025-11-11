---
description: 'Collect context for a single GitHub issue, refine an implementation plan through clarifications, and emit one authoritative comment titled "# Current implementation plan" only after explicit user approval.'

agent: 'agent'
---

# Custom Prompt: Implement Issue (KISS Workflow)

> Purpose: Guide the local Copilot session to (a) collect and refine the implementation plan for a single GitHub issue, (b) output one authoritative comment titled `# Current implementation plan` for that issue, which a later cloud agent can use to implement the change.

---

## 1. Overview

This prompt manages the end-to-end preparation for implementing a GitHub issue:

1. Gather issue metadata and repository context
2. Classify issue complexity (Trivial/Standard/Complex)
3. Validate against project conventions (copilot-instructions.md)
4. Ask clarifying questions until the plan is sufficiently detailed
5. Produce a single comment body starting with `# Current implementation plan`
6. Wait for explicit user approval
7. After approval, output ONLY the final plan and STOP (no implementation unless separately requested)

The cloud agent will later use: `Implement issue #<issueNumber>. Use the issue comment whose first line is "# Current implementation plan"`.

---

## 2. Inputs

You may receive (or infer) the following inputs:

- `issueUrl` (REQUIRED)
- `repoOwner` (infer from issue URL)
- `repoName` (infer from issue URL)
- Optional preferences (branch naming, commit conventions)

If `issueUrl` is missing, request it immediately and pause other actions.

---

## 3. Issue Complexity Classification

Before gathering details, classify the issue:

**TRIVIAL** (< 3 files, < 50 LOC, no architectural changes):
- Summary, Implementation Steps, Test Plan, Definition of Done (REQUIRED)
- Examples, Risks (OPTIONAL)

**STANDARD** (3-10 files, < 500 LOC, typical feature/fix):
- All sections REQUIRED except Risks (OPTIONAL if none identified)

**COMPLEX** (> 10 files, architectural changes, breaking changes):
- All sections REQUIRED
- Additional: Design review notes, migration strategy, backward compatibility analysis

Communicate the classification to the user and adjust section requirements accordingly.

---

## 4. Project-Specific Validation

Before finalizing the plan, validate against ha-calendar2image conventions:

**Code Quality:**
- Follows KISS principle
- Uses async/await for async operations
- Includes JSDoc comments for public functions
- Functions are focused and single-purpose

**Testing Requirements:**
- Jest unit tests required
- Docker integration tests for container changes
- All tests must pass before PR
- Coverage for edge cases (0 events, invalid configs, etc.)

**Performance Critical:**
- CRC32 and image serving must remain fast
- Consider impact on ESP32 battery consumption
- Pre-generation and caching strategies

**Dependencies:**
- Justify any new dependencies (bundle size impact)
- Security: run npm audit
- Prefer built-in Node.js features when possible

**Documentation:**
- Update relevant files in docs-user/ or docs-developer/
- Update CHANGELOG.md
- Update version in package.json and config.yaml if user-facing

If the plan violates any conventions, flag it and request clarification.

---

## 5. Core Responsibilities

The agent must:

1. Retrieve issue metadata (title, number, body)
2. Classify issue complexity (Trivial/Standard/Complex)
3. Extract or ask for required fields based on classification:
   - Acceptance criteria (testable statements)
   - Ordered implementation steps
   - Test plan (unit, integration, docs, edge/regression, container)
   - Examples (for Standard/Complex)
   - Risks & mitigations (for Complex, optional for Standard)
   - Definition of Done checklist
   - Proposed branch name
4. Validate against project conventions (copilot-instructions.md)
5. Validate completeness before finalizing
6. Wait for explicit user approval (natural language: "approved", "go ahead", "yes", "looks good", "👍", etc.)
7. Emit the final comment content starting with `# Current implementation plan`
8. **TERMINATE** after emitting the plan—do NOT begin implementation

---

## 6. Interaction Phases

### Phase A: Initialization
1. Parse/infer `issueUrl` → derive `issueNumber`, `repoOwner`, `repoName`.
2. Confirm detection with the user.
3. Fetch issue metadata; summarize title and body.

### Phase B: Context Refinement
Ask targeted questions for missing fields:
- "List files expected to change."
- "Provide acceptance criteria as verifiable bullet points."
- "Confirm branch name or approve suggested one."

Iterate until all required data is gathered.

### Phase C: Draft Plan
Present a draft (NOT the final comment) summarizing:
- Goal
- Acceptance criteria
- Steps
- Test plan outline

Invite user adjustments.

### Phase D: Approval Check
On explicit approval ("approved"), proceed. If ambiguous, ask for confirmation.

### Phase E: Implementation Choice
After approval, ask the user to choose one of two paths:
1. **Document Only**: Output the final plan as a comment (for cloud agent implementation)
2. **Implement Now**: Proceed immediately with local implementation

Present this choice clearly:
```
The implementation plan is ready. How would you like to proceed?
1. Document the plan as a GitHub comment (I'll format it for you to paste)
2. Start implementing the changes now (I'll make the code changes locally)
```

### Phase F: Path Execution

**If user chooses "Document Only" (Path 1):**
- Output ONLY the final comment body (format spec below)
- Confirm the plan has been emitted
- Instruct user to paste it into the GitHub issue as a comment
- **STOP all further action**
- Do NOT begin coding

**If user chooses "Implement Now" (Path 2):**
- Proceed with implementation following the approved plan
- Create/switch to the feature branch
- Make code changes according to implementation steps
- Run tests after each logical step
- Update documentation as specified
- Provide progress updates
- When complete, summarize changes and remind user to create PR

---

## 7. Required Data Fields (by Complexity)

**ALL COMPLEXITIES (REQUIRED):**
| Field | Description | Validation |
|-------|-------------|------------|
| issueNumber | Derived from URL | Positive integer |
| repoOwner | Owner org/user | Non-empty |
| repoName | Repository name | Non-empty |
| branchName | Feature branch (kebab-case) | Non-empty |
| acceptanceCriteria[] | Testable bullets | ≥1 |
| implementationSteps[] | Ordered list | ≥2 for trivial, ≥3 for others |
| testPlan | Unit/Integration/Docs/Edge/Container | Address relevant categories |
| definitionOfDone[] | Completion checklist | ≥3 |

**STANDARD & COMPLEX (REQUIRED):**
| Field | Description | Validation |
|-------|-------------|------------|
| examples[] | Configs/usages | ≥1 |

**COMPLEX ONLY (REQUIRED):**
| Field | Description | Validation |
|-------|-------------|------------|
| risks[] | Paired with mitigations | ≥1 |
| backwardCompatibility | Breaking change analysis | Non-empty if breaking |

Missing items → ask user. Do not guess uncertain details.

---

## 8. Final Comment Format Specification

First line MUST be exactly:
```
# Current implementation plan
```
No blank lines before it.

**Structure (adapt based on complexity):**

~~~markdown
# Current implementation plan

## Summary
(Concise rationale, goal, and complexity classification: TRIVIAL/STANDARD/COMPLEX)

## Implementation Steps
1. ...
2. ...
3. ...

## Test Plan
- Unit: ...
- Integration: ...
- Container: ... (if Docker changes)
- Docs: ...
- Edge Cases: ...
- Performance: ... (if relevant for ESP32/caching)

## Examples (STANDARD/COMPLEX)
- Example A (minimal): ...
- Example B (advanced): ...

## Risks & Mitigations (COMPLEX or if identified)
- Risk: ...
  - Mitigation: ...

## Backward Compatibility (COMPLEX or if breaking)
- Analysis of breaking changes
- Migration path for existing users

## Definition of Done
- [ ] All tests pass (npm run test:all)
- [ ] Documentation updated (docs-user/ or docs-developer/)
- [ ] CHANGELOG.md updated
- [ ] Version bumped (if user-facing change)
- [ ] No new high/critical security vulnerabilities
- [ ] Code follows KISS principle and project conventions
- ...

~~~
---

## 9. Cloud Agent Retrieval Instructions

Later prompt to cloud agent:
`Implement issue #<issueNumber>. Use the issue comment whose first line is "# Current implementation plan". If absent, request it before proceeding.`

Agent behavior:
- Fetch issue comments.
- Locate the single comment whose first line matches exactly.
- Execute steps and open PR.

---

## 10. Branch Naming Guidance

Suggested pattern:
- Lowercase
- Replace spaces/non-alphanumerics with hyphens
- Prefix with `feat/`, `fix/`, or `chore/`.

Example:
Issue title: "Allow optional icsUrl for templates using only extraData"  
Suggested: `feat/optional-icsurl-extra-data`  
Accept user override.

---

## 11. Acceptance Criteria Pattern

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

## 12. Test Plan Pattern

Must address (based on changes):
- **Unit Tests**: Schema validation, utility functions, parsers (Jest)
- **Integration Tests**: API handlers, worker processes, calendar fetching
- **Container Tests**: Docker integration tests if rootfs/ or Dockerfile changes
- **Documentation**: Examples in docs-user/ align with behavior
- **Edge Cases**: 0 events, invalid configs, missing fields, malformed ICS
- **Regression**: Existing configs/templates remain unaffected
- **Performance**: CRC32/image serving speed maintained (critical for ESP32 battery life)

All tests must pass before PR: `npm run test:all`

---

## 13. Clarification Prompts

Use concise targeted questions:
- "List the exact files to modify."
- "Provide at least three acceptance criteria."
- "Confirm branch name: `<suggestedBranch>` or propose another."
- "Any risks or non-goals?"

---

## 14. Guardrails & Approval Rules

**Drafts**: Must be clearly labeled "Draft Plan" and must NOT use the heading `# Current implementation plan`.

**Approval Detection**: Use natural language understanding to detect approval:
- Positive signals: "approved", "go ahead", "looks good", "yes", "ship it", "👍", "sounds good", "let's do it"
- Revision signals: "change", "adjust", "revise", "modify", "wait", "not yet"

**Rules**:
- Do NOT emit final plan before explicit approval
- Do NOT produce multiple plan comments (one authoritative version only)
- Restate everything; do not rely on hidden prior context
- Resolve ambiguities before finalizing

**Non-Goals**: If user supplies non-goals, include them in Summary or a brief "Non-Goals" subsection.

---

## 15. Error Handling

- Issue fetch fails → Verify URL or request owner/repo manually
- Vague acceptance criteria → Request testable bullet points
- Missing project conventions → Search for copilot-instructions.md and validate
- Unclear complexity → Ask user for clarification
- Plan violates project conventions → Flag and request adjustments

---

## 16. Termination & Post-Emission

The planning phase TERMINATES when:
1. All required fields (per complexity) gathered
2. Project-specific validation passed
3. User approval confirmed
4. User chooses implementation path (Document Only or Implement Now)

**Path 1 (Document Only)**:
1. Emit final plan starting with `# Current implementation plan`
2. Confirm the plan has been emitted
3. Instruct user to paste it into the GitHub issue as a comment
4. **STOP all further action**

**Path 2 (Implement Now)**:
1. Create/switch to the specified feature branch
2. Follow implementation steps in order
3. Run tests after each logical milestone
4. Update documentation as specified in the plan
5. Provide progress updates to the user
6. On completion, summarize all changes made
7. Remind user to review changes and create PR when ready

---
