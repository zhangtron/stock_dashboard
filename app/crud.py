from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from app.models import StockFundamentalScreening, StockFundamentalScreeningCache
from app.schemas import ScreeningFilterParams


def get_screening_list(
    db: Session,
    params: ScreeningFilterParams
) -> Tuple[List[StockFundamentalScreeningCache], int]:
    """
    从本地缓存获取基本面选股数据列表
    返回: (数据列表, 总数)
    """
    query = db.query(StockFundamentalScreeningCache)

    if params.stock_code:
        query = query.filter(StockFundamentalScreeningCache.stock_code.like(f"%{params.stock_code}%"))

    if params.stock_name:
        query = query.filter(StockFundamentalScreeningCache.stock_name.like(f"%{params.stock_name}%"))

    if params.min_overall_score is not None:
        query = query.filter(StockFundamentalScreeningCache.overall_score >= params.min_overall_score)

    if params.max_overall_score is not None:
        query = query.filter(StockFundamentalScreeningCache.overall_score <= params.max_overall_score)

    if params.pass_filters is not None:
        query = query.filter(StockFundamentalScreeningCache.pass_filters == params.pass_filters)

    if params.recommendation:
        query = query.filter(StockFundamentalScreeningCache.recommendation == params.recommendation)

    total = query.count()

    if params.sort_by and hasattr(StockFundamentalScreeningCache, params.sort_by):
        sort_column = getattr(StockFundamentalScreeningCache, params.sort_by)
        if params.sort_order == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

    offset = (params.page - 1) * params.page_size
    data = query.offset(offset).limit(params.page_size).all()

    return data, total


def get_top3_by_overall_score(db: Session) -> List[StockFundamentalScreeningCache]:
    """
    从本地缓存获取综合得分前3的股票
    """
    top3 = db.query(StockFundamentalScreeningCache)\
        .order_by(desc(StockFundamentalScreeningCache.overall_score))\
        .limit(3)\
        .all()
    return top3
