# 🚀 亚马逊 Listing 检查器 - 完整部署指南 (从零开始)

这份指南适用于**全新的服务器环境**（或已清空旧数据的环境）。我们将一步步部署**前端** (`app.example.com`) 和 **后端 API** (`api.example.com`)。

---

## 第一步：Cloudflare DNS 解析

登录 Cloudflare，确保您的域名 `example.com` 下有以下两条 **A 记录**：

| 如果您想用... | 记录类型 | 名称 (Name) | 内容 (Content) | 代理状态 (Proxy) |
| :--- | :--- | :--- | :--- | :--- |
| **前端** | A | `listing` | `您的服务器IP` | ✅ 开启 (Proxied) |
| **API** | A | `api` | `您的服务器IP` | ✅ 开启 (Proxied) |

---

## 第二步：代码部署 (SSH)

通过 SSH 登录您的服务器（推荐使用 1Panel 的终端功能）。

1.  **进入应用目录** (推荐):
    ```bash
    cd /opt/1panel/apps
    ```

2.  **获取代码**:
    *   如果您使用 Git: `git clone https://github.com/rogersu1987/listing-analyzer.git listing-analyzer
    *   如果您手动上传: 请将本地项目文件夹上传到服务器，并重命名为 `listing-analyzer`。

3.  **进入项目目录**:
    ```bash
    cd listing-analyzer
    ```

4.  **配置密钥 (.env)**:
    *   **非常重要**：我们不再将密钥写死在代码里，而是使用环境变量。
    ```bash
    # 1. 设置 API Key (请将 your_secret... 换成您自己的复杂密码)
    echo "GATEWAY_API_KEY=your_secret_key_888888" >> .env
    
    # 2. 设置端口 (默认 8000)
    echo "PORT=8000" >> .env
    ```
    *或者，如果您的项目中已经有 `.env.example`，可以运行 `cp .env.example .env` 然后编辑它。*

5.  **启动容器**:
    ```bash
    # 构建并后台启动
    docker-compose up -d --build
    ```
# 🚀 listing-analyzer 部署指南

本指南涵盖在 Linux VPS (特别是使用 1Panel 面板) 上部署本项目的完整流程。

## 前置要求
- **VPS**: 已安装 Ubuntu/Debian/CentOS
- **Docker**: 已安装 Docker 和 Docker Compose
- **域名**: `app.example.com` (前端) 和 `api.example.com` (后端) 均已解析到服务器 IP
- **防火墙**: 仅开放 80, 443, 22 端口 (推荐只允许 Cloudflare IP 访问 80/443)

---

## 第一步：获取代码

进入你的部署目录 (例如 `/opt/listing-analyzer`):

```bash
cd /opt/listing-analyzer

# 如果是首次部署:
# git clone <YOUR_REPO_URL> .

# 如果是更新现有代码:
git pull origin main
```

---

## 第二步：配置环境变量

在项目根目录下创建或编辑 `.env` 文件。这是**必须步骤**。

```bash
nano .env
```

**复制并填入以下内容** (请修改 `your_secret_key_here` 为你自己设定的强密码):

```ini
# .env file

# [必须] AI 网关密钥
# 前端调用后端高级功能时需要此密钥，也是您调用 API Gateway 的凭证
GATEWAY_API_KEY=your_secret_key_here

# [可选] 端口配置
PORT=8000

# [推荐留空] 前端访问后端的地址；留空表示同源反代
NEXT_PUBLIC_API_URL=

# [可选] 分域部署时填写前端来源；同源反代通常不用改
BACKEND_CORS_ORIGINS=http://localhost:3000
```

> **注意**: `NEXT_PUBLIC_API_URL` 会在前端构建时注入。留空时，浏览器会请求当前域名下的 `/upload`、`/analyze`、`/api/*`、`/project/*` 等路径，适合单域名反代部署。

---

## 第三步：构建并启动

因为我们修改了前端的 API 地址配置，所以必须 **重新构建 (Build)** 镜像。

```bash
# 停止旧容器
docker compose down

# 重新构建并启动 (这会自动读取 .env)
# --build 参数确保重新编译前端代码以注入新的 API URL
docker compose up -d --build
```

---

## 第四步：1Panel 反向代理配置

确保 1Panel 的 OpenResty (Nginx) 反向代理配置正确：

### 1. 后端 (api.example.com)
- **目标 URL**: `http://127.0.0.1:8000`
- **HTTPS**: 开启并申请证书

### 2. 前端 (app.example.com)
- **目标 URL**: `http://127.0.0.1:3000`
- **HTTPS**: 开启并申请证书

---

## 第五步：验证部署

1.  **检查容器状态**:
    ```bash
    docker ps
    # 应该看到 listing-backend (0.0.0.0:8000) 和 listing-frontend (0.0.0.0:3000)
    ```

2.  **验证后端 API**:
    ```bash
    # 同源反代部署
    curl https://你的前端域名/
    # 或分域部署
    curl https://你的API域名/
    # 应该返回: {"message": "Amazon Listing Analyzer API is running"}
    ```

3.  **验证前端连接**:
    打开浏览器访问你的前端域名。
    点击右上角设置图标；同源反代部署时 "Backend URL" 默认为空，表示请求当前域名下的后端路径。
(对应您在第二步设置的密码)。
