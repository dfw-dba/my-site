# Implementation Tracker — Archive

_Completed sprints moved from `todo.md`. For current work, see `todo.md`._

---

## Sprint 1: Project Scaffolding & Local Dev Environment
- [x] 1.1 Create directory structure & .gitignore
- [x] 1.2 Config files (site.example.json, .env.example)
- [x] 1.3 Frontend scaffolding (React 19 + Vite + Tailwind + PWA)
- [x] 1.4 Backend scaffolding (FastAPI + SQLAlchemy + asyncpg via uv)
- [x] 1.5 Database init SQL scripts
- [x] 1.6 Docker files (backend, frontend) + docker-compose.yml
- [x] 1.7 GitHub Actions (ci.yml, deploy.yml stubs)
- [x] 1.8 .claude/ commands & .pre-commit-config.yaml
- [x] 1.9 Verify: `docker compose up -d` → all 4 services healthy → health check 200

## Sprint 2: Database "API" Layer
- [x] 2.1 Schema strategy (internal, api, public)
- [x] 2.2 Tables in internal schema
- [x] 2.3 Stored functions in api schema (19 functions)
- [x] 2.4 Permissions (GRANT EXECUTE)
- [x] 2.5 Seed data
- [x] 2.6 DatabaseAPI service class
- [x] 2.7 Alembic setup + initial migration
- [x] 2.8 Verify: stored functions return correct JSONB

## Sprint 3: FastAPI Routers
- [x] 3.1 Public endpoints (health, resume, blog, showcase, media)
- [x] 3.2 Admin endpoints (API-key protected writes)
- [x] 3.3 Pydantic schemas for all request/response models
- [x] 3.4 Presigned URL media upload flow
- [x] 3.5 Verify: all endpoints return correct responses, Swagger UI works

## Sprint 4: React Frontend
- [x] 4.1 Route definitions + MainLayout with hamburger menu
- [x] 4.2 Resume page (landing) with Timeline component
- [x] 4.3 Personal life pages (albums, gallery with lightbox)
- [x] 4.4 Showcase pages (hub, blog listing, blog post, data demos)
- [x] 4.5 Data fetching via @tanstack/react-query
- [x] 4.6 PWA configuration (manifest, service worker)
- [x] 4.7 Responsive design verification
- [x] 4.8 Verify: all pages render, navigation works, PWA installable

## Sprint 5: Testing
- [x] 5.1 Backend test fixtures (conftest.py)
- [x] 5.2 Stored procedure tests (test_db_functions.py)
- [x] 5.3 Router tests (all endpoints)
- [x] 5.4 Frontend component + page tests
- [x] 5.5 Verify: all tests pass

## Sprint 6: Resume Content + Dark Mode + Profile Image
- [x] 6.1 Replace placeholder resume_sections seed data with real content
- [x] 6.2 Replace placeholder professional_entries with real work history
- [x] 6.3 Remove placeholder education entry
- [x] 6.4 Rebuild database and verify API responses
- [x] 6.5 Verify frontend Resume page renders with real data
- [x] 6.6 Run tests to confirm no regressions
- [x] 6.7 Add dark theme with toggle (defaults to dark) — PR #16
- [x] 6.8 Add profile image placeholder to Resume page — PR #17

---

## Sprint 7: Profile Photo
- [x] 7.1 Replace profile placeholder with real photo on Resume page — PR #19

---

## Sprint 8: Claude Workflow Improvements
- [x] 8.1 Sync stale GitHub Project items with todo.md
- [x] 8.2 Update CLAUDE.md Task Management rules
- [x] 8.3 Update lessons.md with new workflow patterns
- [x] 8.4 Create plans directory with plan file for this sprint

---

## Sprint 9: Resume Page Redesign
- [x] 9.1 Center profile image at top of page
- [x] 9.2 Add social/contact icons below profile image
- [x] 9.3 Remove Contact section from page
- [x] 9.4 Rename DEVOPS_CLOUD to DEVOPS in skills
- [x] 9.5 Make skill groups collapsible (default collapsed)
- [x] 9.6 Center the Skills section
- [x] 9.7 Remove "Resume" title text and accent bar from header
- [x] 9.8 Center "Professional Timeline" heading
- [x] 9.9 Move theme toggle to top-right corner of page
- [x] 9.10 Remove "Skills" heading text
- [x] 9.11 Left-align collapsible skill groups

---

## Sprint 10: Fix Scroll Under Header + Update Planning Workflow
- [x] 10.1 Update CLAUDE.md §1 with strict numbered planning procedure
- [x] 10.2 Add lesson to `.claude/tasks/lessons.md` about planning checklist
- [x] 10.3 Convert MainLayout from fixed-positioned controls to flex-column layout
- [x] 10.4 Remove `fixed` positioning from HamburgerMenu toggle button
- [x] 10.5 Verify scroll clipping and layout on mobile and desktop

---

## Sprint 11: LinkedIn Recommendations Carousel + Global Social Icons
- [x] 11.1–11.9 All items complete

---

## Sprint 12: Admin UI
- [x] 12.1–12.14 All items complete

---

## Fix: Remove "About" Section from Resume Admin & Database
- [x] 13.1–13.5 All items complete

---

## Sprint 14: Performance Review Carousels
- [x] 14.1–14.9 All items complete

---

## Sprint 15: Refactor PostgreSQL Database to Match DB Rules
- [x] 15.1–15.9 All items complete

---

## Sprint 16: Repo Structure Optimization for Token Efficiency
- [x] 16.1–16.9 All items complete

