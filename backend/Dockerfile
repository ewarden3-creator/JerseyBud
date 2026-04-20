# Use Playwright's Python base image — comes with Chromium + system deps
# pre-installed. Saves us ~5 min build time and 200MB of trial-and-error.
FROM mcr.microsoft.com/playwright/python:v1.47.0-jammy

WORKDIR /app

# Postgres client lib for SQLAlchemy + tini for proper signal handling
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev tini && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright browsers are pre-installed in this base image — no need to run
# `playwright install` again.

COPY . .

EXPOSE 8000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
