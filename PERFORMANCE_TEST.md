# 性能优化测试方案

## 测试目标
验证v1.1.0的SQLite本地缓存和定时同步功能是否正常工作

---

## 测试准备

### 1. 清理旧缓存数据（可选）
```bash
# 删除旧缓存数据库，测试首次同步
rm -f app/static/data/stock_cache.db

# Windows
del app\static\data\stock_cache.db
```

### 2. 启动应用
```bash
uvicorn app.main:app --reload
```

---

## 测试1：缓存数据库初始化 ✅

### 测试目标
验证应用启动时自动创建SQLite缓存数据库和表结构

### 测试步骤

```bash
# 1. 启动应用，查看日志
# 应该看到：
# - "正在初始化本地缓存数据库..."
# - "本地缓存数据库表结构初始化完成"
# - "正在启动定时任务调度器..."
# - "定时任务调度器启动成功，每日5:00执行数据同步"

# 2. 检查缓存文件是否创建
ls -lh app/static/data/stock_cache.db
# Windows: dir app\static\data\stock_cache.db

# 应该看到类似输出：
# -rw-r--r-- 1 user user 1.1M Jan  8 19:47 stock_cache.db

# 3. 使用SQLite工具查看表结构
sqlite3 app/static/data/stock_cache.db ".schema"
# 或使用Python
python -c "
from app.cache_database import engine
from sqlalchemy import inspect
inspector = inspect(engine)
for table_name in inspector.get_table_names():
    print(f'表名: {table_name}')
    for column in inspector.get_columns(table_name):
        print(f'  - {column[\"name\"]}: {column[\"type\"]}')
"
```

### 预期结果
✅ 缓存文件创建成功（约1-2MB）
✅ 表结构正确（stock_fundamental_screening_cache, sync_metadata）
✅ 日志显示初始化成功

---

## 测试2：首次数据同步 ✅

### 测试目标
验证应用首次启动时自动执行全量同步

### 测试步骤

```bash
# 1. 查看启动日志，应该看到：
# - "本地缓存为空，执行首次数据同步..."
# - "开始数据同步..."
# - "执行全量同步"
# - "从远程获取到 4583 条记录"
# - "全量同步：清空本地缓存表"
# - "同步成功！本地缓存共 4583 条记录"
# - "首次同步完成，共同步 4583 条记录"

# 2. 查看缓存记录数
python -c "
from app.cache_database import SessionLocal
from app.models import StockFundamentalScreeningCache

session = SessionLocal()
count = session.query(StockFundamentalScreeningCache).count()
print(f'本地缓存记录数: {count}')

# 查看Top 3
top3 = session.query(StockFundamentalScreeningCache)\
    .order_by(StockFundamentalScreeningCache.overall_score.desc())\
    .limit(3)\
    .all()

print('\nTop 3股票:')
for i, stock in enumerate(top3, 1):
    print(f'{i}. {stock.stock_name} - {stock.overall_score}')

session.close()
"

# 3. 查看同步元数据
python -c "
from app.cache_database import SessionLocal
from app.models import SyncMetadata

session = SessionLocal()
last_sync = session.query(SyncMetadata)\
    .order_by(SyncMetadata.id.desc())\
    .first()

if last_sync:
    print(f'上次同步时间: {last_sync.last_sync_time}')
    print(f'同步状态: {last_sync.sync_status}')
    print(f'记录数: {last_sync.record_count}')
    print(f'错误信息: {last_sync.error_message}')
    print(f'远程最大更新时间: {last_sync.remote_max_update_time}')

session.close()
"
```

### 预期结果
✅ 缓存记录数 = 4,583
✅ Top 3数据正确显示
✅ 同步状态 = success
✅ 同步记录数 = 4,583
✅ remote_max_update_time有值

---

## 测试3：API读取缓存数据 ✅

### 测试目标
验证API从本地缓存读取数据，性能提升

