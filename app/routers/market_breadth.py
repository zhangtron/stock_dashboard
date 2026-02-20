from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, date, timedelta
import logging

from app.cache_database import get_cache_db
from app.crud import get_market_breadth_data, get_market_breadth_industries
from app.schemas import MarketBreadthResponse, MarketBreadthIndustriesResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/market-breadth")


@router.get("")
async def get_market_breadth(
    start_date: Optional[str] = Query(None, description="开始日期 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="结束日期 (YYYY-MM-DD)"),
    industries: Optional[str] = Query(None, description="行业列表，逗号分隔"),
    cache_db: Session = Depends(get_cache_db)
):
    """
    获取市场宽度热力图数据
    - 展示各行业BIAS>0的股票比例热力图
    - 默认返回最近30个交易日数据
    - 支持日期范围筛选
    - 支持行业筛选（逗号分隔）
    - 包含 index_all（全市场汇总）和 sum（各行业总和）列
    """
    # 解析日期
    parsed_start_date = None
    parsed_end_date = None

    if start_date:
        try:
            parsed_start_date = start_date  # 直接使用字符串
        except:
            raise HTTPException(status_code=400, detail="开始日期格式错误，应为 YYYY-MM-DD")

    if end_date:
        try:
            parsed_end_date = end_date  # 直接使用字符串
        except:
            raise HTTPException(status_code=400, detail="结束日期格式错误，应为 YYYY-MM-DD")

    # 如果没有指定日期范围，默认使用最近30个交易日
    if not parsed_start_date and not parsed_end_date:
        from app.models import MarketBreadthMetricsCache
        latest_record = cache_db.query(MarketBreadthMetricsCache.trade_date)\
            .order_by(MarketBreadthMetricsCache.trade_date.desc())\
            .first()
        if latest_record:
            parsed_end_date = latest_record[0]
        else:
            parsed_end_date = date.today().strftime('%Y-%m-%d')

        # 计算45天前的日期（约30个交易日）
        end_dt = datetime.strptime(parsed_end_date, '%Y-%m-%d')
        start_dt = end_dt - timedelta(days=45)
        parsed_start_date = start_dt.strftime('%Y-%m-%d')

    # 解析行业列表
    parsed_industries = None
    if industries:
        parsed_industries = [i.strip() for i in industries.split(',') if i.strip()]

    data = get_market_breadth_data(
        cache_db,
        start_date=parsed_start_date,
        end_date=parsed_end_date,
        industries=parsed_industries
    )

    if not data:
        return JSONResponse(
            status_code=503,
            content={
                "error": "市场宽度数据尚未就绪，请稍后再试",
                "message": "系统正在同步市场宽度数据，请等待每日自动更新或检查系统状态"
            }
        )

    return data


@router.get("/industries", response_model=MarketBreadthIndustriesResponse)
async def get_industries(cache_db: Session = Depends(get_cache_db)):
    """
    获取所有可用行业列表（排除 index_all）
    """
    industries = get_market_breadth_industries(cache_db)
    return {"industries": industries}


@router.get("/sync-status")
async def get_market_breadth_sync_status():
    """
    获取市场宽度数据同步状态
    """
    from app.market_breadth_sync import get_market_breadth_sync_status
    try:
        status = get_market_breadth_sync_status()
        return status
    except Exception as e:
        logger.error(f"获取市场宽度同步状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
async def sync_market_breadth():
    """
    手动触发市场宽度数据同步（从远程MySQL同步到本地SQLite缓存）
    """
    from app.market_breadth_sync import sync_market_breadth_data_from_remote
    try:
        logger.info("收到市场宽度数据同步请求")
        result = sync_market_breadth_data_from_remote()
        return result
    except Exception as e:
        logger.error(f"市场宽度数据同步失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
