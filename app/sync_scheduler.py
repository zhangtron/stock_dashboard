import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.data_sync import sync_data_from_remote, init_cache_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = None


def init_scheduler():
    """初始化定时任务调度器"""
    global scheduler

    if scheduler is not None:
        logger.warning("调度器已经初始化")
        return

    try:
        scheduler = BackgroundScheduler()

        scheduler.add_job(
            sync_data_from_remote,
            trigger=CronTrigger(hour=5, minute=0),
            id='daily_data_sync',
            name='每日数据同步',
            replace_existing=True,
            misfire_grace_time=3600
        )

        scheduler.start()
        logger.info("定时任务调度器启动成功，每日5:00执行数据同步（包含股票和宏观数据）")

    except Exception as e:
        logger.error(f"定时任务调度器启动失败: {e}")
        raise


def shutdown_scheduler():
    """关闭调度器"""
    global scheduler
    if scheduler:
        scheduler.shutdown()
        logger.info("定时任务调度器已关闭")
        scheduler = None


def get_scheduler_status() -> dict:
    """获取调度器状态"""
    if scheduler is None:
        return {
            'running': False,
            'jobs': []
        }

    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            'id': job.id,
            'name': job.name,
            'next_run_time': job.next_run_time.isoformat() if job.next_run_time else None
        })

    return {
        'running': scheduler.running,
        'jobs': jobs
    }
