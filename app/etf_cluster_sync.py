import logging
from datetime import datetime
from typing import Optional
from sqlalchemy import desc
from app.database import SessionLocal as RemoteSessionLocal
from app.cache_database import SessionLocal as CacheSessionLocal, engine as cache_engine, Base as CacheBase
from app.models import EtfClusterSelection, EtfClusterSelectionCache, SyncMetadata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_etf_cluster_cache_db():
    """初始化ETF聚类数据缓存数据库表结构"""
    try:
        CacheBase.metadata.create_all(bind=cache_engine)
        logger.info("ETF聚类数据缓存数据库表结构初始化完成")
    except Exception as e:
        logger.error(f"初始化ETF聚类数据缓存数据库失败: {e}")
        raise


def get_last_etf_cluster_sync_info() -> Optional[SyncMetadata]:
    """获取上次ETF聚类数据同步信息"""
    cache_db = CacheSessionLocal()
    try:
        last_sync = cache_db.query(SyncMetadata)\
            .filter(SyncMetadata.sync_status.in_(['etf_cluster_success', 'etf_cluster_failed']))\
            .order_by(desc(SyncMetadata.id))\
            .first()
        return last_sync
    finally:
        cache_db.close()


def sync_etf_cluster_data_from_remote() -> dict:
    """
    从远程MySQL同步ETF聚类选股数据到本地SQLite缓存
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
        logger.info("开始同步ETF聚类选股数据...")

        last_sync = get_last_etf_cluster_sync_info()

        # 获取远程最新的update_date
        latest_remote_date = remote_db.query(
            EtfClusterSelection.update_date
        ).order_by(desc(EtfClusterSelection.update_date)).first()

        if not latest_remote_date or not latest_remote_date[0]:
            logger.info("远程没有ETF聚类选股数据")
            result.update({
                'success': True,
                'record_count': 0,
                'last_sync_time': None
            })
            return result

        latest_remote_date_str = latest_remote_date[0].strftime('%Y-%m-%d')

        # 检查是否需要同步
        if last_sync and last_sync.remote_max_update_time:
            last_sync_date = last_sync.remote_max_update_time
            if last_sync_date >= latest_remote_date_str:
                logger.info(f"ETF聚类数据已是最新，无需同步。当前最新日期: {latest_remote_date_str}")
                result.update({
                    'success': True,
                    'record_count': cache_db.query(EtfClusterSelectionCache).count(),
                    'sync_type': 'none',
                    'last_sync_time': last_sync.last_sync_time
                })
                return result

        logger.info(f"执行ETF聚类选股数据同步，最新日期: {latest_remote_date_str}")

        # 查询最新日期的数据
        remote_data = remote_db.query(EtfClusterSelection)\
            .filter(EtfClusterSelection.update_date == latest_remote_date[0])\
            .all()

        record_count = len(remote_data)

        if record_count == 0:
            logger.info("最新日期没有ETF聚类选股数据")
            result.update({
                'success': True,
                'record_count': 0,
                'last_sync_time': latest_remote_date_str
            })
            return result

        logger.info(f"从远程获取到 {record_count} 条ETF聚类选股记录")

        # 清空缓存并重新同步（ETF聚类数据按日期完全替换）
        cache_db.query(EtfClusterSelectionCache).delete()

        for remote_item in remote_data:
            cache_item = EtfClusterSelectionCache(
                fund_code=remote_item.fund_code,
                fund_name=remote_item.fund_name,
                cluster_name=remote_item.cluster_name,
                update_date=remote_item.update_date.strftime('%Y-%m-%d') if remote_item.update_date else None,
                rank=remote_item.rank,
                score=remote_item.score,
                created_at=remote_item.created_at
            )
            cache_db.add(cache_item)
            logger.debug(f"新增ETF聚类记录: {remote_item.fund_code} - {remote_item.cluster_name} - Rank {remote_item.rank}")

        cache_db.commit()

        total_count = cache_db.query(EtfClusterSelectionCache).count()

        sync_metadata = SyncMetadata(
            last_sync_time=datetime.now().isoformat(),
            record_count=total_count,
            sync_status='etf_cluster_success',
            error_message=None,
            remote_max_update_time=latest_remote_date_str
        )
        cache_db.add(sync_metadata)
        cache_db.commit()

        logger.info(f"ETF聚类选股数据同步成功！本地缓存共 {total_count} 条记录")

        result.update({
            'success': True,
            'record_count': total_count,
            'last_sync_time': datetime.now()
        })

    except Exception as e:
        cache_db.rollback()
        logger.error(f"ETF聚类选股数据同步失败: {e}")

        sync_metadata = SyncMetadata(
            last_sync_time=datetime.now().isoformat(),
            record_count=0,
            sync_status='etf_cluster_failed',
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


def get_etf_cluster_sync_status() -> dict:
    """获取ETF聚类数据同步状态"""
    cache_db = CacheSessionLocal()
    try:
        cluster_count = cache_db.query(EtfClusterSelectionCache).count()
        last_sync = get_last_etf_cluster_sync_info()

        sync_status = 'never'
        if last_sync:
            if last_sync.sync_status == 'etf_cluster_success':
                sync_status = 'success'
            elif last_sync.sync_status == 'etf_cluster_failed':
                sync_status = 'failed'

        return {
            'last_sync_time': last_sync.last_sync_time if last_sync and last_sync.last_sync_time else None,
            'remote_max_update_time': last_sync.remote_max_update_time if last_sync and last_sync.remote_max_update_time else None,
            'record_count': cluster_count,
            'sync_status': sync_status,
            'has_data': cluster_count > 0
        }
    finally:
        cache_db.close()
