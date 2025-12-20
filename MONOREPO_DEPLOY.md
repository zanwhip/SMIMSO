# 📦 Deploy Monorepo (BE + FE chung 1 repo)

## 🎯 Cấu trúc repo

```
SMIMSO/
├── BACKEND/          # Backend code
│   ├── src/
│   ├── package.json
│   └── ...
├── FRONTEND/         # Frontend code
│   ├── src/
│   ├── package.json
│   └── ...
└── ...
```

---

## 🎨 Frontend - Vercel (Monorepo)

### Cách 1: Qua Dashboard

1. **Import Project**
   - Vào [vercel.com](https://vercel.com)
   - **New Project** → Chọn repo

2. **Cấu hình Root Directory** (QUAN TRỌNG)
   - Click **"Configure Project"** hoặc **"Edit"**
   - Tìm **"Root Directory"** (có thể ở phần Advanced)
   - Chọn hoặc nhập: `FRONTEND`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (tự động)
   - **Output Directory**: `.next` (tự động)

3. **Deploy**

### Cách 2: Qua Vercel CLI

```bash
cd FRONTEND
vercel
# Khi hỏi "What's your project's root directory?", chọn FRONTEND
```

### Cách 3: Tạo `vercel.json` trong FRONTEND

Tạo file `FRONTEND/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

---

## 🔧 Backend - Railway (Monorepo)

### Cách 1: Qua Dashboard

1. **New Project** → **Deploy from GitHub repo**
2. Chọn repo
3. **Cấu hình Root Directory**:
   - Vào **Settings** → **Source**
   - **Root Directory**: Nhập `BACKEND`
   - Hoặc vào **Variables** → Thêm:
     ```
     RAILWAY_SOURCE_DIR=BACKEND
     ```
4. **Build Settings**:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Cách 2: Dùng `railway.json`

File `BACKEND/railway.json` đã có sẵn:

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

Railway sẽ tự động detect file này nếu đặt trong `BACKEND/`.

---

## 🔧 Backend - Render (Monorepo Alternative)

1. **New Web Service** → Connect GitHub
2. Cấu hình:
   - **Root Directory**: `BACKEND`
   - **Build Command**: `cd BACKEND && npm install && npm run build`
   - **Start Command**: `cd BACKEND && npm start`

---

## ✅ Checklist cho Monorepo

### Vercel (Frontend)
- [ ] Root Directory = `FRONTEND`
- [ ] Framework = Next.js
- [ ] Build command chạy được
- [ ] Environment variables đã thêm

### Railway (Backend)
- [ ] Root Directory = `BACKEND` (trong Settings → Source)
- [ ] Build command = `npm install && npm run build`
- [ ] Start command = `npm start`
- [ ] Environment variables đã thêm

---

## 🐛 Troubleshooting Monorepo

### Vercel không tìm thấy Next.js

**Nguyên nhân**: Root Directory chưa được set
**Giải pháp**: 
- Vào Settings → General → Root Directory → Set `FRONTEND`
- Redeploy

### Railway build failed

**Nguyên nhân**: Đang build ở root thay vì BACKEND
**Giải pháp**:
- Vào Settings → Source → Root Directory → Set `BACKEND`
- Hoặc thêm variable: `RAILWAY_SOURCE_DIR=BACKEND`

### Build command không chạy đúng thư mục

**Giải pháp**: Thêm `cd` vào build command:
- Railway: `cd BACKEND && npm install && npm run build`
- Render: `cd BACKEND && npm install && npm run build`

---

## 💡 Tips cho Monorepo

1. **Root Directory là bắt buộc** khi BE và FE chung repo
2. **Vercel**: Root Directory ở Settings → General
3. **Railway**: Root Directory ở Settings → Source hoặc dùng variable
4. **Render**: Root Directory ở Build Settings
5. Luôn kiểm tra logs để đảm bảo build đúng thư mục

---

**Xem thêm**: `QUICK_DEPLOY.md` hoặc `DEPLOY_SIMPLE.md`



