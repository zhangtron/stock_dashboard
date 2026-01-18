# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stock Fundamental Screening Dashboard (v2.0.0) - A web-based stock screening system displaying fundamental analysis data with filtering, sorting, pagination, macroeconomic analysis, and market breadth visualization. Built with FastAPI backend, dual-database architecture (remote MySQL + local SQLite cache), and Bootstrap 5 frontend with three theme support.

**Production URL:** https://cicpa.fun

## Features
- **Stock Screening**: Filter, sort, and paginate fundamental analysis data
- **Macro Analysis**: Monetary/credit cycle analysis with investment strategy matrix
- **Market Breadth**: Industry heat map showing BIAS>0 stock ratios
- **Three Themes**: Teal (default), Red, Dark with persistent storage

## Common Commands

```bash
# Development server with hot reload
uvicorn app.main:app --reload

# Production server
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Install dependencies
pip install -r requirements.txt

# Reset local cache database (use reset_cache_db.py script)
python reset_cache_db.py
```

**Key URLs:**
- Web UI: http://localhost:8000
- Screening page: http://localhost:8000/screening
- Macro analysis: http://localhost:8000/macro-analysis
- Market breadth: http://localhost:8000/market-breadth
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health
- Screening API: http://localhost:8000/api/screening
- Macro analysis API: http://localhost:8000/api/macro-analysis
- Market breadth API: http://localhost:8000/api/market-breadth
- Sync status: http://localhost:8000/api/sync/status

## Architecture

### Dual-Database Design
The application uses a hybrid database architecture for performance optimization:

1. **Remote MySQL** (`mysql.sqlpub.com`) - Source of truth
   - Tables: `stock_fundamental_screening`, `bond_china_yield`, `macro_data`, `market_breadth_metrics`
   - Connection: Pool size 1, max overflow 1, pool recycle 3600s
   - Managed by `app/database.py` → `SessionLocal`

2. **Local SQLite Cache** - High-performance read layer
   - Location: `app/static/data/stock_cache.db`
   - Tables: `*_cache` tables + `sync_metadata`
   - Auto-created on startup via `init_cache_db()`
   - Managed by `app/cache_database.py` → `SessionLocal`

### Data Sync Flow
```
Remote MySQL → data_sync.py → Local SQLite → API Responses
                     ↑
                     |
               sync_scheduler.py
               (Daily 5:00 AM via APScheduler)
```

- **Incremental Sync**: Uses `update_time` field to sync only changed records
- **Full Sync**: Clears cache and re-syncs all data (via `force_full_sync()`)
- **Fail-Safe**: Sync failures preserve previous cache data
- **Scope**: Syncs stock screening data, macroeconomic data, and market breadth data

### Data Sync Modules
- `app/data_sync.py` - Stock screening data sync
- `app/macro_sync.py` - Macro data sync (bond yield + macro indicators)
- `app/market_breadth_sync.py` - Market breadth data sync
- `app/sync_scheduler.py` - APScheduler for daily 5:00 AM auto-sync (stocks + macro + market breadth)

### Request Flow
```
Browser → FastAPI (main.py) → Router (screening.py/macro_analysis.py/market_breadth.py) → CRUD (crud.py) → SQLite Cache → Response
```

### Module Structure

```
app/
├── main.py                    # FastAPI entry, startup/shutdown events, route registration
├── config.py                  # Pydantic Settings (env-based configuration)
├── database.py                # Remote MySQL connection (source of truth)
├── cache_database.py          # Local SQLite connection (performance cache)
├── models.py                  # SQLAlchemy ORM models (remote + cache tables)
├── schemas.py                 # Pydantic validation schemas
├── crud.py                    # Database queries (operates on cache DB)
├── data_sync.py               # Stock screening sync (remote → cache, incremental)
├── macro_sync.py              # Macro data sync (bond yield + macro indicators)
├── market_breadth_sync.py     # Market breadth data sync
├── sync_scheduler.py          # APScheduler for daily 5:00 AM auto-sync
├── routers/
│   ├── screening.py           # GET /api/screening endpoints
│   ├── macro_analysis.py      # GET /api/macro-analysis endpoint
│   └── market_breadth.py      # GET /api/market-breadth endpoints
└── static/
    ├── templates/
    │   ├── base.html          # Base layout with theme system
    │   ├── screening.html     # Stock screening page
    │   ├── macro_analysis.html # Macro analysis page
    │   ├── market_breadth.html # Market breadth heat map page
    │   └── about.html         # About page
    ├── js/
    │   ├── theme.js           # Theme manager (Teal/Red/Dark)
    │   ├── api.js             # API client wrapper
    │   ├── macro_analysis.js  # Macro chart rendering
    │   ├── market_breadth.js  # Market breadth heat map rendering
    │   └── ...
    └── css/
        └── *.css              # Theme variables and component styles
```