### 测试步骤

```bash
# 1. 测试基本查询
time curl -s "http://localhost:8000/api/screening?page=1&page_size=20" | python -m json.tool | head -50

# 查看Top 3
time curl -s "http://localhost:8000/api/screening?page=1&page_size=5" | python -c "
import sys, json
data = json.load(sys.stdin)
print('Top 3股票:')
for i, stock in enumerate(data['top3'], 1):
    print(f'{i}. {stock[\"stock_name\"]} - {stock[\"overall_score\"]}')
"

# 2. 测试筛选查询
time curl -s "http://localhost:8000/api/screening?recommendation=STRONG_BUY&page=1&page_size=10" | python -c "
import sys, json
data = json.load(sys.stdin)
print(f'推荐股票数量: {data[\"total\"]}')
print(f'Top 3推荐股票:')
for i, stock in enumerate(data['data'][:3], 1):
    print(f'{i}. {stock[\"stock_name\"]} - {stock[\"stock_code\"]} - 得分: {stock[\"overall_score\"]}')
"

# 3. 测试分页查询
time curl -s "http://localhost:8000/api/screening?page=2&page_size=5" | python -c "
import sys, json
data = json.load(sys.stdin)
print(f'当前页: {data[\"page\"]}')
print(f'每页数量: {data[\"page_size\"]}')
print(f'总记录数: {data[\"total\"]}')
print(f'总页数: {data[\"total_pages\"]}')
print('\n当前页数据:')
for stock in data['data']:
    print(f'  - {stock[\"stock_name\"]} ({stock[\"stock_code\"]})')
"

# 4. 测试模糊搜索
time curl -s "http://localhost:8000/api/screening?stock_name=银行&page=1&page_size=10" | python -c "
import sys, json
data = json.load(sys.stdin)
print(f'搜索\"银行\"结果: {data[\"total\"]}条')
for stock in data['data']:
    print(f'  - {stock[\"stock_name\"]} ({stock[\"stock_code\"]})')
"

# 5. 测试得分筛选
time curl -s "http://localhost:8000/api/screening?min_overall_score=80&page=1&page_size=10" | python -c "
import sys, json
data = json.load(sys.stdin)
print(f'得分>=80的股票: {data[\"total\"]}条')
print('Top 5:')
for i, stock in enumerate(data['data'][:5], 1):
    print(f'{i}. {stock[\"stock_name\"]} - {stock[\"overall_score\"]}')
"
```

### 预期结果
✅ 响应时间 < 100ms（目标：~50ms）
✅ Top 3数据正确
✅ 筛选功能正常
✅ 分页功能正常
✅ 模糊搜索正常

---

## 测试4：同步状态API ✅

### 测试目标
验证同步状态监控API正常工作

### 测试步骤

```bash
# 1. 调用同步状态API
curl -s "http://localhost:8000/api/sync/status" | python -m json.tool

# 2. 验证响应内容
curl -s "http://localhost:8000/api/sync/status" | python -c "
import sys, json
data = json.load(sys.stdin)

print('=== 同步状态 ===')
sync = data['sync']
print(f'上次同步时间: {sync[\"last_sync_time\"]}')
print(f'同步记录数: {sync[\"record_count\"]}')
print(f'同步状态: {sync[\"sync_status\"]}')
print(f'是否有数据: {sync[\"has_data\"]}')
print(f'本地缓存数: {sync[\"cache_count\"]}')
print(f'远程最大更新时间: {sync[\"remote_max_update_time\"]}')

print('\n=== 调度器状态 ===')
scheduler = data['scheduler']
print(f'运行状态: {scheduler[\"running\"]}')
print(f'任务数量: {len(scheduler[\"jobs\"])}')

if scheduler['jobs']:
    print('\n定时任务:')
    for job in scheduler['jobs']:
        print(f'  - {job[\"name\"]}')
        print(f'    ID: {job[\"id\"]}')
        print(f'    下次执行: {job[\"next_run_time\"]}')
"
```

