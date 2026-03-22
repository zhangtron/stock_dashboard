import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.cache_database import get_cache_db
from app.crud import (
    get_l2_available_dates,
    get_l2_available_sectors,
    get_l2_market_list,
    get_l2_stock_history,
    get_l2_top_stocks_by_date,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/l2-analysis")


@router.get("/top-stocks-matrix")
async def get_top_stocks_matrix(
    days: int = Query(6, ge=1, le=30, description="最近 N 个交易日"),
    limit_per_day: int = Query(8, ge=1, le=50, description="每天 Top N 股票"),
    sector: Optional[str] = Query(None, description="板块筛选"),
    cache_db: Session = Depends(get_cache_db),
):
    try:
        data = get_l2_top_stocks_by_date(
            cache_db,
            days=days,
            limit_per_day=limit_per_day,
            sector=sector,
        )

        if not data:
            return JSONResponse(
                status_code=503,
                content={
                    "error": "L2 分析数据尚未就绪，请稍后再试",
                    "message": "系统正在同步 L2 分析数据，请稍后重试或检查同步状态。",
                },
            )

        return {
            "data": data,
            "total_days": len(data),
        }
    except Exception as error:
        logger.error("获取 L2 Top 股票矩阵失败: %s", error)
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/stock-history")
async def get_stock_history_api(
    stock_code: str = Query(..., description="股票代码"),
    days: int = Query(30, ge=1, le=100, description="最近 N 天"),
    cache_db: Session = Depends(get_cache_db),
):
    try:
        data = get_l2_stock_history(
            cache_db,
            stock_code=stock_code,
            days=days,
        )

        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"未找到股票 {stock_code} 的 L2 分析数据",
            )

        return data
    except HTTPException:
        raise
    except Exception as error:
        logger.error("获取股票历史数据失败: %s", error)
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/market-list")
async def get_market_list_api(
    date: Optional[str] = Query(None, description="交易日期 (YYYY-MM-DD)"),
    sector: Optional[str] = Query(None, description="板块筛选"),
    stock_code: Optional[str] = Query(None, description="股票代码"),
    stock_name: Optional[str] = Query(None, description="股票名称"),
    min_score: Optional[float] = Query(None, ge=0, le=100, description="最小评分"),
    max_score: Optional[float] = Query(None, ge=0, le=100, description="最大评分"),
    sort_by: str = Query("score", description="排序字段"),
    sort_order: str = Query("desc", description="排序方向"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    cache_db: Session = Depends(get_cache_db),
):
    try:
        data, total = get_l2_market_list(
            cache_db,
            date=date,
            sector=sector,
            stock_code=stock_code,
            stock_name=stock_name,
            min_score=min_score,
            max_score=max_score,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=page_size,
        )

        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return {
            "data": data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }
    except Exception as error:
        logger.error("获取全市场列表失败: %s", error)
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/available-dates")
async def get_available_dates_api(cache_db: Session = Depends(get_cache_db)):
    try:
        dates = get_l2_available_dates(cache_db)
        return {"dates": dates}
    except Exception as error:
        logger.error("获取可用日期列表失败: %s", error)
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/available-sectors")
async def get_available_sectors_api(cache_db: Session = Depends(get_cache_db)):
    try:
        sectors = get_l2_available_sectors(cache_db)
        return {"sectors": sectors}
    except Exception as error:
        logger.error("获取可用板块列表失败: %s", error)
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/sync-status")
async def get_l2_analysis_sync_status():
    from app.l2_analysis_sync import get_l2_analysis_sync_status as get_sync_status

    try:
        return get_sync_status()
    except Exception as error:
        logger.error("获取 L2 分析同步状态失败: %s", error)
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/sync")
async def sync_l2_analysis():
    from app.l2_analysis_sync import sync_l2_analysis_data_from_remote

    try:
        logger.info("收到 L2 分析数据同步请求")
        return sync_l2_analysis_data_from_remote()
    except Exception as error:
        logger.error("L2 分析数据同步失败: %s", error)
        raise HTTPException(status_code=500, detail=str(error))
