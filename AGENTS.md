# AGENTS.md - Stock Fundamental Screening Dashboard

## Build/Run Commands
- **Development server**: `uvicorn app.main:app --reload`
- **Production server**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- **Install dependencies**: `pip install -r requirements.txt`
- **Quick test**: `python test_cache.py` or `test_quick.bat`
- **Single test**: Run specific test functions in `test_cache.py` directly

## Code Style Guidelines
- **Imports**: Group imports: standard lib → third-party → local modules
- **Formatting**: Follow existing patterns in codebase (no specific formatter)
- **Types**: Use type hints consistently (as seen in schemas.py and crud.py)
- **Naming**: snake_case for variables/functions, PascalCase for classes
- **Error handling**: Use try-except blocks with specific exception types
- **Database**: Use SQLAlchemy ORM with connection pooling
- **API design**: FastAPI with Pydantic schemas for validation
- **Templates**: Jinja2 templates with vanilla JavaScript for frontend

## Project Structure
- `app/main.py`: FastAPI app entry point
- `app/routers/`: API endpoints
- `app/models.py`: SQLAlchemy ORM models
- `app/schemas.py`: Pydantic request/response schemas
- `app/crud.py`: Database query functions
- `app/static/templates/`: HTML templates
- `app/static/js/`: Frontend JavaScript

## Key Patterns
- Configuration via `.env` file (copy `.env.example`)
- Remote MySQL + local SQLite cache architecture
- Single GET endpoint with filtering/sorting/pagination
- Bootstrap 5 frontend with vanilla JS for async data fetching

## Data Architecture

### Remote Data Source
- **Remote MySQL**: Source of truth for stock fundamental data
- **Local SQLite Cache**: Read-only mirror database for fast API responses
- **Sync Schedule**: Daily at 5:00 AM via `sync_scheduler.py`

### Data Flow
1. **Remote Database** → **Local Cache** (sync at 5:00 AM)
2. **Local Cache** → **Frontend** (via API)
3. **Frontend** → **Display** (Components.renderTable)

### Current Data Loading Issue Investigation
- **Problem**: Basic analysis page not showing data
- **Possible Cause**: API.BASE_URL is empty (`''` in `app/static/js/api.js`)
- **Symptom**: All requests fail silently or return 404
- **Files Involved**:
  - `app/static/js/api.js` (line 6: `static BASE_URL = ''`)
  - `app/static/js/events.js` (fetches data via API.getScreeningData())
  - `app/routers/screening.py` (returns stock data)

### Fix Required
- Set `API.BASE_URL` to correct base URL (e.g., `'http://localhost:8000'`)

## API Endpoints

### Screening Endpoints (`/api/screening`)
- `GET /api/screening?page={page}&page_size={page_size}&...` - Get stock screening list with filters
- `GET /api/screening/search/suggestions?q={q}&limit={limit}` - Get stock search suggestions
- `GET /api/screening/top-stocks?limit={limit}` - Get top N stocks by score

### Sync Endpoints
- `POST /api/sync/trigger?force={force}` - Manually trigger data sync from remote

### System Endpoints
- `GET /health` - Health check
- `GET /api/sync/status` - Get last sync status

## Frontend Components (`app/static/js/components.js`)
- `Components.getScoreClass(score)` - Return CSS class based on score value
- `Components.getRecommendationClass(recommendation)` - Return CSS class based on recommendation
- `Components.renderTop3(top3Data)` - Render top 3 stock cards
- `Components.renderTable(data)` - Render main data table with sorting
- `Components.renderPagination(total, page, pageSize, totalPages)` - Render pagination controls
- `Components.showError(message)` - Show error message in table body

### Events (`app/static/js/events.js`)
- `Events.fetchData()` - Main data fetching method
- `Events.resetFilters()` - Reset all filter inputs
- `Events.fetchTopStocks()` - Fetch top N stocks by score
- Events.fetchSearchSuggestions(keyword)` - Fetch search suggestions

### State Management
- `Events.state` - Global state object containing:
  - `currentPage` - Current page number (default: 1)
  - `sortBy` - Sort field (default: 'overall_score')
  - `sortOrder` - Sort direction (default: 'desc')
  - `searchKeyword` - Current search keyword
  - `searchDebounceTimer` - Timer for search debounce (500ms delay)
  - `has_searchDebounceTimer` - Flag for search debounce timer

## Data Fetching Pattern

### Initial Page Load
1. `DOMContentLoaded` → Events.init()` → Events.fetchData()` → API.getScreeningData(params)
2. `Events.fetchData()` calls `API.getScreeningData(params)`
3. API.getScreeningData() builds query params and fetches from `this.BASE_URL/api/screening${queryParams ? '?' + queryParams : ''}`
4. Response: `{top3: [...], data: [...], total: 999, page: 1, page_size: 20, total_pages: 50, total: 999}`
5. Components renders: `top3`, `table`, `pagination`

### Filter/Sort Flow
1. User changes filter input → `bindFilterEvents()` → updates `this.state`
2. User clicks "重置" button → `resetFilters()` → `this.state.currentPage = 1; this.fetchData()`
3. User changes sort header → `bindSortEvents()` → updates `this.state.sortBy`, `this.state.sortOrder` → `this.fetchData()`
4. User clicks "应用筛选" button → `bindFilterEvents()` → `applySearchFilter(keyword)` → `this.fetchData()`
5. User clicks pagination link → `bindPaginationEvents()` → `this.state.currentPage = newPage` → `this.fetchData()`

### Search Flow
1. User types in search box → `bindSearchEvents()` → `searchInput.addEventListener('input'/'keydown')` events`
2. On `keydown` event (Enter key):
   - Debounce: `setTimeout(500ms)` → `await API.getSearchSuggestions(keyword)` → `Components.renderSearchSuggestions()`
