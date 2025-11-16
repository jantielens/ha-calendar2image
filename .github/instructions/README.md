# GitHub Copilot Instructions

This directory contains specialized instructions for GitHub Copilot coding agent. These files help Copilot understand how to work with this repository following our conventions and best practices.

## Instruction Files

### General Instructions
- **`general.instructions.md`**: Overall project guidelines, architecture, and development workflow
- Applies to: All files in the repository (`applyTo: "**/*"`)

### Scoped Instructions
Instructions that apply to specific parts of the codebase:

- **`source-code.instructions.md`**: Code style, patterns, and best practices for source code
  - Applies to: `calendar2image/src/**/*`
  
- **`testing.instructions.md`**: Testing framework, patterns, and requirements
  - Applies to: `calendar2image/tests/**/*`
  
- **`documentation.instructions.md`**: Documentation standards and maintenance
  - Applies to: `calendar2image/docs-**/*` and all `.md` files

## How It Works

GitHub Copilot in VS Code and the coding agent automatically read these instruction files when working on your repository. The YAML frontmatter in each file defines which files the instructions apply to using the `applyTo` field with glob patterns:

```yaml
---
title: Instruction File Title
description: Brief description of what these instructions cover
applyTo: "pattern/matching/files/**/*"
---
```

## Best Practices

When working with this repository:
1. Copilot will automatically apply the most specific instructions to your current context
2. General instructions apply everywhere
3. Scoped instructions using `applyTo` patterns override general ones for their specific areas
4. Always check these instructions match actual project practices

## Updating Instructions

When updating instructions:
- Use YAML frontmatter with `applyTo` to define clear file pattern scopes
- Be specific and actionable
- Include examples where helpful
- Test that instructions work as expected

## Learn More

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Custom Instructions Guide](https://docs.github.com/en/copilot/tutorials/coding-agent/get-the-best-results)
- [Best Practices](https://docs.github.com/en/copilot/get-started/best-practices)
