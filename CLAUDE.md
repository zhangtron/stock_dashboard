# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stock Fundamental Screening Dashboard - A web-based stock screening system displaying fundamental analysis data with filtering, sorting, and pagination. Built with FastAPI backend and Bootstrap 5 frontend.

## Common Commands

```bash
# Development server with hot reload
uvicorn app.main:app --reload

# Production server
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Install dependencies
pip install -r requirements.txt
```

**Key URLs:**
- Web UI: http://localhost:8000
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health
- Screening API: http://localhost:8000/api/screening

## Architecture

```
app/
├── main.py           # FastAPI app entry, routes /, /screening, /health
├── config.py         # Pydantic Settings for env-based configuration
├── database.py       # SQLAlchemy engine with connection pooling
├── models.py         # ORM model: StockFundamentalScreening
├── schemas.py        # Pydantic schemas for request/response validation
├── crud.py           # Database queries (get_screening_list, get_top3_by_overall_score)
├── routers/
│   └── screening.py  # GET /api/screening endpoint with filtering/sorting/pagination
└── static/templates/
    ├── base.html     # Base layout with Bootstrap 5 styling
    └── screening.html # Main page with vanilla JS for dynamic table rendering
```

**Request Flow:**
Browser → FastAPI (main.py) → Router (screening.py) → CRUD (crud.py) → SQLAlchemy → MySQL

## Key Patterns

- **Configuration**: Uses `pydantic-settings` with `.env` file. Copy `.env.example` to `.env` for local development.
- **Database**: Remote MySQL at `mysql.sqlpub.com`. Uses SQLAlchemy ORM with connection pooling (pool_size=1, max_overflow=1, pool_recycle=3600).
- **API Design**: Single GET endpoint with query params for pagination (`page`, `page_size`), filtering (`stock_code`, `stock_name`, `min_overall_score`, `recommendation`), and sorting (`sort_by`, `sort_order`).
- **Templates**: Jinja2 templates with vanilla JavaScript for async data fetching and dynamic rendering.

## Database Schema

Table `stock_fundamental_screening`:
- Primary key: `id`
- Indexed: `stock_code`, `calc_time`, `overall_score`
- Score fields: `overall_score`, `growth_score`, `profitability_score`, `solvency_score`, `cashflow_score` (DECIMAL 5,2)
- `recommendation`: STRONG_BUY, BUY, HOLD, AVOID

## Deployment

Deployed to Zeabur (configured in `zeabur.yaml`). The `DB_PASSWORD` environment variable must be set in Zeabur dashboard - not committed to repo.