3 - On `input` event (typing): Hide suggestions if empty keyword → `Components.hideSearchSuggestions()`
4 - Click search suggestion item → `applySearchFilter(stock_code)` → `hideSearchSuggestions()` → `fetchData()`

## Skeleton Loading
- **Top 3 Cards**: `Components.renderTop3()` called by `Events.fetchData()` when `currentPage === 1`
- **Main Table**: `Components.renderTable()` called every time `fetchData()` is called
- **Pagination**: `Components.renderPagination()` called after data is loaded
- **Skeleton Classes**: `.skeleton`, `.card-code.skeleton`, `.card-name.skeleton`, `.card-price.skeleton`, `.card-tag.skeleton`, `.card-content.skeleton`
- **Skeleton HTML**: Loading spinner in center of table body

## Chart Loading Speed Issues
- **Problem**: Charts load very slowly
- **Possible Causes**:
  - Large dataset (999 stocks in database)
  - Multiple API calls to fetch Top 3, suggestions, table data
  - Remote MySQL connection latency
  - ECharts rendering heavy charts with lots of data points

### Optimization Opportunities
1. Implement lazy loading for pagination
2. Add data streaming for large datasets
3. Cache search suggestions locally
4. Use CDN for ECharts (already in use)
5. Add loading states and skeletons for charts

## Common Issues and Solutions

### No Data Showing on Basic Analysis Page
**Symptom**: Table shows "无数据" or loading spinner stuck
**Diagnosis**:
  1. Check API.BASE_URL - currently empty string
   2. Check cache database - may be empty (no cached stock data)
  3. Check API response - likely failing silently due to empty BASE_URL
 4. Check console for errors in `events.js` and `api.js`
  5. Check browser network tab for failed requests

**Solutions**:
1. Set `API.BASE_URL = 'http://localhost:8000'` in `app/static/js/api.js`
2. Check database cache - if empty, trigger manual sync via `POST /api/sync/trigger?force=true`
3. Check API connectivity - verify API.BASE_URL is correctly set
4. Check browser console for error messages

### Charts Loading Slow
**Symptoms**: ECharts take 10+ seconds to render
**Diagnosis**:
  - Large dataset size
  - Multiple parallel API calls
  - Remote database latency
  - Too many data points for ECharts to render efficiently

**Solutions**:
1. Reduce dataset size for pagination (already implemented - 20 per page)
2. Implement lazy loading for charts
3. Add pagination to individual charts
4. Optimize database queries with indexes
5. Consider using Web Workers for chart rendering

## Testing

### Unit Testing
- `test_cache.py` - Cache database testing
- **Test 1**: `test_cache_db_connection()` - Verify SQLite cache connection
- **Test 2**: `test_sync_status()` - Check sync status endpoint
- **Test 3**: `test_screening_api()` - Test screening API endpoint
- **Test 4**: `test_health_check()` - Health check endpoint

### Integration Testing
- Start dev server: `uvicorn app.main:app --reload`
- Manual sync: `curl -X POST http://localhost:8000/api/sync/trigger?force=true`
- Check sync status: `curl http://localhost:8000/api/sync/status`
- Get health: `curl http://localhost:8000/health`

### Browser Testing
- Open DevTools (F12)
- Check Network tab for failed requests (red color = failed, 4xx/5xx)
- Check Console tab for JavaScript errors (red text)
- Check Application/Network tab for request timing
- Monitor Console tab for API responses and data rendering

### Manual Data Verification
```sql
-- Check cache database contents
SELECT stock_code, stock_name, overall_score, calc_time 
FROM stock_fundamental_screening_cache 
ORDER BY overall_score DESC 
LIMIT 5;
```

## Deployment

### Environment Variables (.env)
```
DATABASE_URL=mysql+mysql://user:password@host:port/dbname
CACHE_DATABASE_URL=sqlite:///./app/static/data/stock_cache.db
```

### Production Considerations
- Remote MySQL database must be accessible
- SQLite cache is read-only, data comes from sync process
- Sync runs at 5:00 AM daily
- API timeouts configured (300ms default)
- CORS may need to be configured for remote access
- Static files served via FastAPI StaticFiles

## Development Workflow
1. Install dependencies: `pip install -r requirements.txt`
2. Configure environment: Copy `.env.example` to `.env` with your database credentials
3. Run server: `uvicorn app.main:app --reload`
4. Test basic page at `http://localhost:8000/`
5. Trigger data sync: POST `/api/sync/trigger?force=true` or wait for 5:00 AM sync
6. Monitor server logs for errors
7. Open browser DevTools to verify API responses
