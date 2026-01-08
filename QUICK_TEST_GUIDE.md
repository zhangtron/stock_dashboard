# 快速测试指南

本文档提供快速验证SQLite缓存和数据同步功能的步骤。

---

## 🚀 快速开始（5分钟）

### 方法1：使用自动化测试脚本（推荐）

#### Windows用户
```bash
# 1. 启动应用
uvicorn app.main:app --reload

# 2. 新开一个终端，运行测试
test_quick.bat

# 或者运行Python测试
python test_cache.py

# 或者运行性能测试
python test_performance.py
```

#### Linux/Mac用户
```bash
# 1. 启动应用
uvicorn app.main:app --reload

# 2. 新开一个终端，运行测试
python test_cache.py

# 或者运行性能测试
python test_performance.py
```

---

### 方法2：手动验证核心功能（10分钟）

#### 步骤1：验证缓存文件创建
```bash
# 检查缓存文件是否存在
ls -lh app/static/data/stock_cache.db

# Windows:
dir app\static\data\stock_cache.db

# 应该看到约1MB的文件
```

#### 步骤2：验证数据同步
```bash
# 查看同步状态
curl -s "http://localhost:8000/api/sync/status" | python -m json.tool

# 关键检查项：
# - sync.has_data = true
# - sync.record_count ≈ 4583
# - sync.sync_status = success
# - scheduler.running = true
```

#### 步骤3：验证API从缓存读取
```bash
# 测试基本查询
time curl -s "http://localhost:8000/api/screening?page=1&page_size=20"

# 响应时间应该 < 300ms
# 返回的数据应该有 20 条记录
```

#### 步骤4：验证数据完整性
```bash
# 检查Top 3数据
curl -s "http://localhost:8000/api/screening?page=1&page_size=5" | python -c "
import json, sys
data = json.load(sys.stdin)
print('Top 3:')
for i, stock in enumerate(data['top3'], 1):
    print(f'  {i}. {stock[\"stock_name\"]} - {stock[\"overall_score\"]}')
"

# 应该看到兴齐眼药、药明康德、四川黄金
```

---

## 📋 完整测试清单

使用此清单确认所有功能正常：

### 基础功能 ✅

- [ ] **应用启动**
  - [ ] 无错误日志
  - [ ] 显示"初始化本地缓存数据库..."
  - [ ] 显示"定时任务调度器启动成功"

- [ ] **缓存数据库**
  - [ ] 文件创建成功 (app/static/data/stock_cache.db)
  - [ ] 文件大小约1MB
  - [ ] 表结构正确

- [ ] **数据同步**
  - [ ] 首次启动执行全量同步
  - [ ] 同步成功 (4583条记录)
  - [ ] 同步状态 = success
  - [ ] 有错误时保留上一次数据

- [ ] **定时任务**
  - [ ] 调度器运行状态 = true
  - [ ] 有1个任务 (daily_data_sync)
  - [ ] 下次执行时间 = 明天5:00

### API功能 ✅

- [ ] **基本查询**
  - [ ] GET /api/screening 正常返回数据
  - [ ] 响应时间 < 300ms
  - [ ] 返回20条记录
  - [ ] total = 4583

- [ ] **Top 3查询**
  - [ ] top3数组有3条记录
  - [ ] 排序按overall_score降序
  - [ ] 得分最高的在第一位

- [ ] **筛选功能**
  - [ ] recommendation=STRONG_BUY 只返回推荐股票
  - [ ] min_overall_score=80 只返回高分股票
  - [ ] max_overall_score=60 只返回低分股票

- [ ] **搜索功能**
  - [ ] stock_name=银行 返回银行相关股票
  - [ ] stock_code=300573 返回对应股票
  - [ ] 支持模糊搜索

- [ ] **分页功能**
  - [ ] page参数正常工作
  - [ ] page_size参数正常工作
  - [ ] total_pages计算正确

- [ ] **排序功能**
  - [ ] sort_by参数正常工作
  - [ ] sort_order=asc 升序
  - [ ] sort_order=desc 降序

### 监控API ✅

- [ ] **健康检查**
  - [ ] GET /health 返回healthy
  - [ ] database = connected

- [ ] **同步状态**
  - [ ] GET /api/sync/status 正常返回
  - [ ] 同步信息完整
  - [ ] 调度器信息完整

### 性能指标 ✅

