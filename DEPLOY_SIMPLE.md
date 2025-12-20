# 🚀 Hướng dẫn Deploy SMIMSO - Đơn giản nhất

## 📋 Tổng quan

- **Frontend**: Deploy lên **Vercel** (miễn phí, tự động)
- **Backend**: Deploy lên **Railway** hoặc **Render** (đơn giản nhất, không cần VPS)

---

## 🎨 Frontend - Deploy lên Vercel

### Bước 1: Chuẩn bị code

```bash
cd FRONTEND
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Bước 2: Deploy trên Vercel

#### Cách 1: Qua Vercel Dashboard (Khuyến nghị)

1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng GitHub
2. Click **"Add New..."** → **"Project"**
3. Import repository của bạn
4. **Quan trọng**: Vì BE và FE chung 1 repo, cần cấu hình Root Directory:
   - Click **"Configure Project"** hoặc **"Edit"** (nếu đã import)
   - **Root Directory**: Chọn `FRONTEND` từ dropdown hoặc nhập `FRONTEND`
   - **Framework Preset**: Next.js (tự động detect)
   - **Build Command**: `npm run build` (tự động)
   - **Output Directory**: `.next` (tự động)
5. Click **"Deploy"**

**Lưu ý**: Nếu không thấy Root Directory, có thể cần click "Advanced" hoặc "Show More Options"

#### Cách 2: Qua Vercel CLI

```bash
# Cài đặt Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd FRONTEND
vercel

# Deploy production
vercel --prod
```

### Bước 3: Cấu hình Environment Variables

Sau khi deploy xong, vào **Settings** → **Environment Variables** và thêm:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.railway.app
NEXTAUTH_SECRET=your-random-secret-key-here
NEXTAUTH_URL=https://your-app.vercel.app
```

**Lưu ý**: Sau khi thêm env variables, cần **Redeploy** project.

### Bước 4: Kiểm tra

Truy cập URL Vercel đã cung cấp (ví dụ: `https://your-app.vercel.app`)

---

## 🔧 Backend - Deploy lên Railway (Đơn giản nhất)

### Tại sao chọn Railway?
- ✅ Miễn phí $5 credit/tháng (đủ cho dự án nhỏ)
- ✅ Tự động deploy từ GitHub
- ✅ Tự động cấu hình HTTPS
- ✅ Không cần setup server/VPS
- ✅ Dễ dàng quản lý

### Bước 1: Chuẩn bị code

```bash
cd BACKEND
git add .
git commit -m "Prepare backend for deployment"
git push origin main
```

### Bước 2: Tạo file `railway.json` (Tùy chọn)

Tạo file `BACKEND/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Bước 3: Deploy trên Railway

1. Truy cập [railway.app](https://railway.app) và đăng nhập bằng GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Chọn repository của bạn
4. Railway sẽ tự động detect và build
5. **Quan trọng**: Vì BE và FE chung 1 repo, cần cấu hình Root Directory:
   - Vào **Settings** → **Source**
   - **Root Directory**: Nhập `BACKEND`
   - Hoặc vào **Variables** tab và thêm:
     ```
     RAILWAY_SOURCE_DIR=BACKEND
     ```
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   
**Lưu ý**: Railway có thể tự động detect, nhưng nên set Root Directory để chắc chắn

### Bước 4: Cấu hình Environment Variables

Vào **Variables** tab và thêm:

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-app.vercel.app

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=30d

# Google OAuth (nếu có)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# VAPID Keys (nếu có)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:your-email@example.com
```

### Bước 5: Tạo thư mục uploads

Railway tự động tạo, nhưng nếu cần, thêm vào `package.json`:

```json
{
  "scripts": {
    "postinstall": "mkdir -p uploads"
  }
}
```

### Bước 6: Lấy URL Backend

1. Vào **Settings** → **Networking**
2. Click **"Generate Domain"** để lấy public URL
3. Copy URL này (ví dụ: `https://your-backend.railway.app`)

### Bước 7: Cập nhật Frontend

Quay lại Vercel và cập nhật Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend.railway.app
```

Sau đó **Redeploy** Frontend.

---

## 🔧 Backend - Deploy lên Render (Alternative)

Nếu Railway không phù hợp, có thể dùng Render (cũng đơn giản):

### Bước 1: Tạo Web Service trên Render

1. Truy cập [render.com](https://render.com) và đăng nhập
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repository
4. Cấu hình:
   - **Name**: `smimso-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd BACKEND && npm install && npm run build`
   - **Start Command**: `cd BACKEND && npm start`
   - **Root Directory**: (để trống hoặc `BACKEND`)

### Bước 2: Environment Variables

Thêm các biến môi trường giống như Railway ở trên.

### Bước 3: Deploy

Click **"Create Web Service"** và đợi deploy xong.

---

## 📝 Checklist Deploy

### Backend
- [ ] Code đã được push lên GitHub
- [ ] Railway/Render project đã được tạo
- [ ] Environment variables đã được thêm đầy đủ
- [ ] Backend đã deploy thành công
- [ ] Backend URL đã được lấy

### Frontend
- [ ] Code đã được push lên GitHub
- [ ] Vercel project đã được tạo
- [ ] Environment variables đã được thêm (với Backend URL)
- [ ] Frontend đã deploy thành công
- [ ] Đã test kết nối với Backend

---

## 🔍 Kiểm tra sau khi deploy

### Backend

```bash
# Test API health endpoint
curl https://your-backend.railway.app/api/health

# Hoặc mở browser
https://your-backend.railway.app
```

### Frontend

1. Mở URL Vercel
2. Mở DevTools (F12) → Console
3. Kiểm tra không có lỗi kết nối API
4. Test đăng nhập/đăng ký

---

## 🐛 Troubleshooting

### Backend không start

**Kiểm tra logs trên Railway/Render:**
- Vào **Deployments** → Click vào deployment mới nhất → Xem logs
- Tìm lỗi và fix

**Lỗi thường gặp:**
- Thiếu environment variables → Thêm đầy đủ
- Port không đúng → Railway/Render tự động set PORT, không cần config
- Build failed → Kiểm tra `npm run build` chạy được local không

### Frontend không kết nối được Backend

1. Kiểm tra `NEXT_PUBLIC_API_URL` đúng chưa
2. Kiểm tra CORS trong Backend (đã có sẵn trong code)
3. Kiểm tra Backend đang chạy (test URL trực tiếp)
4. Redeploy Frontend sau khi sửa env variables

### Socket.IO không hoạt động

1. Đảm bảo `NEXT_PUBLIC_SOCKET_URL` đúng
2. Kiểm tra Backend có hỗ trợ WebSocket (Railway/Render hỗ trợ sẵn)
3. Kiểm tra CORS settings trong Backend

---

## 💡 Tips

1. **Railway Free Tier**: $5 credit/tháng, đủ cho dự án nhỏ
2. **Vercel Free Tier**: Unlimited cho personal projects
3. **Environment Variables**: Luôn redeploy sau khi thay đổi
4. **Custom Domain**: Có thể thêm sau khi deploy xong
5. **Monitoring**: Railway và Vercel đều có logs và metrics

---

## 🎉 Hoàn thành!

Sau khi deploy xong:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.railway.app`

**Chúc bạn deploy thành công!** 🚀

