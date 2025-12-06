# 🚀 SMIMSO Deployment Guide

Hướng dẫn deploy Backend và Frontend của dự án SMIMSO.

## 📋 Mục lục

1. [Backend Deployment](#backend-deployment)
2. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Troubleshooting](#troubleshooting)

---

## 🔧 Backend Deployment

### Prerequisites

- Node.js 18+ và npm
- Supabase account và project
- Server/VPS với:
  - Ubuntu 20.04+ hoặc tương đương
  - Tối thiểu 2GB RAM
  - Domain name (tùy chọn nhưng khuyến nghị)

### Step 1: Chuẩn bị server

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Cài đặt PM2 để quản lý process
sudo npm install -g pm2

# Cài đặt Nginx (cho reverse proxy)
sudo apt install -y nginx

# Tạo thư mục cho ứng dụng
sudo mkdir -p /var/www/smimso-backend
sudo chown $USER:$USER /var/www/smimso-backend
```

### Step 2: Upload và cài đặt code

```bash
# Clone repository hoặc upload code
cd /var/www/smimso-backend

# Copy code backend vào đây
# Hoặc: git clone <repository-url> .

# Cài đặt dependencies
cd BACKEND
npm install

# Build TypeScript
npm run build
```

### Step 3: Cấu hình Environment Variables

Tạo file `.env` trong thư mục `BACKEND`:

```bash
cd /var/www/smimso-backend/BACKEND
nano .env
```

Thêm các biến môi trường sau:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=30d

# Google OAuth (nếu có)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Web Push Notifications (VAPID Keys)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:your-email@example.com

# AI Services (nếu có)
OPENAI_API_KEY=your-openai-key
```

**Lưu ý quan trọng:**
- Thay tất cả các giá trị placeholder bằng giá trị thực
- Giữ file `.env` bí mật, không commit vào git
- JWT_SECRET nên là một chuỗi ngẫu nhiên mạnh (ít nhất 32 ký tự)

### Step 4: Tạo thư mục uploads

```bash
mkdir -p /var/www/smimso-backend/BACKEND/uploads
chmod 755 /var/www/smimso-backend/BACKEND/uploads
```

### Step 5: Cấu hình PM2

Tạo file `ecosystem.config.js` trong thư mục `BACKEND`:

```javascript
module.exports = {
  apps: [{
    name: 'smimso-backend',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

Khởi động ứng dụng với PM2:

```bash
cd /var/www/smimso-backend/BACKEND
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 6: Cấu hình Nginx (Reverse Proxy)

Tạo file cấu hình Nginx:

```bash
sudo nano /etc/nginx/sites-available/smimso-backend
```

Thêm nội dung sau:

```nginx
server {
    listen 80;
    server_name your-api-domain.com;

    # Redirect HTTP to HTTPS (sau khi setup SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Increase upload size limit
    client_max_body_size 50M;
}
```

Kích hoạt cấu hình:

```bash
sudo ln -s /etc/nginx/sites-available/smimso-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Setup SSL với Let's Encrypt (Khuyến nghị)

```bash
# Cài đặt Certbot
sudo apt install -y certbot python3-certbot-nginx

# Lấy SSL certificate
sudo certbot --nginx -d your-api-domain.com

# Certbot sẽ tự động cấu hình Nginx để sử dụng HTTPS
```

### Step 8: Kiểm tra deployment

```bash
# Kiểm tra PM2 status
pm2 status

# Xem logs
pm2 logs smimso-backend

# Kiểm tra API endpoint
curl http://localhost:5000/api/health
```

---

## 🎨 Frontend Deployment (Vercel)

### Prerequisites

- Vercel account (free tier available)
- Git repository (GitHub, GitLab, hoặc Bitbucket)
- Backend API URL đã được deploy

### Step 1: Chuẩn bị repository

Đảm bảo code frontend đã được push lên Git repository:

```bash
cd FRONTEND
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Deploy trên Vercel

#### Option A: Deploy qua Vercel Dashboard

1. Đăng nhập vào [Vercel](https://vercel.com)
2. Click **"New Project"**
3. Import repository từ GitHub/GitLab
4. Cấu hình project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `FRONTEND`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

#### Option B: Deploy qua Vercel CLI

```bash
# Cài đặt Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd FRONTEND
vercel

# Production deploy
vercel --prod
```

### Step 3: Cấu hình Environment Variables trên Vercel

Trong Vercel Dashboard, vào **Settings** → **Environment Variables**, thêm:

```
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
NEXT_PUBLIC_SOCKET_URL=https://your-api-domain.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-frontend-domain.vercel.app
```

**Lưu ý:**
- Tất cả biến bắt đầu bằng `NEXT_PUBLIC_` sẽ được expose cho client
- Sau khi thêm env variables, cần **redeploy** project

### Step 4: Cấu hình Custom Domain (Tùy chọn)

1. Vào **Settings** → **Domains**
2. Thêm domain của bạn
3. Cấu hình DNS records theo hướng dẫn của Vercel

### Step 5: Cập nhật next.config.js

Đảm bảo file `FRONTEND/next.config.js` có cấu hình đúng:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'your-api-domain.com',
        pathname: '/uploads/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000',
  },
}