## Key Patterns

### Configuration
- Uses `pydantic-settings` with `.env` file
- Copy `.env.example` to `.env` for local development
- Required env var: `DB_PASSWORD` (others have defaults)

### Database Access Pattern
```python
# For reading data (ALWAYS use cache for performance)
from app.cache_database import SessionLocal as CacheSessionLocal
cache_db = CacheSessionLocal()
data = cache_db.query(StockFundamentalScreeningCache).all()

# For syncing (remote → cache)
from app.database import SessionLocal as RemoteSessionLocal
from app.cache_database import SessionLocal as CacheSessionLocal
remote_db = RemoteSessionLocal()
cache_db = CacheSessionLocal()
# ... sync logic ...
```

### API Endpoints
- `/api/screening` - Stock screening with pagination/filtering/sorting
- `/api/screening/search/suggestions` - Autocomplete for stock search
- `/api/screening/top-stocks` - Top N stocks by overall score
- `/api/macro-analysis` - Macroeconomic analysis (monetary/credit cycles)
- `/api/market-breadth` - Market breadth heat map data
- `/api/market-breadth/industries` - List of available industries
- `/api/sync/status` - View sync status (stock + macro + market_breadth)
- `/api/sync/trigger?force=false` - Manual trigger sync

### Startup Sequence
1. `init_cache_db()` - Create SQLite tables if not exist (including macro and market breadth tables)
2. `init_scheduler()` - Start APScheduler for daily 5:00 AM sync
3. If cache empty → Initial full sync from remote (stocks + macro + market breadth)
4. Logs completion and serves requests

## Database Schema

### Remote Tables (MySQL)
- `stock_fundamental_screening` - Stock fundamental data with scores
- `bond_china_yield` - China bond yield curves with signals
- `macro_data` - Macroeconomic indicators (M1, GDP, PPI, loan growth)
- `market_breadth_metrics` - Market breadth data by industry (trade_date, industries_data JSON)

### Cache Tables (SQLite)
- `stock_fundamental_screening_cache` - Mirrors remote table, `stock_code` is unique
- `bond_china_yield_cache` - Bond yield data cache
- `macro_data_cache` - Macro indicators cache
- `market_breadth_metrics_cache` - Market breadth data cache (trade_date is unique)
- `sync_metadata` - Tracks sync history, status, and `remote_max_update_time`

### Key Fields
- Scores: `overall_score`, `growth_score`, `profitability_score`, `solvency_score`, `cashflow_score` (DECIMAL 5,2)
- `recommendation`: STRONG_BUY, BUY, HOLD, AVOID
- `pass_filters`: Boolean flag for filtering
- `credit_cycle`: Integer (0-4), count of expansion signals for credit cycle analysis

## Macro Analysis Logic

Located in `app/crud.py:get_macro_analysis()`

### Monetary Cycle (货币周期)
Based on bond yield signals (`one_year_signal`, `ten_year_signal`):
- Both TRUE = "宽货币" (Easy money) → Invest in high-risk assets
- Otherwise = "紧货币" (Tight money) → Invest in low-risk assets

### Credit Cycle (信用周期)
Based on `credit_cycle` count (0-4 expansion signals):
- >= 2 = "宽信用" (Easy credit) → Favor large-cap stocks
- < 2 = "紧信用" (Tight credit) → Favor small-cap stocks

