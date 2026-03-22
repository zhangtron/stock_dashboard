import logging
from datetime import datetime
from typing import Optional
from sqlalchemy import desc
from app.database import SessionLocal as RemoteSessionLocal
from app.cache_database import SessionLocal as CacheSessionLocal, engine as cache_engine, Base as CacheBase
from app.models import L2AnalysisResults, L2AnalysisResultsCache, SyncMetadata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_l2_analysis_cache_db():
    """初始化L2分析结果缓存数据库表结构"""
    try:
        CacheBase.metadata.create_all(bind=cache_engine)
        logger.info("L2分析结果缓存数据库表结构初始化完成")
    except Exception as e:
        logger.error(f"初始化L2分析结果缓存数据库失败: {e}")
        raise


def get_last_l2_analysis_sync_info() -> Optional[SyncMetadata]:
    """获取上次L2分析结果同步信息"""
    cache_db = CacheSessionLocal()
    try:
        last_sync = cache_db.query(SyncMetadata)\
            .filter(SyncMetadata.sync_status.in_(['l2_analysis_success', 'l2_analysis_failed']))\
            .order_by(desc(SyncMetadata.id))\
            .first()
        return last_sync
    finally:
        cache_db.close()


def sync_l2_analysis_data_from_remote() -> dict:
    """
    从远程MySQL同步L2分析结果数据到本地SQLite缓存
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
        logger.info("开始同步L2分析结果数据...")

        last_sync = get_last_l2_analysis_sync_info()

        if last_sync and last_sync.remote_max_update_time:
            logger.info(f"执行L2分析结果数据增量同步，上次同步时间: {last_sync.remote_max_update_time}")
            query = remote_db.query(L2AnalysisResults)\
                .filter(L2AnalysisResults.updated_at > last_sync.remote_max_update_time)
            result['sync_type'] = 'incremental'
        else:
            logger.info("执行L2分析结果数据全量同步")
            query = remote_db.query(L2AnalysisResults)

        remote_data = query.all()
        record_count = len(remote_data)

        if record_count == 0:
            logger.info("没有新L2分析结果数据需要同步")
            result.update({
                'success': True,
                'record_count': 0,
                'last_sync_time': last_sync.remote_max_update_time if last_sync else None
            })
            return result

        logger.info(f"从远程获取到 {record_count} 条L2分析结果记录")

        remote_max_update_time = max([item.updated_at for item in remote_data if item.updated_at]) if remote_data else None

        if result['sync_type'] == 'full':
            logger.info("全量同步：清空本地L2分析结果缓存表")
            cache_db.query(L2AnalysisResultsCache).delete()

        for remote_item in remote_data:
            # 复合唯一键: (date, stock_code)
            existing = cache_db.query(L2AnalysisResultsCache)\
                .filter(L2AnalysisResultsCache.date == str(remote_item.date))\
                .filter(L2AnalysisResultsCache.stock_code == remote_item.stock_code)\
                .first()

            cache_item_data = {
                'date': str(remote_item.date) if remote_item.date else None,
                'stock_code': remote_item.stock_code,
                'stock_name': remote_item.stock_name,
                'sector_name': remote_item.sector_name,
                'score': remote_item.score,
                'operation_advice': remote_item.operation_advice,
                'vwap': remote_item.vwap,
                'amount': remote_item.amount,
                'created_at': remote_item.created_at,
                'updated_at': remote_item.updated_at.isoformat() if remote_item.updated_at else None
            }

            if existing:
                if remote_item.updated_at and existing.updated_at and remote_item.updated_at.isoformat() > existing.updated_at:
                    for key, value in cache_item_data.items():
                        setattr(existing, key, value)
                    logger.debug(f"更新L2分析结果记录: {remote_item.date} - {remote_item.stock_code}")
                else:
                    logger.debug(f"跳过记录（数据未更新）: {remote_item.date} - {remote_item.stock_code}")
            else:
                cache_item = L2AnalysisResultsCache(**cache_item_data)
                cache_db.add(cache_item)
                logger.debug(f"新增L2分析结果记录: {remote_item.date} - {remote_item.stock_code}")

        cache_db.commit()

        total_count = cache_db.query(L2AnalysisResultsCache).count()

        sync_metadata = SyncMetadata(
            last_sync_time=datetime.now().isoformat(),
            record_count=total_count,
            sync_status='l2_analysis_success',
            error_message=None,
            remote_max_update_time=remote_max_update_time.isoformat() if remote_max_update_time else None
        )
        cache_db.add(sync_metadata)
        cache_db.commit()

        logger.info(f"L2分析结果数据同步成功！本地缓存共 {total_count} 条记录")

        result.update({
            'success': True,
            'record_count': total_count,
            'last_sync_time': datetime.now()
        })

    except Exception as e:
        cache_db.rollback()
        logger.error(f"L2分析结果数据同步失败: {e}")

        sync_metadata = SyncMetadata(
            last_sync_time=datetime.now().isoformat(),
            record_count=0,
            sync_status='l2_analysis_failed',
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


def get_l2_analysis_sync_status() -> dict:
    """获取L2分析结果数据同步状态"""
    cache_db = CacheSessionLocal()
    try:
        l2_count = cache_db.query(L2AnalysisResultsCache).count()
        last_sync = get_last_l2_analysis_sync_info()

        sync_status = 'never'
        if last_sync:
            if last_sync.sync_status == 'l2_analysis_success':
                sync_status = 'success'
            elif last_sync.sync_status == 'l2_analysis_failed':
                sync_status = 'failed'

        return {
            'last_sync_time': last_sync.last_sync_time if last_sync and last_sync.last_sync_time else None,
            'remote_max_update_time': last_sync.remote_max_update_time if last_sync and last_sync.remote_max_update_time else None,
            'record_count': l2_count,
            'sync_status': sync_status,
            'has_data': l2_count > 0
        }
    finally:
        cache_db.close()
