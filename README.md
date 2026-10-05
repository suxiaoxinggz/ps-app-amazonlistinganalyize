# Amazon Listing Analyzer 📊

**亚马逊 Listing 关键词覆盖率分析工具** / **Amazon Listing Keyword Coverage Analysis Tool**

一个帮助亚马逊卖家分析 Listing 关键词覆盖情况的全栈 Web 应用。通过上传关键词数据库，对比 Listing 文案的关键词命中率，结合 AI 翻译和优化建议，快速识别优化机会。

A full-stack web application that helps Amazon sellers analyze keyword coverage in their listings. Upload a keyword database, compare against your listing copy, and use AI-powered translation and optimization suggestions to identify improvement opportunities.

---

## ✨ 核心功能 / Key Features

### 📈 关键词覆盖分析 / Keyword Coverage Analysis
- 上传关键词 Excel 数据库（支持搜索量、排名、CPC 等字段）
- 对比多个 Listing 的关键词覆盖、搜索量覆盖
- 分段统计（核心词 / 中间词 / 长尾词）
- 覆盖矩阵可视化

### 🤖 AI 辅助功能 / AI-Powered Features
- **关键词翻译** — 批量翻译关键词为中文
- **Listing 翻译** — 整篇 Listing 文案中英翻译
- **优化建议** — AI 根据未覆盖关键词重写 Title 和 Bullet Points
- 支持多 AI 服务商（OpenAI、DeepSeek、OpenRouter、Google Gemini）

### 🔒 多租户隔离 / Multi-Tenant Isolation
- 无需注册登录，通过「项目 + 密码」隔离数据
- 每个项目独立的关键词数据库（ChromaDB 集合 + 缓存文件）
- 用户可自行删除项目及数据
- 管理员可通过密码清空所有数据

### 📥 导出功能 / Export
- CSV 导出完整分析报告（含翻译列）
- UTF-8 BOM 支持中文 Excel 正确显示

---

## 🏗️ 技术栈 / Tech Stack

| 层级 | 技术 |
|------|------|
| **前端 Frontend** | Next.js 14 + React + TypeScript + Tailwind CSS + shadcn/ui |
| **后端 Backend** | Python + FastAPI + Uvicorn |
| **向量检索 Vector DB** | ChromaDB + Sentence Transformers |
| **AI 集成 LLM** | OpenAI SDK (兼容 DeepSeek / OpenRouter / Google) |
| **数据处理** | Pandas + Scikit-learn |
| **部署 Deployment** | Docker + Docker Compose |

---

## 📁 项目结构 / Project Structure

```
listing-analyzer/
├── app/                        # 后端 Backend
│   ├── __init__.py
│   ├── main.py                 # FastAPI 入口 + API 路由
│   └── core/
│       ├── analyzer.py         # 分析引擎（关键词匹配 + 统计）
│       ├── data_processor.py   # Excel 解析器
│       ├── engine.py           # ChromaDB 向量匹配引擎
│       ├── llm_client.py       # AI 客户端（翻译 + 优化）
│       └── project_manager.py  # 多租户项目管理
├── frontend/                   # 前端 Frontend
│   ├── app/                    # Next.js App Router
│   ├── components/
│   │   ├── MainPage.tsx        # 主页面（步骤流程）
│   │   ├── ProjectEntry.tsx    # 项目入口（创建/登录）
│   │   ├── Uploader.tsx        # 文件上传组件
│   │   ├── MatrixView.tsx      # 覆盖矩阵表格
│   │   ├── StepGuide.tsx       # 双语操作指南组件
│   │   └── ui/                 # shadcn/ui 组件
│   ├── lib/
│   │   └── i18n.tsx            # 国际化
│   └── Dockerfile
├── docker-compose.yml          # Docker 编排
├── Dockerfile.backend          # 后端 Docker 配置
├── requirements.txt            # Python 依赖
└── .env.example                # 环境变量模板
```

---

## 🚀 快速开始 / Quick Start

### 方式一：Docker 部署（推荐）/ Docker Deployment (Recommended)

