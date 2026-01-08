# 股票基本面选股数据看板 - 使用文档

## 目录
1. [快速开始](#快速开始)
2. [本地开发](#本地开发)
3. [API文档](#api文档)
4. [部署指南](#部署指南)
5. [常见问题](#常见问题)

---

## 快速开始

### 环境要求
- Python 3.8+
- MySQL 5.7+
- pip（Python包管理器）

### 快速启动（3分钟）

1. **克隆项目**
```bash
git clone <your-repo-url>
cd stock-dashboard
```

2. **安装依赖**
```bash
pip install -r requirements.txt
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑.env文件，填写数据库信息
```

4. **启动服务器**
```bash
uvicorn app.main:app --reload
```

5. **访问应用**
- Web页面：http://localhost:8000
- API文档：http://localhost:8000/docs

---

## 本地开发

### 项目结构
```
stock-dashboard/
├── app/
│   ├── main.py              # FastAPI应用入口
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── models.py            # SQLAlchemy模型
│   ├── schemas.py           # Pydantic schemas
│   ├── crud.py              # 数据库操作
│   ├── routers/
│   │   ├── screening.py     # 基本面选股API
│   │   └── __init__.py
│   └── static/
│       └── templates/
│           ├── base.html      # 基础模板
│           └── screening.html # 主页面
├── .env                   # 环境变量（不提交Git）
├── .env.example           # 环境变量示例
├── .gitignore             # Git忽略文件
├── requirements.txt       # Python依赖
├── zeabur.yaml           # Zeabur部署配置
└── README.md             # 项目说明
```

### 环境变量配置

`.env` 文件内容：
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

### 启动命令

**开发模式（自动重载）**
```bash
uvicorn app.main:app --reload
```

**生产模式**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**指定host和端口**
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

### 虚拟环境（推荐）

**Windows**
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**Linux/Mac**
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## API文档

### 自动生成文档

启动服务器后，访问：
- Swagger UI：http://localhost:8000/docs
- ReDoc：http://localhost:8000/redoc

### API端点

#### 1. 获取基本面选股数据
```
GET /api/screening
```

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码（≥1） |
| page_size | int | 20 | 每页数量（1-100） |
| stock_code | string | null | 股票代码（模糊搜索） |
| stock_name | string | null | 股票名称（模糊搜索） |
| min_overall_score | float | null | 最小综合得分（0-100） |
| max_overall_score | float | null | 最大综合得分（0-100） |
| pass_filters | bool | null | 是否通过筛选 |
| recommendation | string | null | 投资建议（STRONG_BUY/BUY/HOLD/AVOID） |
| sort_by | string | overall_score | 排序字段 |
| sort_order | string | desc | 排序方向（asc/desc） |

**响应格式：**
```json
{
  "top3": [
    {
      "id": 1,
      "stock_code": "300573.SZ",
      "stock_name": "股票名称",
      "overall_score": 89.72,
      "growth_score": 100.0,
      "profitability_score": 100.0,
      "solvency_score": 99.37,
      "cashflow_score": 32.3,
      "recommendation": "STRONG_BUY",
      "pass_filters": true,
      "calc_time": "2026-01-07T13:09:13"
    }
  ],
  "data": [...],
  "total": 13749,
  "page": 1,
  "page_size": 20,
  "total_pages": 688
}
```

#### 2. 健康检查
```
GET /health
```

**响应：**
```json
{
  "status": "healthy",
  "app_name": "Stock Dashboard"
}
```

---

## 部署指南

### Zeabur部署（推荐）

#### 1. 推送代码到GitHub
```bash
cd stock-dashboard
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo>
git push -u origin main
```

#### 2. 在Zeabur创建项目
1. 访问 https://zeabur.com 并登录
2. 点击"New Project"
3. 选择"Deploy from GitHub"
4. 授权并选择你的GitHub仓库
5. 选择`stock-dashboard`目录

#### 3. 配置环境变量
在Zeabur项目设置中添加：
```
DB_PASSWORD = your_database_password
```

#### 4. 部署项目
Zeabur会自动：
- 检测`zeabur.yaml`配置
- 安装依赖（`pip install -r requirements.txt`）
- 启动服务（`uvicorn app.main:app`）
- 分配应用URL

#### 5. 绑定自定义域名
1. 在Zeabur项目设置 → Domains
2. 点击"Add Custom Domain"
3. 输入：cicpa.fun
4. 获取DNS配置信息

#### 6. 配置DNS
在域名服务商处添加CNAME记录：
```
类型：CNAME
主机记录：@
记录值：<zeabur提供的CNAME>
TTL：600
```

#### 7. 验证HTTPS
Zeabur会自动申请Let's Encrypt证书，几分钟后生效。

---

## 常见问题

### 1. 数据库连接失败
```
错误：pymysql.err.OperationalError: (2003, 'Can't connect to MySQL server')

解决方案：
1. 检查.env文件中的数据库配置
2. 确认MySQL服务是否可访问
3. 检查防火墙设置
4. 测试连接：mysql -h mysql.sqlpub.com -u chase_zhang -p
```

### 2. 依赖安装失败
```
错误：ModuleNotFoundError: No module named 'fastapi'

解决方案：
1. 确认虚拟环境已激活
2. 重新安装依赖：
   pip install --upgrade pip
   pip install -r requirements.txt
```

### 3. 端口被占用
```
错误：[Errno 48] Address already in use

解决方案：
1. 查找占用端口的进程：
   Windows: netstat -ano | findstr :8000
   Linux/Mac: lsof -i :8000
2. 杀死进程
3. 使用其他端口启动：uvicorn app.main:app --port 8001
```

### 4. API返回422错误
```
错误：422 Unprocessable Entity

原因：参数类型不匹配（如空字符串传给了数字类型）

解决方案：
已在代码中修复，确保空参数被转换为None。
```

### 5. 前端缓存问题
```
现象：页面不显示最新数据

解决方案：
1. 强制刷新：Ctrl + Shift + R
2. 清除浏览器缓存：F12 → Application → Clear storage
3. 隐身模式测试：Ctrl + Shift + N
```

### 6. 字符编码问题
```
现象：中文字符显示为乱码

解决方案：
1. 数据库表使用utf8mb4字符集
2. 确保连接字符串包含charset参数：
   mysql+pymysql://user:pass@host/db?charset=utf8mb4
3. 前端HTML设置正确的meta标签：
   <meta charset="UTF-8">
```

### 7. CORS错误
```
错误：Access to XMLHttpRequest blocked by CORS policy

解决方案：
1. 安装fastapi-cors中间件：
   pip install fastapi-cors
2. 在main.py中添加：
   from fastapi.middleware.cors import CORSMiddleware
   app.add_middleware(CORSMiddleware, allow_origins=["*"])
```

---

## 开发技巧

### 1. 热重载开发模式
使用`--reload`参数，代码修改后自动重启：
```bash
uvicorn app.main:app --reload --reload-dir app
```

### 2. 查看SQL语句
在config.py中设置DEBUG=True，数据库操作会打印到控制台：
```python
engine = create_engine(settings.DATABASE_URL, echo=True)
```

### 3. 使用IPython调试
```bash
pip install ipython
ipython
# 在IPython中：
from app.models import StockFundamentalScreening
from app.database import SessionLocal
session = SessionLocal()
stocks = session.query(StockFundamentalScreening).all()
```

### 4. 测试API
使用curl或httpie：
```bash
# 测试健康检查
curl http://localhost:8000/health

# 测试筛选
curl "http://localhost:8000/api/screening?page=1&page_size=5&min_overall_score=80"

# 使用httpie
http GET "localhost:8000/api/screening?page=1&recommendation=STRONG_BUY"
```

### 5. 性能分析
使用FastAPI的性能分析工具：
```python
# 在启动时添加--reload参数
uvicorn app.main:app --reload

# 使用Python的cProfile分析
python -m cProfile -s timeit -o profile.stats app.main:app
```

---

## 数据库操作

### 查询示例
```python
from app.database import SessionLocal
from app.models import StockFundamentalScreening

session = SessionLocal()

# 查询Top 3
top3 = session.query(StockFundamentalScreening)\
    .order_by(StockFundamentalScreening.overall_score.desc())\
    .limit(3)\
    .all()

# 筛选查询
stocks = session.query(StockFundamentalScreening)\
    .filter(StockFundamentalScreening.overall_score >= 80)\
    .filter(StockFundamentalScreening.recommendation == 'STRONG_BUY')\
    .all()

session.close()
```

### 索引优化
已在数据库表中添加索引：
- stock_code：加速股票代码搜索
- calc_time：加速按时间排序
- overall_score：加速综合得分排序

---

## 监控和日志

### 查看日志
```bash
# 查看实时日志
uvicorn app.main:app

# 将日志输出到文件
uvicorn app.main:app --log-level info --log-file logs/app.log

# 禁用访问日志
uvicorn app.main:app --log-level warning
```

### 日志级别
- CRITICAL：严重错误
- ERROR：错误
- WARNING：警告
- INFO：常规信息
- DEBUG：调试信息（生产环境建议关闭）

---

## 技术支持

如遇问题，请检查：
1. 数据库连接是否正常
2. API文档：http://localhost:8000/docs
3. 浏览器控制台错误信息（F12）
4. 服务器日志输出
5. GitHub Issues：提交issue并附上日志

---

**文档版本**：1.0.0
**最后更新**：2026-01-08