### 预期结果
✅ sync.running = true
✅ sync.has_data = true
✅ sync.record_count = 4583
✅ sync.sync_status = success
✅ scheduler.running = true
✅ scheduler.jobs 包含 "daily_data_sync"
✅ next_run_time 显示明天的5:00

---

## 测试5：增量同步模拟 ✅

### 测试目标
验证增量同步逻辑（模拟数据更新）

### 测试步骤

```bash
# 1. 查看当前同步时间
python -c "
from app.cache_database import SessionLocal
from app.models import SyncMetadata

session = SessionLocal()
last_sync = session.query(SyncMetadata)\
    .order_by(SyncMetadata.id.desc())\
    .first()

print(f'上次同步时间: {last_sync.last_sync_time}')
print(f'远程最大更新时间: {last_sync.remote_max_update_time}')

session.close()
"

# 2. 手动触发增量同步
python -c "
from app.data_sync import sync_data_from_remote
result = sync_data_from_remote()

print('=== 同步结果 ===')
print(f'成功: {result[\"success\"]}')
print(f'同步类型: {result[\"sync_type\"]}')
print(f'记录数: {result[\"record_count\"]}')
print(f'上次同步时间: {result[\"last_sync_time\"]}')
if result.get('error'):
    print(f'错误: {result[\"error\"]}')
"

# 3. 验证同步类型为增量（如果远程有新数据）
# 或验证全量同步（如果远程没有新数据）

# 4. 查看同步元数据，确认有新的同步记录
python -c "
from app.cache_database import SessionLocal
from app.models import SyncMetadata

session = SessionLocal()

syncs = session.query(SyncMetadata)\
    .order_by(SyncMetadata.id.desc())\
    .limit(3)\
    .all()

print('最近3次同步记录:')
for i, sync in enumerate(reversed(syncs), 1):
    print(f'{i}. {sync.last_sync_time} - {sync.sync_status} - {sync.record_count}条')

session.close()
"
```

### 预期结果
✅ 如果远程有新数据：执行增量同步
✅ 如果远程无新数据：执行全量同步但记录数不变
✅ 同步元数据增加新记录
✅ 缓存记录数保持或增加

---

## 测试6：性能对比测试 ✅

### 测试目标
验证性能提升效果（本地缓存 vs 远程查询）

### 测试步骤

```bash
# 创建性能测试脚本
cat > performance_test.sh << 'EOF'
#!/bin/bash

echo "=== 性能测试: 本地缓存 vs 模拟远程查询 ==="

echo ""
echo "测试1: 本地缓存查询（10次）"
total_time=0
for i in {1..10}; do
    time_output=$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:8000/api/screening?page=1&page_size=20")
    total_time=$(echo "$total_time + $time_output" | bc)
    echo "  第${i}次: ${time_output}s"
done
avg_time=$(echo "scale=3; $total_time / 10" | bc)
echo "  平均响应时间: ${avg_time}s"
echo "  平均响应时间(毫秒): $(echo "scale=0; $avg_time * 1000" | bc)ms"

echo ""
echo "测试2: Top 3查询（10次）"
total_time=0
for i in {1..10}; do
    time_output=$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:8000/api/screening?page=1&page_size=5")
    total_time=$(echo "$total_time + $time_output" | bc)
    echo "  第${i}次: ${time_output}s"
done
avg_time=$(echo "scale=3; $total_time / 10" | bc)
echo "  平均响应时间: ${avg_time}s"
echo "  平均响应时间(毫秒): $(echo "scale=0; $avg_time * 1000" | bc)ms"

echo ""
echo "测试3: 筛选查询（10次）"
total_time=0
for i in {1..10}; do
    time_output=$(curl -s -o /dev/null -w "%{time_total}" "http://localhost:8000/api/screening?recommendation=STRONG_BUY&page=1&page_size=10")
    total_time=$(echo "$total_time + $time_output" | bc)
    echo "  第${i}次: ${time_output}s"
done
avg_time=$(echo "scale=3; $total_time / 10" | bc)
echo "  平均响应时间: ${avg_time}s"
echo "  平均响应时间(毫秒): $(echo "scale=0; $avg_time * 1000" | bc)ms"
EOF

chmod +x performance_test.sh
./performance_test.sh
```

