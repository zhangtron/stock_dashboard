from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from app.models import (
    StockFundamentalScreening,
    StockFundamentalScreeningCache,
    MacroDataCache,
    BondChinaYieldCache,
    MarketBreadthMetricsCache
)
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
    
    if params.search:
        query = query.filter(
            or_(
                StockFundamentalScreeningCache.stock_code.like(f"%{params.search}%"),
                StockFundamentalScreeningCache.stock_name.like(f"%{params.search}%")
            )
        )
    else:
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


def search_stock_suggestions(db: Session, query: str, limit: int = 10) -> List[StockFundamentalScreeningCache]:
    """
    搜索股票代码或名称的建议（OR逻辑，模糊匹配）
    返回: 建议列表
    """
    search_query = db.query(StockFundamentalScreeningCache).filter(
        or_(
            StockFundamentalScreeningCache.stock_code.like(f"%{query}%"),
            StockFundamentalScreeningCache.stock_name.like(f"%{query}%")
        )
    )
    
    suggestions = search_query.order_by(
        StockFundamentalScreeningCache.overall_score.desc()
    ).limit(limit).all()
    
    return suggestions


def get_top_stocks_by_overall_score(db: Session, limit: int = 8) -> List[StockFundamentalScreeningCache]:
    """
    从本地缓存获取综合得分前N名的股票
    返回: 前N名股票列表
    """
    top_stocks = db.query(StockFundamentalScreeningCache)\
        .order_by(desc(StockFundamentalScreeningCache.overall_score))\
        .limit(limit)\
        .all()
    return top_stocks


def get_macro_analysis(db: Session) -> Optional[dict]:
    """
    从本地缓存获取宏观数据分析结果
    返回: 宏观数据分析字典，如果没有数据返回None
    """
    latest_bond = db.query(BondChinaYieldCache)\
        .filter(BondChinaYieldCache.curve_name == '中债国债收益率曲线')\
        .order_by(desc(BondChinaYieldCache.date))\
        .first()
    
    latest_macro = db.query(MacroDataCache)\
        .order_by(desc(MacroDataCache.date))\
        .first()
    
    if not latest_bond or not latest_macro:
        return None
    
    sig1 = latest_bond.one_year_signal
    sig2 = latest_bond.ten_year_signal
    
    # 判断货币周期状态
    if sig1 and sig2:
        monetary_status = '宽货币'  # 货币宽松
        monetary_msg = '宽松，投资高风险'
    else:
        monetary_status = '紧货币'  # 货币紧缩
        monetary_msg = '紧缩，投资低风险'
    
    # 判断信用周期状态
    credit_cycle_value = latest_macro.credit_cycle
    if credit_cycle_value >= 2:
        credit_status = '宽信用'   # 信用宽松
        credit_msg = '宽松，利好大市值'
        market_cap_bias = '利好大市值'
    else:
        credit_status = '紧信用'   # 信用紧缩
        credit_msg = '紧缩，利好小市值'
        market_cap_bias = '利好小市值'
    
    # 根据货币+信用组合确定投资策略
    combination = f"{monetary_status} + {credit_status}"
    investment_strategy = ""
    asset_allocation = ""
    
    if monetary_status == '宽货币' and credit_status == '宽信用':
        investment_strategy = "买股票"
        asset_allocation = "复苏启动，风险资产领涨"
    elif monetary_status == '宽货币' and credit_status == '紧信用':
        investment_strategy = "买债券"
        asset_allocation = "经济差，政策托底"
    elif monetary_status == '紧货币' and credit_status == '宽信用':
        investment_strategy = "买商品+周期股"
        asset_allocation = "经济热，通胀起"
    elif monetary_status == '紧货币' and credit_status == '紧信用':
        investment_strategy = "持现金"
        asset_allocation = "全面收缩，防御为主"
    
    bond_data = db.query(BondChinaYieldCache)\
        .filter(BondChinaYieldCache.curve_name == '中债国债收益率曲线')\
        .order_by(BondChinaYieldCache.date)\
        .all()
    
    macro_data = db.query(MacroDataCache)\
        .order_by(MacroDataCache.date)\
        .all()
    
    raw_data = {
        'bond_1y': [
            {
                'date': b.date.strftime('%Y-%m-%d') if b.date else '',
                'value': float(b.one_year) if b.one_year else None,
                'ma_3m': float(b.one_year_3m_avg) if b.one_year_3m_avg else None,
                'ma_6m': float(b.one_year_6m_avg) if b.one_year_6m_avg else None
            }
            for b in bond_data
        ],
        'bond_10y': [
            {
                'date': b.date.strftime('%Y-%m-%d') if b.date else '',
                'value': float(b.ten_year) if b.ten_year else None,
                'ma_3m': float(b.ten_year_3m_avg) if b.ten_year_3m_avg else None,
                'ma_6m': float(b.ten_year_6m_avg) if b.ten_year_6m_avg else None
            }
            for b in bond_data
        ],
        'm1_data': [
            {'date': m.date.strftime('%Y-%m-%d') if m.date else '', 'value': float(m.M1_yoy)}
            for m in macro_data if m.M1_yoy is not None
        ],
        'gdp_data': [
            {'date': m.date.strftime('%Y-%m-%d') if m.date else '', 'value': float(m.GDP_growth)}
            for m in macro_data if m.GDP_growth is not None
        ],
        'ppi_data': [
            {'date': m.date.strftime('%Y-%m-%d') if m.date else '', 'value': float(m.PPI_yoy)}
            for m in macro_data if m.PPI_yoy is not None
        ],
        'loan_data': [
            {'date': m.date.strftime('%Y-%m-%d') if m.date else '', 'value': float(m.loan_yoy)}
            for m in macro_data if m.loan_yoy is not None
        ]
    }
    
    max_date = max(
        latest_bond.date if latest_bond.date else datetime.min,
        latest_macro.date if latest_macro.date else datetime.min
    )
    
    return {
        'monetary_cycle': monetary_msg,
        'credit_cycle': credit_msg,
        'market_cap_bias': market_cap_bias,
        'calc_time': max_date.isoformat() if max_date != datetime.min else None,
        'raw_data': raw_data,
        # 新增字段
        'monetary_status': monetary_status,
        'credit_status': credit_status,
        'combination': combination,
        'investment_strategy': investment_strategy,
        'asset_allocation': asset_allocation
    }


