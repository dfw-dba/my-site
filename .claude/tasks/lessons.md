# Lessons Learned

_Updated after each correction or insight. Review at session start._

## Process

- **Background agents can overwrite file moves**: When running subagents in the background, they may recreate files that were moved/deleted in the main context. Always verify file state after all background agents complete.
- **CLAUDE.md and tasks/ live in `.claude/`**: Not in the project root. All references in CLAUDE.md should use `.claude/tasks/` paths.
- **Detailed sprint items in todo.md (2026-02-28)**: Each sprint item must include detailed implementation context: files to change, what the change does, acceptance criteria, and technical decisions made during planning.
- **No process steps as todo items (2026-03-26)**: "Push branch", "create PR", "monitor CI", "merge PR", and "post-deploy verify" are standard shipping steps governed by git-workflow.md. Tracking them as todo checkboxes creates busywork that consistently gets skipped, leaving stale unchecked items. Todo items should track *what to build*, not *how to ship*.
- **Archive completed sprints (2026-03-26)**: Keep only the last 3 completed sprints in `todo.md`, move older ones to `todo-archive.md`. The file was 580+ lines and growing — old completed sprints add no value to current work.
- **Plan files named after branches (2026-03-01)**: Create `.claude/tasks/plans/<branch-name>.md` during planning. Update it as plans evolve. This file persists in the repo and serves as the implementation spec.
- **GitHub Project items must include detail (2026-03-01)**: When syncing to the GitHub Project, include compact but meaningful detail in the title or body — not just a task number and name.
- **Sync todo.md and GitHub Project at every state change (2026-03-01)**: Every time a todo item is created, updated, or completed in `todo.md`, immediately mirror the change in the GitHub Project. Never batch or defer syncing.
- **Follow the numbered planning checklist strictly (2026-03-02)**: Section 1 in CLAUDE.md is a strict procedure. Execute steps in order: branch, plan mode, write plan file, finalize, add todos, sync GitHub Project, prompt user to clear context. Skipping or reordering steps leads to missed steps downstream.

## Post-deploy Validation

- **Always use `curl -sfL` in validation commands (2026-03-27)**: FastAPI redirects routes without trailing slashes (e.g., `/api/resume` → `/api/resume/` via 307). Without `-L` (follow redirects), `curl -sf` silently returns empty output and `grep` fails. Always include `-L` in validation curl commands.
- **Verify field names against actual API responses before writing validation (2026-03-27)**: Don't guess JSON field names — `curl` the endpoint first and check the real response structure. Example: searched for `profile_image_url` but the actual field was `image_url` inside a `profile_image` object. Always test the exact grep pattern against the real response.
- **Use `DOMAIN_NAME` not `API_URL` for CloudFront-served resources (2026-03-28)**: `${API_URL}` points to the API Gateway (e.g., `api.example.com`), not the CloudFront distribution. CSP headers, frontend assets, and response headers policies are on the CloudFront distribution (`${DOMAIN_NAME}`). Using `${API_URL}` to check CSP headers will always fail because API Gateway doesn't serve those headers.

## AWS / CDK

- **Route 53 delegation set vs in-zone NS records (2026-03-26)**: When setting up DNS delegation, always use nameservers from `aws route53 get-hosted-zone` (the delegation set), NOT the NS records visible in the Route 53 console Records tab (in-zone NS). They can differ, and only the delegation set nameservers actually serve the zone.
- **S3 bucket names are globally unique (2026-03-26)**: Removing `bucketName` from an existing CDK bucket causes CloudFormation to replace it (create new, delete old). Use a config flag (`CDK_AUTO_BUCKET_NAMES`) to conditionally set bucket names — auto-generate for new forks, preserve explicit names for existing deployments.
- **ACM cert DNS validation requires delegation first (2026-03-26)**: Deploying `MySiteCert` before DNS delegation is set up causes the deploy to hang indefinitely. Always deploy `MySiteDns` first, verify delegation, then deploy the rest.

## Universal Principles

- **Fork-friendly**: No hardcoded domains, AWS account IDs, or personal info. Everything parameterized via config/site.json.
- **Optional behavior via flags, not comments (2026-03-14)**: Never make features optional by requiring users to uncomment code. Use env vars, CLI flags, or scripts with flags instead. Applies to docker-compose, CI workflows, and any config.