module.exports = nextConfig
```

### Step 6: Kiểm tra deployment

1. Truy cập URL Vercel đã cung cấp
2. Kiểm tra console browser (F12) để đảm bảo không có lỗi
3. Test các chức năng chính:
   - Đăng nhập/Đăng ký
   - Upload ảnh
   - Chat
   - Notifications

---

## 🔐 Environment Variables

### Backend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | ✅ | Môi trường chạy | `production` |
| `PORT` | ✅ | Port server | `5000` |
| `FRONTEND_URL` | ✅ | URL frontend | `https://app.vercel.app` |
| `SUPABASE_URL` | ✅ | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `JWT_SECRET` | ✅ | Secret cho JWT | Random 32+ characters |
| `JWT_EXPIRES_IN` | ❌ | JWT expiry time | `30d` |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth secret | `GOCSPX-xxx` |
| `VAPID_PUBLIC_KEY` | ❌ | Web Push public key | `BKxxx` |
| `VAPID_PRIVATE_KEY` | ❌ | Web Push private key | `xxx` |
| `VAPID_EMAIL` | ❌ | Email cho VAPID | `mailto:admin@example.com` |

### Frontend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL | `https://api.example.com/api` |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ | Backend Socket URL | `https://api.example.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `NEXTAUTH_SECRET` | ✅ | NextAuth secret | Random string |
| `NEXTAUTH_URL` | ✅ | Frontend URL | `https://app.vercel.app` |

---

## 🗄️ Database Setup

### Supabase Setup

1. Tạo project mới trên [Supabase](https://supabase.com)
2. Chạy migrations từ `BACKEND/src/migrations/` theo thứ tự
3. Cấu hình Storage buckets cho uploads
4. Tạo RLS (Row Level Security) policies nếu cần

### Run Migrations

```bash
# Kết nối đến Supabase SQL Editor
# Copy nội dung từ các file migration và chạy lần lượt
```

### Seed Data (Tùy chọn)

```bash
cd BACKEND
npm run seed
```

---

## 🔍 Troubleshooting

### Backend Issues

**Port đã được sử dụng:**
```bash
# Kiểm tra process đang dùng port
sudo lsof -i :5000
# Kill process hoặc đổi PORT trong .env
```

**PM2 không start:**
```bash
pm2 logs smimso-backend
# Kiểm tra logs để tìm lỗi
```

**Nginx 502 Bad Gateway:**
- Kiểm tra backend đang chạy: `pm2 status`
- Kiểm tra PORT trong .env khớp với proxy_pass trong Nginx
- Kiểm tra firewall: `sudo ufw status`

### Frontend Issues

**Build failed trên Vercel:**
- Kiểm tra logs trong Vercel dashboard
- Đảm bảo tất cả dependencies đã được install
- Kiểm tra TypeScript errors: `npm run build` locally

**API connection errors:**
- Kiểm tra CORS settings trong backend
- Đảm bảo `NEXT_PUBLIC_API_URL` đúng
- Kiểm tra backend đang accessible từ internet

**Environment variables không hoạt động:**
- Redeploy sau khi thêm env variables
- Đảm bảo tên biến đúng (case-sensitive)
- Biến `NEXT_PUBLIC_*` cần rebuild để có hiệu lực

### Common Solutions

**Clear cache và rebuild:**
```bash
# Backend
cd BACKEND
rm -rf dist node_modules
npm install
npm run build

# Frontend
cd FRONTEND
rm -rf .next node_modules
npm install
npm run build
```

**Restart services:**
```bash
# PM2
pm2 restart smimso-backend

# Nginx
sudo systemctl restart nginx
```

---

## 📝 Post-Deployment Checklist

- [ ] Backend API accessible từ internet
- [ ] Frontend có thể kết nối đến Backend API
- [ ] SSL/HTTPS đã được cấu hình
- [ ] CORS settings đúng
- [ ] Database migrations đã chạy
- [ ] Environment variables đã được set đầy đủ
- [ ] File uploads hoạt động
- [ ] Socket.IO connections hoạt động
- [ ] Authentication/Authorization hoạt động
- [ ] Push notifications hoạt động (nếu có)

---

## 🔄 Continuous Deployment

### GitHub Actions (Tùy chọn)

Tạo file `.github/workflows/deploy.yml` để tự động deploy khi push code.

### Vercel Auto-Deploy

Vercel tự động deploy khi push code lên branch `main` hoặc `master`.

---

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Logs trong PM2: `pm2 logs`
2. Vercel deployment logs
3. Browser console errors
4. Network tab trong DevTools

---

**Chúc bạn deploy thành công! 🎉**

