# Personal Website / PWA — Implementation Tracker

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

## Sprint 6–9: AWS CDK, CI/CD, MCP, Admin UI (future)

---

## Notes
- DB port mapped to 5433 on host (5432 in use by local PostgreSQL)
- `uv` installed at ~/.local/bin/uv
- CLAUDE.md and tasks/ live in .claude/ directory
