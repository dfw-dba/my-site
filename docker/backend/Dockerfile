# Stage 1: Build dependencies
FROM python:3.13-slim AS builder

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY backend/pyproject.toml .

RUN uv pip install --system --no-cache -r pyproject.toml

# Stage 2: Runtime
FROM python:3.13-slim

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY backend/src/ ./src/

EXPOSE 8000

CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
