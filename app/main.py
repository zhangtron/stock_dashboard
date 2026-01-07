from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.routers import screening
from app.config import settings
import os

app = FastAPI(
    title=settings.APP_NAME,
    description="股票基本面选股数据看板",
    version="1.0.0"
)

app.include_router(screening.router, prefix="/api")

base_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(base_dir, "static")
templates_dir = os.path.join(static_dir, "templates")

app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)


@app.get("/", response_class=HTMLResponse, summary="首页")
async def read_root(request: Request):
    return templates.TemplateResponse("screening.html", {"request": request})


@app.get("/screening", response_class=HTMLResponse, summary="基本面选股页面")
async def screening_page(request: Request):
    return templates.TemplateResponse("screening.html", {"request": request})


@app.get("/health", summary="健康检查")
async def health_check():
    return {"status": "healthy", "app_name": settings.APP_NAME}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
