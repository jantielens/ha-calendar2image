---
description: Analyze and implement a GitHub issue with a structured, collaborative workflow
agent: agent
---

# Implement GitHub Issue

Analyze a GitHub issue and implement its solution following a systematic, user-collaborative workflow.

## Usage

In chat, use: `/implement-issue`

Provide the issue number when asked: `#42` or just `42`

## Workflow

Follow these steps systematically:

### 1. Read & Understand the Issue
- Fetch the complete GitHub issue content including:
  - Issue title and description
  - All comments and discussion
  - Labels, assignees, and linked issues/PRs
  - Any referenced code snippets or files
- Identify the core problem or feature request
- Note any specific requirements, constraints, or edge cases mentioned

### 2. Gather Context
Systematically collect information needed to implement the solution:

#### Code Context
- Search for related code files, functions, and classes mentioned in the issue
- Review existing implementations of similar features
- Check for tests related to the affected components
- Identify architectural patterns used in the codebase

#### Documentation Context
- Review relevant user documentation in `docs-user/` folder
- Check developer documentation in `docs-developer/` folder
- Look for related configuration schemas or examples
- Review [`CHANGELOG.md`](../../calendar2image/CHANGELOG.md) for similar past changes

#### Project Context
- Check [`package.json`](../../calendar2image/package.json) for relevant dependencies
- Review project conventions from [`copilot-instructions.md`](../copilot-instructions.md)
- Understand testing requirements and patterns
- Identify affected areas (API, templates, config, etc.)

### 3. Clarification (If Needed)
If any of the following are unclear, **ask the user questions before proceeding**:

- **Ambiguous requirements**: Which approach is preferred?
- **Missing information**: What should happen in edge case X?
- **Scope uncertainty**: Should this include Y, or is that separate?
- **Technical decisions**: Which library/pattern should be used?
- **Breaking changes**: Is backward compatibility required?

**Format questions clearly:**
```
I need clarification on a few points before proposing a solution:

1. [Question about requirement X]
2. [Question about edge case Y]
3. [Question about technical approach Z]

Please provide your input so I can create an accurate implementation plan.
```

### 4. Propose Implementation Plan
Once you have sufficient context (either initially or after clarifications):

**Say:** "I've analyzed the issue and gathered the necessary context. Would you like me to summarize my implementation plan?"

**Wait for user confirmation** before proceeding.

### 5. Provide Implementation Plan
After user approves, provide a **concise, actionable plan** in this format:

```markdown
## Implementation Plan for [Issue Title]

### Summary
[1-2 sentence overview of the solution]

### Changes Required

#### 1. [Component/File Area]
- Specific change 1
- Specific change 2

#### 2. [Component/File Area]
- Specific change 1
- Specific change 2

#### 3. Tests
- New test cases to add
- Existing tests to update

#### 4. Documentation
- User docs to update: [file names]
- Developer docs to update: [file names]
- CHANGELOG entry

### Files to Modify
- `src/path/file1.js` - [brief description]
- `src/path/file2.js` - [brief description]
- `tests/path/test.js` - [brief description]
- `docs-user/FILE.md` - [brief description]

### Potential Risks
- [Any breaking changes or risks]

### Estimated Complexity
[Low/Medium/High] - [Brief justification]
```

### 6. Request Approval
After presenting the plan, explicitly ask:

```
Does this implementation plan look good to you? 

Please review and let me know if you'd like any adjustments before I start implementing.
```

**Wait for explicit approval** - do NOT start implementation until the user confirms.

### 7. Implementation (Post-Approval)
Only after receiving approval:

1. **Create a todo list** to track progress
2. **Implement changes** systematically following the approved plan
3. **Run tests** after implementation: `npm run test:all`
4. **Update documentation** as specified in the plan
5. **Update CHANGELOG.md** with the changes
6. **Mark todos complete** as you finish each step
7. **Report completion** with a summary of what was done

---

## Key Principles

### Do NOT:
- ❌ Start implementing before getting approval
- ❌ Skip the clarification step if requirements are unclear
- ❌ Make assumptions about ambiguous requirements
- ❌ Proceed without showing the plan first
- ❌ Skip tests or documentation updates

### DO:
- ✅ Ask questions when uncertain
- ✅ Gather comprehensive context before planning
- ✅ Present a clear, reviewable plan
- ✅ Wait for explicit user approval
- ✅ Follow the project's conventions from [`copilot-instructions.md`](../copilot-instructions.md)
- ✅ Test thoroughly before marking complete
- ✅ Update all relevant documentation

---

## Example Interaction

**Agent:** "I'll analyze issue #42 for you."

*[Agent reads issue and gathers context]*

**Agent:** "I've reviewed the issue about adding calendar rotation support. I need clarification on two points:

1. Should the rotation interval be configurable per calendar or globally?
2. Do you want to preserve the current calendar when restarting, or always start from index 0?

Please advise so I can create an accurate plan."

**User:** "Per calendar config, and preserve on restart."

**Agent:** "Thank you. I've analyzed the issue and gathered the necessary context. Would you like me to summarize my implementation plan?"

**User:** "Yes"

**Agent:** *[Provides detailed implementation plan as shown in template above]*

"Does this implementation plan look good to you? Please review and let me know if you'd like any adjustments before I start implementing."

**User:** "Looks good, go ahead"

**Agent:** *[Creates todo list and begins implementation]*
