import logging
from datetime import datetime
from typing import Optional
from sqlalchemy import desc
from app.database import SessionLocal as RemoteSessionLocal
from app.cache_database import SessionLocal as CacheSessionLocal, engine as cache_engine, Base as CacheBase
from app.models import MarketBreadthMetrics, MarketBreadthMetricsCache, SyncMetadata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_market_breadth_cache_db():
    """初始化市场宽度数据缓存数据库表结构"""
    try:
        CacheBase.metadata.create_all(bind=cache_engine)
        logger.info("市场宽度数据缓存数据库表结构初始化完成")
    except Exception as e:
        logger.error(f"初始化市场宽度数据缓存数据库失败: {e}")
        raise


def get_last_market_breadth_sync_info() -> Optional[SyncMetadata]:
    """获取上次市场宽度数据同步信息"""
    cache_db = CacheSessionLocal()
    try:
        last_sync = cache_db.query(SyncMetadata)\
            .filter(SyncMetadata.sync_status.like('%market_breadth%'))\
            .order_by(desc(SyncMetadata.id))\
            .first()
        return last_sync
    finally:
        cache_db.close()


def sync_market_breadth_data_from_remote() -> dict:
    """
    从远程MySQL同步市场宽度数据到本地SQLite缓存
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
        logger.info("开始同步市场宽度数据...")

        last_sync = get_last_market_breadth_sync_info()

        if last_sync and last_sync.remote_max_update_time:
            logger.info(f"执行市场宽度数据增量同步，上次同步时间: {last_sync.remote_max_update_time}")
            query = remote_db.query(MarketBreadthMetrics)\
                .filter(MarketBreadthMetrics.update_time > last_sync.remote_max_update_time)
            result['sync_type'] = 'incremental'
        else:
            logger.info("执行市场宽度数据全量同步")
            query = remote_db.query(MarketBreadthMetrics)

        remote_data = query.all()
        record_count = len(remote_data)

        if record_count == 0:
            logger.info("没有新市场宽度数据需要同步")
            result.update({
                'success': True,
                'record_count': 0,
                'last_sync_time': last_sync.remote_max_update_time if last_sync else None
            })
            return result

        logger.info(f"从远程获取到 {record_count} 条市场宽度记录")

        remote_max_update_time = max([item.update_time for item in remote_data if item.update_time]) if remote_data else None

        if result['sync_type'] == 'full':
            logger.info("全量同步：清空本地市场宽度缓存表")
            cache_db.query(MarketBreadthMetricsCache).delete()

        for remote_item in remote_data:
            existing = cache_db.query(MarketBreadthMetricsCache)\
                .filter(MarketBreadthMetricsCache.trade_date == remote_item.trade_date)\
                .first()

            cache_item_data = {
                'trade_date': remote_item.trade_date,
                'industries_data': remote_item.industries_data,
                'market_breadth': remote_item.market_breadth,
                'total_breadth': remote_item.total_breadth,
                'update_time': remote_item.update_time
            }

            if existing:
                if remote_item.update_time and existing.update_time and remote_item.update_time > existing.update_time:
                    for key, value in cache_item_data.items():
                        setattr(existing, key, value)
                    logger.debug(f"更新市场宽度记录: {remote_item.trade_date}")
                else:
                    logger.debug(f"跳过记录（数据未更新）: {remote_item.trade_date}")
            else:
                cache_item = MarketBreadthMetricsCache(**cache_item_data)
                cache_db.add(cache_item)
                logger.debug(f"新增市场宽度记录: {remote_item.trade_date}")

        cache_db.commit()

        total_count = cache_db.query(MarketBreadthMetricsCache).count()

        sync_metadata = SyncMetadata(
            last_sync_time=datetime.now(),
            record_count=total_count,
            sync_status='success',
            error_message=None,
            remote_max_update_time=remote_max_update_time
        )
        cache_db.add(sync_metadata)
        cache_db.commit()

        logger.info(f"市场宽度数据同步成功！本地缓存共 {total_count} 条记录")

        result.update({
            'success': True,
            'record_count': total_count,
            'last_sync_time': datetime.now()
        })

    except Exception as e:
        cache_db.rollback()
        logger.error(f"市场宽度数据同步失败: {e}")

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


def get_market_breadth_sync_status() -> dict:
    """获取市场宽度数据同步状态"""
    cache_db = CacheSessionLocal()
    try:
        breadth_count = cache_db.query(MarketBreadthMetricsCache).count()
        last_sync = get_last_market_breadth_sync_info()

        return {
            'last_sync_time': last_sync.last_sync_time.isoformat() if last_sync and last_sync.last_sync_time else None,
            'remote_max_update_time': last_sync.remote_max_update_time.isoformat() if last_sync and last_sync.remote_max_update_time else None,
            'record_count': breadth_count,
            'sync_status': last_sync.sync_status if last_sync else 'never',
            'has_data': breadth_count > 0
        }
    finally:
        cache_db.close()
