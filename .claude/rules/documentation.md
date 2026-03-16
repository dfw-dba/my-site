---
globs:
  - "README.md"
  - "docs/**"
---

# Documentation Rules

> **MANDATORY**: Every PR must evaluate whether `README.md` needs updating.
> If the change adds, removes, or modifies user-facing functionality, infrastructure,
> configuration, CLI commands, environment variables, deployment steps, or project structure,
> the README **must** be updated in the same PR.

## README.md Standards

The README is the primary onboarding document. It must contain everything a human or AI needs
to fork this repo into a new repository and:
1. Run the project locally (`./dev.sh`)
2. Deploy the full stack to their own AWS account
3. Understand the architecture, cost, and project structure

### Required sections (keep current):
- **Tech Stack** — languages, frameworks, services with versions
- **Architecture** — ASCII diagram of deployed infrastructure
- **Cost Estimate** — monthly costs with free-tier vs post-free-tier breakdown
- **Running Locally** — step-by-step with copy-pasteable commands
- **Deploying to AWS** — every prerequisite, IAM setup, CDK bootstrap, secrets, and first deploy
- **Continuous Deployment** — how CI/CD works, path filtering, manual triggers
- **Project Structure** — directory tree with descriptions
- **Managing Costs** — how to stop/start resources to save money

### When to update README:
- **New feature or page**: Add to relevant section (tech stack, project structure, etc.)
- **New environment variable**: Add to the CDK variables table or local dev section
- **New AWS resource**: Update architecture diagram, cost estimate, and deployment steps
- **Changed CLI command or dev workflow**: Update Running Locally or deployment steps
- **New directory or major file reorganization**: Update Project Structure
- **CI/CD pipeline changes**: Update Continuous Deployment section
- **New dependency or tool requirement**: Update Prerequisites

### When NOT to update README:
- Internal refactors with no user-facing impact
- Bug fixes that don't change behavior or configuration
- Changes only to `.claude/` files, test files, or code comments

### Writing style:
- Use copy-pasteable `bash` blocks for all commands
- Include expected output or success indicators where helpful
- Use tables for configuration with columns: Name, Description/Default, Example
- Keep prose minimal — let commands and structure speak
