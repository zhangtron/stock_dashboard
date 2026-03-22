import json
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from app.models import (
    FinancialScoresCache,
    MarketBreadthMetricsCache,
    EtfClusterSelection,
    EtfClusterSelectionCache,
    L2AnalysisResultsCache
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


def get_l2_top_stocks_by_date(
    db: Session,
    days: int = 6,
    limit_per_day: int = 8,
    sector: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    获取最近N天每天Top N股票数据（用于矩阵展示）
    返回格式: [{"date": "2024-01-01", "stocks": [...]}, ...]
    """
    from sqlalchemy import func

    # 获取最近的N个交易日期
    dates_query = db.query(L2AnalysisResultsCache.date)\
        .distinct()\
        .order_by(L2AnalysisResultsCache.date.desc())\
        .limit(days)

    dates = [d[0] for d in dates_query.all()]

    if not dates:
        return []

    result = []

    for date in dates:
        query = db.query(L2AnalysisResultsCache)\
            .filter(L2AnalysisResultsCache.date == date)

        if sector:
            query = query.filter(L2AnalysisResultsCache.sector_name == sector)

        stocks = query\
            .order_by(L2AnalysisResultsCache.score.desc())\
            .limit(limit_per_day)\
            .all()

        stock_list = []
        for stock in stocks:
            stock_list.append({
                'stock_code': stock.stock_code,
                'stock_name': stock.stock_name,
                'sector_name': stock.sector_name,
                'score': float(stock.score) if stock.score is not None else None,
                'operation_advice': stock.operation_advice
            })

        result.append({
            'date': date,
            'stocks': stock_list
        })

    # 按日期正序排列
    result.reverse()
    return result


def get_l2_stock_history(
    db: Session,
    stock_code: str,
    days: int = 30
) -> Optional[Dict[str, Any]]:
    """
    获取单个股票的历史数据（用于图表展示）
    返回格式: {
        "stock_code": "...",
        "stock_name": "...",
        "dates": [...],
        "vwap": {"level1": [...], "level2": [...], "level3": [...]},
        "amount": {"level1": [...], "level2": [...], "level3": [...]},
        "scores": [...]
    }
    """
    records = db.query(L2AnalysisResultsCache)\
        .filter(L2AnalysisResultsCache.stock_code == stock_code)\
        .order_by(L2AnalysisResultsCache.date.desc())\
        .limit(days)\
        .all()

    if not records:
        return None

    # 反转以按时间正序排列
    records.reverse()

    dates = []
    vwap_data = {
        'vwap': [],
        'super_large_vwap': [],
        'large_vwap': [],
        'medium_vwap': [],
        'others_vwap': [],
        'close_price': []
    }
    amount_data = {
        'super_large_amount': [],
        'large_amount': [],
        'medium_amount': [],
        'others_amount': [],
        'total_amount': []
    }
    scores = []

    for record in records:
        dates.append(record.date)

        # 解析VWAP JSON数据 - 支持新的6字段格式
        if record.vwap:
            try:
                vwap_dict = json.loads(record.vwap)
                # 如果是新的6字段格式
                if 'vwap' in vwap_dict or 'super_large_vwap' in vwap_dict:
                    vwap_data['vwap'].append(float(vwap_dict.get('vwap')) if vwap_dict.get('vwap') is not None else None)
                    vwap_data['super_large_vwap'].append(float(vwap_dict.get('super_large_vwap')) if vwap_dict.get('super_large_vwap') is not None else None)
                    vwap_data['large_vwap'].append(float(vwap_dict.get('large_vwap')) if vwap_dict.get('large_vwap') is not None else None)
                    vwap_data['medium_vwap'].append(float(vwap_dict.get('medium_vwap')) if vwap_dict.get('medium_vwap') is not None else None)
                    vwap_data['others_vwap'].append(float(vwap_dict.get('others_vwap')) if vwap_dict.get('others_vwap') is not None else None)
                    vwap_data['close_price'].append(float(vwap_dict.get('close_price')) if vwap_dict.get('close_price') is not None else None)
                else:
                    # 兼容旧的level格式
                    for level in ['level1', 'level2', 'level3']:
                        level_data = vwap_dict.get(level, [])
                        val = float(level_data[-1]) if level_data else None
                        if level == 'level1':
                            vwap_data['vwap'].append(val)
                            vwap_data['large_vwap'].append(val)
                        elif level == 'level2':
                            vwap_data['medium_vwap'].append(val)
                        else:
                            vwap_data['others_vwap'].append(val)
                        vwap_data['super_large_vwap'].append(None)
                        vwap_data['close_price'].append(None)
            except (json.JSONDecodeError, TypeError, ValueError):
                for key in vwap_data:
                    vwap_data[key].append(None)
        else:
            for key in vwap_data:
                vwap_data[key].append(None)

        # 解析成交额 JSON数据 - 支持新的格式
        if record.amount:
            try:
                amount_dict = json.loads(record.amount)
                # 如果是新的字段格式
                if 'super_large_amount' in amount_dict or 'large_amount' in amount_dict or 'total_amount' in amount_dict:
                    amount_data['super_large_amount'].append(float(amount_dict.get('super_large_amount')) if amount_dict.get('super_large_amount') is not None else None)
                    amount_data['large_amount'].append(float(amount_dict.get('large_amount')) if amount_dict.get('large_amount') is not None else None)
                    amount_data['medium_amount'].append(float(amount_dict.get('medium_amount')) if amount_dict.get('medium_amount') is not None else None)
                    amount_data['others_amount'].append(float(amount_dict.get('others_amount')) if amount_dict.get('others_amount') is not None else None)
                    amount_data['total_amount'].append(float(amount_dict.get('total_amount')) if amount_dict.get('total_amount') is not None else None)
                else:
                    # 兼容旧的level格式
                    for level in ['level1', 'level2', 'level3']:
                        level_data = amount_dict.get(level, [])
                        val = float(level_data[-1]) if level_data else None
                        if level == 'level1':
                            amount_data['large_amount'].append(val)
                        elif level == 'level2':
                            amount_data['medium_amount'].append(val)
                        else:
                            amount_data['others_amount'].append(val)
                        amount_data['super_large_amount'].append(None)
                        amount_data['total_amount'].append(None)
            except (json.JSONDecodeError, TypeError, ValueError):
                for key in amount_data:
                    amount_data[key].append(None)
        else:
            for key in amount_data:
                amount_data[key].append(None)

        scores.append(float(record.score) if record.score is not None else None)

    return {
        'stock_code': records[0].stock_code,
        'stock_name': records[0].stock_name,
        'sector_name': records[0].sector_name,
        'dates': dates,
        'vwap': vwap_data,
        'amount': amount_data,
        'scores': scores
    }


def get_l2_market_list(
    db: Session,
    date: Optional[str] = None,
    sector: Optional[str] = None,
    stock_code: Optional[str] = None,
    stock_name: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    sort_by: str = "score",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 20
) -> Tuple[List[Dict[str, Any]], int]:
    """
    获取全市场分页列表数据
    返回: (数据列表, 总数)
    """
    # 如果未指定日期，使用最新日期
    if not date:
        latest_date = db.query(L2AnalysisResultsCache.date)\
            .order_by(L2AnalysisResultsCache.date.desc())\
            .first()
        if latest_date:
            date = latest_date[0]
        else:
            return [], 0

    query = db.query(L2AnalysisResultsCache).filter(L2AnalysisResultsCache.date == date)

    if sector:
        query = query.filter(L2AnalysisResultsCache.sector_name == sector)

    if stock_code:
        query = query.filter(L2AnalysisResultsCache.stock_code.like(f"%{stock_code}%"))

    if stock_name:
        query = query.filter(L2AnalysisResultsCache.stock_name.like(f"%{stock_name}%"))

    if min_score is not None:
        query = query.filter(L2AnalysisResultsCache.score >= min_score)

    if max_score is not None:
        query = query.filter(L2AnalysisResultsCache.score <= max_score)

    records = query.all()

    def parse_json_field(raw_value: Optional[str]) -> Dict[str, Any]:
        if not raw_value:
            return {}

        try:
            parsed = json.loads(raw_value)
            return parsed if isinstance(parsed, dict) else {}
        except (TypeError, ValueError, json.JSONDecodeError):
            return {}

    def to_float(value: Any) -> Optional[float]:
        try:
            if value is None:
                return None
            number = float(value)
            return number
        except (TypeError, ValueError):
            return None

    def safe_ratio(numerator: Optional[float], denominator: Optional[float]) -> Optional[float]:
        if numerator is None or denominator in (None, 0):
            return None
        return numerator / denominator

    data = []
    for record in records:
        vwap_data = parse_json_field(record.vwap)
        amount_data = parse_json_field(record.amount)

        close_price = to_float(vwap_data.get('close_price'))
        vwap_value = to_float(vwap_data.get('vwap'))
        super_large_amount = to_float(amount_data.get('super_large_amount'))
        large_amount = to_float(amount_data.get('large_amount'))
        medium_amount = to_float(amount_data.get('medium_amount'))
        others_amount = to_float(amount_data.get('others_amount'))
        total_amount = to_float(amount_data.get('total_amount'))
        if total_amount is None:
            amount_parts = [super_large_amount, large_amount, medium_amount, others_amount]
            if any(part is not None for part in amount_parts):
                total_amount = sum(part or 0.0 for part in amount_parts)
        large_order_amount = None
        if super_large_amount is not None or large_amount is not None:
            large_order_amount = (super_large_amount or 0.0) + (large_amount or 0.0)

        data.append({
            'stock_code': record.stock_code,
            'stock_name': record.stock_name,
            'sector_name': record.sector_name,
            'score': float(record.score) if record.score is not None else None,
            'operation_advice': record.operation_advice,
            'price_close_vwap_ratio': safe_ratio(close_price, vwap_value),
            'large_total_amount_ratio': safe_ratio(large_order_amount, total_amount)
        })

    sort_key_map = {
        'stock_code': lambda item: (item.get('stock_code') or '').lower(),
        'stock_name': lambda item: (item.get('stock_name') or '').lower(),
        'sector_name': lambda item: (item.get('sector_name') or '').lower(),
        'score': lambda item: item.get('score'),
        'price_close_vwap_ratio': lambda item: item.get('price_close_vwap_ratio'),
        'large_total_amount_ratio': lambda item: item.get('large_total_amount_ratio'),
    }

    key_func = sort_key_map.get(sort_by, sort_key_map['score'])
    reverse = sort_order == 'desc'

    sortable_items = [item for item in data if key_func(item) is not None]
    unsortable_items = [item for item in data if key_func(item) is None]
    sortable_items.sort(key=key_func, reverse=reverse)
    data = sortable_items + unsortable_items

    total = len(data)
    offset = (page - 1) * page_size
    paged_data = data[offset:offset + page_size]

    return paged_data, total


def get_l2_available_dates(db: Session) -> List[str]:
    """
    获取所有可用的交易日期列表（按时间倒序）
    """
    dates = db.query(L2AnalysisResultsCache.date)\
        .distinct()\
        .order_by(L2AnalysisResultsCache.date.desc())\
        .all()

    return [d[0] for d in dates]


def get_l2_available_sectors(db: Session) -> List[str]:
    """
    获取所有可用的板块列表
    """
    sectors = db.query(L2AnalysisResultsCache.sector_name)\
        .filter(L2AnalysisResultsCache.sector_name.isnot(None))\
        .distinct()\
        .order_by(L2AnalysisResultsCache.sector_name)\
        .all()

    return [s[0] for s in sectors if s[0]]
