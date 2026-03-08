# 先信投资 - 数据驱动的投资探索

**版本**：v2.1.0
**状态**：已上线 🟢
**在线地址**：https://cicpa.fun
**GitHub**: https://github.com/zhangtron/stock_dashboard

基于FastAPI + MySQL + SQLite + Bootstrap 5构建的股票基本面选股与基金分析展示系统，支持三主题切换。

## 功能特性

### 核心功能
#### 基本面选股
- **Top 3 推荐**：综合得分前3的股票突出展示
- **多维度筛选**：股票代码、名称、综合得分范围、投资建议
- **灵活排序**：支持按任意字段排序，默认按综合得分降序
- **分页展示**：每页20条数据，快速浏览大量数据
- **快速搜索**：支持股票代码和名称搜索，实时显示建议
- **双击板块筛选**：双击板块名称即可快速筛选该板块所有股票
- **手动同步**：支持手动触发数据同步，实时获取最新数据
- **可视化展示**：
  - 得分颜色编码（≥80绿色，60-79黄色，<60红色）
  - 投资建议标签（强烈推荐/买入/持有/回避）
  - 响应式设计，支持手机/平板/桌面

#### 基金分析 🆕
- **ETF聚类选股**：基于聚类算法的ETF基金选股结果展示
- **5个聚类卡片**：每个聚类展示5只基金
- **Rank 1突出显示**：排名第一的基金居中突出展示
- **纵向列表**：其余基金纵向排列，显示代码、名称和得分
- **手动同步**：支持手动同步最新选股结果

#### 市场宽度分析
- **热力图展示**：各行业BIAS>0股票比例的时间序列热力图
- **默认60天**：默认显示最近60个交易日数据
- **全量查看**：支持查看全部历史数据
- **趋势分析**：全市场上涨家数总和的趋势图和5日均线
- **统计摘要**：日期范围、行业数量、交易日数、平均比例
- **手动同步**：支持手动同步最新市场宽度数据

### 主题系统
- **三主题支持**：Teal（默认）、Red、Dark
- **一键切换**：点击主题按钮循环切换
- **主题持久化**：主题选择保存在浏览器本地
- **自动适配**：所有页面元素自动适配当前主题
- **流畅动画**：主题切换时图标旋转360°

### 关于页面
- **网站愿景**：数据驱动的投资探索
- **核心功能**：基本面选股、基金分析、市场宽度分析
- **未来规划**：4个开发中的功能
- **数据来源**：聚宽/Tushare/AKShare
- **联系反馈**：邮箱 + GitHub
- **更新日志**：详细的版本更新记录

### 性能优化
- **本地缓存**：使用SQLite本地缓存，减少远程数据库连接
- **增量同步**：基于update_time字段实现增量数据同步
- **定时任务**：每天早上5:00自动同步最新数据
- **响应速度**：API响应时间从~300ms优化到~50ms（6倍提升）

### 技术栈
- **后端**：FastAPI 0.115.0
- **数据库**：MySQL（远程）+ SQLite（本地缓存）+ SQLAlchemy 2.0.36
- **定时任务**：APScheduler 3.10.4
- **前端**：Bootstrap 5.3.0 + Jinja2 + Bootstrap Icons
- **主题**：CSS Variables + Vanilla JavaScript
- **部署**：Zeabur（免费托管）

## 数据库配置

### 表结构：stock_fundamental_screening

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| stock_code | VARCHAR(20) | 股票代码 |
| stock_name | VARCHAR(100) | 股票名称 |
| overall_score | DECIMAL(5,2) | 综合得分 |
| growth_score | DECIMAL(5,2) | 成长能力得分 |
| profitability_score | DECIMAL(5,2) | 盈利能力得分 |
| solvency_score | DECIMAL(5,2) | 偿债能力得分 |
| cashflow_score | DECIMAL(5,2) | 现金流能力得分 |
| recommendation | VARCHAR(20) | 投资建议（STRONG_BUY/BUY/HOLD/AVOID） |
| pass_filters | TINYINT(1) | 是否通过筛选 |
| latest_quarter | DATE | 最新财报截止日期 |
| report_publ_date | DATE | 报告披露日期 |
| calc_time | DATETIME | 计算时间 |
| create_time | TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP | 更新时间 |

## 本地开发

### 环境要求
- Python 3.8+
- MySQL 5.7+

### 安装步骤

1. **克隆项目**
```bash
git clone <your-repo-url>
cd stock-dashboard
```

2. **创建虚拟环境**
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

