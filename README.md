# 先信投资 - 数据驱动的投资探索

**版本**：v2.1.2
**状态**：已上线 🟢
**在线地址**：https://cicpa.fun
**GitHub**: https://github.com/zhangtron/stock_dashboard
**部署环境**：阿里云 ECS + Caddy + 自动 HTTPS

基于FastAPI + MySQL + SQLite + Bootstrap 5构建的股票基本面选股与基金分析展示系统，支持三主题切换和多种部署方式（Windows服务器/阿里云/Docker）。

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
- **部署**：阿里云 ECS + Caddy（自动 HTTPS）+ NSSM Windows 服务

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

## 部署到Windows服务器

### 方式一：使用uvicorn直接运行（开发/测试环境）

#### 前置准备
1. **安装Python 3.8+**
   - 下载地址：https://www.python.org/downloads/
   - 安装时勾选"Add Python to PATH"

2. **安装Git**（可选，用于克隆代码）
   - 下载地址：https://git-scm.com/downloads

3. **准备数据库**
   - 确保可以访问远程MySQL数据库（mysql.sqlpub.com）
   - 或者配置本地MySQL数据库

#### 部署步骤

1. **下载代码**
```bash
# 方式1：使用Git克隆
git clone https://github.com/zhangtron/stock_dashboard.git
cd stock_dashboard

# 方式2：直接下载ZIP解压
# 访问 https://github.com/zhangtron/stock_dashboard
# 点击 "Code" -> "Download ZIP"
# 解压到目标目录
```

2. **创建虚拟环境**
```bash
cd stock_dashboard
python -m venv venv

# Windows激活虚拟环境
venv\Scripts\activate
```

3. **安装依赖**
```bash
pip install -r requirements.txt
```

4. **配置环境变量**

创建 `.env` 文件：
```bash
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

5. **启动应用**
```bash
# 开发模式（支持热重载）
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 生产模式（推荐）
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

6. **访问应用**
- 本地访问：http://localhost:8000
- 局域网访问：http://[服务器IP]:8000

### 方式二：使用Windows服务（生产环境）

#### 使用NSSM将应用注册为Windows服务

1. **下载NSSM**
   - 下载地址：https://nssm.cc/download
   - 解压到例如 `C:\nssm`

2. **安装Python服务**
```bash
# 打开命令提示符（管理员）
cd C:\nssm

# 安装服务
nssm install StockDashboard C:\stock_dashboard\venv\Scripts\python.exe
nssm set StockDashboard AppDirectory C:\stock_dashboard
nssm set StockDashboard AppParameters -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
nssm set StockDashboard AppEnvironmentExtra "DB_HOST=mysql.sqlpub.com" "DB_PORT=3306" "DB_USER=chase_zhang" "DB_PASSWORD=your_password" "DB_NAME=stock_review"
nssm set StockDashboard AppEnvironmentExtra "APP_NAME=Stock Dashboard" "APP_ENV=production" "DEBUG=False"
nssm set StockDashboard DisplayName 先信投资数据看板
nssm set StockDashboard Description 股票基本面选股与基金分析系统
nssm set StockDashboard Start SERVICE_AUTO_START

# 启动服务
nssm start StockDashboard
```

3. **管理服务**
```bash
# 查看服务状态
nssm status StockDashboard

# 停止服务
nssm stop StockDashboard

# 重启服务
nssm restart StockDashboard

# 编辑服务配置
nssm edit StockDashboard

# 卸载服务
nssm remove StockDashboard confirm
```

### 方式三：阿里云服务器部署 + Caddy 自动 HTTPS（生产环境推荐）⭐

本节记录了在阿里云 Windows ECS 服务器上部署应用并配置自动 HTTPS 的完整过程。

#### 实际部署环境

- **服务器**：阿里云 ECS Windows Server 2022
- **公网IP**：101.132.136.153
- **域名**：cicpa.fun
- **Python环境**：Miniconda3 (C:\ProgramData\miniconda3)
- **反向代理**：Caddy（自动获取 Let's Encrypt 证书）
- **最终访问**：https://cicpa.fun

#### 部署架构

```
用户浏览器
    ↓
https://cicpa.fun (443端口) ← Caddy反向代理（自动HTTPS）
    ↓
localhost:8000 ← StockDashboard服务（NSSM Windows服务）
    ↓
SQLite缓存数据库 + 远程MySQL
```

#### 部署步骤

##### 1. 服务器环境准备

```powershell
# 1. 安装 Miniconda（Python环境管理）
# 下载：https://docs.conda.io/en/latest/miniconda.html
# 安装到：C:\ProgramData\miniconda3

# 2. 安装 NSSM（Windows服务管理）
# 使用 Chocolatey 安装
choco install nssm

# 或手动下载：https://nssm.cc/download
# 解压到：C:\ProgramData\chocolatey\lib\nssm\tools
```

