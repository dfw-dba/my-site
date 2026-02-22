# my-site

Personal website and portfolio built with FastAPI and React.

A fork-friendly, full-stack personal site with a "database as API" architecture — all data access goes through PostgreSQL stored functions, keeping the application layer thin and the schema the single source of truth.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.13, FastAPI, SQLAlchemy (async), Alembic |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Database | PostgreSQL 17 |
| Storage | MinIO (local) / S3 (production) |
| Infrastructure | Docker Compose (local), AWS CDK (production) |
| Testing | pytest (backend), Vitest (frontend) |

## Running Locally

```bash
# 1. Copy environment template
cp .env.example .env
cp config/site.example.json config/site.json

# 2. Start all services
docker compose up -d

# 3. Access the app
#    Frontend:  http://localhost:5173
#    Backend:   http://localhost:8000
#    API docs:  http://localhost:8000/docs
#    MinIO:     http://localhost:9001
```

## Project Structure

```
├── backend/           # FastAPI application
│   ├── alembic/       # Database migrations
│   ├── src/app/       # Application code
│   │   ├── models/    # SQLAlchemy models
│   │   ├── routers/   # API route handlers
│   │   ├── schemas/   # Pydantic models
│   │   └── services/  # DatabaseAPI service layer
│   └── tests/         # Backend tests
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/  # API client
│   │   └── types/
│   └── tests/         # Frontend tests
├── database/init/     # SQL initialization scripts
├── docker/            # Dockerfiles
├── config/            # Site configuration
└── infrastructure/    # AWS CDK (future)
```

## Versioning

This project follows [Semantic Versioning](https://semver.org/).

| Change Type | Version Bump | Example |
|------------|-------------|---------|
| Breaking API or schema change | Major (X.0.0) | Redesign database schema |
| New feature, page, or endpoint | Minor (0.X.0) | Add blog section |
| Bug fix, style tweak, dependency update | Patch (0.0.X) | Fix mobile layout |

## License

[MIT](LICENSE)
