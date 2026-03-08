import json
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from app.models import (
    FinancialScoresCache,
    MarketBreadthMetricsCache,
    EtfClusterSelection,
    EtfClusterSelectionCache
)
from app.schemas import ScreeningFilterParams


def get_screening_list(
    db: Session,
    params: ScreeningFilterParams
) -> Tuple[List[Dict[str, Any]], int]:
    """
    从本地缓存获取基本面选股数据列表
    返回: (数据列表, 总数)
    """
    query = db.query(FinancialScoresCache)
    
    # 处理搜索参数
    if params.search:
        query = query.filter(
            or_(
                FinancialScoresCache.stock_code.like(f"%{params.search}%"),
                FinancialScoresCache.stock_name.like(f"%{params.search}%")
            )
        )
    
    # 处理其他筛选参数（这些参数可以与搜索参数组合使用）
    if params.stock_code and not params.search:
        query = query.filter(FinancialScoresCache.stock_code.like(f"%{params.stock_code}%"))
    
    if params.stock_name and not params.search:
        query = query.filter(FinancialScoresCache.stock_name.like(f"%{params.stock_name}%"))
    
    # 板块筛选应该可以与搜索参数组合使用
    if params.sector_name:
        query = query.filter(FinancialScoresCache.sector_name == params.sector_name)
    
    # 映射字段名：overall_score -> total_score
    if params.min_overall_score is not None:
        query = query.filter(FinancialScoresCache.total_score >= params.min_overall_score)
    
    if params.max_overall_score is not None:
        query = query.filter(FinancialScoresCache.total_score <= params.max_overall_score)
    
    # pass_filters字段在新的financial_scores表中不存在，跳过
    # if params.pass_filters is not None:
    #     query = query.filter(FinancialScoresCache.pass_filters == params.pass_filters)
    
    # 映射字段名：recommendation -> grade
    if params.recommendation:
        query = query.filter(FinancialScoresCache.grade == params.recommendation)
    
    total = query.count()
    
    # 映射排序字段
    sort_by = params.sort_by
    if sort_by == 'overall_score':
        sort_by = 'total_score'
    
    if sort_by and hasattr(FinancialScoresCache, sort_by):
        sort_column = getattr(FinancialScoresCache, sort_by)
        if params.sort_order == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
    
    offset = (params.page - 1) * params.page_size
    raw_data = query.offset(offset).limit(params.page_size).all()
    
    # 处理数据，解析metrics_detail并添加板块名称
    data = []
    for item in raw_data:
        # 解析metrics_detail JSON
        metrics_detail_parsed = []
        if item.metrics_detail:
            try:
                metrics_dict = json.loads(item.metrics_detail)
                metrics_detail_parsed = [
                    {"key": key, "value": value}
                    for key, value in metrics_dict.items()
                ]
            except (json.JSONDecodeError, TypeError):
                metrics_detail_parsed = []
        
        data.append({
            "id": item.id,
            "stock_code": item.stock_code,
            "stock_name": item.stock_name,
            "overall_score": float(item.total_score) if item.total_score is not None else None,
            "total_score": float(item.total_score) if item.total_score is not None else None,
            "grade": item.grade,
            "recommendation": item.grade,  # 兼容前端字段名
            "metrics_detail": item.metrics_detail,
            "metrics_detail_parsed": metrics_detail_parsed,
            "completeness_ratio": float(item.completeness_ratio) if item.completeness_ratio is not None else None,
            "sector_name": item.sector_name,
            "data_date": item.data_date.isoformat() if item.data_date else None,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None
        })
    
    return data, total


def get_top3_by_overall_score(db: Session) -> List[Dict[str, Any]]:
    """
    从本地缓存获取综合得分前3的股票
    """
    top3 = db.query(FinancialScoresCache)\
        .order_by(desc(FinancialScoresCache.total_score))\
        .limit(3)\
        .all()
    
    # 处理数据
    result = []
    for item in top3:
        result.append({
            "id": item.id,
            "stock_code": item.stock_code,
            "stock_name": item.stock_name,
            "overall_score": float(item.total_score) if item.total_score is not None else None,
            "total_score": float(item.total_score) if item.total_score is not None else None,
            "grade": item.grade,
            "recommendation": item.grade,  # 兼容前端字段名
            "sector_name": item.sector_name,
            "data_date": item.data_date.isoformat() if item.data_date else None
        })
    
    return result


