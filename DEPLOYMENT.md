# 部署指南

## 目录
1. [Zeabur部署（推荐）](#zeabur部署推荐)
2. [Fly.io部署](#flyio部署)
3. [Render部署](#render部署)
4. [Docker部署](#docker部署)
5. [域名配置](#域名配置)
6. [生产环境配置](#生产环境配置)

---

## Zeabur部署（推荐）

### 为什么选择Zeabur

- ✅ **访问速度快**：有香港节点，中国访问延迟<50ms
- ✅ **免费额度充足**：512MB RAM，0.5GB存储
- ✅ **部署简单**：一键部署，自动检测配置文件
- ✅ **支持自定义域名**：免费SSL证书
- ✅ **GitHub集成**：自动部署

### 部署步骤

#### 步骤1：准备GitHub仓库

```bash
cd stock-dashboard
git init
git add .
git commit -m "Initial commit: Stock Dashboard"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

#### 步骤2：创建Zeabur项目

1. 访问 https://zeabur.com 并注册/登录
2. 点击"New Project"按钮
3. 选择"Deploy from GitHub"
4. 授权并选择你的GitHub仓库
5. 选择`stock-dashboard`根目录
6. 点击"Deploy"按钮

#### 步骤3：配置环境变量

在Zeabur项目设置中添加：

| 环境变量 | 值 | 说明 |
|---------|-----|------|
| DB_PASSWORD | your_database_password | 数据库密码（重要！） |

**注意**：不要在代码中提交数据库密码，始终使用环境变量。

#### 步骤4：验证部署

1. 等待部署完成（约1-2分钟）
2. 查看部署日志确认没有错误
3. 访问Zeabur提供的应用URL测试
4. 确认API正常工作：
   ```
   https://<your-app-url>.zeabur.app/api/screening
   ```

#### 步骤5：绑定域名

1. 在Zeabur项目设置 → Domains
2. 点击"Add Custom Domain"
3. 输入域名：`cicpa.fun`
4. 点击"Create"按钮
5. Zeabur会显示DNS配置信息：
   ```
   CNAME记录：@.zeabur.app
   ```

#### 步骤6：配置DNS

在域名服务商（如阿里云、腾讯云、Cloudflare等）添加DNS记录：

| 类型 | 主机记录 | 记录值 | TTL |
|------|----------|--------|-----|
| CNAME | @ | zeabur提供的CNAME | 600 |

示例：
```
类型：CNAME
主机记录：@
记录值：your-app.zeabur.app
TTL：600
```

#### 步骤7：验证域名

1. DNS生效后（可能需要10分钟到24小时）
2. 访问 https://cicpa.fun
3. 验证HTTPS证书已自动签发
4. 测试所有功能

### zeabur.yaml配置说明

```yaml
services:
  - type: web
    name: stock-dashboard
    env: python
    plan: free
    buildCommand: pip install -r requirements.txt
    runCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      # 数据库配置
      - key: DB_HOST
        value: mysql.sqlpub.com
      - key: DB_PORT
        value: "3306"
      - key: DB_USER
        value: chase_zhang
      # DB_PASSWORD 从环境变量读取（更安全）
      - key: DB_PASSWORD
        value: ${DB_PASSWORD}
      - key: DB_NAME
        value: stock_review
      
      # 应用配置
      - key: APP_NAME
        value: Stock Dashboard
      - key: APP_ENV
        value: production
      - key: DEBUG
        value: "False"
      
      # 端口配置
      - key: HOST
        value: 0.0.0.0
      - key: PORT
        value: "8000"
```

---

## Fly.io部署

### 为什么选择Fly.io

- ✅ **永久免费**：3个256MB VM
- ✅ **亚洲节点**：新加坡/东京，延迟较低
- ✅ **支持FastAPI**
- ✅ **全球CDN**

### 部署步骤

#### 步骤1：安装Fly CLI

```bash
# Windows (使用PowerShell)
iwr https://fly.io/install.ps1

# Linux/Mac
curl -L https://fly.io/install.sh | sh
```

#### 步骤2：登录和初始化

```bash
fly auth login
fly launch
```

#### 步骤3：创建fly.toml配置

```toml
app = "stock-dashboard"
primary_region = "hkg"

[build]
  builder = "paketobuild"

[build.settings]
  python_version = "3.10"

[env]
  DB_HOST = "mysql.sqlpub.com"
  DB_PORT = "3306"
  DB_USER = "chase_zhang"
  DB_PASSWORD = "your_database_password"
  DB_NAME = "stock_review"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  min_machines_running = 0
  processes = ["uvicorn app.main:app --host 0.0.0.0"]
```

#### 步骤4：部署

```bash
fly deploy
```

#### 步骤5：配置域名

```bash
fly ips allocate-v4 cicpa.fun
```

---

## Render部署

### 为什么选择Render

- ✅ **最简单**：零配置，一键部署
- ✅ **文档完善**：详细的部署指南
- ✅ **自动SSL**：免费HTTPS证书
- ⚠️ **国外节点**：访问速度可能较慢

### 部署步骤

#### 步骤1：推送代码到GitHub

同Zeabur步骤1

#### 步骤2：创建Render服务

1. 访问 https://render.com 并注册/登录
2. 点击"New +"
3. 选择"Web Service"
4. 连接GitHub仓库
5. 选择分支：`main`
6. 配置：
   - **构建命令**：`pip install -r requirements.txt`
   - **启动命令**：`uvicorn app.main:app --host 0.0.0.0 --port $PORT`

#### 步骤3：配置环境变量

在Render的"Environment"部分添加：
```
DB_PASSWORD = your_database_password
```

#### 步骤4：部署

点击"Create Web Service"按钮

#### 步骤5：绑定域名

1. 在项目设置 → "Domains"
2. 点击"Add Domain"
3. 输入：`cicpa.fun`
4. 按照Render的说明配置DNS

---

## Docker部署

### 创建Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 构建和运行

```bash
# 构建镜像
docker build -t stock-dashboard .

# 运行容器
docker run -d \
  -p 8000:8000 \
  -e DB_HOST=mysql.sqlpub.com \
  -e DB_USER=chase_zhang \
  -e DB_PASSWORD=your_database_password \
  -e DB_NAME=stock_review \
  stock-dashboard
```

### 使用Docker Compose

```yaml
version: '3'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=mysql.sqlpub.com
      - DB_PORT=3306
      - DB_USER=chase_zhang
      - DB_PASSWORD=your_database_password
      - DB_NAME=stock_review
      - DEBUG=False
```

运行：
```bash
docker-compose up -d
```

---

## 域名配置

### 阿里云DNS配置

1. 登录阿里云控制台 → 域名 → 解析设置
2. 添加记录：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|----------|--------|-----|
| CNAME | @ | zeabur提供的CNAME | 600 |

### 腾讯云DNS配置

1. 登录腾讯云DNSPod
2. 添加记录：

| 主机记录 | 记录类型 | 线路类型 | 记录值 | TTL |
|---------|---------|---------|--------|-----|
| @ | CNAME | 默认 | zeabur提供的CNAME | 600 |

### Cloudflare DNS配置

1. 登录Cloudflare → DNS
2. 添加CNAME记录：

| 类型 | 名称 | 目标 | 代理状态 | TTL |
|------|------|------|----------|-----|
| CNAME | @ | zeabur提供的CNAME | 已代理 | 自动 |

### DNS生效时间

- 通常需要5分钟到24小时
- 使用`dig`命令检查：
  ```bash
  dig cicpa.fun +short
  ```
- 或在线查询：https://dnschecker.org/

---

## 生产环境配置

### 环境变量（生产）

```env
# 数据库配置
DB_HOST=mysql.sqlpub.com
DB_PORT=3306
DB_USER=chase_zhang
DB_PASSWORD=your_database_password
DB_NAME=stock_review

# 应用配置
APP_NAME=Stock Dashboard
APP_ENV=production
DEBUG=False

# 服务器配置
HOST=0.0.0.0
PORT=8000
```

### 生产启动命令

```bash
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --access-log \
  --log-level warning
```

### 使用Gunicorn（生产推荐）

```bash
# 安装gunicorn
pip install gunicorn

# 启动
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile logs/access.log \
  --error-logfile logs/error.log \
  --log-level warning
```

### Nginx反向代理（可选）

```nginx
server {
    listen 80;
    server_name cicpa.fun;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name cicpa.fun;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS头部
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type, Authorization" always;
    }
}
```

---

## 监控和日志

### Zeabur日志

1. 在Zeabur控制台查看实时日志
2. 下载日志文件进行分析

### 日志收集

使用Sentry、Loggly等服务：
```python
# 安装sentry-sdk
pip install sentry-sdk[flask]

# 在代码中集成
import sentry_sdk
sentry_sdk.init(
    dsn="your-sentry-dsn",
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
)
)
```

### 性能监控

使用Prometheus + Grafana：
```python
# 安装依赖
pip install prometheus-fastapi-instrumentator

# 在main.py中添加
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Counter

instrumentator = Instrumentator()
app = instrumentator.instrument(app)
```

---

## 备份和恢复

### 数据库备份

```bash
# 备份数据库
mysqldump -h mysql.sqlpub.com -u chase_zhang -p \
  stock_review > backup_$(date +%Y%m%d).sql

# 恢复数据库
mysql -h mysql.sqlpub.com -u chase_zhang -p stock_review \
  < backup_20250107.sql
```

### 代码备份

```bash
# 创建标签
git tag -a v1.0.0 -m "First release"

# 推送标签
git push origin v1.0.0
```

---

## 故障排查

### 常见错误

**1. 部署失败**
```
错误：Build failed

解决方案：
1. 检查requirements.txt依赖版本兼容性
2. 查看部署日志中的具体错误
3. 确保Python版本符合要求（3.8+）
```

**2. 域名访问404**
```
错误：404 Not Found

解决方案：
1. 检查DNS记录是否正确配置
2. 使用dig命令检查DNS解析
3. 等待DNS生效（最多24小时）
4. 检查Zeabur域名配置
```

**3. HTTPS证书错误**
```
错误：SSL证书过期或无效

解决方案：
1. Zeabur会自动续期证书
2. 检查DNS配置
3. 检查证书有效期
```

**4. 数据库连接超时**
```
错误：Connection timeout

解决方案：
1. 检查数据库服务器状态
2. 增加连接池大小
3. 检查网络连接
4. 使用连接池自动重连
```

---

## 性能优化

### 数据库优化

1. **添加索引**（已实施）
```sql
CREATE INDEX idx_stock_code ON stock_fundamental_screening(stock_code);
CREATE INDEX idx_calc_time ON stock_fundamental_screening(calc_time);
CREATE INDEX idx_overall_score ON stock_fundamental_screening(overall_score);
```

2. **查询优化**
   - 只查询需要的字段
   - 使用分页避免加载全部数据
   - 使用连接池

3. **缓存策略**
   - 数据更新频率低（每月一次），可考虑添加Redis缓存
   - 缓存Top 3数据

### 应用优化

1. **异步处理**
   - 使用FastAPI的异步特性
   - 数据库查询使用async

2. **压缩响应**
   - 启用Gzip压缩

3. **CDN加速**
   - 静态资源使用CDN
   - API响应使用Zeabur的CDN

---

## 安全最佳实践

### 1. 环境变量
- ✅ 敏感信息存储在环境变量中
- ✅ .env文件加入.gitignore
- ✅ 生产环境使用强密码

### 2. 数据库安全
- ✅ 只读权限，不提供写操作
- ✅ 使用连接池
- ✅ SQL注入防护（SQLAlchemy ORM）

### 3. HTTPS强制
- ✅ 生产环境强制HTTPS
- ✅ 自动续期SSL证书
- ✅ 配置安全响应头

### 4. 依赖管理
- ✅ 定期更新依赖
- ✅ 使用固定版本号
- ✅ 定期安全扫描

---

**文档版本**：1.0.0
**最后更新**：2026-01-08
