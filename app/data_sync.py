import logging
import json
from datetime import datetime
from typing import Optional
from sqlalchemy import desc
from app.database import SessionLocal as RemoteSessionLocal
from app.cache_database import SessionLocal as CacheSessionLocal, engine as cache_engine, Base as CacheBase
from app.models import FinancialScores, FinancialScoresCache, StockDetails, StockDetailsCache, SyncMetadata
from app.market_breadth_sync import init_market_breadth_cache_db, sync_market_breadth_data_from_remote, get_market_breadth_sync_status
from app.etf_cluster_sync import init_etf_cluster_cache_db, sync_etf_cluster_data_from_remote, get_etf_cluster_sync_status

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_cache_db():
    """初始化本地缓存数据库表结构"""
    try:
        CacheBase.metadata.create_all(bind=cache_engine)
        init_market_breadth_cache_db()
        init_etf_cluster_cache_db()
        logger.info("本地缓存数据库表结构初始化完成")
    except Exception as e:
        logger.error(f"初始化缓存数据库失败: {e}")
        raise


def get_last_sync_info() -> Optional[SyncMetadata]:
    """获取上次同步信息"""
    cache_db = CacheSessionLocal()
    try:
        last_sync = cache_db.query(SyncMetadata)\
            .order_by(desc(SyncMetadata.id))\
            .first()
        return last_sync
    finally:
        cache_db.close()


def sync_data_from_remote() -> dict:
    """
    从远程MySQL同步financial_scores和stock_details数据到本地SQLite缓存
    支持增量同步（基于updated_at）
    同步失败时保留上一次数据
    """
    result = {
        'success': False,
        'record_count': 0,
        'sync_type': 'full',
        'error': None,
        'last_sync_time': None,
        'financial_scores_sync': {'success': False, 'record_count': 0},
        'stock_details_sync': {'success': False, 'record_count': 0}
    }

    remote_db = RemoteSessionLocal()
    cache_db = CacheSessionLocal()

    try:
        logger.info("开始数据同步...")

        last_sync = get_last_sync_info()
        remote_max_update_time = None  # 初始化变量

        # 同步financial_scores数据
        logger.info("同步financial_scores数据...")
        if last_sync and last_sync.remote_max_update_time:
            logger.info(f"执行增量同步，上次同步时间: {last_sync.remote_max_update_time}")
            query = remote_db.query(FinancialScores)\
                .filter(FinancialScores.updated_at > last_sync.remote_max_update_time)
            result['sync_type'] = 'incremental'
        else:
            logger.info("执行全量同步")
            query = remote_db.query(FinancialScores)

        financial_scores_data = query.all()
        financial_scores_count = len(financial_scores_data)

        if financial_scores_count == 0:
            logger.info("没有新的financial_scores数据需要同步")
        else:
            logger.info(f"从远程获取到 {financial_scores_count} 条financial_scores记录")

            remote_max_update_time = max([item.updated_at for item in financial_scores_data]) if financial_scores_data else None

            if result['sync_type'] == 'full':
                logger.info("全量同步：清空本地financial_scores缓存表")
                cache_db.query(FinancialScoresCache).delete()

            # 获取所有股票代码，用于查询板块名称
            stock_codes = [item.stock_code for item in financial_scores_data]
            
            # 查询stock_details获取板块名称
            stock_details_map = {}
            if stock_codes:
                stock_details = remote_db.query(StockDetails)\
                    .filter(StockDetails.stock_code.in_(stock_codes))\
                    .all()
                stock_details_map = {item.stock_code: item.sector_name for item in stock_details}

            for remote_item in financial_scores_data:
                existing = cache_db.query(FinancialScoresCache)\
                    .filter(FinancialScoresCache.stock_code == remote_item.stock_code)\
                    .first()

                # 获取板块名称
                sector_name = stock_details_map.get(remote_item.stock_code, '')

                cache_item_data = {
                    'stock_code': remote_item.stock_code,
                    'stock_name': remote_item.stock_name,
                    'total_score': remote_item.total_score,
                    'grade': remote_item.grade,
                    'metrics_detail': remote_item.metrics_detail,
                    'completeness_ratio': remote_item.completeness_ratio,
                    'sector_name': sector_name,
                    'data_date': remote_item.data_date,
                    'created_at': remote_item.created_at,
                    'updated_at': remote_item.updated_at
                }

                if existing:
                    if remote_item.updated_at > existing.updated_at:
                        for key, value in cache_item_data.items():
                            setattr(existing, key, value)
                        logger.debug(f"更新financial_scores记录: {remote_item.stock_code}")
                    else:
                        logger.debug(f"跳过记录（数据未更新）: {remote_item.stock_code}")
                else:
                    cache_item = FinancialScoresCache(**cache_item_data)
                    cache_db.add(cache_item)
                    logger.debug(f"新增financial_scores记录: {remote_item.stock_code}")

            cache_db.commit()
            result['financial_scores_sync']['success'] = True
            result['financial_scores_sync']['record_count'] = financial_scores_count

        # 同步stock_details数据
        logger.info("同步stock_details数据...")
        stock_details_data = remote_db.query(StockDetails).all()
        stock_details_count = len(stock_details_data)

        if stock_details_count > 0:
            logger.info(f"从远程获取到 {stock_details_count} 条stock_details记录")
            
            # 清空并重新同步stock_details缓存表
            cache_db.query(StockDetailsCache).delete()
            
            for remote_item in stock_details_data:
                cache_item = StockDetailsCache(
                    stock_code=remote_item.stock_code,
                    stock_name=remote_item.stock_name,
                    sector_code=remote_item.sector_code,
                    sector_name=remote_item.sector_name,
                    detail_info=remote_item.detail_info,
                    created_at=remote_item.created_at,
                    updated_at=remote_item.updated_at
                )
                cache_db.add(cache_item)
                logger.debug(f"新增stock_details记录: {remote_item.stock_code}")
            
            cache_db.commit()
            result['stock_details_sync']['success'] = True
            result['stock_details_sync']['record_count'] = stock_details_count

        # 计算总记录数
        total_financial_scores = cache_db.query(FinancialScoresCache).count()
        total_stock_details = cache_db.query(StockDetailsCache).count()
        total_count = total_financial_scores + total_stock_details

        # 保存同步元数据
        sync_metadata = SyncMetadata(
            last_sync_time=datetime.now().isoformat(),
            record_count=total_financial_scores,  # 只记录financial_scores的数量
            sync_status='success',
            error_message=None,
            remote_max_update_time=remote_max_update_time.isoformat() if remote_max_update_time else None
        )
        cache_db.add(sync_metadata)
        cache_db.commit()

        logger.info(f"同步成功！本地缓存共 {total_financial_scores} 条financial_scores记录，{total_stock_details} 条stock_details记录")

        result.update({
            'success': True,
            'record_count': total_financial_scores,
            'last_sync_time': datetime.now()
        })

    except Exception as e:
        cache_db.rollback()
        logger.error(f"同步失败: {e}")

        sync_metadata = SyncMetadata(
            last_sync_time=datetime.now().isoformat(),
            record_count=0,
            sync_status='failed',
            error_message=str(e)[:500],
            remote_max_update_time=None
        )
        cache_db.add(sync_metadata)
        cache_db.commit()

        result['error'] = str(e)

    finally:
        remote_db.close()
        cache_db.close()

    if result['success']:
        logger.info("开始同步市场宽度数据...")
        breadth_result = sync_market_breadth_data_from_remote()
        result['market_breadth_sync'] = breadth_result

        if not breadth_result['success']:
            logger.error(f"市场宽度数据同步失败: {breadth_result.get('error')}")
            result['success'] = False
            result['market_breadth_sync_error'] = breadth_result.get('error')

        logger.info("开始同步ETF聚类选股数据...")
        etf_result = sync_etf_cluster_data_from_remote()
        result['etf_cluster_sync'] = etf_result

        if not etf_result['success']:
            logger.error(f"ETF聚类选股数据同步失败: {etf_result.get('error')}")
            result['etf_cluster_sync_error'] = etf_result.get('error')
    else:
        result['market_breadth_sync'] = None
        result['etf_cluster_sync'] = None

    return result


