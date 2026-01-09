from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


class StockFundamentalScreeningSchema(BaseModel):
    id: int
    stock_code: str
    stock_name: Optional[str] = None
    overall_score: Optional[float] = None
    growth_score: Optional[float] = None
    profitability_score: Optional[float] = None
    solvency_score: Optional[float] = None
    cashflow_score: Optional[float] = None
    recommendation: Optional[str] = None
    pass_filters: Optional[bool] = None
    latest_quarter: Optional[date] = None
    report_publ_date: Optional[date] = None
    calc_time: Optional[datetime] = None
    create_time: Optional[datetime] = None
    update_time: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ScreeningFilterParams(BaseModel):
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")
    stock_code: Optional[str] = Field(None, description="股票代码")
    stock_name: Optional[str] = Field(None, description="股票名称")
    search: Optional[str] = Field(None, description="搜索关键词（代码或名称，OR逻辑）")
    min_overall_score: Optional[float] = Field(None, ge=0, le=100, description="最小综合得分")
    max_overall_score: Optional[float] = Field(None, ge=0, le=100, description="最大综合得分")
    pass_filters: Optional[bool] = Field(None, description="是否通过筛选")
    recommendation: Optional[str] = Field(None, description="投资建议")
    sort_by: str = Field("overall_score", description="排序字段")
    sort_order: str = Field("desc", description="排序方向 (asc/desc)")


class ScreeningResponse(BaseModel):
    top3: List[StockFundamentalScreeningSchema] = Field(default_factory=list, description="Top 3推荐")
    data: List[StockFundamentalScreeningSchema] = Field(default_factory=list, description="当前页数据")
    total: int = Field(0, description="总数据量")
    page: int = Field(1, description="当前页")
    page_size: int = Field(20, description="每页数量")
    total_pages: int = Field(0, description="总页数")


class SearchSuggestionItem(BaseModel):
    stock_code: str = Field(..., description="股票代码")
    stock_name: Optional[str] = Field(None, description="股票名称")


class SearchSuggestionsResponse(BaseModel):
    suggestions: List[SearchSuggestionItem] = Field(default_factory=list, description="搜索建议列表")