- [ ] **响应时间**
  - [ ] 基本查询 < 300ms
  - [ ] Top 3查询 < 300ms
  - [ ] 筛选查询 < 300ms
  - [ ] 搜索查询 < 300ms

- [ ] **数据一致性**
  - [ ] 缓存记录数 = 同步记录数
  - [ ] Top 3排序正确
  - [ ] 所有字段完整

- [ ] **稳定性**
  - [ ] 多次查询结果一致
  - [ ] 无超时错误
  - [ ] 无数据库错误

---

## 🔍 常见问题排查

### 问题1: 应用启动失败

**症状**: 启动时报错，无法连接

**检查步骤**:
```bash
# 1. 检查Python版本
python --version  # 需要 3.8+

# 2. 检查依赖包
pip list | grep -E "(fastapi|sqlalchemy|apscheduler)"

# 3. 查看详细错误
uvicorn app.main:app
```

**解决方案**:
- 安装缺失的依赖: `pip install -r requirements.txt`
- 升级Python版本: `python.org/downloads`
- 检查.env文件配置

---

### 问题2: 缓存文件未创建

**症状**: app/static/data/stock_cache.db 不存在

**检查步骤**:
```bash
# 1. 检查目录权限
ls -ld app/static/data/

# 2. 检查应用日志
# 查看是否有"本地缓存数据库表结构初始化完成"

# 3. 检查.env配置
cat .env | grep DEBUG
```

**解决方案**:
- 创建目录: `mkdir -p app/static/data`
- 检查权限: `chmod 755 app/static/data`
- 设置DEBUG=True查看详细日志

---

### 问题3: 数据同步失败

**症状**: 同步状态显示 failed，或记录数为0

**检查步骤**:
```bash
# 1. 检查远程数据库连接
python -c "
from app.database import engine
try:
    with engine.connect() as conn:
        conn.execute('SELECT 1')
    print('✅ 远程数据库连接成功')
except Exception as e:
    print(f'❌ 远程数据库连接失败: {e}')
"

# 2. 查看同步状态
curl -s "http://localhost:8000/api/sync/status" | python -c "
import json, sys
data = json.load(sys.stdin)
print('同步状态:', data['sync']['sync_status'])
print('错误信息:', data['sync']['error_message'])
"
```

**解决方案**:
- 检查.env文件中的数据库密码
- 测试远程数据库连接: `mysql -h mysql.sqlpub.com -u chase_zhang -p`
- 查看应用日志中的详细错误
- 确认远程数据库有数据

---

### 问题4: API响应慢

**症状**: 响应时间 > 500ms

**检查步骤**:
```bash
# 1. 测试基本API
time curl -s "http://localhost:8000/api/screening?page=1&page_size=20"

# 2. 测试健康检查
time curl -s "http://localhost:8000/health"

# 3. 检查缓存是否使用
# 查看日志，应该有 SQLite 查询，而不是 MySQL 查询
```

**解决方案**:
- 确认使用的是 get_cache_db() 而不是 get_db()
- 检查是否有远程查询混入
- 重启应用清理连接池
- 考虑增加SQLite连接池大小

---

### 问题5: 定时任务不执行

**症状**: 每天早上5:00没有自动同步

**检查步骤**:
```bash
# 1. 查看调度器状态
curl -s "http://localhost:8000/api/sync/status" | python -c "
import json, sys
data = json.load(sys.stdin)
print('调度器运行:', data['scheduler']['running'])
print('下次执行:', data['scheduler']['jobs'][0]['next_run_time'])
"

# 2. 查看应用日志
# 应该看到 "定时任务调度器启动成功"
```

**解决方案**:
- 确认应用启动时没有错误
- 检查时区设置（默认为UTC+8）
- 手动触发同步测试: `python -c "from app.data_sync import sync_data_from_remote; sync_data_from_remote()"`
- 查看APScheduler日志

---

## 📊 性能基准测试

### 标准测试流程

```bash
# 1. 停止所有应用和测试
taskkill /F /IM python.exe  # Windows
killall python              # Linux/Mac

# 2. 清理旧缓存
rm -f app/static/data/stock_cache.db

# 3. 启动应用（首次同步）
uvicorn app.main:app

# 4. 等待同步完成（约5-10秒）
# 等待日志显示 "首次同步完成"

# 5. 运行性能测试
python test_performance.py

# 6. 记录结果
# 保存测试报告
```

### 预期性能指标