def search_stock_suggestions(db: Session, query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    搜索股票代码或名称的建议（OR逻辑，模糊匹配）
    返回: 建议列表
    """
    search_query = db.query(FinancialScoresCache).filter(
        or_(
            FinancialScoresCache.stock_code.like(f"%{query}%"),
            FinancialScoresCache.stock_name.like(f"%{query}%")
        )
    )
    
    suggestions = search_query.order_by(
        FinancialScoresCache.total_score.desc()
    ).limit(limit).all()
    
    # 处理数据
    result = []
    for item in suggestions:
        result.append({
            "stock_code": item.stock_code,
            "stock_name": item.stock_name,
            "overall_score": float(item.total_score) if item.total_score is not None else None,
            "grade": item.grade,
            "sector_name": item.sector_name
        })
    
    return result


def get_top_stocks_by_overall_score(db: Session, limit: int = 8) -> List[Dict[str, Any]]:
    """
    从本地缓存获取综合得分前N名的股票
    返回: 前N名股票列表
    """
    top_stocks = db.query(FinancialScoresCache)\
        .order_by(desc(FinancialScoresCache.total_score))\
        .limit(limit)\
        .all()
    
    # 处理数据
    result = []
    for item in top_stocks:
        result.append({
            "stock_code": item.stock_code,
            "stock_name": item.stock_name,
            "overall_score": float(item.total_score) if item.total_score is not None else None,
            "grade": item.grade,
            "sector_name": item.sector_name
        })
    
    return result


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

    # 获取所有唯一日期，并格式化为 YYYY-MM-DD
    dates = []
    for r in records:
        date_str = r.trade_date
        if date_str:
            # 去掉时间部分，只保留日期
            if ' ' in date_str:
                date_str = date_str.split(' ')[0]
            elif 'T' in date_str:
                date_str = date_str.split('T')[0]
            dates.append(date_str)
        else:
            dates.append(date_str)

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
    # 列：各行业
    data = []  # BIAS>0比例数据
    total_breadth_data = []  # 全市场上涨家数总和

    for i, record in enumerate(records):
        row = []

        # 解析JSON数据
        industries_dict = {}
        if record.industries_data:
            try:
                industries_dict = json.loads(record.industries_data)
            except (json.JSONDecodeError, TypeError):
                industries_dict = {}

        # 只添加各行业的值，不添加 index_all 和 sum
        for industry in industries_list:
            value = industries_dict.get(industry, 0)
            # 如果是浮点数，四舍五入取整
            if isinstance(value, float):
                value = int(round(value))
            row.append(int(value) if value is not None else 0)

        data.append(row)

        # 添加 total_breadth 数据（用于趋势图）
        total_breadth_value = record.total_breadth if record.total_breadth is not None else 0
        total_breadth_data.append(int(total_breadth_value))

    # 列名：只包含各行业
    columns = industries_list

    # 计算统计数据
    industry_values = [v for row in data for v in row]  # 所有数据都是行业数据

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
        'total_breadth_data': total_breadth_data,  # 用于趋势图的全市场上涨家数总和
        'statistics': statistics,
        'last_update': last_update if last_update else None
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


def get_etf_cluster_selection_latest(db: Session) -> Optional[Dict[str, Any]]:
    """
    从本地缓存获取最新一天的ETF聚类选股数据
    返回按cluster_name分组的数据，每个cluster包含5个基金
    """
    from sqlalchemy import func

    # 获取缓存中最新的update_date
    latest_date = db.query(
        func.max(EtfClusterSelectionCache.update_date)
    ).scalar()

    if not latest_date:
        return None

    # 查询最新日期的所有数据，按cluster_name和rank排序
    records = db.query(EtfClusterSelectionCache)\
        .filter(EtfClusterSelectionCache.update_date == latest_date)\
        .order_by(EtfClusterSelectionCache.cluster_name, EtfClusterSelectionCache.rank)\
        .all()

    if not records:
        return None

    # 按cluster_name分组数据
    clusters = {}
    for record in records:
        cluster_name = record.cluster_name or '未分类'
        if cluster_name not in clusters:
            clusters[cluster_name] = []

        clusters[cluster_name].append({
            'fund_code': record.fund_code,
            'fund_name': record.fund_name,
            'rank': record.rank,
            'score': record.score
        })

    # 格式化返回数据
    result = {
        'update_date': latest_date,
        'clusters': []
    }

    # 转换为列表格式，保持cluster_name的顺序
    for cluster_name in sorted(clusters.keys()):
        result['clusters'].append({
            'cluster_name': cluster_name,
            'funds': clusters[cluster_name]
        })

    return result