##### 2. 克隆代码并配置

```powershell
# 克隆代码
cd C:\
git clone https://github.com/zhangtron/stock_dashboard.git
cd stock_dashboard

# 创建 .env 文件（复制 .env.example）
Copy-Item .env.example .env

# 编辑 .env 填写数据库配置
notepad .env
```

`.env` 文件内容：
```env
DB_HOST=mysql.sqlpub.com
DB_PORT=3306
DB_USER=chase_zhang
DB_PASSWORD=your_database_password
DB_NAME=stock_review
APP_NAME=Stock Dashboard
APP_ENV=production
DEBUG=False
HOST=0.0.0.0
PORT=8000
```

##### 3. 创建启动脚本（适配 Miniconda）

创建 `C:\stock-dashboard\start_service.bat`：
```batch
@echo off
call C:\ProgramData\miniconda3\Scripts\activate.bat base
cd /d C:\stock-dashboard
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**重要**：必须激活 conda 环境，否则找不到 uvicorn 命令。

##### 4. 注册为 Windows 服务（使用 NSSM）

```powershell
# 打开管理员 PowerShell
cd C:\ProgramData\chocolatey\lib\nssm\tools

# 安装服务（使用批处理脚本）
nssm.exe install StockDashboard C:\stock-dashboard\start_service.bat
nssm.exe set StockDashboard AppDirectory C:\stock-dashboard
nssm.exe set StockDashboard DisplayName "Stock Dashboard API"
nssm.exe set StockDashboard Description "Stock Fundamental Screening Dashboard"

# 设置服务日志重定向（便于排查问题）
nssm.exe set StockDashboard AppStdout C:\stock-dashboard\service-output.log
nssm.exe set StockDashboard AppStderr C:\stock-dashboard\service-error.log

# 启动服务
nssm.exe start StockDashboard

# 验证服务状态
nssm.exe status StockDashboard
```

##### 5. 配置阿里云安全组

在阿里云控制台配置安全组规则：

1. 登录阿里云控制台
2. 进入 **ECS 实例** → 找到您的服务器
3. 点击 **安全组** → **配置规则** → **手动添加**
4. 添加以下入站规则：

| 协议类型 | 端口范围 | 授权对象 | 描述 |
|---------|---------|---------|------|
| TCP | 8000/8000 | 0.0.0.0/0 | 应用端口（测试用） |
| TCP | 80/80 | 0.0.0.0/0 | HTTP（Caddy） |
| TCP | 443/443 | 0.0.0.0/0 | HTTPS（Caddy） |

**注意**：配置 Caddy 后，可以关闭 8000 端口的外网访问。

##### 6. 配置域名解析

在阿里云 DNS 解析添加记录：

1. 登录阿里云控制台
2. 进入 **云解析 DNS** → 找到域名 `cicpa.fun`
3. 添加解析记录：

| 主机记录 | 记录类型 | 记录值 | TTL |
|---------|---------|--------|-----|
| @ | A | 101.132.136.153 | 600 |

4. 验证解析：
```powershell
nslookup cicpa.fun
# 应返回 101.132.136.153
```

##### 7. 安装 Caddy（反向代理 + 自动 HTTPS）

```powershell
# 1. 下载 Caddy
Invoke-WebRequest -Uri "https://caddyserver.com/api/download?os=windows&arch=amd64" -OutFile "C:\caddy.exe"

# 2. 创建 Caddyfile 配置
@"
cicpa.fun {
    reverse_proxy localhost:8000
}
"@ | Out-File -FilePath "C:\Caddyfile" -Encoding UTF8

# 3. 测试配置
& C:\caddy.exe validate --config C:\Caddyfile

# 4. 开放防火墙端口
netsh advfirewall firewall add rule name="Caddy HTTP" dir=in action=allow protocol=TCP localport=80 profile=any
netsh advfirewall firewall add rule name="Caddy HTTPS" dir=in action=allow protocol=TCP localport=443 profile=any
```

**Caddy 配置说明**：
- `cicpa.fun`：您的域名
- `reverse_proxy localhost:8000`：反向代理到应用端口
- Caddy 会自动从 Let's Encrypt 获取 SSL 证书
- 自动将 HTTP 重定向到 HTTPS

##### 8. 安装 Caddy 为 Windows 服务

```powershell
cd C:\ProgramData\chocolatey\lib\nssm\tools

# 安装服务
nssm.exe install Caddy C:\caddy.exe run --config C:\Caddyfile
nssm.exe set Caddy DisplayName "Caddy Web Server"
nssm.exe set Caddy Description "Reverse proxy with automatic HTTPS"