### Investment Strategy Matrix
| Monetary | Credit | Strategy | Asset Allocation |
|----------|--------|----------|------------------|
| 宽货币 | 宽信用 | 买股票 | 复苏启动，风险资产领涨 |
| 宽货币 | 紧信用 | 买债券 | 经济差，政策托底 |
| 紧货币 | 宽信用 | 买商品+周期股 | 经济热，通胀起 |
| 紧货币 | 紧信用 | 持现金 | 全面收缩，防御为主 |

## Market Breadth Analysis

Located in `app/routers/market_breadth.py` and `app/crud.py:get_market_breadth_data()`

### Data Structure
- Heat map showing BIAS>0 stock ratio for each industry over time
- Industries stored as JSON in `industries_data` field
- Includes `index_all` (full market summary) and `sum` (industry totals) columns
- Default view: Last 30 trading days

### API Endpoints
- `GET /api/market-breadth` - Get heat map data with optional date/industry filters
- `GET /api/market-breadth/industries` - Get list of available industries

## Frontend Architecture

### Theme System
- Three themes: Teal (default), Red, Dark
- CSS variables in `app/static/css/variables-updated.css`
- Theme persistence via localStorage
- Managed by `app/static/js/theme.js`

### JavaScript Modules
- `api.js` - API client with error handling
- `theme.js` - Theme switching logic
- `macro_analysis.js` - Chart.js rendering for macro data
- `market_breadth.js` - Heat map rendering for market breadth data
- `components.js` - Reusable UI components
- `events.js` - Event handlers

### Templates
- Jinja2 with Bootstrap 5.3.0
- Responsive design (mobile/tablet/desktop)
- Base template with navigation and footer

## Deployment

Deployed to Zeabur (configured in `zeabur.yaml`):
- Free tier: 512MB RAM, 0.5GB storage
- Auto-build from GitHub
- Environment variable `DB_PASSWORD` must be set in Zeabur dashboard
- Custom domain: cicpa.fun with HTTPS (Let's Encrypt)

## Testing

No formal test suite is currently implemented. To add tests:
1. Create `tests/` directory
2. Add `pytest` to requirements.txt
3. Use FastAPI's `TestClient` for endpoint testing
4. Mock database sessions using pytest fixtures

### Manual Testing Scripts
The project includes several test scripts in the root directory:
- `check_*.py` - Various data validation scripts
- `test_*.py` - API endpoint and frontend testing
- `sync_market_breadth.py` - Manual market breadth sync trigger

## Dependencies

Key Python packages (from requirements.txt):
- `fastapi==0.115.0` - Web framework
- `uvicorn==0.27.0` - ASGI server
- `sqlalchemy==2.0.36` - ORM
- `pymysql==1.1.0` - MySQL driver
- `apscheduler==3.10.4` - Task scheduling
- `akshare==1.13.0` - Financial data source
- `pandas==2.2.0` - Data processing

## Development Notes

### Adding New API Endpoints
1. Create router in `app/routers/`
2. Register in `app/main.py` with `app.include_router()`
3. For data access, use cache DB (`get_cache_db()` dependency)
4. Add Pydantic schemas to `app/schemas.py` if needed

### Adding New Data Types (e.g., New Market Metrics)
1. Add remote model to `app/models.py`
2. Add cache model to `app/models.py` (with `Cache` suffix)
3. Create sync module (e.g., `app/my_metric_sync.py`) following pattern:
   - `init_*_cache_db()` - Create cache tables
   - `sync_*_data_from_remote()` - Sync remote to cache with incremental support
   - `get_*_sync_status()` - Return sync status dict
4. Import and call init in `app/data_sync.py:init_cache_db()`
5. Add CRUD functions in `app/crud.py`
6. Create router in `app/routers/my_metric.py`
7. Register in `app/main.py`
8. Optionally add to scheduled sync in `app/sync_scheduler.py`

### Syncing Data Manually
- POST `/api/sync/trigger?force=false` - Incremental sync (stocks + macro + market breadth)
- POST `/api/sync/trigger?force=true` - Full sync (clears cache first)

### Resetting Local Cache
Use the provided script:
```bash
python reset_cache_db.py
```
This will delete `app/static/data/stock_cache.db` and trigger a full sync on next startup.

### Data Deduplication
- Cache tables use unique constraints on key fields (e.g., `stock_code`)
- Sync logic checks `update_time` to determine if record needs update
- Latest record by `update_time` wins in case of conflicts