### 预期结果
✅ 平均响应时间 < 100ms
✅ Top 3查询 < 50ms
✅ 筛选查询 < 100ms
✅ 性能稳定，无明显波动

---

## 测试7：容错机制测试 ✅

### 测试目标
验证同步失败时保留上一次数据

### 测试步骤

```bash
# 1. 备份当前缓存
cp app/static/data/stock_cache.db app/static/data/stock_cache_backup.db

# 2. 模拟同步失败（修改数据库密码为错误值）
export DB_PASSWORD="wrong_password"
python -c "
from app.data_sync import sync_data_from_remote
try:
    result = sync_data_from_remote()
    print(f'同步结果: {result}')
except Exception as e:
    print(f'同步失败: {e}')
"

# 3. 验证缓存数据是否保留
python -c "
from app.cache_database import SessionLocal
from app.models import StockFundamentalScreeningCache, SyncMetadata

session = SessionLocal()
count = session.query(StockFundamentalScreeningCache).count()
print(f'缓存记录数: {count}')

last_sync = session.query(SyncMetadata)\
    .order_by(SyncMetadata.id.desc())\
    .first()
print(f'最后一次同步状态: {last_sync.sync_status}')
print(f'最后一次同步错误: {last_sync.error_message}')

session.close()
"

# 4. 恢复数据库密码
# 在.env文件中恢复正确的密码

# 5. 恢复备份
cp app/static/data/stock_cache_backup.db app/static/data/stock_cache.db

# 6. 重新测试API
curl -s "http://localhost:8000/api/screening?page=1&page_size=5" | python -c "
import sys, json
data = json.load(sys.stdin)
print(f'Total: {data[\"total\"]}')
print(f'Top 1: {data[\"data\"][0][\"stock_name\"]}')
"
```

### 预期结果
✅ 同步失败时不删除缓存数据
✅ 同步状态记录为 "failed"
✅ 错误信息记录到元数据
✅ API仍然可以返回旧数据
✅ 数据库连接失败不影响用户访问

---

## 测试8：定时任务验证 ✅

### 测试目标
验证定时任务调度器正常工作

### 测试步骤

```bash
# 1. 查看调度器状态
curl -s "http://localhost:8000/api/sync/status" | python -c "
import sys, json
from datetime import datetime
data = json.load(sys.stdin)

scheduler = data['scheduler']
print('=== 调度器状态 ===')
print(f'运行中: {scheduler[\"running\"]}')
print(f'任务数: {len(scheduler[\"jobs\"])}')

if scheduler['jobs']:
    job = scheduler['jobs'][0]
    print(f'\n任务名称: {job[\"name\"]}')
    print(f'任务ID: {job[\"id\"]}')
    print(f'下次执行时间: {job[\"next_run_time\"]}')

    # 计算距离下次执行的时间
    next_run = datetime.fromisoformat(job['next_run_time'])
    now = datetime.now()
    diff = next_run - now
    print(f'距离下次执行: {diff}')
"

# 2. 检查应用日志，查看调度器启动信息
# 应该看到：
# - "定时任务调度器启动成功，每日5:00执行数据同步"

# 3. （可选）修改调度器时间进行测试
# 在 app/sync_scheduler.py 中临时修改：
# scheduler.add_job(..., trigger=CronTrigger(hour=0, minute=0))  # 改为每小时
# 重启应用，观察是否每小时执行一次
```

