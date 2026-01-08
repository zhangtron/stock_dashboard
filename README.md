# 股票基本面选股数据看板

基于FastAPI + MySQL + Bootstrap 5构建的股票基本面选股数据展示系统。

## 功能特性

### 核心功能
- **Top 3 推荐**：综合得分前3的股票突出展示
- **多维度筛选**：股票代码、名称、综合得分范围、投资建议
- **灵活排序**：支持按任意字段排序，默认按综合得分降序
- **分页展示**：每页20条数据，快速浏览大量数据
- **可视化展示**：
  - 得分颜色编码（≥80绿色，60-79黄色，<60红色）
  - 投资建议标签（强烈推荐/买入/持有/回避）
  - 响应式设计，支持手机/平板/桌面

### 技术栈
- **后端**：FastAPI 0.104.1
- **数据库**：MySQL + SQLAlchemy 2.0.23
- **前端**：Bootstrap 5.3.0 + Jinja2
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
- API文档：http://localhost:8000/docs
- API端点：http://localhost:8000/api/screening

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

**响应示例：**
```json
{
  "top3": [
    {
      "id": 1,
      "stock_code": "000001",
      "stock_name": "平安银行",
      "overall_score": 95.6,
      "growth_score": 92.5,
      "profitability_score": 96.8,
      "solvency_score": 94.2,
      "cashflow_score": 93.5,
      "recommendation": "STRONG_BUY",
      "pass_filters": true,
      "calc_time": "2025-01-07T10:30:00"
    }
  ],
  "data": [...],
  "total": 5000,
  "page": 1,
  "page_size": 20,
  "total_pages": 250
}
```

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
│   ├── database.py            # 数据库连接
│   ├── models.py              # SQLAlchemy模型
│   ├── schemas.py             # Pydantic schemas
│   ├── crud.py                # 数据库操作
│   ├── main.py                # FastAPI应用入口
│   ├── routers/
│   │   ├── __init__.py
│   │   └── screening.py       # 基本面选股API
│   └── static/
│       └── templates/
│           ├── base.html      # 基础模板
│           └── screening.html # 基本面选股页面
├── .env                       # 环境变量（本地用，不提交Git）
├── .env.example               # 环境变量示例
├── .gitignore                 # Git忽略文件
├── requirements.txt           # Python依赖
├── zeabur.yaml               # Zeabur部署配置
└── README.md                 # 项目文档
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

如有问题，请提交Issue或联系项目维护者。
