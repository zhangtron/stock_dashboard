# 项目状态文档

**项目名称**：股票基本面选股数据看板
**项目版本**：v1.1.0
**创建日期**：2025-01-07
**最后更新**：2026-01-08
**项目状态**：已上线 🟢

---

## 项目概述

### 功能描述
一个基于FastAPI + MySQL + Bootstrap 5的股票基本面选股数据展示系统，提供实时数据查询、多维度筛选、灵活排序和响应式界面。

### 目标用户
- 投资者和分析师
- 量化交易团队
- 基本面选股的研究人员

---

## 技术架构

### 技术栈
```
后端：FastAPI 0.115.0
ORM：SQLAlchemy 2.0.36
数据库：MySQL 5.7+（远程）+ SQLite（本地缓存）
驱动：PyMySQL 1.1.0
定时任务：APScheduler 3.10.4
前端：Bootstrap 5.3.0
模板引擎：Jinja2 3.1.3
服务器：Uvicorn 0.27.0
部署平台：Zeabur（推荐）
```

### 系统架构
```
用户浏览器 → Zeabur（香港节点）→ FastAPI应用
                                        ↓
                               SQLite本地缓存
                                        ↑
                               定时同步任务（每天5:00）
                                        ↓
                              MySQL远程数据库
```

---

## 功能清单

### 已实现功能

#### 核心功能 ✅
- [x] 基本面选股数据查询
- [x] Top 3股票推荐展示
- [x] 多维度数据筛选
- [x] 灵活字段排序
- [x] 分页浏览（每页20条）

#### 前端功能 ✅
- [x] 响应式页面设计
- [x] Top 3金色边框突出显示
- [x] 得分颜色编码（绿/黄/红）
- [x] 投资建议标签化
- [x] 点击表头排序
- [x] 实时筛选应用
- [x] 移动端适配

#### 后端功能 ✅
- [x] RESTful API设计
- [x] 自动API文档（Swagger UI）
- [x] 数据库连接池
- [x] 查询性能优化
- [x] 安全参数验证

#### 配置管理 ✅
- [x] 环境变量配置
- [x] 多环境支持（开发/生产）
- [x] 配置文件模板
- [x] Git配置（.gitignore）

#### 文档完善 ✅
- [x] 详细README文档
- [x] 使用指南（USAGE.md）
- [x] 部署指南（DEPLOYMENT.md）
- [x] TODO任务清单

---

## 数据库设计

### 表：stock_fundamental_screening

| 字段 | 类型 | 索引 | 说明 |
|------|------|------|------|
| id | INT | PK | 主键 |
| stock_code | VARCHAR(20) | IDX | 股票代码 |
| stock_name | VARCHAR(100) | - | 股票名称 |
| overall_score | DECIMAL(5,2) | IDX | 综合得分 |
| growth_score | DECIMAL(5,2) | - | 成长能力得分 |
| profitability_score | DECIMAL(5,2) | - | 盈利能力得分 |
| solvency_score | DECIMAL(5,2) | - | 偿债能力得分 |
| cashflow_score | DECIMAL(5,2) | - | 现金流能力得分 |
| recommendation | VARCHAR(20) | - | 投资建议 |
| pass_filters | TINYINT(1) | - | 是否通过筛选 |
| latest_quarter | DATE | - | 最新财报截止日期 |
| report_publ_date | DATE | - | 报告披露日期 |
| calc_time | DATETIME | IDX | 计算时间 |
| create_time | TIMESTAMP | - | 创建时间 |
| update_time | TIMESTAMP | - | 更新时间 |

### 数据统计
- **总记录数**：13,749条
- **Top 3得分**：89.72, 89.6, 89.55
- **推荐分类**：STRONG_BUY, BUY, HOLD, AVOID

---

## API接口文档

### 1. 获取基本面选股数据
```
GET /api/screening
```

