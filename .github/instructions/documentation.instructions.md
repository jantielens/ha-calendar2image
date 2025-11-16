---
title: Documentation Instructions
description: Instructions for maintaining and updating documentation
applyTo: "calendar2image/docs-**/*,**/*.md"
---

# Documentation Instructions for ha-calendar2image

## Documentation Structure

### User Documentation (`calendar2image/docs-user/`)
- **Purpose**: Help end-users configure and use the add-on
- **Audience**: Home Assistant users, may not be technical
- **Style**: Clear, example-driven, screenshot-heavy

### Developer Documentation (`calendar2image/docs-developer/`)
- **Purpose**: Guide developers contributing to the project
- **Audience**: Software developers familiar with Node.js
- **Style**: Technical, architecture-focused, code examples

### Root Documentation
- **README.md**: Project overview, quick start, feature highlights
- **CHANGELOG.md**: Version history and changes (must be updated with every release)

## Writing Style

### General Guidelines
- Use clear, concise language
- Provide examples for complex concepts
- Include code snippets with syntax highlighting
- Add links to related documentation
- Keep it up-to-date with code changes

### Markdown Best Practices
- Use proper heading hierarchy (# for title, ## for sections, etc.)
- Use code blocks with language specification: \`\`\`javascript
- Use tables for structured data
- Add screenshots for UI elements
- Use task lists for checklists: `- [ ] Task`

### Code Examples
- Should be complete and runnable when possible
- Include comments for complex logic
- Show both correct usage and common mistakes
- Provide context about where/how to use the code

## Updating Documentation

### When Code Changes
Always update documentation when you:
- Add new features or APIs
- Change configuration options
- Modify template syntax
- Update dependencies that affect user experience
- Fix bugs that were incorrectly documented

### CHANGELOG Updates
Follow this format in `calendar2image/CHANGELOG.md`:
```markdown
## [Version] - YYYY-MM-DD

### Added
- New feature descriptions

### Changed
- Modified functionality descriptions

### Fixed
- Bug fix descriptions

### Security
- Security-related changes
```

### Version Updates
When releasing a new version:
1. Update version in `calendar2image/package.json`
2. Update version in `calendar2image/config.yaml`
3. Add entry to `calendar2image/CHANGELOG.md`
4. Update documentation references to reflect version changes

## Documentation Sections to Maintain

### README.md
- Feature list (keep current with latest features)
- Quick start guide (verify all steps work)
- Links to detailed docs (ensure they're not broken)

### Installation Guide
- Step-by-step instructions
- Troubleshooting common issues
- System requirements
- Screenshots of installation process

### Configuration Guide
- All configuration options explained
- Default values documented
- Examples for common scenarios
- Validation rules and constraints

### API Documentation
- All endpoints documented
- Request/response examples
- Error codes and messages
- Rate limiting information (if applicable)

### Template Development Guide
- Template structure explained
- Available variables and functions
- Custom template examples
- Testing templates locally

## Validation

### Before Committing Documentation Changes
- [ ] Spell check all new content
- [ ] Verify all links work (internal and external)
- [ ] Test all code examples
- [ ] Check markdown rendering (preview in GitHub)
- [ ] Ensure consistency with existing documentation style
- [ ] Update table of contents if structure changed

### Screenshots and Images
- Store in appropriate `docs-*/images/` directory
- Use descriptive filenames
- Optimize file size (compress PNGs)
- Include alt text for accessibility
- Show only relevant portions of UI

## Common Documentation Tasks

### Adding a New Feature
1. Document in appropriate section of `docs-user/`
2. Add technical details to `docs-developer/` if needed
3. Update README.md feature list
4. Add to CHANGELOG.md under "Added"
5. Update configuration examples if applicable

### Fixing a Bug
1. Update CHANGELOG.md under "Fixed"
2. Correct any misleading documentation
3. Add troubleshooting entry if it's a common issue

### Deprecating a Feature
1. Mark as deprecated in documentation
2. Note in CHANGELOG.md under "Deprecated"
3. Provide migration path to alternative
4. Plan removal for next major version

## Links and References
- Link to official Home Assistant docs for add-on concepts
- Reference npm package docs for dependencies
- Link to GitHub issues for detailed discussions
- Provide examples from real-world usage when possible
