import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import desc
from app.database import SessionLocal as RemoteSessionLocal
from app.cache_database import SessionLocal as CacheSessionLocal, engine as cache_engine, Base as CacheBase
from app.models import BondChinaYield, MacroData, BondChinaYieldCache, MacroDataCache, SyncMetadata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_macro_cache_db():
    """初始化宏观数据缓存数据库表结构"""
    try:
        CacheBase.metadata.create_all(bind=cache_engine)
        logger.info("宏观数据缓存数据库表结构初始化完成")
    except Exception as e:
        logger.error(f"初始化宏观数据缓存数据库失败: {e}")
        raise


def get_last_bond_sync_info() -> Optional[SyncMetadata]:
    """获取上次债券数据同步信息"""
    cache_db = CacheSessionLocal()
    try:
        last_sync = cache_db.query(SyncMetadata)\
            .filter(SyncMetadata.sync_status.like('%bond%'))\
            .order_by(desc(SyncMetadata.id))\
            .first()
        return last_sync
    finally:
        cache_db.close()


def get_last_macro_sync_info() -> Optional[SyncMetadata]:
    """获取上次宏观数据同步信息"""
    cache_db = CacheSessionLocal()
    try:
        last_sync = cache_db.query(SyncMetadata)\
            .filter(SyncMetadata.sync_status.like('%macro%'))\
            .order_by(desc(SyncMetadata.id))\
            .first()
        return last_sync
    finally:
        cache_db.close()


def sync_bond_data_from_remote() -> dict:
    """
    从远程MySQL同步债券收益率数据到本地SQLite缓存
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
        logger.info("开始同步债券收益率数据...")

        last_sync = get_last_bond_sync_info()

        if last_sync and last_sync.remote_max_update_time:
            logger.info(f"执行债券数据增量同步，上次同步时间: {last_sync.remote_max_update_time}")
            query = remote_db.query(BondChinaYield)\
                .filter(BondChinaYield.date > last_sync.remote_max_update_time)
            result['sync_type'] = 'incremental'
        else:
            logger.info("执行债券数据全量同步")
            query = remote_db.query(BondChinaYield)

        remote_data = query.all()
        record_count = len(remote_data)

        if record_count == 0:
            logger.info("没有新债券数据需要同步")
            result.update({
                'success': True,
                'record_count': 0,
                'last_sync_time': last_sync.remote_max_update_time if last_sync else None
            })
            return result

        logger.info(f"从远程获取到 {record_count} 条债券记录")

        remote_max_date = max([item.date for item in remote_data]) if remote_data else None

        if result['sync_type'] == 'full':
            logger.info("全量同步：清空本地债券缓存表")
            cache_db.query(BondChinaYieldCache).delete()

        for remote_item in remote_data:
            existing = cache_db.query(BondChinaYieldCache)\
                .filter(BondChinaYieldCache.date == remote_item.date,
                        BondChinaYieldCache.curve_name == remote_item.curve_name)\
                .first()

            cache_item_data = {
                'id': remote_item.id,
                'date': remote_item.date,
                'curve_name': remote_item.curve_name,
                'one_year': remote_item.one_year,
                'ten_year': remote_item.ten_year,
                'one_year_3m_avg': remote_item.one_year_3m_avg,
                'one_year_6m_avg': remote_item.one_year_6m_avg,
                'ten_year_3m_avg': remote_item.ten_year_3m_avg,
                'ten_year_6m_avg': remote_item.ten_year_6m_avg,
                'one_year_signal': remote_item.one_year_signal,
                'ten_year_signal': remote_item.ten_year_signal
            }

            if existing:
                cache_db.merge(BondChinaYieldCache(**cache_item_data))
                logger.debug(f"更新债券记录: {remote_item.date} {remote_item.curve_name}")
            else:
                cache_item = BondChinaYieldCache(**cache_item_data)
                cache_db.add(cache_item)
                logger.debug(f"新增债券记录: {remote_item.date} {remote_item.curve_name}")

        cache_db.commit()

        total_count = cache_db.query(BondChinaYieldCache).count()

        sync_metadata = SyncMetadata(
            last_sync_time=datetime.now(),
            record_count=total_count,
            sync_status='success',
            error_message=None,
            remote_max_update_time=remote_max_date
        )
        cache_db.add(sync_metadata)
        cache_db.commit()

        logger.info(f"债券数据同步成功！本地缓存共 {total_count} 条记录")

        result.update({
            'success': True,
            'record_count': total_count,
            'last_sync_time': datetime.now()
        })

    except Exception as e:
        cache_db.rollback()
        logger.error(f"债券数据同步失败: {e}")

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


def sync_macro_data_from_remote() -> dict:
    """
    从远程MySQL同步宏观数据到本地SQLite缓存
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
        logger.info("开始同步宏观数据...")

        last_sync = get_last_macro_sync_info()

        if last_sync and last_sync.remote_max_update_time:
            logger.info(f"执行宏观数据增量同步，上次同步时间: {last_sync.remote_max_update_time}")
            query = remote_db.query(MacroData)\
                .filter(MacroData.date > last_sync.remote_max_update_time)
            result['sync_type'] = 'incremental'
        else:
            logger.info("执行宏观数据全量同步")
            query = remote_db.query(MacroData)

        remote_data = query.all()
        record_count = len(remote_data)

        if record_count == 0:
            logger.info("没有新宏观数据需要同步")
            result.update({
                'success': True,
                'record_count': 0,
                'last_sync_time': last_sync.remote_max_update_time if last_sync else None
            })
            return result

        logger.info(f"从远程获取到 {record_count} 条宏观记录")

        remote_max_date = max([item.date for item in remote_data]) if remote_data else None

        if result['sync_type'] == 'full':
            logger.info("全量同步：清空本地宏观缓存表")
            cache_db.query(MacroDataCache).delete()

        for remote_item in remote_data:
            existing = cache_db.query(MacroDataCache)\
                .filter(MacroDataCache.date == remote_item.date)\
                .first()

            cache_item_data = {
                'id': remote_item.id,
                'date': remote_item.date,
                'M1_yoy': remote_item.M1_yoy,
                'GDP_growth': remote_item.GDP_growth,
                'PPI_yoy': remote_item.PPI_yoy,
                'loan_yoy': remote_item.loan_yoy,
                'M1_PPI_diff': remote_item.M1_PPI_diff,
                'M1_GDP_diff': remote_item.M1_GDP_diff,
                'M1_PPI_diff_3m_avg': remote_item.M1_PPI_diff_3m_avg,
                'M1_PPI_diff_6m_avg': remote_item.M1_PPI_diff_6m_avg,
                'M1_GDP_diff_3m_avg': remote_item.M1_GDP_diff_3m_avg,
                'M1_GDP_diff_6m_avg': remote_item.M1_GDP_diff_6m_avg,
                'loan_yoy_3m_avg': remote_item.loan_yoy_3m_avg,
                'loan_yoy_6m_avg': remote_item.loan_yoy_6m_avg,
                'credit_cycle': remote_item.credit_cycle
            }

            if existing:
                cache_db.merge(MacroDataCache(**cache_item_data))
                logger.debug(f"更新宏观记录: {remote_item.date}")
            else:
                cache_item = MacroDataCache(**cache_item_data)
                cache_db.add(cache_item)
                logger.debug(f"新增宏观记录: {remote_item.date}")

        cache_db.commit()

        total_count = cache_db.query(MacroDataCache).count()

        sync_metadata = SyncMetadata(
            last_sync_time=datetime.now(),
            record_count=total_count,
            sync_status='success',
            error_message=None,
            remote_max_update_time=remote_max_date
        )
        cache_db.add(sync_metadata)
        cache_db.commit()

        logger.info(f"宏观数据同步成功！本地缓存共 {total_count} 条记录")

        result.update({
            'success': True,
            'record_count': total_count,
            'last_sync_time': datetime.now()
        })

    except Exception as e:
        cache_db.rollback()
        logger.error(f"宏观数据同步失败: {e}")

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