### 预期结果
✅ 调度器运行状态 = true
✅ 有1个定时任务（daily_data_sync）
✅ 下次执行时间为明天的5:00
✅ 应用日志显示调度器启动成功

---

## 测试9：并发测试 ✅

### 测试目标
验证系统在高并发情况下的稳定性

### 测试步骤

```bash
# 使用 Apache Bench 进行并发测试
# 如果没有安装: apt-get install apache2-utils (Ubuntu/Debian)

echo "=== 并发测试: 100并发，共1000请求 ==="
ab -n 1000 -c 100 "http://localhost:8000/api/screening?page=1&page_size=20"

echo ""
echo "=== 并发测试: 50并发，共500请求 ==="
ab -n 500 -c 50 "http://localhost:8000/api/screening?recommendation=STRONG_BUY&page=1&page_size=10"
```

### 预期结果
✅ 无失败请求（Failed requests = 0）
✅ 平均响应时间 < 100ms
✅ 90%请求响应时间 < 150ms
✅ 无超时或连接错误

---

## 测试10：数据库持久化测试 ✅

### 测试目标
验证缓存数据在应用重启后保持

### 测试步骤

```bash
# 1. 记录当前缓存状态
echo "=== 重启前状态 ==="
python -c "
from app.cache_database import SessionLocal
from app.models import StockFundamentalScreeningCache, SyncMetadata

session = SessionLocal()
count = session.query(StockFundamentalScreeningCache).count()
print(f'缓存记录数: {count}')

last_sync = session.query(SyncMetadata)\
    .order_by(SyncMetadata.id.desc())\
    .first()
if last_sync:
    print(f'上次同步: {last_sync.last_sync_time}')
    print(f'同步状态: {last_sync.sync_status}')

session.close()
"

# 2. 停止应用（Ctrl+C）

# 3. 检查缓存文件
ls -lh app/static/data/stock_cache.db

# 4. 重新启动应用
uvicorn app.main:app --reload

# 5. 验证数据未丢失
echo ""
echo "=== 重启后状态 ==="
python -c "
from app.cache_database import SessionLocal
from app.models import StockFundamentalScreeningCache, SyncMetadata

session = SessionLocal()
count = session.query(StockFundamentalScreeningCache).count()
print(f'缓存记录数: {count}')

last_sync = session.query(SyncMetadata)\
    .order_by(SyncMetadata.id.desc())\
    .first()
if last_sync:
    print(f'上次同步: {last_sync.last_sync_time}')
    print(f'同步状态: {last_sync.sync_status}')

session.close()
"

# 6. 测试API
curl -s "http://localhost:8000/api/screening?page=1&page_size=5" | python -c "
import sys, json
data = json.load(sys.stdin)
print(f'Total: {data[\"total\"]}')
print(f'Top 1: {data[\"top3\"][0][\"stock_name\"]} - {data[\"top3\"][0][\"overall_score\"]}')
"
```

### 预期结果
✅ 缓存文件存在
✅ 重启后缓存记录数不变
✅ 重启后同步元数据保持
✅ API正常返回数据

---

## 测试检查清单

使用以下清单记录测试结果：

```
✅ 测试1: 缓存数据库初始化
   [ ] 缓存文件创建成功
   [ ] 表结构正确
   [ ] 日志显示初始化成功

✅ 测试2: 首次数据同步
   [ ] 全量同步执行成功
   [ ] 记录数 = 4583
   [ ] Top 3数据正确
   [ ] 同步状态 = success

✅ 测试3: API读取缓存数据
   [ ] 响应时间 < 100ms
   [ ] Top 3数据正确
   [ ] 筛选功能正常
   [ ] 分页功能正常
   [ ] 模糊搜索正常

✅ 测试4: 同步状态API
   [ ] 同步状态返回正确
   [ ] 调度器状态 = true
   [ ] 下次执行时间正确

✅ 测试5: 增量同步
   [ ] 增量同步逻辑正确
   [ ] 同步元数据更新
   [ ] 缓存数据保持

✅ 测试6: 性能对比
   [ ] 平均响应 < 100ms
   [ ] 性能稳定
   [ ] 明显优于远程查询

✅ 测试7: 容错机制
   [ ] 同步失败保留数据
   [ ] 错误信息记录
   [ ] API仍然可用

✅ 测试8: 定时任务
   [ ] 调度器运行正常
   [ ] 任务配置正确
   [ ] 下次执行时间正确

✅ 测试9: 并发测试
   [ ] 无失败请求
   [ ] 响应时间可接受
   [ ] 无超时错误

✅ 测试10: 数据持久化
   [ ] 重启后数据保留
   [ ] 文件持久化正常
   [ ] API正常工作
```