# 启动服务
nssm.exe start Caddy

# 验证服务状态
nssm.exe status Caddy
```

##### 9. 验证部署

1. **测试端口监听**：
```powershell
netstat -ano | findstr :80
netstat -ano | findstr :443
# 应显示 LISTENING 状态
```

2. **测试服务状态**：
```powershell
nssm.exe status StockDashboard
nssm.exe status Caddy
# 都应显示 SERVICE_RUNNING
```

3. **测试 Web 访问**：
- 访问 `http://cicpa.fun` → 自动跳转到 `https://cicpa.fun`
- 浏览器地址栏显示锁图标 🔒
- 检查控制台无错误

4. **测试 API**：
```powershell
# 本地测试
curl http://localhost:8000/health

# 远程测试（从外部电脑）
curl https://cicpa.fun/api/screening?page=1&page_size=5
```

#### 服务管理命令

```powershell
# StockDashboard 服务管理
nssm.exe status StockDashboard    # 查看状态
nssm.exe start StockDashboard     # 启动服务
nssm.exe stop StockDashboard      # 停止服务
nssm.exe restart StockDashboard   # 重启服务
nssm.exe edit StockDashboard      # 编辑配置

# Caddy 服务管理
nssm.exe status Caddy             # 查看状态
nssm.exe start Caddy              # 启动服务
nssm.exe stop Caddy               # 停止服务
nssm.exe restart Caddy            # 重启服务

# 查看服务日志
Get-Content C:\stock-dashboard\service-error.log -Tail 50
```

#### 更新代码

```powershell
# 1. 拉取最新代码
cd C:\stock-dashboard
git pull origin main

# 2. 重启服务（应用新代码）
nssm.exe restart StockDashboard

# 3. 清除浏览器缓存并刷新
# 按 Ctrl + Shift + R 强制刷新
```

#### 常见问题排查

##### 1. 服务无法启动（SERVICE_STOPPED）

**检查日志**：
```powershell
Get-Content C:\stock-dashboard\service-error.log
```

**常见原因**：
- conda 环境路径错误 → 检查 `start_service.bat` 中的路径
- .env 文件缺失 → 创建并配置 .env 文件
- 数据库连接失败 → 检查网络和数据库配置

##### 2. 前端 API 请求失败（ERR_CONNECTION_REFUSED）

**问题**：浏览器控制台显示 `ERR_CONNECTION_REFUSED`

**原因**：前端 JavaScript 硬编码了 `localhost:8000`

**解决**：确保 `app/static/js/api.js` 使用 `window.location.origin`：
```javascript
static BASE_URL = window.location.origin;  // 自动适配域名
```

##### 3. Caddy 无法获取 SSL 证书

**检查**：
- 域名解析是否生效：`nslookup cicpa.fun`
- 80 端口是否开放：检查阿里云安全组
- 防火墙是否允许 80 端口

**手动测试**：
```powershell
# 停止 Caddy 服务
nssm.exe stop Caddy

# 前台运行查看错误
C:\caddy.exe run --config C:\Caddyfile
```

##### 4. 外网无法访问

**排查顺序**：
1. 本地访问：`http://localhost:8000` ✅
2. 内网IP访问：`http://172.17.131.55:8000`（服务器内网IP）
3. 公网IP访问：`http://101.132.136.153:8000`
4. 域名访问：`https://cicpa.fun`

每一步失败都对应不同的配置问题。

#### 性能和监控

##### 1. 查看服务资源占用

```powershell
# 查看 Python 进程
tasklist | findstr python

# 查看内存占用
Get-Process python | Select-Object ProcessName, Id, WorkingSet
```

##### 2. 配置日志监控

```powershell
# 实时监控服务日志
Get-Content C:\stock-dashboard\service-output.log -Wait -Tail 20

# 监控错误日志
Get-Content C:\stock-dashboard\service-error.log -Wait -Tail 20
```

##### 3. 定期维护任务

- 每周检查一次磁盘空间
- 每月检查一次 SSL 证书有效期（Caddy 自动续期）
- 定期检查服务日志大小
- 监控数据库连接状态

#### 备份和恢复

##### 1. 备份配置文件

```powershell
# 备份关键配置
Copy-Item C:\stock-dashboard\.env C:\backup\.env
Copy-Item C:\Caddyfile C:\backup\Caddyfile
```

##### 2. 恢复服务

```powershell
# 如果服务崩溃，重启服务
nssm.exe restart StockDashboard
nssm.exe restart Caddy

# 如果需要完全重置
nssm.exe remove StockDashboard confirm
nssm.exe remove Caddy confirm
# 重新执行安装步骤
```