3. **安装依赖**
```bash
pip install -r requirements.txt
```

4. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，填写数据库连接信息
```

.env 文件内容：
```env
DB_HOST=mysql.sqlpub.com
DB_PORT=3306
DB_USER=chase_zhang
DB_PASSWORD=your_database_password
DB_NAME=stock_review
APP_NAME=Stock Dashboard
APP_ENV=development
DEBUG=True
HOST=0.0.0.0
PORT=8000
```

5. **启动服务器**
```bash
uvicorn app.main:app --reload
```

6. **访问应用**
- Web页面：http://localhost:8000
- 基本面选股：http://localhost:8000/
- 基金分析：http://localhost:8000/fund-analysis
- 市场宽度：http://localhost:8000/market-breadth
- 关于页面：http://localhost:8000/about
- API文档：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

### API文档

#### 获取基本面选股数据
```
GET /api/screening
```

**查询参数：**
- `page`: 页码（默认：1）
- `page_size`: 每页数量（默认：20，最大：100）
- `stock_code`: 股票代码（模糊搜索）
- `stock_name`: 股票名称（模糊搜索）
- `min_overall_score`: 最小综合得分（0-100）
- `max_overall_score`: 最大综合得分（0-100）
- `pass_filters`: 是否通过筛选（true/false）
- `recommendation`: 投资建议（STRONG_BUY/BUY/HOLD/AVOID）
- `sort_by`: 排序字段（默认：overall_score）
- `sort_order`: 排序方向（asc/desc，默认：desc）

#### 获取ETF聚类选股数据 🆕
```
GET /api/fund-analysis/etf-clusters
```

**响应示例：**
```json
{
  "update_date": "2024-03-08",
  "clusters": [
    {
      "cluster_name": "聚类1",
      "funds": [
        {"fund_code": "159001", "fund_name": "基金1", "rank": 1, "score": 95.5},
        {"fund_code": "159002", "fund_name": "基金2", "rank": 2, "score": 90.3}
      ]
    }
  ]
}
```

#### 同步ETF聚类选股数据 🆕
```
POST /api/fund-analysis/sync
```

#### 获取市场宽度数据
```
GET /api/market-breadth
```

**查询参数：**
- `start_date`: 开始日期（可选）
- `end_date`: 结束日期（可选）
- `industries`: 行业列表，逗号分隔（可选）

#### 同步市场宽度数据
```
POST /api/market-breadth/sync
```

#### 获取同步状态
```
GET /api/sync/status
```

**响应示例：**
```json
{
  "sync": {
    "stock": {"last_sync_time": "2024-03-08T05:00:00", "has_data": true},
    "market_breadth": {"last_sync_time": "2024-03-08T05:00:00", "has_data": true},
    "etf_cluster": {"last_sync_time": "2024-03-08T05:00:00", "has_data": true}
  }
}
```

#### 手动触发数据同步
```
POST /api/sync/trigger?force=false
```

**查询参数：**
- `force`: 是否强制全量同步（true/false，默认：false）

## 部署到Zeabur

### 前置准备
1. GitHub账号
2. Zeabur账号（免费注册：https://zeabur.com）
3. 自定义域名 cicpa.fun

### 部署步骤

1. **推送代码到GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo>
git push -u origin main
```

2. **在Zeabur创建新项目**
   - 登录 https://zeabur.com
   - 点击"New Project"
   - 选择"Deploy from GitHub"
   - 授权并选择你的GitHub仓库
   - 选择"stock-dashboard"目录

3. **配置环境变量**
   在Zeabur项目设置中添加以下环境变量：
   ```
   DB_PASSWORD = your_database_password
   ```
   其他配置已在 zeabur.yaml 中预设。

4. **启动部署**
   - Zeabur会自动检测 zeabur.yaml 配置
   - 自动构建和部署
   - 部署完成后获得应用URL

5. **绑定自定义域名**
   - 在Zeabur项目设置中点击"Domains"
   - 点击"Add Custom Domain"
   - 输入域名：cicpa.fun
   - 获取DNS配置信息

6. **配置DNS**
   - 在域名服务商处添加CNAME记录：
   ```
   类型：CNAME
   主机记录：@
   记录值：<zeabur提供的CNAME>
   TTL：600
   ```

7. **验证HTTPS**
   - Zeabur会自动申请Let's Encrypt证书
   - 几分钟后访问 https://cicpa.fun 验证

### Zeabur配置说明

