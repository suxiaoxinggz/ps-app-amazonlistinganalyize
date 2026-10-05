# 部署故障排查指南 (Deployment Troubleshooting)

目前检测到的现象：
1.  **Cloudflare 已接管域名**：访问 `http://api.example.com` 会跳转到 HTTPS (301 Moved Permanently)。
2.  **端口 8000 未直接开放**：外部无法直接访问 8000 端口（这是正确的，应该通过反向代理访问）。
3.  **HTTPS 连接失败**：SSL 握手失败，这通常意味着服务器并没有正确处理 HTTPS 请求，或者 Cloudflare 无法连接到源服务器。

## 核心问题：缺少反向代理配置

Docker 容器启动在 `8000` 端口，但您的域名访问的是 80/443 端口。您需要在 1Panel 中配置一个**反向代理 (Reverse Proxy)** 将流量转发给容器。

## 解决步骤 (1Panel 操作)

请按照以下步骤检查您的 1Panel 设置：

1.  **进入 1Panel 面板** -> **网站** -> **创建网站**。
2.  **类型选择**：选择 "反向代理" (Reverse Proxy)。
3.  **域名**：填写 `api.example.com`。
4.  **代理地址 (Proxy Pass)**：
    *   填写 `http://127.0.0.1:8000`
    *   *说明：Docker 已经把 8000 映射到了宿主机，所以用 127.0.0.1 即可。*
5.  **确认创建**。

## 解决步骤 (Cloudflare SSL 设置)

由于您使用了 Cloudflare，SSL 设置如果不匹配也会导致无法通过。

1.  登录 **Cloudflare Dashboard**。
2.  进入 **SSL/TLS** 选项卡。
3.  **检查加密模式**：
    *   如果是 **Flexible**: 您的 1Panel 网站必须通过 **HTTP** (80) 响应。
    *   如果是 **Full**: 您的 1Panel 网站可以使用自签名证书（HTTPS 443）。
    *   **推荐方案**：
        1.  在 1Panel 中为网站申请 Let's Encrypt 证书（开启 HTTPS）。
        2.  将 Cloudflare 设置为 **Full (Strict)**。
        3.  或者简单点：Cloudflare 设为 **Flexible**，1Panel 那边只开 HTTP (不推荐，不安全)。

## 检查 Docker 容器状态

确保后端容器正在运行且没有报错：**修正**:
在服务器上直接验证 localhost 可能不通（因为 DNS 解析），请直接用公网域名验证：
```bash
curl https://api.example.com/
# 成功: {"message": "..."}
```

如果必须要验证本地端口，请用：
```bash
curl http://127.0.0.1:8000/
```，那么问题肯定出在 **1Panel 反向代理** 配置上。
