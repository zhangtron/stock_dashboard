from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.cache_database import get_cache_db
from app.crud import get_macro_analysis
from app.schemas import MacroAnalysisSchema

router = APIRouter(prefix="/macro-analysis")


@router.get("", response_model=Optional[MacroAnalysisSchema])
async def get_macro_data(cache_db: Session = Depends(get_cache_db)):
    """
    获取宏观数据分析结果
    包含货币周期、信用周期、市值偏好等信息
    """
    data = get_macro_analysis(cache_db)
    
    if not data:
        return JSONResponse(
            status_code=503,
            content={
                "error": "宏观数据尚未就绪，请稍后再试",
                "message": "系统正在同步宏观数据，请等待每日17:00的自动更新或检查系统状态"
            }
        )
    
    return data
