# 亚马逊 Listing 检查器 - API 开发接入文档

本文档用于指导第三方应用或网站接入本服务的 API 能力。

**Base URL**: 同源部署时使用当前站点根路径；独立 API 域名部署时使用你的后端地址，例如 `https://api.example.com`

---

## 🔐 鉴权方式 (Authentication)

本 API 分为两类接口，使用不同的鉴权方式。

### 1. AI 网关接口 (本地模型)
*   **用途**: 文本嵌入、相似度、情感分析、关键词提取。
*   **计费**: 免费 (消耗本地算力)。
*   **鉴权**: HTTP Header
    *   Key: `X-Gateway-Key`
    *   Value: `(请联系管理员获取，对应服务器环境变量 GATEWAY_API_KEY)`

### 2. LLM 代理接口 (OpenAI)
*   **用途**: 翻译、Listing 优化、文案重写。
*   **计费**: 付费 (消耗您的 OpenAI Token)。
*   **鉴权**: Request Body
    *   Key: `api_key`
    *   Value: `sk-xxxxxxxx` (您的有效 OpenAI API Key)

---

## 📚 第一类：AI 网关能力 (Local NLP)

### 1. 文本嵌入 (Embeddings)
将文本列表转换为向量，用于语义搜索或聚类。

*   **Endpoint**: `POST /gateway/v1/embeddings`
*   **Header**: `X-Gateway-Key: <YOUR_KEY>`
*   **Request Body**:
    ```json
    {
      "texts": [
        "Wireless earbuds with noise cancellation",
        "Waterproof bluetooth headphones"
      ]
    }
    ```
*   **Response**:
    ```json
    {
      "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...]],
      "model": "BAAI/bge-small-en-v1.5",
      "count": 2
    }
    ```

### 2. 文本相似度 (Similarity)
计算两个文本的余弦相似度 (0~1)。

*   **Endpoint**: `POST /gateway/v1/similarity`
*   **Header**: `X-Gateway-Key: <YOUR_KEY>`
*   **Request Body**:
    ```json
    {
      "text_1": "iPhone 13 Case",
      "text_2": "Apple Phone Cover"
    }
    ```
*   **Response**:
    ```json
    {
      "score": 0.85
    }
    ```

### 3. 情感分析 (Sentiment)
判断文本的情感倾向 (Positive/Negative)。

*   **Endpoint**: `POST /gateway/v1/sentiment`
*   **Header**: `X-Gateway-Key: <YOUR_KEY>`
*   **Request Body**:
    ```json
    {
      "texts": [
        "Great product, works perfectly!",
        "Terrible quality, broke in one day."
      ]
    }
    ```
*   **Response**:
    ```json
    {
      "results": [
        {"label": "POSITIVE", "score": 0.99},
        {"label": "NEGATIVE", "score": 0.98}
      ]
    }
    ```

### 4. 关键词提取 (Extract Keywords)
从长描述中提取权重最高的关键词。

*   **Endpoint**: `POST /gateway/v1/extract-keywords`
*   **Header**: `X-Gateway-Key: <YOUR_KEY>`
*   **Request Body**:
    ```json
    {
      "text": "This ergonomic office chair features lumbar support and mesh back for breathability...",
      "top_n": 5
    }
    ```
*   **Response**:
    ```json
    {
      "keywords": [
        ["office chair", 0.6],
        ["lumbar support", 0.55],
        ...
      ]
    }
    ```

### 5. 服务健康检查 (Health)
*   **Endpoint**: `GET /gateway/v1/health`
*   **Response**: `{"status": "healthy", ...}`

---

## 🤖 第二类：LLM 代理能力 (OpenAI Proxy)

**注意**: 所有接口都支持可选参数 `base_url` (默认 api.openai.com) 和 `model` (默认 gpt-3.5-turbo)。

### 6. 亚马逊关键词翻译 (Translate Keywords)
将关键词列表翻译为中文，优化电商语境。

*   **Endpoint**: `POST /api/translate`
*   **Request Body**:
    ```json
    {
      "keywords": ["running shoes", "gym wear"],
      "api_key": "sk-proj-xxxxxx"
    }
    ```
*   **Response**: `{"running shoes": "跑鞋", "gym wear": "健身服"}`

### 7. Listing 优化 (Optimize)
根据缺失关键词优化标题和五点描述。

*   **Endpoint**: `POST /api/optimize`
*   **Request Body**:
    ```json
    {
      "listing": {
        "title": "Old Title...",
        "bullets": "Old Bullets..."
      },
      "missing_keywords": ["waterproof", "durable"],
      "api_key": "sk-proj-xxxxxx"
    }
    ```
*   **Response**: `{"suggestion": "Optimized Title with **waterproof**..."}`

### 8. Listing 全文翻译 (Translate Listing)
翻译大段文本。

*   **Endpoint**: `POST /api/translate_listing`
*   **Request Body**:
    ```json
    {
      "text": "Full product description here...",
      "api_key": "sk-proj-xxxxxx"
    }
    ```
*   **Response**: `{"translation": "完整的产品描述..."}`

---

## 📝 示例代码 (Python)

```python
import os
import requests

API_HOST = os.getenv("API_HOST", "https://your-domain.example")
GATEWAY_KEY = os.getenv("GATEWAY_API_KEY", "your_server_gateway_key")

def get_similarity(text1, text2):
    url = f"{API_HOST}/gateway/v1/similarity"
    headers = {"X-Gateway-Key": GATEWAY_KEY}
    payload = {"text_1": text1, "text_2": text2}
    
    resp = requests.post(url, json=payload, headers=headers)
    return resp.json()

print(get_similarity("apple", "banana"))
```