---

## Feature: Editable Highlights in Resume Entry Form
- [x] 17.1–17.3 All items complete

---

## Sprint 18: Cognito Auth Integration
- [x] 18.1–18.22 All items complete (backend + frontend + config)

---

## Sprint 19: AWS CDK Infrastructure + CD Pipeline
- [x] 19.1–19.15 All items complete (CDK project, data infra, Lambda prep, app infra, CD pipeline)

---

## Sprint 20: RDS IAM Authentication (replace Secrets Manager)
- [x] 20.1–20.9 All items complete

---

## Sprint 21: Fix Database Schema Deployment + Add Bastion Host
- [x] 21.1–21.9 All items complete

---

## Sprint 22: Improve README Documentation
- [x] 22.1–22.3 All items complete

---

## Sprint 23: Normalize resume_sections Table & Add Summary Form Editor
- [x] 23.1–23.15 All items complete

---

## Sprint 24: Security Audit — Phase 1 (Critical + High + Select Medium)
- [x] 24.1–24.7 All items complete

---

## Sprint 25: Security Audit — Phase 2 (Medium Severity)
- [x] 25.1–25.8 All items complete

---

## Fix: Profile Image Not Displaying on Resume Page
- [x] 26.1–26.8 All items complete

---

## Fix: Profile Image Upload Shows Stale Image in Production
- [x] 27.1–27.10 All items complete

---

## Fix: Profile Image Upload Timeout (Lambda can't reach CloudFront API from VPC)
- [x] 28.1–28.10 All items complete

---

## Sprint 29: Skip CI/Deploy for Non-Code Changes + Documentation Rule
- [x] 29.1–29.7 All items complete

---

## Sprint 30: Application Logging Dashboard
- [x] 30.1–30.17 All items complete

---

## Sprint 31: Staging Environment with Approval Gate
_Superseded by the separate staging account work (PR #103). Design changed from same-account staging to separate AWS account model._

---

## Sprint 32: Stage Post-Deploy Validation
- [x] 32.1–32.6 All items complete

---

## Sprint 33: Release Please Versioning & Release Process
- [x] 33.1–33.10 All items complete

---

## Sprint 34: Fix Database Migration System & LinkedIn URL Deploy Failure
- [x] 34.1–34.9 All items complete

---

## Sprint 35: Dashboard IP Filter & Log Detail Heading
- [x] 35.1 SQL: Add `client_ip` filter to `get_app_logs` and `get_threat_detections` functions
- [x] 35.2 Migration: Create `004_add_client_ip_filter.sql`
- [x] 35.3 CDK: Bump migration version to "9"
- [x] 35.4 Backend: Add `client_ip` query param to `/logs` and `/logs/threats` endpoints
- [x] 35.5 Frontend API: Pass `client_ip` in API calls
- [x] 35.6 Frontend hooks: Accept `client_ip` in filter types
- [x] 35.7 Dashboard: IP filter state, clickable IPs, clear button, "Log Detail" heading
- [x] 35.8 Verification: lint, type check, all tests pass

---

## Sprint 36: Fix GitHub Actions Node.js 20 Deprecation

- [x] 36.1 Upgrade `actions/checkout` v4 → v5 across ci, deploy-stage, deploy-prod
- [x] 36.2 Upgrade `actions/setup-node` v4 → v5 across ci, deploy-stage, deploy-prod
- [x] 36.3 Upgrade `aws-actions/configure-aws-credentials` v4 → v5 in deploy-stage, deploy-prod
- [x] 36.4 Upgrade `actions/setup-python` v5 → v6 in ci
- [x] 36.5 Upgrade `astral-sh/setup-uv` v4 → v5 in ci
- [x] 36.6 Upgrade `amannn/action-semantic-pull-request` v5 → v6 in lint-pr

---

## Sprint 37: Hobby Entry Type

- [x] 37.1–37.5 All items complete

---

## Sprint 38: Scoped Rules & Memory Migration

- [x] 38.1–38.6 All items complete

---

## Sprint 39: Pre-Public Security Audit & Hardening

- [x] 39.1 Delete all 38 old plan files from `.claude/tasks/plans/`
- [x] 39.2 Add Content-Security-Policy header to CloudFront response headers policy in `app-stack.ts`
- [x] 39.3 Add architecture decision comments for Lambda public subnets in `app-stack.ts` and `data-stack.ts`
- [x] 39.4 Scope S3 media bucket permissions: `grantReadWrite` → `grantRead` + `grantPut` in `app-stack.ts`
- [x] 39.5 Document RDS IAM wildcard trade-off with comment in `app-stack.ts`
- [x] 39.6 Verification: TypeScript compiles, backend tests pass (41/41), frontend tests pass (25/25)
- [x] 39.7 Post-public: Enable branch protection on `main`
- [x] 39.8 Post-public: Add production environment protection rules

---

## Sprint 40: Combine Deploy Workflows

- [x] 40.1 Create combined `deploy.yml` workflow with 6-job chain
- [x] 40.2 Delete `deploy-stage.yml` and `deploy-prod.yml`
- [x] 40.3 Update `.claude/rules/git-workflow.md` (Deploy Workflows, Prod Deploy Gate, Dependabot)
- [x] 40.4 Update `.claude/agents/aws-architect.md` (2 workflow references)
- [x] 40.5 Update `README.md` (Continuous Deployment, Staging, Production sections)
- [x] 40.6 Verification: YAML syntax, job chain, secrets, no stale references
