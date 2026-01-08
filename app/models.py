from sqlalchemy import Column, Integer, String, DECIMAL, Date, DateTime, Boolean, Index
from datetime import datetime
from app.database import Base
from app.cache_database import Base as CacheBase


class StockFundamentalScreening(Base):
    __tablename__ = 'stock_fundamental_screening'

    id = Column(Integer, primary_key=True, autoincrement=True)
    stock_code = Column(String(20), nullable=False, index=True, comment='股票代码')
    stock_name = Column(String(100), comment='股票名称')
    overall_score = Column(DECIMAL(5, 2), comment='综合得分')
    growth_score = Column(DECIMAL(5, 2), comment='成长能力得分')
    profitability_score = Column(DECIMAL(5, 2), comment='盈利能力得分')
    solvency_score = Column(DECIMAL(5, 2), comment='偿债能力得分')
    cashflow_score = Column(DECIMAL(5, 2), comment='现金流能力得分')
    recommendation = Column(String(20), comment='投资建议')
    pass_filters = Column(Boolean, comment='是否通过筛选')
    latest_quarter = Column(Date, comment='最新财报截止日期')
    report_publ_date = Column(Date, comment='报告披露日期')
    calc_time = Column(DateTime, index=True, comment='计算时间')
    create_time = Column(DateTime, default=datetime.now, comment='创建时间')
    update_time = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')


class StockFundamentalScreeningCache(CacheBase):
    __tablename__ = 'stock_fundamental_screening_cache'

    id = Column(Integer, primary_key=True)
    stock_code = Column(String(20), nullable=False, index=True, comment='股票代码')
    stock_name = Column(String(100), comment='股票名称')
    overall_score = Column(DECIMAL(5, 2), index=True, comment='综合得分')
    growth_score = Column(DECIMAL(5, 2), comment='成长能力得分')
    profitability_score = Column(DECIMAL(5, 2), comment='盈利能力得分')
    solvency_score = Column(DECIMAL(5, 2), comment='偿债能力得分')
    cashflow_score = Column(DECIMAL(5, 2), comment='现金流能力得分')
    recommendation = Column(String(20), comment='投资建议')
    pass_filters = Column(Boolean, comment='是否通过筛选')
    latest_quarter = Column(Date, comment='最新财报截止日期')
    report_publ_date = Column(Date, comment='报告披露日期')
    calc_time = Column(DateTime, comment='计算时间')
    create_time = Column(DateTime, comment='创建时间')
    update_time = Column(DateTime, comment='更新时间')


class SyncMetadata(CacheBase):
    __tablename__ = 'sync_metadata'

    id = Column(Integer, primary_key=True)
    last_sync_time = Column(DateTime, nullable=False, comment='上次同步时间')
    record_count = Column(Integer, nullable=False, comment='同步记录数')
    sync_status = Column(String(20), nullable=False, comment='同步状态: success/failed')
    error_message = Column(String(500), comment='错误信息')
    remote_max_update_time = Column(DateTime, comment='远程数据库最大更新时间')
