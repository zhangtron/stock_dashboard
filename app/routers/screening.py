from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session
from app.cache_database import get_cache_db
from app.crud import get_screening_list, get_top3_by_overall_score, search_stock_suggestions, get_top_stocks_by_overall_score
from app.schemas import ScreeningFilterParams, ScreeningResponse, SearchSuggestionsResponse

router = APIRouter(prefix="/screening", tags=["基本面选股"])


@router.get("", response_model=ScreeningResponse, summary="获取基本面选股数据列表")
async def get_screening_data(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    stock_code: Optional[str] = Query(None, description="股票代码"),
    stock_name: Optional[str] = Query(None, description="股票名称"),
    search: Optional[str] = Query(None, description="搜索关键词（代码或名称，OR逻辑）"),
    min_overall_score: Optional[float] = Query(None, ge=0, le=100, description="最小综合得分"),
    max_overall_score: Optional[float] = Query(None, ge=0, le=100, description="最大综合得分"),
    pass_filters: Optional[bool] = Query(None, description="是否通过筛选"),
    recommendation: Optional[str] = Query(None, description="投资建议"),
    sort_by: str = Query("overall_score", description="排序字段"),
    sort_order: str = Query("desc", description="排序方向 (asc/desc)"),
    db: Session = Depends(get_cache_db)
):
    """
    从本地缓存获取基本面选股数据列表，支持筛选、排序、分页

    - **page**: 页码，从1开始
    - **page_size**: 每页数量，1-100
    - **stock_code**: 股票代码（模糊搜索）
    - **stock_name**: 股票名称（模糊搜索）
    - **search**: 搜索关键词（代码或名称，OR逻辑）
    - **min_overall_score**: 最小综合得分
    - **max_overall_score**: 最大综合得分
    - **pass_filters**: 是否通过筛选
    - **recommendation**: 投资建议（STRONG_BUY/BUY/HOLD/AVOID）
    - **sort_by**: 排序字段（默认：overall_score）
    - **sort_order**: 排序方向（asc/desc，默认：desc）
    """
    params = ScreeningFilterParams(
        page=page,
        page_size=page_size,
        stock_code=stock_code if stock_code else None,
        stock_name=stock_name if stock_name else None,
        search=search if search else None,
        min_overall_score=min_overall_score,
        max_overall_score=max_overall_score,
        pass_filters=pass_filters,
        recommendation=recommendation if recommendation and recommendation.strip() else None,
        sort_by=sort_by,
        sort_order=sort_order
    )

    data, total = get_screening_list(db, params)
    top3 = get_top3_by_overall_score(db)

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return ScreeningResponse(
        top3=top3,
        data=data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/search/suggestions", response_model=SearchSuggestionsResponse, summary="搜索股票代码或名称的建议")
async def search_suggestions(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    limit: int = Query(10, ge=1, le=20, description="返回数量"),
    db: Session = Depends(get_cache_db)
):
    """
    搜索股票代码或名称的建议（OR逻辑，模糊匹配）

    - **q**: 搜索关键词
    - **limit**: 返回数量，1-20
    """
    suggestions = search_stock_suggestions(db, q, limit)
    
    return SearchSuggestionsResponse(
        suggestions=[
            {
                "stock_code": item.stock_code,
                "stock_name": item.stock_name
            }
            for item in suggestions
        ]
    )


@router.get("/top-stocks", summary="获取综合排名前N的股票")
async def get_top_stocks(
    limit: int = Query(8, ge=1, le=20, description="返回数量"),
    db: Session = Depends(get_cache_db)
):
    """
    获取综合得分前N名的股票

    - **limit**: 返回数量，1-20
    """
    top_stocks = get_top_stocks_by_overall_score(db, limit)
    
    return SearchSuggestionsResponse(
        suggestions=[
            {
                "stock_code": item.stock_code,
                "stock_name": item.stock_name
            }
            for item in top_stocks
        ]
    )
