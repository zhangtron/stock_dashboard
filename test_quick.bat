@echo off
REM Windows快速验证脚本
chcp 65001 >nul

echo ========================================
echo 股票基本面选股数据看板 - 功能验证测试
echo ========================================
echo.

REM 检查Python环境
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python未安装或未添加到PATH
    pause
    exit /b 1
)

REM 检查应用是否运行
echo [测试1] 检查应用是否运行
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo ❌ 应用未运行，请先启动: uvicorn app.main:app --reload
    pause
    exit /b 1
) else (
    echo ✅ 应用运行正常
)

REM 测试API健康检查
echo.
echo [测试2] API健康检查
curl -s http://localhost:8000/health
echo.

REM 测试同步状态
echo.
echo [测试3] 同步状态检查
curl -s http://localhost:8000/api/sync/status
echo.

REM 测试API性能
echo.
echo [测试4] API性能测试
echo 测试基本查询...
for /L %%i in (1,1,5) do (
    curl -s -o nul -w "第%%i次: %%{time_total}秒" http://localhost:8000/api/screening?page=1&page_size=20
    echo.
)

REM 测试数据质量
echo.
echo [测试5] 数据质量检查
curl -s http://localhost:8000/api/screening?page=1&page_size=5 > api_test.json
python -c "import json; d=json.load(open('api_test.json')); print(f'总记录数: {d[\"total\"]}'); print(f'Top 1: {d[\"top3\"][0][\"stock_name\"]} - {d[\"top3\"][0][\"overall_score\"]}')"
del api_test.json

REM 检查缓存文件
echo.
echo [测试6] 缓存文件检查
if exist app\static\data\stock_cache.db (
    echo ✅ 缓存文件存在
    dir app\static\data\stock_cache.db | findstr stock_cache.db
) else (
    echo ❌ 缓存文件不存在
)

REM 检查表结构
echo.
echo [测试7] 数据库表结构检查
python -c "from app.cache_database import engine; from sqlalchemy import inspect; i=inspect(engine); print('表:', i.get_table_names())"

REM 测试查询功能
echo.
echo [测试8] 查询功能测试
echo 8.1 Top 3查询:
curl -s "http://localhost:8000/api/screening?page=1&page_size=5" | python -c "import json,sys; d=json.load(sys.stdin); print('  Top 1:', d['top3'][0]['stock_name'], '-', d['top3'][0]['overall_score'])"

echo.
echo 8.2 筛选查询 (STRONG_BUY):
curl -s "http://localhost:8000/api/screening?recommendation=STRONG_BUY&page=1&page_size=5" | python -c "import json,sys; d=json.load(sys.stdin); print('  推荐:', d['data'][0]['stock_name'], '-', d['data'][0]['stock_code'])"

echo.
echo 8.3 搜索查询 (银行):
curl -s "http://localhost:8000/api/screening?stock_name=银行&page=1&page_size=5" | python -c "import json,sys; d=json.load(sys.stdin); print('  找到:', d['total'], '个结果')"

echo.
echo ========================================
echo 测试完成
echo ========================================
echo.
echo 如需更详细测试，请运行:
echo   python test_cache.py
echo.
echo 或查看完整测试文档:
echo   cat PERFORMANCE_TEST.md
echo.

pause