def force_full_sync() -> dict:
    """强制执行全量同步"""
    logger.info("执行强制全量同步...")
    cache_db = CacheSessionLocal()
    try:
        cache_db.query(SyncMetadata).delete()
        cache_db.commit()
        logger.info("已清除同步元数据，接下来将执行全量同步")
    finally:
        cache_db.close()

    return sync_data_from_remote()


def get_sync_status() -> dict:
    """获取同步状态"""
    last_sync = get_last_sync_info()
    total_count = 0

    cache_db = CacheSessionLocal()
    try:
        total_count = cache_db.query(FinancialScoresCache).count()
    finally:
        cache_db.close()

    stock_sync_status = {
        'last_sync_time': None,
        'record_count': 0,
        'sync_status': 'never',
        'error_message': None,
        'cache_count': 0,
        'has_data': False
    }

    if last_sync:
        stock_sync_status = {
            'last_sync_time': last_sync.last_sync_time if last_sync.last_sync_time else None,
            'record_count': last_sync.record_count,
            'sync_status': last_sync.sync_status,
            'error_message': last_sync.error_message,
            'remote_max_update_time': last_sync.remote_max_update_time if last_sync.remote_max_update_time else None,
            'cache_count': total_count,
            'has_data': total_count > 0
        }

    market_breadth_sync_status = get_market_breadth_sync_status()
    etf_cluster_sync_status = get_etf_cluster_sync_status()

    return {
        'stock': stock_sync_status,
        'market_breadth': market_breadth_sync_status,
        'etf_cluster': etf_cluster_sync_status
    }
