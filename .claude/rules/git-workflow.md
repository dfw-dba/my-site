> **MANDATORY — NO EXCEPTIONS**: Never edit, stage, or commit files while on the `main` branch.
> Before making ANY file change (including `.claude/tasks/todo.md`, `CLAUDE.md`, or any other file),
> you MUST first create and switch to a feature or fix branch. This applies to every change,
> no matter how small — documentation, config, task tracking, everything.
>
> A broken deploy pipeline is **NOT** an exception. Create a `fix/` branch, push, and
> fast-track the PR. It takes under a minute. "It's just one line" is never a justification.

- **NEVER commit directly to `main`**. All changes must go through a pull request.
- **NEVER edit files while on `main`**. Switch to a branch FIRST, then make edits.
- Create a feature branch (`feature/<name>`) or fix branch (`fix/<name>`) for every change.
- Push the branch, create a PR targeting `main`, and merge via the PR.
- ***Always squash merge*** into `main` (`gh pr merge --squash`). No merge commits or rebase merges.
- Branch naming: `feature/short-description` for new work, `fix/short-description` for bug fixes.
- **PR titles MUST follow [Conventional Commits](https://www.conventionalcommits.org/) format** — enforced by `lint-pr.yml`.
  Since we squash-merge, the PR title becomes the commit message on `main`, which Release Please parses for versioning.
  Format: `type: description` or `type(scope): description`. Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`.
  Append `!` for breaking changes (e.g., `feat!: redesign API`).
- Every PR test plan item must be executable and verified before suggesting the PR is ready to merge. Do not write test plan items that cannot be verified pre-merge. Execute each test plan item, check them off using `gh api`.
- Create post deploy plan items as part of the PR creation that will be used to validate deployment in a separate section of the pr below all of the test plan items.
- **Post-deploy runner constraints (MANDATORY)**: The post-deploy runner is a bare GitHub Actions
  `ubuntu-latest` environment. It has ONLY these tools and env vars:
  - `curl` — for testing HTTP endpoints
  - `gh` CLI — for GitHub API operations (authenticated via `${GH_TOKEN}`)
  - `${API_URL}` — the deployed API endpoint
  - `${DOMAIN_NAME}` — the site domain
  - `${GH_TOKEN}` — GitHub token
- **DO NOT use in post-deploy items**: `aws` CLI, `psql`, `docker`, or any command requiring
  AWS credentials, AWS profiles, database access, or secrets beyond `${GH_TOKEN}`.
  If validation requires these, do it in the test plan phase (pre-merge) instead.
- Post-deploy items should test the actual production behavior introduced by the PR. Consider whether the change affects
  infrastructure served by the deployed stack (e.g., CloudFront, Lambda, API Gateway) versus local-only configuration (e.g.,
  Docker, nginx.conf) and write validation items accordingly.
- **Post-deploy item format (REQUIRED)**: PRs must have **two separate validation sections**:
  1. `## Post-stage-deploy validation` — runs against the **staging** API (`${API_URL}` points to staging). Failures **block** production deployment.
  2. `## Post-deploy validation` — runs against the **production** API (`${API_URL}` points to production).

  Each item must include an executable command in a fenced `bash` block.
  The deploy workflow automatically extracts and runs these commands, comments results on the PR,
  and checks off passed items. Available env vars: `${API_URL}`, `${DOMAIN_NAME}`, `${GH_TOKEN}` (for `gh` CLI commands). Exit code 0 = pass, non-zero = fail.
  **IMPORTANT**: `${API_URL}` is the API Gateway domain (e.g. `https://api.example.com`) — it does NOT include
  the `/api` path prefix. All backend routes are mounted under `/api/`, so use `${API_URL}/api/...` in commands.
  Example format:
  ```markdown
  ## Post-stage-deploy validation
  - [ ] Verify health endpoint responds on staging
    ```bash
    curl -sf "${API_URL}/api/health"
    ```
    Expected: HTTP 200 with JSON response

  ## Post-deploy validation
  - [ ] Verify health endpoint responds on production
    ```bash
    curl -sf "${API_URL}/api/health"
    ```
    Expected: HTTP 200 with JSON response
  ```
- Monitor CI job after submitting PR and mark CI test plan item complete if it completes successfully. Never suggest to merge a PULL REQUEST if the CI workflow is failing.
- After successful completion of CI job and Test plan items, merge the PR and monitor the deploy job as it runs.
- Post-deploy validation runs automatically **twice** in `deploy.yml` using **separate PR sections**:
  1. **Staging** (`stage-post-deploy-validation`): runs after `deploy-stage-frontend`, extracts commands from the `## Post-stage-deploy validation` section. `${API_URL}` points to the staging API. **Staging validation failures block production deployment.**
  2. **Production** (`post-deploy-validation`): runs after `deploy-frontend`, extracts commands from the `## Post-deploy validation` section. `${API_URL}` points to the production API.
  Results are commented on the PR and passed items are checked off automatically.
  The deploy chain is strictly sequential: stage-infra → stage-frontend → stage-validation → prod-infra → prod-frontend → prod-validation.
  Manual production-only deploys (`workflow_dispatch` with `target=production`) skip staging entirely.
- If a new commit is pushed to the head branch this invalidates the test plan items and the CI outcome. The CI must be run again and tes plan items must be unchecked, test plan items must be executed again and marked as complete upon success.