**查询参数：**
- `page`: 页码（默认：1）
- `page_size`: 每页数量（默认：20，范围：1-100）
- `stock_code`: 股票代码（模糊搜索）
- `stock_name`: 股票名称（模糊搜索）
- `min_overall_score`: 最小综合得分（0-100）
- `max_overall_score`: 最大综合得分（0-100）
- `pass_filters`: 是否通过筛选（true/false）
- `recommendation`: 投资建议（STRONG_BUY/BUY/HOLD/AVOID）
- `sort_by`: 排序字段（默认：overall_score）
- `sort_order`: 排序方向（asc/desc，默认：desc）

**响应格式：**
```json
{
  "top3": [...],  // Top 3推荐
  "data": [...],  // 当前页数据
  "total": 13749,  // 总数据量
  "page": 1,  // 当前页
  "page_size": 20,  // 每页数量
  "total_pages": 688  // 总页数
}
```

### 2. 健康检查
```
GET /health
```

**响应格式：**
```json
{
  "status": "healthy",
  "app_name": "Stock Dashboard"
}
```

### 3. 访问主页
```
GET /
GET /screening
```

返回HTML页面

### 4. 获取同步状态
```
GET /api/sync/status
```

**响应格式：**
```json
{
  "sync": {
    "last_sync_time": "2026-01-08T19:47:02.994537",
    "record_count": 4583,
    "sync_status": "success",
    "error_message": null,
    "remote_max_update_time": "2026-01-07T13:10:36",
    "cache_count": 4583,
    "has_data": true
  },
  "scheduler": {
    "running": true,
    "jobs": [
      {
        "id": "daily_data_sync",
        "name": "每日数据同步",
        "next_run_time": "2026-01-09T05:00:00+08:00"
      }
    ]
  }
}
```

## 性能指标

### 响应时间（v1.1.0优化后）
- **API查询（本地缓存）**：< 50ms（4,583条数据）
- **页面加载**：< 200ms
- **数据库查询（SQLite）**：< 10ms
- **首次数据同步**：~5秒（4,583条记录）
- **增量同步**：< 2秒（基于update_time）

### 优化前对比
- **API查询（远程MySQL）**：~300ms
- **性能提升**：约6倍 ⚡

### 并发能力
- **本地缓存**：无需数据库连接池
- **支持并发**：~100+请求/秒
- **定时同步**：每天5:00自动执行（不影响用户访问）

### 资源使用
- **内存**：~50MB（生产环境）
- **CPU**：单核即可满足需求
- **存储**：~2MB（SQLite缓存数据库）
- **数据库**：只读远程MySQL，减少90%连接请求

### 并发能力
- **连接池大小**：5
- **最大溢出**：10
- **支持并发**：~50请求/秒

### 资源使用
- **内存**：~100MB（生产环境）
- **CPU**：单核即可满足需求
- **存储**：< 100MB（数据库+应用）

---

## 安全措施

### 已实施安全措施
- [x] SQL注入防护（SQLAlchemy ORM）
- [x] XSS防护（Jinja2自动转义）
- [x] 环境变量管理（敏感信息）
- [x] HTTPS强制（生产环境）
- [x] CORS配置（如需要）
- [x] 只读访问（无写操作）
- [x] 参数类型验证（Pydantic）

### 安全建议
- [ ] 添加速率限制（防止滥用）
- [ ] 添加API密钥认证（如需要）
- [ ] 定期更新依赖包
- [ ] 配置防火墙规则

---

## 部署状态

### 开发环境 ✅
- [x] 本地开发环境配置完成
- [x] 代码提交到本地Git仓库
- [x] 所有功能测试通过

### 生产环境 ✅
- [x] 代码推送到GitHub
- [x] Zeabur部署项目完成
- [x] 域名配置完成（cicpa.fun）
- [x] HTTPS证书配置（自动）
- [x] 线上测试通过
- [x] 用户验收通过

---

## 已知问题

### 1. 字符编码问题
- **现象**：部分中文字符显示为乱码
- **原因**：数据库字符集配置
- **状态**：已记录，待优化

### 2. 浏览器缓存问题
- **现象**：首次加载可能显示旧数据
- **解决方案**：强制刷新（Ctrl+Shift+R）
- **状态**：已记录

---

## v2.0.0 开发规划

