from sqlalchemy import Column, Integer, String, DECIMAL, Date, DateTime, Boolean, Index, Text, Float
from datetime import datetime
from app.database import Base
from app.cache_database import Base as CacheBase


class MarketBreadthMetrics(Base):
    __tablename__ = 'market_breadth_metrics'

    id = Column(Integer, primary_key=True, autoincrement=True, comment='ID')
    industries_data = Column(Text, comment='各行业BIAS>0比例数据(JSON格式)')
    market_breadth = Column(DECIMAL(5, 2), index=True, comment='全市场BIAS>0比例')
    total_breadth = Column(DECIMAL(5, 2), index=True, comment='各行业BIAS>0比例总和')
    trade_date = Column(DateTime, index=True, comment='交易日期')
    update_time = Column(DateTime, comment='更新时间')


class MarketBreadthMetricsCache(CacheBase):
    __tablename__ = 'market_breadth_metrics_cache'

    id = Column(Integer, primary_key=True, comment='ID')
    industries_data = Column(Text, comment='各行业BIAS>0比例数据(JSON格式)')
    market_breadth = Column(DECIMAL(5, 2), comment='全市场BIAS>0比例')
    total_breadth = Column(DECIMAL(5, 2), comment='各行业BIAS>0比例总和')
    trade_date = Column(String(50), index=True, comment='交易日期')
    update_time = Column(String(50), comment='更新时间')


class FinancialScores(Base):
    __tablename__ = 'financial_scores'

    stock_code = Column(String(20), primary_key=True, comment='股票代码')
    stock_name = Column(String(100), comment='股票名称')
    total_score = Column(DECIMAL(5, 2), index=True, comment='综合得分')
    grade = Column(String(2), index=True, comment='评级')
    metrics_detail = Column(Text, comment='指标详情(JSON格式)')
    completeness_ratio = Column(DECIMAL(5, 4), comment='数据完整度')
    data_date = Column(Date, index=True, comment='数据日期')
    created_at = Column(DateTime, default=datetime.now, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')


class FinancialScoresCache(CacheBase):
    __tablename__ = 'financial_scores_cache'

    id = Column(Integer, primary_key=True)
    stock_code = Column(String(20), nullable=False, unique=True, index=True, comment='股票代码')
    stock_name = Column(String(100), comment='股票名称')
    total_score = Column(DECIMAL(5, 2), index=True, comment='综合得分')
    grade = Column(String(2), index=True, comment='评级')
    metrics_detail = Column(Text, comment='指标详情(JSON格式)')
    completeness_ratio = Column(DECIMAL(5, 4), comment='数据完整度')
    sector_name = Column(String(50), comment='板块名称')
    data_date = Column(Date, comment='数据日期')
    created_at = Column(DateTime, comment='创建时间')
    updated_at = Column(DateTime, comment='更新时间')


class StockDetails(Base):
    __tablename__ = 'stock_details'

    stock_code = Column(String(20), primary_key=True, comment='股票代码')
    stock_name = Column(String(100), comment='股票名称')
    sector_code = Column(String(20), index=True, comment='板块代码')
    sector_name = Column(String(50), comment='板块名称')
    detail_info = Column(Text, comment='详细信息(JSON格式)')
    created_at = Column(DateTime, default=datetime.now, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')


class StockDetailsCache(CacheBase):
    __tablename__ = 'stock_details_cache'

    id = Column(Integer, primary_key=True)
    stock_code = Column(String(20), nullable=False, unique=True, index=True, comment='股票代码')
    stock_name = Column(String(100), comment='股票名称')
    sector_code = Column(String(20), comment='板块代码')
    sector_name = Column(String(50), comment='板块名称')
    detail_info = Column(Text, comment='详细信息(JSON格式)')
    created_at = Column(DateTime, comment='创建时间')
    updated_at = Column(DateTime, comment='更新时间')


class SyncMetadata(CacheBase):
    __tablename__ = 'sync_metadata'

    id = Column(Integer, primary_key=True, comment='ID')
    last_sync_time = Column(String(50), comment='最后同步时间')
    record_count = Column(Integer, comment='记录数量')
    sync_status = Column(String(50), comment='同步状态')
    error_message = Column(Text, comment='错误信息')
    remote_max_update_time = Column(String(50), comment='远程最大更新时间')


class EtfClusterSelection(Base):
    """ETF聚类选股表"""
    __tablename__ = 'etf_cluster_selection'

    id = Column(Integer, primary_key=True, autoincrement=True, comment='ID')
    fund_code = Column(String(20), nullable=False, index=True, comment='基金代码')
    fund_name = Column(String(100), comment='基金名称')
    cluster_name = Column(String(50), index=True, comment='聚类名称')
    update_date = Column(Date, nullable=False, index=True, comment='更新日期')
    rank = Column(Integer, nullable=False, index=True, comment='排名')
    score = Column(Float, comment='得分')
    created_at = Column(DateTime, default=datetime.now, comment='创建时间')


class EtfClusterSelectionCache(CacheBase):
    """ETF聚类选股缓存表"""
    __tablename__ = 'etf_cluster_selection_cache'

    id = Column(Integer, primary_key=True, comment='ID')
    fund_code = Column(String(20), nullable=False, index=True, comment='基金代码')
    fund_name = Column(String(100), comment='基金名称')
    cluster_name = Column(String(50), index=True, comment='聚类名称')
    update_date = Column(String(50), index=True, comment='更新日期')
    rank = Column(Integer, nullable=False, index=True, comment='排名')
    score = Column(Float, comment='得分')
    created_at = Column(DateTime, comment='创建时间')
