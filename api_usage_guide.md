# 亚马逊 Listing 检查器 - API 开发接入文档

本文档用于指导第三方应用或网站接入本服务的 API 能力。

**Base URL**：

- 1Panel / 单域名部署：使用你的站点根路径，例如 `https://your-domain.example`
- 本地测试：`http://localhost:18080`
- 如果你自行分域部署后端：使用你的后端 API 地址

> 当前 Docker Compose 内置 `listing-gateway` Nginx 容器。正常部署时，外部只需要访问统一入口 `APP_PORT`（默认 `18080`），无需分别暴露前端 `3179` 和后端 `8723`。

---

## 🔐 鉴权方式 (Authentication)

本 API 分为两类接口，使用不同的鉴权方式。

### 1. AI 网关接口 (Local NLP)

- **用途**：文本嵌入、相似度、情感分析、关键词提取。
- **计费**：免费，消耗本机 / VPS 算力。
- **鉴权**：HTTP Header
  - Key：`X-Gateway-Key`
  - Value：对应服务器环境变量 `GATEWAY_API_KEY`

### 2. LLM 代理接口 (OpenAI-compatible Proxy)

- **用途**：关键词翻译、Listing 翻译、Listing 优化。
- **计费**：消耗用户填写的模型供应商 API Key。
- **鉴权**：Request Body
  - `api_key`：用户自己的模型供应商 API Key
  - `base_url`：可选，OpenAI-compatible API Base URL
  - `model`：可选，模型 ID

常见 `base_url` 示例：

| 供应商 | base_url 示例 | 模型示例 |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| OpenRouter | `https://openrouter.ai/api/v1` | `qwen/qwen3.8-flash` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/` | `gemini-3.8-flash` |
| DeepSeek | `https://api.deepseek.com` | `deepseek-flash` |
| Tencent TokenHub | `https://tokenhub.tencentmaas.com/v1` | `hy4-preview` |
| Tencent Token Plan | `https://api.lkeap.cloud.tencent.com/plan/v3` | `tc-code-latest` |

---

## ✅ 快速测试

### 1. 检查应用入口

```bash
curl https://your-domain.example/
# 预期响应: {"message":"Amazon Listing Analyzer API is running"}
```

本地或 VPS 直连统一 gateway：

```bash
curl http://127.0.0.1:18080/
```

### 2. 测试 Gateway 健康检查

```bash
curl -H "X-Gateway-Key: YOUR_GATEWAY_KEY" \
  https://your-domain.example/gateway/v1/health
```

---

## 📚 第一类：AI 网关能力 (Local NLP)

### 1. 文本嵌入 (Embeddings)

将文本列表转换为向量，用于语义搜索或聚类。

- **Endpoint**：`POST /gateway/v1/embeddings`
- **Header**：`X-Gateway-Key: <YOUR_KEY>`
- **默认模型**：`BAAI/bge-small-en-v1.5`（可通过 `EMBEDDING_MODEL` 修改）

**Request Body**：

```json
{
  "texts": [
    "Wireless earbuds with noise cancellation",
    "Waterproof bluetooth headphones"
  ]
}
```

**Response**：

```json
{
  "embeddings": [[0.1, 0.2], [0.3, 0.4]],
  "model": "BAAI/bge-small-en-v1.5",
  "count": 2
}
```

### 2. 文本相似度 (Similarity)

计算两个文本的余弦相似度。

- **Endpoint**：`POST /gateway/v1/similarity`
- **Header**：`X-Gateway-Key: <YOUR_KEY>`

**Request Body**：

```json
{
  "text_1": "iPhone 13 Case",
  "text_2": "Apple Phone Cover"
}
```

**Response**：

```json
{
  "score": 0.85
}
```

### 3. 情感分析 (Sentiment)

判断文本的情感倾向。

- **Endpoint**：`POST /gateway/v1/sentiment`
- **Header**：`X-Gateway-Key: <YOUR_KEY>`
- **默认模型**：`distilbert-base-uncased-finetuned-sst-2-english`（可通过 `SENTIMENT_MODEL` 修改）

**Request Body**：

```json
{
  "texts": [
    "Great product, works perfectly!",
    "Terrible quality, broke in one day."
  ]
}
```

**Response**：

```json
{
  "results": [
    {"label": "POSITIVE", "score": 0.99},
    {"label": "NEGATIVE", "score": 0.98}
  ]
}
```

### 4. 关键词提取 (Extract Keywords)

从长描述中提取语义相关关键词。

- **Endpoint**：`POST /gateway/v1/extract-keywords`
- **Header**：`X-Gateway-Key: <YOUR_KEY>`

**Request Body**：

```json
{
  "text": "This ergonomic office chair features lumbar support and mesh back for breathability...",
  "top_n": 5
}
```

**Response**：

```json
{
  "keywords": ["office", "chair", "lumbar", "support", "mesh"]
}
```

### 5. 服务健康检查 (Health)

- **Endpoint**：`GET /gateway/v1/health`
- **Header**：`X-Gateway-Key: <YOUR_KEY>`

**Response**：

```json
{
  "status": "healthy",
  "service": "AI Gateway",
  "models_loaded": ["BAAI/bge-small-en-v1.5", "distilbert-base-uncased-finetuned-sst-2-english"],
  "backend": "PyTorch + SentenceTransformers + Transformers"
}
```

---

## 🤖 第二类：LLM 代理能力 (OpenAI-compatible Proxy)

所有接口都支持：

- `api_key`：必填，用户自己的模型供应商 Key
- `base_url`：可选，默认 `https://api.openai.com/v1`
- `model`：可选，默认 `gpt-4o-mini`

### 6. 亚马逊关键词翻译 (Translate Keywords)

- **Endpoint**：`POST /api/translate`

**Request Body**：

```json
{
  "keywords": ["running shoes", "gym wear"],
  "api_key": "sk-proj-xxxxxx",
  "base_url": "https://api.openai.com/v1",
  "model": "gpt-4o-mini"
}
```

**Response**：

```json
{
  "running shoes": "跑鞋",
  "gym wear": "健身服"
}
```

### 7. Listing 优化 (Optimize)

- **Endpoint**：`POST /api/optimize`

**Request Body**：

```json
{
  "listing": {
    "title": "Old Title...",
    "bullets": "Old Bullets..."
  },
  "missing_keywords": ["waterproof", "durable"],
  "api_key": "sk-proj-xxxxxx",
  "base_url": "https://openrouter.ai/api/v1",
  "model": "qwen/qwen3.8-flash"
}
```

**Response**：

```json
{
  "suggestion": "Optimized Title with **waterproof**..."
}
```

### 8. Listing 全文翻译 (Translate Listing)

- **Endpoint**：`POST /api/translate_listing`

**Request Body**：

```json
{
  "text": "Full product description here...",
  "api_key": "sk-proj-xxxxxx",
  "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
  "model": "gemini-3.8-flash"
}
```

**Response**：

```json
{
  "translation": "完整的产品描述..."
}
```

---

## 📝 示例代码 (Python)

```python
import os
import requests

API_HOST = os.getenv("API_HOST", "https://your-domain.example").rstrip("/")
GATEWAY_KEY = os.getenv("GATEWAY_API_KEY", "your_server_gateway_key")

def get_similarity(text1, text2):
    url = f"{API_HOST}/gateway/v1/similarity"
    headers = {"X-Gateway-Key": GATEWAY_KEY}
    payload = {"text_1": text1, "text_2": text2}

    resp = requests.post(url, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    return resp.json()

print(get_similarity("apple", "banana"))
```
