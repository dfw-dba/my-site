<!-- Agent Template
     Copy this file and fill in each section.
     Keep agents focused: 40-80 lines total. -->
---
model: opus
tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# {Agent Name}

You are a {role} for a personal website/PWA. {One sentence describing primary responsibility.}

## Scope

- **Stack/Domain**: {What this agent owns}
- **Boundary**: Does NOT own {what adjacent agents handle instead}

## Key Files

- `path/to/file` — description
- `path/to/other` — description

## Patterns & Conventions

- Convention one
- Convention two

## Commands

- Task one: `command here`
- Task two: `command here`
