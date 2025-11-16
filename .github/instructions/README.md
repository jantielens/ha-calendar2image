# GitHub Copilot Instructions

This directory contains specialized instructions for GitHub Copilot coding agent. These files help Copilot understand how to work with this repository following our conventions and best practices.

## Instruction Files

### General Instructions
- **`general.instructions.md`**: Overall project guidelines, architecture, and development workflow
- Applies to: All files in the repository (`scope: "**/*"`)

### Scoped Instructions
Instructions that apply to specific parts of the codebase:

- **`source-code.instructions.md`**: Code style, patterns, and best practices for source code
  - Applies to: `calendar2image/src/**/*`
  
- **`testing.instructions.md`**: Testing framework, patterns, and requirements
  - Applies to: `calendar2image/tests/**/*`
  
- **`documentation.instructions.md`**: Documentation standards and maintenance
  - Applies to: `calendar2image/docs-**/*` and all `.md` files

## How It Works

GitHub Copilot coding agent automatically reads these instruction files when working on your repository. The YAML frontmatter in each file defines the scope where instructions apply:

```yaml
---
title: Instruction File Title
description: Brief description of what these instructions cover
scope: "pattern/matching/files/**/*"
---
```

## Legacy Format

The repository also maintains `.github/copilot-instructions.md` for backward compatibility with older versions of GitHub Copilot. The content is equivalent to the combined instructions in this directory.

## Best Practices

When working with this repository:
1. Copilot will automatically apply the most specific instructions to your current context
2. General instructions apply everywhere
3. Scoped instructions override general ones for their specific areas
4. Always check these instructions match actual project practices

## Updating Instructions

When updating instructions:
- Keep both the legacy file and new instruction files in sync
- Use YAML frontmatter to define clear scopes
- Be specific and actionable
- Include examples where helpful
- Test that instructions work as expected

## Learn More

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Custom Instructions Guide](https://docs.github.com/en/copilot/tutorials/coding-agent/get-the-best-results)
- [Best Practices](https://docs.github.com/en/copilot/get-started/best-practices)