**1. 克隆项目 / Clone**

```bash
git clone https://github.com/suxiaoxinggz/listing-analyzer.git
cd listing-analyzer
```

**2. 配置环境变量 / Configure Environment**

```bash
cp .env.example .env
```

编辑 `.env` 文件 / Edit `.env`:

```env
# AI 网关密钥（自定义，保护 API）
GATEWAY_API_KEY=your_secret_key_here

# 管理员密码（用于清空所有数据）
ADMIN_PASSWORD=your_admin_password_here
```

**3. 启动服务 / Launch Services**

```bash
docker compose up -d --build
```

**4. 访问应用 / Access**

- 前端: `http://localhost:3179`
- 后端 API: `http://localhost:8723`

### 方式二：本地开发 / Local Development

**后端 / Backend:**

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# 安装依赖
pip install -r requirements.txt

# 启动后端
uvicorn app.main:app --host 0.0.0.0 --port 8723 --reload
```

**前端 / Frontend:**

```bash
cd frontend
npm install
npm run dev
```

---

## 📖 使用说明 / User Guide

### 1️⃣ 创建/进入项目 / Create or Enter Project

- 首次使用：填写项目名称、密码（≥4位）、联系方式，点击 "Create Project"
- 创建后获得一个 **8 位项目 ID**，请妥善保存（⚠️ 丢失无法找回）
- 再次访问：输入项目 ID + 密码进入

### 2️⃣ 上传关键词 / Upload Keywords

- 上传 Excel 文件（.xlsx/.xls），需包含 `关键词` 或 `Keyword` 列
- 可选列：`Search Volume` / `Rank` / `CVR` / `CPC` / `Competitors`
- 系统自动识别表头格式（支持多级表头）

### 3️⃣ 输入 Listing / Enter Listings

- 输入 ASIN（10 位亚马逊产品标识码）
- 粘贴完整 Listing 内容（Title + Bullet Points + Description + Search Terms）
- 支持添加多个 Listing 进行对比分析
- 可使用翻译按钮翻译 Listing（需配置 AI）

### 4️⃣ 分析结果 / Analysis Results

- 查看全局统计（总关键词数、总搜索量）
- 每个 ASIN 的覆盖率和搜索量覆盖率
- 关键词矩阵表（✓ = 已覆盖）
- 一键翻译所有关键词
- AI 优化建议（基于未覆盖关键词）
- 导出 CSV 报告

---

## ⚙️ 环境变量 / Environment Variables

| 变量 | 必填 | 说明 |
|------|------|------|
| `APP_PORT` | 可选 | Docker 对外统一入口端口，默认 `18080`；1Panel 只需要反代到这个端口 |
| `GATEWAY_API_KEY` | 可选 | AI 网关密钥，保护翻译/优化 API |
| `ADMIN_PASSWORD` | 可选 | 管理员密码，用于清空所有项目数据 |
| `NEXT_PUBLIC_API_URL` | 构建时 | 前端浏览器访问后端的地址；留空表示同源反代，填完整 URL 表示独立后端域名 |
| `BACKEND_CORS_ORIGINS` | 可选 | 后端允许跨域的前端来源；同源反代通常不用改，分域部署时填前端域名 |
| `EMBEDDING_MODEL` | 可选 | 关键词向量匹配模型，默认 `BAAI/bge-small-en-v1.5` |
| `EMBEDDING_NORMALIZE` | 可选 | 是否归一化 embedding，默认 `true` |
| `SENTIMENT_MODEL` | 可选 | `/gateway/v1/sentiment` 使用的小型情感分析模型 |

---

## 🔌 API 端点 / API Endpoints

### 核心功能 / Core

| 方法 | 端点 | 说明 |
|------|------|------|
| `POST` | `/upload` | 上传并索引关键词 Excel（支持 `?project_id=xxx`） |
| `POST` | `/analyze` | 分析 Listing 关键词覆盖 |

### AI 功能 / AI Features

| 方法 | 端点 | 说明 |
|------|------|------|
| `POST` | `/api/translate` | 批量翻译关键词 |
| `POST` | `/api/optimize` | AI 优化 Listing 文案 |
| `POST` | `/api/translate_listing` | 翻译整篇 Listing |

### 项目管理 / Project Management

| 方法 | 端点 | 说明 |
|------|------|------|
| `POST` | `/project/create` | 创建新项目 |
| `POST` | `/project/verify` | 验证项目密码 |
| `POST` | `/project/delete` | 删除项目及数据 |
| `GET` | `/project/list` | 列出所有项目 |
| `POST` | `/admin/clear` | 管理员清空所有数据 |

---

## 🐳 VPS 部署指南 / VPS Deployment Guide

### 首次部署 / First Deployment

```bash
# 1. 克隆项目
git clone https://github.com/suxiaoxinggz/listing-analyzer.git
cd listing-analyzer

