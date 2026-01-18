from sqlalchemy import Column, Integer, String, DECIMAL, Date, DateTime, Boolean, Index, Text, Float
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
    stock_code = Column(String(20), nullable=False, unique=True, index=True, comment='股票代码')
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


class BondChinaYield(Base):
    __tablename__ = 'bond_china_yield'
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(DateTime, index=True, comment='日期')
    curve_name = Column(String(255), comment='曲线名称')
    one_year = Column(Float, comment='1年期收益率')
    ten_year = Column(Float, comment='10年期收益率')
    one_year_3m_avg = Column(Float, comment='1年期3个月均值')
    one_year_6m_avg = Column(Float, comment='1年期6个月均值')
    ten_year_3m_avg = Column(Float, comment='10年期3个月均值')
    ten_year_6m_avg = Column(Float, comment='10年期6个月均值')
    one_year_signal = Column(Boolean, comment='1年期信号')
    ten_year_signal = Column(Boolean, comment='10年期信号')


class MacroData(Base):
    __tablename__ = 'macro_data'
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(DateTime, index=True, comment='日期')
    M1_yoy = Column(Float, comment='M1同比增长率')
    GDP_growth = Column(Float, comment='GDP增速')
    PPI_yoy = Column(Float, comment='PPI同比增长率')
    loan_yoy = Column(Float, comment='新增贷款同比增长率')
    M1_PPI_diff = Column(Float, comment='M1-PPI差值')
    M1_GDP_diff = Column(Float, comment='M1-GDP差值')
    M1_PPI_diff_3m_avg = Column(Float, comment='M1-PPI差值3个月均值')
    M1_PPI_diff_6m_avg = Column(Float, comment='M1-PPI差值6个月均值')
    M1_GDP_diff_3m_avg = Column(Float, comment='M1-GDP差值3个月均值')
    M1_GDP_diff_6m_avg = Column(Float, comment='M1-GDP差值6个月均值')
    loan_yoy_3m_avg = Column(Float, comment='贷款3个月均值')
    loan_yoy_6m_avg = Column(Float, comment='贷款6个月均值')
    credit_cycle = Column(Integer, comment='信用周期(宽松信号数)')


class BondChinaYieldCache(CacheBase):
    __tablename__ = 'bond_china_yield_cache'
    id = Column(Integer, primary_key=True)
    date = Column(DateTime, index=True, comment='日期')
    curve_name = Column(String(255), comment='曲线名称')
    one_year = Column(Float, comment='1年期收益率')
    ten_year = Column(Float, comment='10年期收益率')
    one_year_3m_avg = Column(Float, comment='1年期3个月均值')
    one_year_6m_avg = Column(Float, comment='1年期6个月均值')
    ten_year_3m_avg = Column(Float, comment='10年期3个月均值')
    ten_year_6m_avg = Column(Float, comment='10年期6个月均值')
    one_year_signal = Column(Boolean, comment='1年期信号')
    ten_year_signal = Column(Boolean, comment='10年期信号')


class MacroDataCache(CacheBase):
    __tablename__ = 'macro_data_cache'
    id = Column(Integer, primary_key=True)
    date = Column(DateTime, index=True, comment='日期')
    M1_yoy = Column(Float, comment='M1同比增长率')
    GDP_growth = Column(Float, comment='GDP增速')
    PPI_yoy = Column(Float, comment='PPI同比增长率')
    loan_yoy = Column(Float, comment='新增贷款同比增长率')
    M1_PPI_diff = Column(Float, comment='M1-PPI差值')
    M1_GDP_diff = Column(Float, comment='M1-GDP差值')
    M1_PPI_diff_3m_avg = Column(Float, comment='M1-PPI差值3个月均值')
    M1_PPI_diff_6m_avg = Column(Float, comment='M1-PPI差值6个月均值')
    M1_GDP_diff_3m_avg = Column(Float, comment='M1-GDP差值3个月均值')
    M1_GDP_diff_6m_avg = Column(Float, comment='M1-GDP差值6个月均值')
    loan_yoy_3m_avg = Column(Float, comment='贷款3个月均值')
    loan_yoy_6m_avg = Column(Float, comment='贷款6个月均值')
    credit_cycle = Column(Integer, comment='信用周期(宽松信号数)')


class MarketBreadthMetrics(Base):
    __tablename__ = 'market_breadth_metrics'

    trade_date = Column(String(20), primary_key=True, comment='交易日期')
    industries_data = Column(Text, nullable=False, comment='各行业BIAS>0比例数据(JSON格式)')
    market_breadth = Column(Float, comment='全市场BIAS>0比例')
    total_breadth = Column(Integer, comment='各行业BIAS>0比例总和')
    update_time = Column(DateTime, comment='更新时间')


class MarketBreadthMetricsCache(CacheBase):
    __tablename__ = 'market_breadth_metrics_cache'

    id = Column(Integer, primary_key=True)
    trade_date = Column(String(20), nullable=False, unique=True, index=True, comment='交易日期')
    industries_data = Column(Text, nullable=False, comment='各行业BIAS>0比例数据(JSON格式)')
    market_breadth = Column(Float, comment='全市场BIAS>0比例')
    total_breadth = Column(Integer, comment='各行业BIAS>0比例总和')
    update_time = Column(DateTime, comment='更新时间')