zeabur.yaml 文件配置了：
- Python运行环境
- 自动安装依赖（requirements.txt）
- 启动命令：`uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- 环境变量配置
- 免费套餐（512MB RAM，0.5GB存储）

## 常见问题

### 1. 数据库连接失败
- 检查 .env 文件中的数据库配置是否正确
- 确认MySQL服务是否可访问
- 检查防火墙设置

### 2. API返回空数据
- 确认数据库表中有数据
- 检查筛选条件是否过于严格
- 查看服务器日志排查错误

### 3. 部署后无法访问
- 检查Zeabur部署状态是否为"Running"
- 确认DNS配置是否正确生效
- 查看Zeabur日志排查错误

### 4. 页面样式异常
- 清除浏览器缓存
- 检查网络连接是否正常
- CDN可能需要时间加载

### 5. 性能优化建议
- 数据库已添加索引（stock_code, calc_time）
- 使用连接池（pool_size=5, max_overflow=10）
- 分页查询避免加载全部数据
- 预期响应时间：<500ms（10,000条数据）

## 项目结构

```
stock-dashboard/
├── app/
│   ├── __init__.py
│   ├── config.py              # 配置管理
│   ├── database.py            # 远程MySQL连接
│   ├── cache_database.py      # 本地SQLite缓存连接
│   ├── models.py              # SQLAlchemy模型（远程+缓存）
│   ├── schemas.py             # Pydantic schemas
│   ├── crud.py                # 数据库操作（缓存）
│   ├── data_sync.py           # 数据同步主模块
│   ├── etf_cluster_sync.py    # ETF聚类数据同步 🆕
│   ├── market_breadth_sync.py # 市场宽度数据同步
│   ├── sync_scheduler.py      # APScheduler定时任务
│   ├── main.py                # FastAPI应用入口
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── screening.py       # 基本面选股API
│   │   ├── fund_analysis.py   # 基金分析API 🆕
│   │   └── market_breadth.py  # 市场宽度API
│   └── static/
│       ├── css/
│       │   ├── variables-updated.css  # 主题变量
│       │   ├── base.css             # 基础样式
│       │   ├── layout.css           # 布局样式
│       │   ├── components.css       # 组件样式
│       │   ├── responsive.css       # 响应式样式
│       │   ├── about.css           # 关于页面样式
│       │   └── fund_analysis.css   # 基金分析样式 🆕
│       ├── js/
│       │   ├── theme.js             # 主题管理器
│       │   ├── api.js               # API 调用
│       │   ├── skeleton.js          # 骨架屏
│       │   ├── components.js        # 组件渲染
│       │   ├── events.js            # 事件处理
│       │   ├── parallax.js          # 视差效果
│       │   ├── market_breadth.js   # 市场宽度逻辑
│       │   └── fund_analysis.js    # 基金分析逻辑 🆕
│       └── templates/
│           ├── base.html            # 基础模板
│           ├── screening.html       # 基本面选股页面
│           ├── fund_analysis.html   # 基金分析页面 🆕
│           ├── market_breadth.html  # 市场宽度页面
│           └── about.html           # 关于页面
├── .env                       # 环境变量（本地用，不提交Git）
├── .env.example               # 环境变量示例
├── .gitignore                 # Git忽略文件
├── requirements.txt           # Python依赖
├── zeabur.yaml               # Zeabur部署配置
├── README.md                 # 项目文档
├── CLAUDE.md                 # Claude Code开发指南
└── reset_cache_db.py         # 重置缓存数据库脚本
```

## 开发说明

### 添加新的API端点
1. 在 `app/routers/` 目录创建新的路由文件
2. 在 `app/main.py` 中注册路由

### 添加新的页面
1. 在 `app/static/templates/` 创建新的HTML模板
2. 在 `app/main.py` 添加路由

### 数据库迁移
当前项目使用表结构已存在的数据库，不包含迁移工具。
如需修改表结构，建议使用Alembic进行迁移管理。

## 安全注意事项

1. **环境变量**：.env 文件包含敏感信息，不要提交到Git
2. **SQL注入防护**：使用SQLAlchemy ORM，已内置防护
3. **XSS防护**：前端使用Jinja2模板，自动转义输出
4. **HTTPS**：生产环境强制使用HTTPS
5. **只读访问**：API仅提供查询功能，无写操作

## 许可证

MIT License

## 联系方式

- **邮箱**: zhangtron@outlook.com
- **GitHub**: https://github.com/zhangtron/stock_dashboard
- **在线地址**: https://cicpa.fun

如有问题或建议，欢迎：
1. 提交 GitHub Issue
2. 发送邮件联系
3. 查看关于页面了解更多信息