def sync_all_macro_data() -> dict:
    """同步所有宏观数据（债券和宏观指标）"""
    logger.info("开始同步所有宏观数据...")

    bond_result = sync_bond_data_from_remote()
    macro_result = sync_macro_data_from_remote()

    overall_success = bond_result['success'] and macro_result['success']

    result = {
        'success': overall_success,
        'bond_sync': bond_result,
        'macro_sync': macro_result
    }

    if overall_success:
        logger.info("所有宏观数据同步完成")
    else:
        logger.error("宏观数据同步失败")

    return result


def get_macro_sync_status() -> dict:
    """获取宏观数据同步状态"""
    cache_db = CacheSessionLocal()
    try:
        bond_count = cache_db.query(BondChinaYieldCache).count()
        macro_count = cache_db.query(MacroDataCache).count()

        last_bond_sync = get_last_bond_sync_info()
        last_macro_sync = get_last_macro_sync_info()

        return {
            'bond_data': {
                'last_sync_time': last_bond_sync.last_sync_time.isoformat() if last_bond_sync and last_bond_sync.last_sync_time else None,
                'remote_max_update_time': last_bond_sync.remote_max_update_time.isoformat() if last_bond_sync and last_bond_sync.remote_max_update_time else None,
                'record_count': bond_count,
                'sync_status': last_bond_sync.sync_status if last_bond_sync else 'never',
                'has_data': bond_count > 0
            },
            'macro_data': {
                'last_sync_time': last_macro_sync.last_sync_time.isoformat() if last_macro_sync and last_macro_sync.last_sync_time else None,
                'remote_max_update_time': last_macro_sync.remote_max_update_time.isoformat() if last_macro_sync and last_macro_sync.remote_max_update_time else None,
                'record_count': macro_count,
                'sync_status': last_macro_sync.sync_status if last_macro_sync else 'never',
                'has_data': macro_count > 0
            }
        }
    finally:
        cache_db.close()
