# 环境变量设计方案

## 📋 完整变量清单

### 核心业务变量

| 变量名 | 必需 | 说明 | 开发环境 | 生产环境 |
|--------|------|------|----------|----------|
| `LINE_CHANNEL_ID` | ✅ | LINE频道ID | 相同 | 相同 |
| `LINE_CHANNEL_SECRET` | ✅ | LINE频道密钥 | 相同 | 相同 |
| `JWT_SECRET` | ✅ | JWT签名密钥 | 任意安全字符串 | 强密钥 |
| `APP_JWT_SECRET` | ✅ | 应用JWT密钥 | 同JWT_SECRET | 强密钥 |
| `DATABASE_URL` | ✅ | 数据库连接 | 开发数据库 | 生产数据库 |
| `APP_BASE_URL` | ⚠️ | 应用基础URL | **开发环境请删除** | 生产域名 |

### 开发辅助变量

| 变量名 | 说明 | 自动设置 |
|--------|------|----------|
| `REPL_SLUG` | Replit项目slug | ✅ 自动 |
| `REPL_OWNER` | Replit所有者 | ✅ 自动 |
| `NODE_ENV` | 运行环境 | development/production |

---

## 🎯 LINE登录URL配置逻辑

系统会按以下优先级确定回调URL：

```javascript
优先级1: 如果设置了 APP_BASE_URL
  → 使用 APP_BASE_URL（生产环境）

优先级2: 如果检测到 REPL_SLUG 和 REPL_OWNER
  → 自动构建开发环境URL: https://${REPL_SLUG}.${REPL_OWNER}.repl.co

优先级3: 默认回退
  → 使用 https://prodee.replit.app
```

---

## 🔧 开发环境配置方案

### 方案一：临时删除 APP_BASE_URL（推荐）

在 Replit Secrets 中：

1. **临时删除** `APP_BASE_URL` secret
2. 重启服务器
3. 系统自动检测到开发环境并使用：
   ```
   https://workspace.longxianmian1.repl.co
   ```

**优点**：
- ✅ 完全自动化，无需手动配置
- ✅ 自动适应不同的Replit环境

**缺点**：
- ⚠️ 部署生产时需要重新添加

---

### 方案二：设置为开发环境URL（简单）

在 Replit Secrets 中：

将 `APP_BASE_URL` 修改为：
```
https://workspace.longxianmian1.repl.co
```

**优点**：
- ✅ 简单直接
- ✅ 立即生效

**缺点**：
- ⚠️ 部署生产时必须记得改回来

---

### 方案三：添加开发模式标记（最灵活）

添加新的环境变量 `USE_DEV_MODE=true`，让代码自动切换。

需要修改代码：
```javascript
function getAppBaseUrl() {
  // 开发模式：强制使用开发环境URL
  if (process.env.USE_DEV_MODE === 'true') {
    if (REPL_SLUG && REPL_OWNER) {
      return `https://${REPL_SLUG}.${REPL_OWNER}.repl.co`;
    }
  }
  
  // 生产模式：使用配置的URL
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }
  
  // 回退
  return 'https://prodee.replit.app';
}
```

**优点**：
- ✅ 一个开关控制所有环境
- ✅ 代码逻辑清晰
- ✅ 易于切换

**缺点**：
- ⚠️ 需要修改代码

---

## 📱 LINE Developers Console 配置

无论使用哪种方案，都需要在 LINE 开发者控制台添加开发环境回调URL：

### 添加 Callback URL

登录 [LINE Developers Console](https://developers.line.biz/console/)

在您的LINE Login频道 → **LINE Login settings** → **Callback URL**

添加（保留原有的，只是增加一个）：

```
✅ https://prodee.replit.app/auth/line/callback          (生产环境)
✅ https://workspace.longxianmian1.repl.co/auth/line/callback  (开发环境) ← 新增
```

⚠️ **重要**：LINE允许配置多个Callback URL，无需删除生产环境的配置！

---

## 🚀 测试开发环境LINE登录的步骤

### 步骤1：配置环境变量

选择上述方案之一配置 `APP_BASE_URL`

### 步骤2：验证环境检测

重启服务器后，查看日志：

```bash
# 应该看到类似输出：
🌍 环境配置信息:
   BASE_URL: https://workspace.longxianmian1.repl.co  ← 开发环境
   REDIRECT_URI: https://workspace.longxianmian1.repl.co/auth/line/callback
```

### 步骤3：配置LINE Console

在LINE开发者控制台添加开发环境的Callback URL

### 步骤4：手机测试

1. 在手机打开LINE
2. 在聊天窗口发送：`https://workspace.longxianmian1.repl.co`
3. 点击链接（在LINE内置浏览器中打开）
4. 点击登录按钮
5. 完成LINE授权
6. 验证登录成功

---

## 🔄 开发/生产环境快速切换表

| 操作 | 开发环境 | 生产环境 |
|------|----------|----------|
| **方案一** | 删除 `APP_BASE_URL` | 设置 `APP_BASE_URL=https://your-domain.com` |
| **方案二** | `APP_BASE_URL=https://workspace.longxianmian1.repl.co` | `APP_BASE_URL=https://your-domain.com` |
| **方案三** | `USE_DEV_MODE=true` | `USE_DEV_MODE=false` 或删除 |

---

## 📊 当前环境状态

根据日志显示，当前：
- ✅ 服务器运行正常
- ⚠️ 使用生产环境URL（因为APP_BASE_URL已设置）
- 🔧 需要调整以启用开发环境测试

### 推荐行动

**立即生效的方法**（推荐）：

1. 打开 Replit Secrets
2. 临时删除或注释掉 `APP_BASE_URL`
3. 重启服务器
4. 验证日志显示开发环境URL
5. 在LINE Console添加开发回调URL
6. 开始测试

---

## 🛡️ 生产部署检查清单

部署到生产前，确保：

- [ ] `APP_BASE_URL` 设置为生产域名
- [ ] `DATABASE_URL` 指向生产数据库
- [ ] `JWT_SECRET` 使用强密钥
- [ ] `LINE_CHANNEL_ID` 和 `LINE_CHANNEL_SECRET` 正确
- [ ] LINE Console配置了生产回调URL
- [ ] 删除或设置 `USE_DEV_MODE=false`（如使用方案三）

---

## 💡 常见问题

### Q: 为什么我的LINE登录回调失败？

A: 检查：
1. `APP_BASE_URL` 是否正确
2. LINE Console是否添加了对应的Callback URL
3. 服务器日志中显示的REDIRECT_URI是否正确

### Q: 开发和生产可以用同一个LINE Channel吗？

A: 可以！LINE允许配置多个Callback URL，所以同一个频道可以同时支持开发和生产环境。

### Q: 我需要两套环境变量吗？

A: 大部分变量（LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, JWT_SECRET）可以相同。只有 `APP_BASE_URL` 和 `DATABASE_URL` 需要区分。

---

## 📝 快速参考

```bash
# 当前开发环境URL
https://workspace.longxianmian1.repl.co

# LINE回调URL（需要添加到LINE Console）
https://workspace.longxianmian1.repl.co/auth/line/callback

# 检查当前环境
查看服务器日志开头的 "🌍 环境配置信息"
```
