# NJ Canna

Real-time NJ cannabis dispensary deals, strain discovery, and AI-powered recommendations.

## Architecture

- **`backend/`** — FastAPI + SQLAlchemy 2.0 + Postgres + Redis + Celery
- **`frontend/`** — Next.js 14 (App Router) + Tailwind + Framer Motion + Recharts
- **`docker/`** — Postgres, Redis, API, Celery worker, Celery beat

## Quick start

### 1. Backend
```bash
cp backend/.env.example backend/.env   # add ANTHROPIC_API_KEY
cd docker && docker-compose up
```
Beat fires `scrape_all` every 30 min. First run seeds NJ dispensaries from Dutchie + iHeartJane, then per-dispensary scrape tasks fan out.

### 2. Frontend
```bash
cd frontend
npm install     # or bun install
npm run dev     # http://localhost:3000
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Curated home feed: Hottest Deals, Trending, Best Value, New Drops + Ask Bud |
| `/feed` | Browse all NJ products with rich filters (cannabinoids, terpenes, value, etc.) |
| `/recommend` | Full Ask Bud — Opus-powered conversational recommender |
| `/strains/[name]` | Cross-NJ strain compare, lab data, price history |
| `/dispensaries` | List with open-now / delivery filters |
| `/dispensaries/[slug]` | Hours, amenities, license, live menu |
| `/favorites` | Saved products / strains / dispensaries |
| `/alerts` | Active price + back-in-stock watches |

Anonymous device-scoped favorites + alerts. No login.