---

## 快速测试脚本

将以下命令保存为 `test_all.sh` 快速运行所有测试：

```bash
#!/bin/bash

echo "=== 开始全面测试 ==="

# 测试1: 缓存初始化
echo ""
echo "测试1: 缓存数据库初始化"
if [ -f "app/static/data/stock_cache.db" ]; then
    echo "✅ 缓存文件存在"
    python -c "
from app.cache_database import engine
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
if 'stock_fundamental_screening_cache' in tables:
    print('✅ 表结构正确')
else:
    print('❌ 表结构缺失')
"
else
    echo "❌ 缓存文件不存在"
fi

# 测试2: API性能
echo ""
echo "测试2: API性能测试"
time curl -s -o /dev/null "http://localhost:8000/api/screening?page=1&page_size=20"

# 测试3: 数据完整性
echo ""
echo "测试3: 数据完整性"
python -c "
from app.cache_database import SessionLocal
from app.models import StockFundamentalScreeningCache

session = SessionLocal()
count = session.query(StockFundamentalScreeningCache).count()
print(f'缓存记录数: {count}')
if count >= 4500:
    print('✅ 数据完整')
else:
    print('❌ 数据不完整')
session.close()
"

# 测试4: 同步状态
echo ""
echo "测试4: 同步状态"
curl -s "http://localhost:8000/api/sync/status" | python -c "
import sys, json
data = json.load(sys.stdin)
sync = data['sync']
scheduler = data['scheduler']
if sync['has_data'] and scheduler['running']:
    print('✅ 同步状态正常')
else:
    print('❌ 同步状态异常')
"

echo ""
echo "=== 测试完成 ==="
```

运行：
```bash
chmod +x test_all.sh
./test_all.sh
```

---

## 测试报告模板

测试完成后，填写以下报告：

```
测试日期: __________
测试人员: __________
应用版本: v1.1.0
环境: 本地开发 / 生产环境

测试结果总结:
- 通过测试: __/10
- 失败测试: __/10
- 阻塞问题: __

问题记录:
1. ________________________________
2. ________________________________
3. ________________________________

性能数据:
- 平均响应时间: ____ms
- Top 3响应时间: ____ms
- 并发支持: __请求/秒

结论:
□ 全部通过，可以部署
□ 部分问题，需要修复
□ 需要重新测试
```

---

## 常见问题排查

### 问题1: 缓存文件未创建
**原因**: 权限问题或目录不存在
**解决**:
```bash
mkdir -p app/static/data
chmod 755 app/static/data
```

### 问题2: 同步失败
**原因**: 数据库连接失败或网络问题
**解决**:
- 检查 .env 文件配置
- 测试远程数据库连接
- 查看应用日志错误信息

### 问题3: API返回空数据
**原因**: 缓存为空或同步失败
**解决**:
- 检查 /api/sync/status
- 手动触发同步
- 查看同步错误日志

### 问题4: 响应时间慢
**原因**: 本地缓存未生效
**解决**:
- 确认使用 cache_database
- 检查是否有远程查询
- 重启应用

---

**最后更新**: 2026-01-08
**版本**: v1.0
