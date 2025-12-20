# ✅ Production Deployment Checklist

## 🔧 Pre-Deployment

### Backend

- [x] ✅ Code đã được clean (xóa console.log, comments không cần thiết)
- [x] ✅ TypeScript build thành công không có lỗi
- [x] ✅ Tất cả environment variables đã được document trong `.env.example`
- [x] ✅ Supabase Storage integration đã được implement
- [ ] ⚠️ **Cần làm**: Setup Supabase Storage bucket và policies
- [ ] ⚠️ **Cần làm**: Tạo JWT_SECRET mạnh (32+ characters)
- [ ] ⚠️ **Cần làm**: Cấu hình CORS với đúng frontend URL

### Frontend

- [x] ✅ Code đã được clean
- [x] ✅ Next.js build thành công không có lỗi
- [x] ✅ TypeScript errors đã được fix
- [x] ✅ Tất cả environment variables đã được document
- [ ] ⚠️ **Cần làm**: Cấu hình `next.config.js` với đúng image domains

## 🗄️ Database & Storage

- [ ] ⚠️ **Cần làm**: Chạy tất cả database migrations trong Supabase
- [ ] ⚠️ **Cần làm**: Tạo Supabase Storage bucket `uploads`
- [ ] ⚠️ **Cần làm**: Cấu hình Storage policies:
  - INSERT policy cho authenticated users
  - SELECT policy cho public read
- [ ] ⚠️ **Cần làm**: Test upload/download files

## 🔐 Security

- [ ] ⚠️ **Cần làm**: Đảm bảo JWT_SECRET là random và mạnh
- [ ] ⚠️ **Cần làm**: Đảm bảo SUPABASE_SERVICE_ROLE_KEY được bảo mật
- [ ] ⚠️ **Cần làm**: Cấu hình CORS đúng với production domains
- [ ] ⚠️ **Cần làm**: Enable HTTPS/SSL cho cả backend và frontend
- [ ] ⚠️ **Cần làm**: Review và test authentication flows

## 📦 Environment Variables

### Backend (.env)

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend.vercel.app

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=uploads

JWT_SECRET=your-strong-secret-32-chars-minimum
JWT_EXPIRES_IN=30d

# Optional
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:...
```

### Frontend (Vercel Environment Variables)

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend.railway.app
NEXTAUTH_SECRET=random-secret-string
NEXTAUTH_URL=https://your-frontend.vercel.app

# Optional
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
```

## 🚀 Deployment Steps

### 1. Backend (Railway/Render/VPS)

1. [ ] Push code lên GitHub
2. [ ] Tạo project trên Railway/Render
3. [ ] Cấu hình Root Directory: `BACKEND`
4. [ ] Thêm tất cả environment variables
5. [ ] Deploy và kiểm tra logs
6. [ ] Test API endpoints
7. [ ] Test file upload/download

### 2. Frontend (Vercel)

1. [ ] Push code lên GitHub
2. [ ] Tạo project trên Vercel
3. [ ] Cấu hình Root Directory: `FRONTEND`
4. [ ] Thêm tất cả environment variables
5. [ ] Deploy và kiểm tra build logs
6. [ ] Test các chức năng chính

### 3. Supabase Setup

1. [ ] Tạo Storage bucket `uploads`
2. [ ] Cấu hình bucket là Public
3. [ ] Tạo Storage policies:
   ```sql
   -- INSERT Policy
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'uploads');
   
   -- SELECT Policy
   CREATE POLICY "Allow public read"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'uploads');
   ```
4. [ ] Test upload file qua API

## 🧪 Testing Checklist

### Backend API

- [ ] Health check endpoint: `GET /api/health`
- [ ] Authentication: Login, Register, Google OAuth
- [ ] Posts: Create, Read, Update, Delete
- [ ] File upload: Images, Avatars, Covers
- [ ] Search: Text search, Image search
- [ ] Chat: WebSocket connection, Messages
- [ ] Notifications: Push notifications

### Frontend

- [ ] Homepage loads correctly
- [ ] Authentication flows work
- [ ] Image upload works
- [ ] Posts display correctly
- [ ] Search functionality
- [ ] Chat real-time updates
- [ ] Responsive design on mobile

## 📊 Monitoring

- [ ] Setup error logging (Sentry, LogRocket, etc.)
- [ ] Monitor API response times
- [ ] Monitor storage usage
- [ ] Setup uptime monitoring
- [ ] Monitor database performance

## 🔄 Post-Deployment

- [ ] Test tất cả chức năng chính
- [ ] Kiểm tra performance
- [ ] Setup backup strategy cho database
- [ ] Document API endpoints
- [ ] Setup CI/CD pipeline (optional)

## ⚠️ Important Notes

1. **JWT_SECRET**: Phải là random string mạnh, ít nhất 32 ký tự
2. **SUPABASE_SERVICE_ROLE_KEY**: Không bao giờ expose trong frontend
3. **CORS**: Chỉ cho phép domain production
4. **Storage**: Đảm bảo bucket policies đúng
5. **Environment Variables**: Không commit `.env` files

## 📝 Quick Commands

```bash
# Backend build
cd BACKEND
npm install
npm run build
npm start

# Frontend build
cd FRONTEND
npm install
npm run build
npm start

# Check for console.log
grep -r "console\." BACKEND/src FRONTEND/src
```

## 🆘 Troubleshooting

### Backend không start
- Kiểm tra environment variables
- Kiểm tra Supabase connection
- Kiểm tra PORT không bị conflict

### File upload không work
- Kiểm tra Supabase Storage bucket đã tạo chưa
- Kiểm tra Storage policies
- Kiểm tra SUPABASE_SERVICE_ROLE_KEY

### Frontend build fail
- Kiểm tra TypeScript errors
- Kiểm tra environment variables
- Kiểm tra Next.js config

---

**Status**: ✅ Code ready, ⚠️ Cần setup infrastructure

