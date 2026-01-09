from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.routers import screening
from app.config import settings
from app.data_sync import init_cache_db, sync_data_from_remote, get_sync_status
from app.sync_scheduler import init_scheduler, shutdown_scheduler, get_scheduler_status
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    description="股票基本面选股数据看板",
    version="1.0.1"
)

app.include_router(screening.router, prefix="/api")

base_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(base_dir, "static")
templates_dir = os.path.join(static_dir, "templates")

app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)


@app.on_event("startup")
async def startup_event():
    """应用启动时的初始化操作"""
    try:
        logger.info("正在初始化本地缓存数据库...")
        init_cache_db()

        logger.info("正在启动定时任务调度器...")
        init_scheduler()

        sync_status = get_sync_status()
        if not sync_status['has_data']:
            logger.info("本地缓存为空，执行首次数据同步...")
            result = sync_data_from_remote()
            if result['success']:
                logger.info(f"首次同步完成，共同步 {result['record_count']} 条记录")
            else:
                logger.warning(f"首次同步失败: {result.get('error', 'Unknown error')}")

        logger.info("应用启动完成！")

    except Exception as e:
        logger.error(f"应用启动初始化失败: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时的清理操作"""
    try:
        logger.info("正在关闭定时任务调度器...")
        shutdown_scheduler()
        logger.info("应用关闭完成！")
    except Exception as e:
        logger.error(f"应用关闭时出错: {e}")


@app.get("/", response_class=HTMLResponse, summary="首页")
async def read_root(request: Request):
    return templates.TemplateResponse("screening.html", {"request": request})


@app.get("/screening", response_class=HTMLResponse, summary="基本面选股页面")
async def screening_page(request: Request):
    return templates.TemplateResponse("screening.html", {"request": request})


@app.get("/health", summary="健康检查")
async def health_check():
    from app.database import engine
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "app_name": settings.APP_NAME, "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "app_name": settings.APP_NAME, "database": "disconnected", "error": str(e)}


@app.get("/api/sync/status", summary="获取同步状态")
async def get_sync_status_api():
    """获取数据同步状态"""
    from app.data_sync import get_sync_status
    from app.sync_scheduler import get_scheduler_status
    try:
        sync_status = get_sync_status()
        scheduler_status = get_scheduler_status()
        return {
            "sync": sync_status,
            "scheduler": scheduler_status
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/sync/trigger", summary="手动触发数据同步")
async def trigger_sync(force: bool = False):
    """
    手动触发数据同步
    - force=False: 增量同步（仅同步新增/更新的数据）
    - force=True: 强制全量同步（清除缓存，重新同步所有数据）
    """
    from app.data_sync import sync_data_from_remote, force_full_sync
    try:
        logger.info(f"收到手动同步请求，force={force}")
        if force:
            result = force_full_sync()
        else:
            result = sync_data_from_remote()
        return result
    except Exception as e:
        logger.error(f"手动同步失败: {e}")
        return {
            "success": False,
            "error": str(e),
            "sync_type": "full" if force else "incremental"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
