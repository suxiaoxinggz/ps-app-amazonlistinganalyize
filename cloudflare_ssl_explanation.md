# Cloudflare SSL 与 1Panel 配置详解

您提到主域名 `example.com` 托管在 Cloudflare，且 `panel.example.com` 正常工作。现在的问题在于新接入的 API 域名 `api.example.com`。

## 核心概念：为什么会有 SSL 模式？

Cloudflare 就像在用户和您的服务器中间站了一个“保安”。连接分为两段：

1.  **用户 (User) -> Cloudflare**: 这段永远是加密的 (HTTPS)，由 Cloudflare 负责。
2.  **Cloudflare -> 您的服务器 (1Panel)**: 这段怎么走，取决于 **SSL 模式**。

如果您的 API 访问出现 `SSL handshake failure`，说明 **第 2 段** 通路断了。通常是因为“保安”想用加密通话，但您的服务器只接受明文（或者反之）。

---

## 针对您的设定 (1Panel + Cloudflare) 的解决方案

因为您的 `api.example.com` 也是 `example.com` 的子域名，它会继承主域名的 SSL 设置。

### 方案一：最简单，不易出错 (推荐新手)

让 Cloudflare 发送明文给您的服务器，您的服务器只处理 HTTP。

1.  **Cloudflare 设置**:
    *   进入 Cloudflare 后台 -> **SSL/TLS**。
    *   将加密模式改为 **Flexible (灵活)**。
    *   *注意：这会影响所有子域名。如果您的 `panel.example.com` 强制要求 HTTPS 且必须有证书才能访问，改这个可能会导致面板打不开。如果面板也是反代或者HTTP，则没问题。*

2.  **1Panel 设置**:
    *   在“网站”中找到 `api.example.com`。
    *   **不要** 开启 HTTPS (不申请证书)。
    *   确保它是一个 **HTTP** 的反向代理，指向 `127.0.0.1:8000`。

### 方案二：安全，标准做法 (推荐生产环境)

全程加密。

1.  **Cloudflare 设置**:
    *   将加密模式设为 **Full (完全)** 或 **Full (Strict)**。

2.  **1Panel 设置**:
    *   在“网站”中找到 `api.example.com`。
    *   **必须** 开启 HTTPS。
    *   在配置中申请一个 **Let's Encrypt** 证书 (1Panel 自带申请功能)。
        *   *提示：如果 Cloudflare 开了小黄云(代理)，Let's Encrypt 验证可能会失败。您可能需要先暂停小黄云，申请完证书，再开启小黄云。或者使用 DNS 验证方式申请证书。*

### 总结建议

因为您说 `panel.example.com` 是好的，建议您先检查一下 `example.com` 在 Cloudflare 里的当前 SSL 模式是哪个。

*   **如果当前是 Flexible**: 您在 1Panel 建 `api` 网站时，**千万别开 HTTPS**。
*   **如果当前是 Full/Strict**: 您在 1Panel 建 `api` 网站时，**必须配置 HTTPS 证书**。

**只要两边“对上号”，就能通。**
