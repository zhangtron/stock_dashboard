from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date


class FinancialScoresSchema(BaseModel):
    id: int
    stock_code: str
    stock_name: Optional[str] = None
    overall_score: Optional[float] = None
    total_score: Optional[float] = None
    grade: Optional[str] = None
    recommendation: Optional[str] = None
    metrics_detail: Optional[str] = None
    metrics_detail_parsed: List[Dict[str, Any]] = Field(default_factory=list, description="解析后的指标详情")
    completeness_ratio: Optional[float] = None
    sector_name: Optional[str] = None
    data_date: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True


class ScreeningFilterParams(BaseModel):
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")
    stock_code: Optional[str] = Field(None, description="股票代码")
    stock_name: Optional[str] = Field(None, description="股票名称")
    sector_name: Optional[str] = Field(None, description="板块名称")
    search: Optional[str] = Field(None, description="搜索关键词（代码或名称，OR逻辑）")
    min_overall_score: Optional[float] = Field(None, ge=0, le=100, description="最小综合得分")
    max_overall_score: Optional[float] = Field(None, ge=0, le=100, description="最大综合得分")
    pass_filters: Optional[bool] = Field(None, description="是否通过筛选")
    recommendation: Optional[str] = Field(None, description="投资建议")
    sort_by: str = Field("overall_score", description="排序字段")
    sort_order: str = Field("desc", description="排序方向 (asc/desc)")


class ScreeningResponse(BaseModel):
    top3: List[FinancialScoresSchema] = Field(default_factory=list, description="Top 3推荐")
    data: List[FinancialScoresSchema] = Field(default_factory=list, description="当前页数据")
    total: int = Field(0, description="总数据量")
    page: int = Field(1, description="当前页")
    page_size: int = Field(20, description="每页数量")
    total_pages: int = Field(0, description="总页数")


class SearchSuggestionItem(BaseModel):
    stock_code: str = Field(..., description="股票代码")
    stock_name: Optional[str] = Field(None, description="股票名称")
    overall_score: Optional[float] = Field(None, description="综合得分")
    grade: Optional[str] = Field(None, description="评级")
    sector_name: Optional[str] = Field(None, description="板块名称")


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


class MarketBreadthResponse(BaseModel):
    dates: List[str] = Field(..., description="日期列表（Y轴）")
    columns: List[str] = Field(..., description="列名列表（X轴）：各行业 + index_all + sum")
    data: List[List[int]] = Field(..., description="热力图数据矩阵（BIAS>0比例）")
    statistics: Dict[str, Any] = Field(default_factory=dict, description="统计数据")
    last_update: Optional[str] = Field(None, description="最后更新时间")


class MarketBreadthIndustriesResponse(BaseModel):
    industries: List[str] = Field(..., description="行业列表（排除 index_all）")
