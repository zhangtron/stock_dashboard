from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
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


class MacroAnalysisSchema(BaseModel):
    monetary_cycle: str = Field(..., description="货币周期状态")
    credit_cycle: str = Field(..., description="信用周期状态")
    market_cap_bias: str = Field(..., description="利好大市值或小市值")
    calc_time: str = Field(..., description="计算时间")
    raw_data: Dict[str, Any] = Field(default_factory=dict, description="原始图表数据")
    # 新增字段
    monetary_status: str = Field(..., description="货币状态：宽货币/紧货币")
    credit_status: str = Field(..., description="信用状态：宽信用/紧信用")
    combination: str = Field(..., description="货币+信用组合状态")
    investment_strategy: str = Field(..., description="投资策略建议")
    asset_allocation: str = Field(..., description="资产配置建议")