def get_market_breadth_data(
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    industries: Optional[List[str]] = None
) -> Optional[dict]:
    """
    获取市场宽度热力图数据（从JSON字段解析）
    返回格式: {dates: [], columns: [行业列表 + 'index_all' + 'sum'], data: [[...]], statistics: {}, last_update: datetime}
    """
    import json
    
    # 构建查询
    query = db.query(MarketBreadthMetricsCache)

    if start_date:
        query = query.filter(MarketBreadthMetricsCache.trade_date >= start_date)
    if end_date:
        query = query.filter(MarketBreadthMetricsCache.trade_date <= end_date)

    query = query.order_by(MarketBreadthMetricsCache.trade_date.asc())

    records = query.all()

    if not records:
        return None

    # 获取所有唯一日期
    dates = [r.trade_date for r in records]
    
    # 从所有记录中收集所有行业
    all_industries = set()
    for record in records:
        if record.industries_data:
            try:
                industries_dict = json.loads(record.industries_data)
                all_industries.update(industries_dict.keys())
            except (json.JSONDecodeError, TypeError):
                continue
    
    industries_list = sorted(all_industries)

    # 如果用户指定了行业筛选，应用筛选
    if industries:
        industries_list = [ind for ind in industries_list if ind in industries]

    # 构建数据矩阵（宽格式）
    # 行：日期
    # 列：各行业 + index_all + sum
    data = []  # BIAS>0比例数据

    for record in records:
        row = []
        
        # 解析JSON数据
        industries_dict = {}
        if record.industries_data:
            try:
                industries_dict = json.loads(record.industries_data)
            except (json.JSONDecodeError, TypeError):
                industries_dict = {}
        
        # 添加各行业的值
        for industry in industries_list:
            value = industries_dict.get(industry, 0)
            # 如果是浮点数，四舍五入取整
            if isinstance(value, float):
                value = int(round(value))
            row.append(int(value) if value is not None else 0)
        
        # 添加 market_breadth 列（全市场汇总）
        market_breadth_value = record.market_breadth if record.market_breadth is not None else 0
        if isinstance(market_breadth_value, float):
            market_breadth_value = int(round(market_breadth_value))
        row.append(int(market_breadth_value))
        
        # 添加 total_breadth 列（各行业值总和）
        total_breadth_value = record.total_breadth if record.total_breadth is not None else 0
        row.append(int(total_breadth_value))
        
        data.append(row)

    # 列名：各行业 + index_all + sum
    columns = industries_list + ['index_all', 'sum']

    # 计算统计数据
    industry_values = [v for row in data for v in row[:-2]]  # 只统计行业数据，不包括 index_all 和 sum
    statistics = {
        'total_records': len(records),
        'date_range': f"{dates[-1]} to {dates[0]}" if dates else None,
        'industry_count': len(industries_list),
        'trading_days': len(dates),
    }

    if industry_values:
        statistics.update({
            'min_value': min(industry_values),
            'max_value': max(industry_values),
            'avg_value': round(sum(industry_values) / len(industry_values), 2),
        })

    # 获取最后更新时间
    last_update = max((r.update_time for r in records if r.update_time), default=None)

    return {
        'dates': dates,
        'columns': columns,
        'data': data,
        'statistics': statistics,
        'last_update': last_update.isoformat() if last_update else None
    }


def get_market_breadth_industries(db: Session) -> List[str]:
    """获取所有可用行业列表"""
    import json
    
    # 从所有记录的JSON字段中提取唯一行业
    all_industries = set()
    records = db.query(MarketBreadthMetricsCache).all()
    
    for record in records:
        if record.industries_data:
            try:
                industries_dict = json.loads(record.industries_data)
                all_industries.update(industries_dict.keys())
            except (json.JSONDecodeError, TypeError):
                continue
    
    return sorted(list(all_industries))
