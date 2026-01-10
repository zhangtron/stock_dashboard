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