### 方式四：使用 IIS（企业环境）

#### 前置准备
1. 安装IIS（控制面板 -> 程序 -> 启用或关闭Windows功能）
2. 安装CGI功能（IIS -> 万维网服务 -> 应用程序开发功能）
3. 安装Python和wfastcgi

#### 部署步骤

1. **安装wfastcgi**
```bash
pip install wfastcgi
```

2. **启用wfastcgi**
```bash
# 启用wfastcgi
wfastcgi-enable

# 查看配置
wfastcgi-dispatch-list
```

3. **创建FastAPI应用启动文件**

创建 `app/asgi.py`：
```python
import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

4. **在IIS中配置网站**
   - 打开IIS管理器
   - 添加网站
   - 物理路径：指向项目目录
   - 绑定：HTTP端口80
   - 应用程序池：.NET CLR v4.0（无托管代码）

5. **配置FastCGI处理程序映射**
   - 打开网站 -> 处理程序映射 -> 添加模块映射
   - 模块：FastCgiModule
   - 可执行文件：`C:\stock_dashboard\venv\Scripts\python.exe`
   - 参数：`C:\stock_dashboard\venv\Scripts\wfastcgi.py`

### 方式四：使用Docker（跨平台）

#### 1. 创建Dockerfile

在项目根目录创建 `Dockerfile`：
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 2. 创建docker-compose.yml

```yaml
version: '3.8'

services:
  stock-dashboard:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=mysql.sqlpub.com
      - DB_PORT=3306
      - DB_USER=chase_zhang
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=stock_review
      - APP_NAME=Stock Dashboard
      - APP_ENV=production
      - DEBUG=False
    restart: unless-stopped
```

#### 3. 构建和运行
```bash
# 构建镜像
docker build -t stock-dashboard .

# 运行容器
docker run -d -p 8000:8000 --name stock-dashboard stock-dashboard

# 或使用docker-compose
docker-compose up -d

# 查看日志
docker logs -f stock-dashboard

# 停止容器
docker stop stock-dashboard
```

### 防火墙配置

确保Windows防火墙允许8000端口访问：

```powershell
# 以管理员身份运行PowerShell
New-NetFirewallRule -DisplayName "Stock Dashboard" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

或通过GUI配置：
1. 控制面板 -> Windows Defender 防火墙 -> 高级设置
2. 入站规则 -> 新建规则
3. 规则类型：端口
4. 协议：TCP
5. 特定本地端口：8000
6. 操作：允许连接

### 域名配置（可选）

如果有域名，可以使用Nginx作为反向代理：

1. **下载Nginx for Windows**
   - 下载地址：http://nginx.org/en/docs/windows.html

2. **配置nginx.conf**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. **启动Nginx**
```bash
cd C:\nginx
start nginx
```

### 监控和日志

#### 查看应用日志
```bash
# 如果直接运行uvicorn，日志会在控制台输出
# 建议配置日志输出到文件

# 使用日志重定向
uvicorn app.main:app --host 0.0.0.0 --port 8000 > app.log 2>&1
```

#### 性能监控
- 使用任务管理器查看Python进程资源占用
- 配置日志轮转，避免日志文件过大
- 定期清理 `app/static/data/stock_cache.db` 缓存文件

### 自动启动配置

#### 使用任务计划程序

1. 打开任务计划程序（taskschd.msc）
2. 创建基本任务
3. 触发器：计算机启动时
4. 操作：启动程序
   - 程序：`C:\stock_dashboard\venv\Scripts\python.exe`
   - 参数：`-m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`
   - 起始于：`C:\stock_dashboard`

### 常见问题

### 1. 数据库连接失败
- 检查 .env 文件中的数据库配置是否正确
- 确认服务器可以访问远程MySQL（mysql.sqlpub.com:3306）
- 检查防火墙是否允许出站连接
- 尝试telnet测试：`telnet mysql.sqlpub.com 3306`

### 2. 端口被占用
```bash
# 查看8000端口占用
netstat -ano | findstr :8000

# 结束占用进程
taskkill /PID [进程ID] /F
```

### 3. 依赖安装失败
```bash
# 使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 4. 应用无法访问
- 确认应用已启动
- 检查防火墙设置
- 尝试本地访问：http://localhost:8000
- 检查服务器IP和端口配置

### 5. 数据同步失败
- 检查数据库连接是否正常
- 查看应用日志排查错误
- 手动触发同步：访问 http://localhost:8000/api/sync/trigger

### 6. 性能优化建议
- 生产环境使用 `--workers 4` 启动多进程
- 配置反向代理（Nginx）
- 启用缓存数据库
- 定期清理缓存数据
- 预期响应时间：<200ms（SQLite缓存）

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