# 2. 创建 .env 文件
cat > .env << EOF
APP_PORT=18080
GATEWAY_API_KEY=your_secret_key
ADMIN_PASSWORD=your_admin_password
# 推荐留空：用内置 Nginx gateway 同源转发前端和后端
NEXT_PUBLIC_API_URL=
# 同源反代通常不用改；分域部署时填前端域名
BACKEND_CORS_ORIGINS=http://localhost:3179
# 本地向量模型：效果更好但仍轻量
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_NORMALIZE=true
SENTIMENT_MODEL=distilbert-base-uncased-finetuned-sst-2-english
EOF

# 3. 启动
docker compose up -d --build
```

### 更新部署 / Update Deployment

```bash
cd listing-analyzer
git pull origin master
docker compose down
docker compose up -d --build
```

### 数据持久化 / Data Persistence

以下目录通过 Docker volumes 持久化，更新不会丢失数据：

| 容器路径 | 宿主机路径 | 用途 |
|----------|-----------|------|
| `/app/uploads` | `./uploads` | 上传的 Excel 文件 |
| `/app/chroma_db` | `./chroma_db` | ChromaDB 向量数据 |
| `/app/data` | `./data` | 项目数据库 + 关键词缓存 |
| `/app/.cache/huggingface` | `./hf_cache` | Hugging Face 模型缓存，避免重建容器后重复下载 |

> 更换 `EMBEDDING_MODEL` 后，已有 ChromaDB 向量仍来自旧模型。建议重新上传关键词 Excel 或清理对应项目数据，让系统用新模型重建索引。

### 1Panel / Nginx 反向代理

`docker-compose.yml` 已内置 `listing-gateway` Nginx 容器，负责把前端和后端路径分发好：

- `/api/template` → 前端 Next.js 下载模板接口
- `/api/*`、`/upload`、`/analyze`、`/project/*`、`/admin/*`、`/gateway/*`、`/template/*` → 后端
- 其他路径 → 前端

因此 1Panel 里只需要把你的域名反代到一个地址：

```txt
http://127.0.0.1:18080
```

如果你修改了 `.env` 里的 `APP_PORT`，就反代到对应端口。

---

## 🔧 AI 服务商配置 / AI Provider Configuration

本应用支持以下 AI 服务商，在前端设置弹窗中配置：

| 服务商 | Base URL | 说明 |
|--------|----------|------|
| **OpenAI** | `https://api.openai.com/v1` | 官方 API |
| **DeepSeek** | `https://api.deepseek.com` | 性价比高的中文模型 |
| **OpenRouter** | `https://openrouter.ai/api/v1` | 多模型聚合 |
| **Google Gemini** | `https://generativelanguage.googleapis.com/v1beta/openai/` | Google AI |

点击 "Fetch List" 按钮可动态获取可用模型列表。

---

## 📄 License

MIT License

---

## 🙏 致谢 / Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) — 高性能 Python Web 框架
- [ChromaDB](https://www.trychroma.com/) — 嵌入式向量数据库
- [Sentence Transformers](https://www.sbert.net/) — 文本嵌入模型
- [shadcn/ui](https://ui.shadcn.com/) — 精美 React UI 组件
- [Next.js](https://nextjs.org/) — React 全栈框架
