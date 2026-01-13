import logging
from datetime import datetime
from typing import Optional
from sqlalchemy import desc
from app.database import SessionLocal as RemoteSessionLocal
from app.cache_database import SessionLocal as CacheSessionLocal, engine as cache_engine, Base as CacheBase
from app.models import StockFundamentalScreening, StockFundamentalScreeningCache, SyncMetadata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_cache_db():
    """初始化本地缓存数据库表结构"""
    try:
        CacheBase.metadata.create_all(bind=cache_engine)
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
    从远程MySQL同步数据到本地SQLite缓存
    支持增量同步（基于update_time）
    同步失败时保留上一次数据
    """
    result = {
        'success': False,
        'record_count': 0,
        'sync_type': 'full',
        'error': None,
        'last_sync_time': None
    }

    remote_db = RemoteSessionLocal()
    cache_db = CacheSessionLocal()

    try:
        logger.info("开始数据同步...")

        last_sync = get_last_sync_info()

        if last_sync and last_sync.remote_max_update_time:
            logger.info(f"执行增量同步，上次同步时间: {last_sync.remote_max_update_time}")
            query = remote_db.query(StockFundamentalScreening)\
                .filter(StockFundamentalScreening.update_time > last_sync.remote_max_update_time)
            result['sync_type'] = 'incremental'
        else:
            logger.info("执行全量同步")
            query = remote_db.query(StockFundamentalScreening)

        remote_data = query.all()
        record_count = len(remote_data)

        if record_count == 0:
            logger.info("没有新数据需要同步")
            result.update({
                'success': True,
                'record_count': 0,
                'last_sync_time': last_sync.remote_max_update_time if last_sync else None
            })
            return result

        logger.info(f"从远程获取到 {record_count} 条记录")

        remote_max_update_time = max([item.update_time for item in remote_data]) if remote_data else None

        if result['sync_type'] == 'full':
            logger.info("全量同步：清空本地缓存表")
            cache_db.query(StockFundamentalScreeningCache).delete()

        for remote_item in remote_data:
            existing = cache_db.query(StockFundamentalScreeningCache)\
                .filter(StockFundamentalScreeningCache.stock_code == remote_item.stock_code)\
                .first()

            cache_item_data = {
                'id': remote_item.id,
                'stock_code': remote_item.stock_code,
                'stock_name': remote_item.stock_name,
                'overall_score': remote_item.overall_score,
                'growth_score': remote_item.growth_score,
                'profitability_score': remote_item.profitability_score,
                'solvency_score': remote_item.solvency_score,
                'cashflow_score': remote_item.cashflow_score,
                'recommendation': remote_item.recommendation,
                'pass_filters': remote_item.pass_filters,
                'latest_quarter': remote_item.latest_quarter,
                'report_publ_date': remote_item.report_publ_date,
                'calc_time': remote_item.calc_time,
                'create_time': remote_item.create_time,
                'update_time': remote_item.update_time
            }

            if existing:
                # 只有远程数据更新时间更新时才替换本地数据
                if remote_item.update_time > existing.update_time:
                    for key, value in cache_item_data.items():
                        setattr(existing, key, value)
                    logger.debug(f"更新记录: {remote_item.stock_code}")
                else:
                    logger.debug(f"跳过记录（数据未更新）: {remote_item.stock_code}")
            else:
                cache_item = StockFundamentalScreeningCache(**cache_item_data)
                cache_db.add(cache_item)
                logger.debug(f"新增记录: {remote_item.stock_code}")

        cache_db.commit()

        total_count = cache_db.query(StockFundamentalScreeningCache).count()

        sync_metadata = SyncMetadata(
            last_sync_time=datetime.now(),
            record_count=total_count,
            sync_status='success',
            error_message=None,
            remote_max_update_time=remote_max_update_time
        )
        cache_db.add(sync_metadata)
        cache_db.commit()

        logger.info(f"同步成功！本地缓存共 {total_count} 条记录")

        result.update({
            'success': True,
            'record_count': total_count,
            'last_sync_time': datetime.now()
        })

    except Exception as e:
        cache_db.rollback()
        logger.error(f"同步失败: {e}")

        sync_metadata = SyncMetadata(
            last_sync_time=datetime.now(),
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
        total_count = cache_db.query(StockFundamentalScreeningCache).count()
    finally:
        cache_db.close()

    if not last_sync:
        return {
            'last_sync_time': None,
            'record_count': 0,
            'sync_status': 'never',
            'error_message': None,
            'cache_count': 0,
            'has_data': False
        }

    return {
        'last_sync_time': last_sync.last_sync_time.isoformat() if last_sync.last_sync_time else None,
        'record_count': last_sync.record_count,
        'sync_status': last_sync.sync_status,
        'error_message': last_sync.error_message,
        'remote_max_update_time': last_sync.remote_max_update_time.isoformat() if last_sync.remote_max_update_time else None,
        'cache_count': total_count,
        'has_data': total_count > 0
    }
