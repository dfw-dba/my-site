FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir "psycopg[binary]>=3.2,<4" "boto3>=1.35,<2"

RUN useradd -r -s /bin/false appuser
USER appuser

COPY update.py .

CMD ["python", "-u", "update.py"]
