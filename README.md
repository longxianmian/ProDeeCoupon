# PreDee 优惠券系统

## 项目概述

PreDee 是一个为泰国市场设计的综合性 H5 优惠券系统。该系统通过移动端优化的 Web 应用程序，使用户能够领取、管理和兑换数字优惠券。系统集成了 LINE 登录进行用户认证，支持多语言（中文、英文、泰语），包含客户端功能和管理员后台工具。平台支持基于位置的门店发现、二维码兑换和实时优惠券跟踪。

**开发者/运营人员：龙行天下**

## 系统架构

### 前端架构
- **主框架**: Vue 3 + Composition API，React (首页)
- **UI 组件库**: Vant (移动端) + Element Plus (管理后台)
- **状态管理**: Pinia
- **路由**: Vue Router
- **国际化**: Vue I18n (中/英/泰三语言)
- **构建工具**: Vite
- **移动优化**: 响应式设计 + PWA 功能

### 后端架构
- **框架**: Express.js + RESTful API
- **数据库**: PostgreSQL + Drizzle ORM
- **认证**: JWT + bcrypt + LINE OAuth
- **安全**: Helmet + CORS
- **验证**: Joi 数据验证
- **文件处理**: Multer + QR 码生成

### 核心功能
- 🎫 多类型优惠券系统（面值券/折扣券/满减券等）
- 🔐 LINE 登录集成
- 📱 移动端优化界面
- 🌍 三语言支持 (中/英/泰)
- 📍 基于位置的门店发现
- 📱 二维码扫描兑换
- 👨‍💼 管理员后台系统
- 💰 泰铢 (THB) 货币显示

## 本地开发环境

### 环境要求
- Node.js >= 18.0.0
- PostgreSQL >= 13
- npm 或 yarn

### 1. 克隆项目
```bash
git clone <repository-url>
cd predee-coupon-system
```

### 2. 安装依赖
```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd client && npm install && cd ..

# 安装后端依赖
cd server && npm install && cd ..
```

### 3. 环境变量配置

#### 根目录 `.env` 文件
```bash
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/predee_db
PGHOST=localhost
PGPORT=5432
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGDATABASE=predee_db

# JWT 密钥 (必须设置)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# 管理员账户
ADMIN_PASSWORD=your-admin-password
DEV_PASSWORD=your-dev-password

# LINE API 配置
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_LIFF_ID=your-line-liff-id

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Qwen API (可选)
QWEN_API_KEY=your-qwen-api-key
```

#### 前端环境变量 `client/.env`
```bash
VITE_LINE_LIFF_ID=your-line-liff-id
VITE_API_BASE_URL=http://localhost:5000/api
```

### 4. 数据库设置
```bash
# 创建数据库
createdb predee_db

# 推送数据库结构
npm run db:push

# 如果遇到数据丢失警告，强制推送
npm run db:push -- --force
```

### 5. 启动开发服务器
```bash
# 同时启动前后端
npm run dev

# 或者分别启动
npm run server  # 后端 (端口 5000)
npm run client  # 前端 (端口 3000)
```

### 6. 访问系统
- **客户端**: http://localhost:3000
- **React 首页**: http://localhost:5000
- **管理后台**: http://localhost:3000/admin
- **API 文档**: http://localhost:5000/api/health

## 阿里云新加坡服务器部署

### 服务器要求
- Ubuntu 20.04+ 或 CentOS 8+
- Node.js 18+
- PostgreSQL 13+
- Nginx (推荐)
- SSL 证书

### 1. 服务器初始配置
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# 安装 Nginx
sudo apt install nginx -y

# 安装 PM2 (进程管理)
sudo npm install -g pm2
```

### 2. 数据库配置
```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE predee_prod;
CREATE USER predee_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE predee_prod TO predee_user;
\q

# 配置 PostgreSQL 允许远程连接 (如需要)
sudo nano /etc/postgresql/13/main/postgresql.conf
# 修改: listen_addresses = '*'

sudo nano /etc/postgresql/13/main/pg_hba.conf
# 添加: host all all 0.0.0.0/0 md5

sudo systemctl restart postgresql
```

### 3. 项目部署
```bash
# 创建项目目录
sudo mkdir -p /var/www/predee
sudo chown $USER:$USER /var/www/predee

# 克隆项目
cd /var/www/predee
git clone <repository-url> .

# 安装依赖
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 4. 生产环境变量

#### `/var/www/predee/.env`
```bash
# 生产数据库配置
DATABASE_URL=postgresql://predee_user:secure_password_here@localhost:5432/predee_prod
PGHOST=localhost
PGPORT=5432
PGUSER=predee_user
PGPASSWORD=secure_password_here
PGDATABASE=predee_prod

# JWT 密钥 (生产环境必须更强)
JWT_SECRET=your-production-super-secure-jwt-key-64-characters-minimum

# 管理员账户 (生产环境)
ADMIN_PASSWORD=production-admin-password
DEV_PASSWORD=production-dev-password

# LINE API 配置 (生产环境)
LINE_CHANNEL_ACCESS_TOKEN=production-line-channel-access-token
LINE_CHANNEL_SECRET=production-line-channel-secret
LINE_LIFF_ID=production-line-liff-id

# Google Maps API
GOOGLE_MAPS_API_KEY=production-google-maps-api-key

# 生产环境配置
NODE_ENV=production
PORT=5000
```

