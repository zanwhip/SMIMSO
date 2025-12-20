# ⚡ Quick Deploy Guide - 5 phút

## 🎯 Tóm tắt nhanh

1. **Frontend**: Vercel (tự động từ GitHub)
2. **Backend**: Railway (tự động từ GitHub)

---

## 🎨 Frontend - Vercel (2 phút)

### Bước 1: Push code lên GitHub
```bash
git add .
git commit -m "Ready for deploy"
git push origin main
```

### Bước 2: Deploy trên Vercel
1. Vào [vercel.com](https://vercel.com) → Login với GitHub
2. **New Project** → Chọn repo
3. **Quan trọng**: Vì BE và FE chung repo, cần cấu hình:
   - Click **"Configure Project"** hoặc **"Edit"**
   - **Root Directory**: Chọn `FRONTEND` (hoặc nhập `FRONTEND`)
   - **Framework Preset**: Next.js (tự động detect)
   - **Build Command**: `npm run build` (tự động)
   - **Output Directory**: `.next` (tự động)
4. Click **Deploy**

### Bước 3: Thêm Environment Variables
Vào **Settings** → **Environment Variables**:
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend.railway.app
NEXTAUTH_SECRET=random-secret-here
NEXTAUTH_URL=https://your-app.vercel.app
```
→ **Redeploy**

---

## 🔧 Backend - Railway (3 phút)

### Bước 1: Push code lên GitHub
```bash
# Đã push ở trên
```

### Bước 2: Deploy trên Railway
1. Vào [railway.app](https://railway.app) → Login với GitHub
2. **New Project** → **Deploy from GitHub repo**
3. Chọn repo → Railway tự động detect
4. **Quan trọng**: Vì BE và FE chung repo, cần cấu hình:
   - Vào **Settings** → **Source**
   - **Root Directory**: Nhập `BACKEND`
   - Hoặc vào **Variables** → Thêm:
     ```
     RAILWAY_SOURCE_DIR=BACKEND
     ```
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Bước 3: Thêm Environment Variables
Vào **Variables** tab:
```
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
JWT_SECRET=your-32-char-secret
```

### Bước 4: Lấy Backend URL
**Settings** → **Networking** → **Generate Domain**
→ Copy URL này

### Bước 5: Cập nhật Frontend
Quay lại Vercel, cập nhật:
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend.railway.app
```
→ **Redeploy**

---

## ✅ Done!

- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.railway.app`

**Xem chi tiết trong `DEPLOY_SIMPLE.md`**

