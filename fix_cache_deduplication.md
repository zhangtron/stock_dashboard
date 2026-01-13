# 缓存去重修复说明

## 问题描述
之前的同步逻辑基于 `id` 去重，导致相同股票的多条记录被累积存储在本地缓存中。

## 已实施的修复

### 1. models.py 修改
为 `StockFundamentalScreeningCache` 表的 `stock_code` 字段添加唯一约束：
```python
stock_code = Column(String(20), nullable=False, unique=True, index=True, comment='股票代码')
```

### 2. data_sync.py 修改
- **去重逻辑改为基于股票代码**：从 `id` 改为 `stock_code`
- **添加更新时间比较**：只有远程数据的 `update_time` 比本地新时才更新
- **优化日志输出**：区分"更新"和"跳过"记录

## 重要：数据库迁移步骤

由于添加了唯一约束，如果当前缓存表中存在重复的股票代码，应用启动时会报错。需要执行以下步骤之一：

### 方案1：强制全量同步（推荐）

1. 删除现有缓存数据库文件：
```bash
# Windows
del app\static\data\stock_cache.db

# Linux/Mac
rm app/static/data/stock_cache.db
```

2. 启动应用（会自动创建新的缓存表）：
```bash
uvicorn app.main:app --reload
```

3. 触发一次全量同步：
   - 访问 http://localhost:8000/api/sync/force-full-sync
   - 或等待自动调度器执行全量同步

### 方案2：清理重复数据（保留现有数据）

如果不想删除整个缓存数据库，可以手动清理重复数据：

```python
# 创建临时清理脚本 clean_duplicates.py
from app.cache_database import SessionLocal, engine, Base
from app.models import StockFundamentalScreeningCache

# 1. 备份数据（可选）
# 2. 删除旧表，重新创建（会清空所有数据）
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
```

## 验证修复效果

### 1. 检查缓存数据量
同步后，检查每个股票代码是否只有一条记录：

```python
from app.cache_database import SessionLocal
from app.models import StockFundamentalScreeningCache
from sqlalchemy import func

db = SessionLocal()
try:
    # 检查是否有重复的股票代码
    duplicates = db.query(
        StockFundamentalScreeningCache.stock_code,
        func.count(StockFundamentalScreeningCache.stock_code).label('count')
    ).group_by(
        StockFundamentalScreeningCache.stock_code
    ).having(
        func.count(StockFundamentalScreeningCache.stock_code) > 1
    ).all()
    
    if duplicates:
        print(f"发现 {len(duplicates)} 个重复的股票代码")
    else:
        print("✅ 没有重复数据，修复成功")
finally:
    db.close()
```

### 2. 使用测试脚本验证
```bash
python test_cache.py
```

### 3. 检查日志
观察同步日志，应该看到：
- "新增记录" - 只在首次同步时出现
- "更新记录" - 当远程数据更新时出现
- "跳过记录（数据未更新）" - 当数据未变化时出现

## 预期效果

修复后的行为：
1. **全量同步**：清空缓存表，从远程拉取所有数据，每个股票代码只保留最新的一条
2. **增量同步**：只同步 `update_time` 大于上次同步时间的数据，根据股票代码去重
3. **数据一致性**：确保每个股票代码在缓存表中只有一条记录

## 监控指标

- 本地缓存记录数应该 ≤ 远程数据库记录数
- 不应该出现相同股票代码的多条记录
- 同步后 `cache_count` 应该等于实际股票数量
