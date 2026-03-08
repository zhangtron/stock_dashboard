from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.cache_database import get_cache_db
from app.crud import get_etf_cluster_selection_latest
from app.etf_cluster_sync import sync_etf_cluster_data_from_remote

router = APIRouter(prefix="/fund-analysis", tags=["基金分析"])


@router.get("/etf-clusters", summary="获取ETF聚类选股数据")
async def get_etf_clusters(db: Session = Depends(get_cache_db)):
    """
    获取最新一天的ETF聚类选股数据

    返回数据格式：
    {
        "update_date": "2024-01-01",
        "clusters": [
            {
                "cluster_name": "聚类1",
                "funds": [
                    {"fund_code": "159001", "fund_name": "基金1", "rank": 1, "score": 95.5},
                    ...
                ]
            },
            ...
        ]
    }
    """
    result = get_etf_cluster_selection_latest(db)

    if not result:
        raise HTTPException(status_code=404, detail="暂无ETF聚类选股数据")

    return result


@router.post("/sync", summary="同步ETF聚类选股数据")
async def sync_etf_clusters():
    """
    手动触发ETF聚类选股数据同步
    从远程MySQL同步最新数据到本地SQLite缓存
    """
    try:
        result = sync_etf_cluster_data_from_remote()
        return result
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
