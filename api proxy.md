# API 代理调查结果

根据代码库分析，本项目中 "API 代理" 的使用情况如下：

## 1. 前端 (Next.js)
- **未配置代理**：`frontend/next.config.ts` 中不包含任何 `rewrites` 或 `proxy` 配置。
- **直接连接**：前端通过 `NEXT_PUBLIC_API_URL`（通常为 `https://api.example.com`）直接访问后端。

## 2. 后端 (FastAPI) 作为 "AI 网关"
后端 (`app/main.py`) **确实** 充当了 AI 服务的代理/网关：

### A. 内部 AI 网关 (`/gateway/v1/...`)
通过适当的 API 端点公开内部专用 NLP 模型，并由 `X-Gateway-Key` 保护。
- **端点**：
  - `/gateway/v1/embeddings` (计算文本匹配)
  - `/gateway/v1/similarity` (相似度)
  - `/gateway/v1/sentiment` (情感分析)
  - `/gateway/v1/extract-keywords` (关键词提取)

### B. LLM 代理 (`/api/...`)
充当外部 LLM 提供商（如 OpenAI）的代理。
- **功能**：接收来自前端的请求，添加必要的系统提示/上下文，然后将其转发给 LLM 提供商。
- **端点**：
  - `/api/translate` -> 调用 OpenAI
  - `/api/optimize` -> 调用 OpenAI
  - `/api/translate_listing` -> 调用 OpenAI
- **代码**：在 `app/core/llm_client.py` 中使用 `OpenAI` 客户端实现。

## 结论
是的，该项目在 Python 后端中包含了 **API 代理** 实现，专门用于网关化 AI/LLM 请求。