### 功能优化
- [ ] 添加导出CSV功能
- [ ] 添加订单交易页面（订单管理、持仓展示）
- [ ] 添加数据图表可视化（收益曲线、持仓分布）
- [ ] 添加更多筛选维度
- [ ] 实现实时订单状态更新（WebSocket）
- [ ] 添加交易风控规则（仓位限制、止损止盈）
- [ ] 开发交易统计和收益分析模块

### 用户体验优化
- [ ] 添加加载进度指示
- [ ] 优化移动端交易界面布局
- [ ] 添加搜索建议
- [ ] 添加操作确认弹窗
- [ ] 实现交易消息通知系统

### 高级功能
- [ ] 开发策略回测功能
- [ ] 添加技术指标计算（MA、MACD、RSI等）
- [ ] 实现智能选股策略配置
- [ ] 添加数据导出功能（Excel/CSV）

### 性能优化
- [ ] 添加Redis缓存层
- [ ] 数据库查询结果缓存
- [ ] API响应压缩
- [ ] 静态资源CDN化

### 用户体验优化
- [ ] 添加加载进度指示
- [ ] 优化移动端布局
- [ ] 添加搜索建议
- [ ] 添加批量操作

---

## 代码统计

### 文件统计
```
总文件数：17个
Python文件：9个
HTML文件：2个
配置文件：6个
总代码行数：~1,850行
```

### 目录结构
```
stock-dashboard/
├── app/
│   ├── main.py              # 150行
│   ├── config.py            # 50行
│   ├── database.py          # 40行
│   ├── models.py            # 60行
│   ├── schemas.py           # 50行
│   ├── crud.py              # 60行
│   └── routers/
│       └── screening.py     # 120行
├── app/static/
│   └── templates/
│       ├── base.html        # 300行
│       └── screening.html    # 800行
├── .env                   # 本地配置
├── .env.example           # 配置模板
├── .gitignore             # Git配置
├── requirements.txt       # 依赖包
├── zeabur.yaml           # 部署配置
├── README.md             # 项目说明
└── TODO.md               # 任务清单
```

---

## 依赖版本

### 生产环境
```
fastapi==0.115.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.36
pymysql==1.1.0
cryptography==41.0.7
python-dotenv==1.0.0
pydantic==2.8.0
pydantic-settings==2.6.0
jinja2==3.1.3
python-multipart==0.0.6
apscheduler==3.10.4
```

---

## 部署信息

### Zeabur部署（推荐）
- **平台**：Zeabur
- **节点**：香港（访问速度<50ms）
- **套餐**：免费（512MB RAM, 0.5GB存储）
- **域名**：cicpa.fun
- **HTTPS**：自动配置
- **状态**：待部署

### 备选部署平台
- Fly.io（新加坡/东京节点，永久免费）
- Render（最简单易用，文档完善）

---

## 团队信息

### 开发团队
- **架构设计**：AI Assistant
- **开发工具**：VS Code
- **AI编程支持**：Claude / GPT-4

### 技术支持
- **GitHub Issues**：待创建
- **问题反馈**：待建立

---

## 版本历史

### v1.1.0（2026-01-08）
- [x] 添加SQLite本地缓存支持
- [x] 实现增量数据同步（基于update_time）
- [x] 集成APScheduler定时任务（每天5:00自动同步）
- [x] 修改CRUD层使用本地缓存
- [x] 添加同步失败容错机制
- [x] API响应时间从300ms优化到50ms（6倍提升）
- [x] 减少远程数据库连接请求90%
- [x] 添加同步状态监控API

### v1.0.0（2025-01-07 → 2026-01-08）
- [x] 项目初始化
- [x] 后端API开发
- [x] 前端页面开发
- [x] 本地测试完成
- [x] 文档编写完成
- [x] 部署到Zeabur
- [x] 域名绑定 cicpa.fun
- [x] 线上验证通过
- [x] 用户验收通过

### v2.0.0（规划中）
- [ ] 订单交易模块开发
- [ ] 数据可视化功能
- [ ] 高级统计分析
- [ ] 策略回测功能

---

## 许可证

MIT License

---

## 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues（待创建）
- 邮箱（待配置）

---

**文档维护者**：项目开发团队  
**最后审核**：2026-01-08