### 5. 构建项目
```bash
cd /var/www/predee

# 构建前端
npm run build

# 推送数据库结构
npm run db:push
```

### 6. PM2 配置

#### 创建 `ecosystem.config.js`
```javascript
module.exports = {
  apps: [{
    name: 'predee-api',
    script: 'server/index.js',
    cwd: '/var/www/predee',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/pm2/predee-error.log',
    out_file: '/var/log/pm2/predee-out.log',
    log_file: '/var/log/pm2/predee-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
```

#### 启动 PM2 服务
```bash
# 创建日志目录
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# 启动应用
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 7. Nginx 配置

#### `/etc/nginx/sites-available/predee`
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL 证书配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # 前端静态文件
    location / {
        root /var/www/predee/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # 缓存设置
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # 上传文件代理
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # React 首页代理
    location /prodee-homepage/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 启用站点
```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/predee /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx

# 设置开机自启
sudo systemctl enable nginx
```

### 8. 防火墙配置
```bash
# UFW 防火墙配置
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 5432  # PostgreSQL (如果需要外部访问)
sudo ufw enable
```

### 9. SSL 证书配置 (Let's Encrypt)
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 设置自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

## 环境变量说明

### 必需环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@localhost:5432/dbname` |
| `JWT_SECRET` | JWT 签名密钥 (≥32字符) | `your-super-secret-jwt-key-32-chars-min` |
| `ADMIN_PASSWORD` | 管理员密码 | `admin-secure-password` |
| `DEV_PASSWORD` | 开发者密码 | `dev-secure-password` |

### LINE API 配置

| 变量名 | 说明 | 获取位置 |
|--------|------|----------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE 消息API访问令牌 | LINE Developers Console |
| `LINE_CHANNEL_SECRET` | LINE 频道密钥 | LINE Developers Console |
| `LINE_LIFF_ID` | LINE LIFF 应用ID | LINE Developers Console |

### 可选环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `GOOGLE_MAPS_API_KEY` | Google 地图API密钥 | 无 |
| `QWEN_API_KEY` | 通义千问API密钥 | 无 |
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | 服务端口 | `5000` |

## 使用说明

### 管理员登录
- URL: `/admin/login`
- 账户: `admin@predee.com` / `dev@predee.com`
- 密码: 环境变量中配置的密码

### 数据库管理
```bash
# 查看数据库状态
npm run db:studio

# 更新数据库结构
npm run db:push

# 强制更新 (谨慎使用)
npm run db:push -- --force
```

### 部署更新
```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
npm install

# 构建前端
npm run build

# 更新数据库
npm run db:push

# 重启服务
pm2 restart predee-api
```

## 故障排除

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 检查连接
psql $DATABASE_URL -c "SELECT 1;"

# 重启数据库
sudo systemctl restart postgresql
```

#### 2. LINE 登录失败
- 检查 LINE LIFF ID 配置
- 确认域名白名单设置
- 验证 Channel Access Token

#### 3. PM2 服务异常
```bash
# 查看日志
pm2 logs predee-api

# 重启服务
pm2 restart predee-api

# 查看状态
pm2 status
```

#### 4. Nginx 配置问题
```bash
# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 重新加载配置
sudo nginx -s reload
```

### 日志位置
- **应用日志**: `/var/log/pm2/predee-*.log`
- **Nginx 日志**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- **系统日志**: `journalctl -u predee-api`

### 性能监控
```bash
# PM2 监控
pm2 monit

# 系统资源
htop
iostat
free -h
df -h
```

## 开发指南

### 代码结构
```
predee-coupon-system/
├── client/                 # Vue 3 前端
│   ├── src/
│   │   ├── views/         # 页面组件
│   │   ├── components/    # 公共组件
│   │   ├── locales/       # 国际化文件
│   │   └── stores/        # Pinia 状态管理
│   └── prodee-homepage/   # React 首页
├── server/                # Express.js 后端
│   ├── routes/           # API 路由
│   ├── middleware/       # 中间件
│   ├── utils/           # 工具函数
│   └── uploads/         # 上传文件
├── shared/              # 共享代码
│   ├── schema.js/ts     # 数据库模式
│   └── services/        # 共享服务
└── README.md
```

### 贡献指南
1. Fork 项目
2. 创建功能分支: `git checkout -b feature/new-feature`
3. 提交更改: `git commit -am 'Add new feature'`
4. 推送分支: `git push origin feature/new-feature`
5. 提交 Pull Request

---

**技术支持**: 龙行天下  
**许可证**: MIT  
**版本**: 1.0.0