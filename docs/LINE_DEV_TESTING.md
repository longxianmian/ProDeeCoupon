# LINE登录开发环境测试指南

## 🌐 开发环境信息

**开发环境URL**: `https://workspace.longxianmian1.repl.co`

## 📋 配置清单

### 1. LINE Developers Console 配置

登录 [LINE Developers Console](https://developers.line.biz/console/)

#### LINE Login频道设置：

**Callback URL** (可配置多个):
```
✅ https://workspace.longxianmian1.repl.co/auth/line/callback  (开发环境)
✅ https://your-production-domain.com/auth/line/callback      (生产环境)
```

#### LIFF应用设置（如使用）：

**Endpoint URL**:
```
https://workspace.longxianmian1.repl.co
```

### 2. Replit环境变量

已配置的Secret：
- ✅ `LINE_CHANNEL_ID` - LINE频道ID
- ✅ `LINE_CHANNEL_SECRET` - LINE频道密钥
- ✅ `JWT_SECRET` - JWT签名密钥
- ✅ `DATABASE_URL` - 数据库连接

### 3. 测试流程

#### 方式一：通过LINE聊天分享链接

1. 打开LINE应用
2. 选择任意聊天窗口
3. 发送链接：`https://workspace.longxianmian1.repl.co`
4. 点击链接（在LINE内置浏览器中打开）
5. 点击登录按钮测试

#### 方式二：LINE二维码扫描

1. 生成开发环境URL的二维码
2. 使用LINE扫描功能扫描
3. 在LINE浏览器中打开
4. 测试登录功能

### 4. 登录流程说明

当在LINE环境中打开时：

```
1. 用户点击"登录"按钮
   ↓
2. 系统检测到LINE环境 → 使用方案A (PKCE)
   ↓
3. 生成PKCE参数：
   - code_verifier (随机字符串)
   - code_challenge (SHA256哈希)
   - state (防CSRF)
   - nonce (防重放)
   ↓
4. 存储到数据库 pkce_sessions 表
   ↓
5. 跳转到LINE官方授权页面
   ↓
6. 用户同意授权
   ↓
7. LINE回调到: /auth/line/callback
   ↓
8. 验证state，取出code_verifier
   ↓
9. 使用authorization_code + code_verifier换取access_token
   ↓
10. 获取用户资料，创建JWT token
   ↓
11. 设置HttpOnly cookie (sid)
   ↓
12. 登录成功！
```

### 5. 调试技巧

#### 查看PKCE Session

```sql
SELECT * FROM pkce_sessions ORDER BY created_at DESC LIMIT 10;
```

#### 查看用户表

```sql
SELECT id, line_user_id, display_name, created_at FROM users ORDER BY created_at DESC;
```

#### 服务器日志关键词

搜索这些关键词定位问题：
- `[PKCE 开始]` - 登录流程开始
- `[PKCE 回调]` - LINE回调
- `[验证 state]` - 状态验证
- `[Token 交换]` - 获取access token
- `ERROR` - 错误信息

### 6. 常见问题排查

#### 问题：点击登录无反应

**检查**：
- 浏览器控制台是否有JavaScript错误
- 网络请求是否成功（Network标签）

#### 问题：回调后显示错误

**检查**：
1. LINE Callback URL是否正确配置
2. 服务器日志中的具体错误信息
3. pkce_sessions表中是否有对应记录

#### 问题：code_verifier不匹配

**检查**：
1. pkce_sessions表的column名称（应该是code_verifier不是verifier）
2. 数据库schema是否最新

### 7. 与生产环境的区别

| 项目 | 开发环境 | 生产环境 |
|------|---------|---------|
| URL | workspace.longxianmian1.repl.co | your-domain.com |
| 数据库 | Replit开发数据库 | 生产数据库 |
| 日志级别 | 详细（DEBUG） | 标准（INFO） |
| 错误显示 | 显示详细错误 | 用户友好提示 |
| Cookie Domain | .repl.co | .your-domain.com |

### 8. 快速修复流程

```
1. 在LINE中测试，发现问题
   ↓
2. 查看Replit服务器日志
   ↓
3. 在Replit编辑器中修改代码
   ↓
4. 服务器自动重启（约3-5秒）
   ↓
5. 在LINE中刷新页面
   ↓
6. 立即验证修复效果
```

### 9. 安全提醒

- ⚠️ 不要在开发环境使用生产数据
- ⚠️ 测试完成后可以清空开发数据库
- ⚠️ 不要在公开渠道分享开发环境链接
- ⚠️ LINE Channel Secret不要提交到Git

## 🎯 测试检查点

登录测试前，确认：
- [ ] LINE Callback URL已添加开发环境地址
- [ ] Replit环境变量已配置
- [ ] 服务器正在运行
- [ ] 可以在普通浏览器访问首页

登录测试中，验证：
- [ ] 在LINE中打开链接，显示正常
- [ ] 点击登录按钮，跳转到LINE授权页
- [ ] 授权后成功回调
- [ ] 显示用户头像和昵称
- [ ] Cookie已设置（sid）

## 📞 联系支持

如遇到问题：
1. 检查服务器日志
2. 查看数据库pkce_sessions表
3. 确认LINE配置正确
4. 尝试清除浏览器缓存重试