| 查询类型 | 预期时间 | 可接受时间 | 需优化 |
|---------|---------|-----------|--------|
| 基本查询 | < 50ms | < 100ms | > 200ms |
| Top 3查询 | < 30ms | < 50ms | > 100ms |
| 筛选查询 | < 50ms | < 100ms | > 200ms |
| 搜索查询 | < 80ms | < 150ms | > 300ms |

### 性能对比

| 版本 | 远程查询 | 本地缓存 | 提升 |
|------|---------|---------|------|
| v1.0.0 | ~300ms | - | - |
| v1.1.0 | - | ~50ms | **6倍** |

---

## 🎯 验收标准

### 必须满足（P0）

- [ ] 应用正常启动，无错误
- [ ] 缓存文件创建成功
- [ ] 首次同步成功，数据完整
- [ ] 所有API功能正常
- [ ] 响应时间 < 300ms

### 应该满足（P1）

- [ ] 定时任务正常运行
- [ ] 同步失败容错机制正常
- [ ] 监控API工作正常
- [ ] 响应时间 < 100ms

### 最好满足（P2）

- [ ] 响应时间 < 50ms
- [ ] 有完整的测试报告
- [ ] 性能测试自动化
- [ ] 监控数据可视化

---

## 📝 测试报告模板

```markdown
# 测试报告

**测试日期**: __________
**测试人员**: __________
**应用版本**: v1.1.0
**测试环境**: 本地开发 / 生产环境

## 测试结果

| 测试项 | 状态 | 备注 |
|-------|------|------|
| 应用启动 | ☐ 通过 / ☐ 失败 | |
| 缓存创建 | ☐ 通过 / ☐ 失败 | |
| 数据同步 | ☐ 通过 / ☐ 失败 | |
| API功能 | ☐ 通过 / ☐ 失败 | |
| 定时任务 | ☐ 通过 / ☐ 失败 | |
| 性能测试 | ☐ 通过 / ☐ 失败 | |

## 性能数据

- 平均响应时间: ____ms
- Top 3响应时间: ____ms
- 并发支持: ____请求/秒
- 性能评级: ☐ 优秀 / ☐ 良好 / ☐ 一般 / ☐ 需优化

## 问题记录

1. ________________________________
2. ________________________________
3. ________________________________

## 结论

☐ **通过** - 可以部署
☐ **有条件通过** - 需要修复后部署
☐ **不通过** - 需要重新测试
```

---

## 🚀 部署检查清单

在部署到生产环境前，确认：

### 代码检查
- [ ] 所有测试通过
- [ ] 代码已提交到Git
- [ ] 分支已推送到远程
- [ ] 标签已创建 (v1.1.0)

### 环境检查
- [ ] requirements.txt 已更新
- [ ] .gitignore 包含缓存文件
- [ ] zeabur.yaml 配置正确
- [ ] 环境变量已配置

### 功能检查
- [ ] 应用启动正常
- [ ] 数据同步成功
- [ ] API功能正常
- [ ] 定时任务正常

### 文档检查
- [ ] README.md 已更新
- [ ] PROJECT_STATUS.md 已更新
- [ ] TODO.md 已更新
- [ ] 测试文档完整

---

## 💡 快速提示

### 快速验证命令

```bash
# 一键检查所有关键指标
curl -s "http://localhost:8000/api/sync/status" | python -c "
import json, sys
d = json.load(sys.stdin)

print('=== 关键指标 ===')
print('✅' if d['sync']['has_data'] else '❌', '缓存数据:', d['sync']['cache_count'])
print('✅' if d['sync']['sync_status'] == 'success' else '❌', '同步状态:', d['sync']['sync_status'])
print('✅' if d['scheduler']['running'] else '❌', '调度器:', d['scheduler']['running'])
"

# 快速性能测试
for i in {1..5}; do
  time curl -s -o /dev/null "http://localhost:8000/api/screening?page=1&page_size=20"
done
```

### 快速测试Top 3
```bash
curl -s "http://localhost:8000/api/screening?page=1&page_size=5" | python -c "
import json, sys
d = json.load(sys.stdin)
for s in d['top3']:
    print(f'{s[\"stock_name\"]}: {s[\"overall_score\"]} - {s[\"recommendation\"]}')
"
```

### 快速检查同步日志
```bash
# 查看最近10行应用日志
tail -10 server.log | grep -E "(同步|缓存|调度)"
```

---

**文档版本**: v1.0
**最后更新**: 2026-01-08
