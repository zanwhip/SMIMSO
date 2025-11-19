# 🚀 START HERE - Chạy Dự Án

## ✅ Đã Fix Lỗi TypeScript

File `BACKEND/src/utils/jwt.ts` đã được sửa để tương thích với `jsonwebtoken`.

---

## 🎯 Bây Giờ Làm Gì

### **Bước 1: Chạy Backend**

Mở **PowerShell** hoặc **Terminal** và chạy:

```powershell
cd D:\Download\SMIMSO\BACKEND
npm run dev
```

Đợi thấy:
```
╔═══════════════════════════════════════════════════════════╗
║   🚀 SMIMSO API Server                                    ║
║   Server running on: http://localhost:5000              ║
╚═══════════════════════════════════════════════════════════╝
```

✅ **Backend đã chạy!**

---

### **Bước 2: Chạy Frontend**

Mở **PowerShell/Terminal MỚI** (giữ terminal backend đang chạy) và chạy:

```powershell
cd D:\Download\SMIMSO\FRONTEND
npm run dev
```

Đợi thấy:
```
✓ ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

✅ **Frontend đã chạy!**

---

### **Bước 3: Mở Browser**

Truy cập: **http://localhost:3000**

Bạn sẽ thấy trang đăng nhập! 🎉

---

## 🐛 Nếu Gặp Lỗi

### ❌ Backend: "type vector does not exist"

**Giải pháp**: Chạy lại SQL script trong Supabase SQL Editor.

File `BACKEND/src/config/database.sql` đã được fix, có lệnh:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

### ❌ Backend: "Unable to compile TypeScript"

**Giải pháp**: File đã được fix! Nếu vẫn lỗi, xóa cache:

```powershell
cd BACKEND
Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue
npm run dev
```

---

### ❌ Backend: "SUPABASE_URL is not defined"

**Giải pháp**: Kiểm tra file `BACKEND/.env` đã điền đúng thông tin Supabase chưa.

---

### ❌ Frontend: "Failed to fetch"

**Giải pháp**: 
1. Kiểm tra backend đang chạy tại http://localhost:5000
2. Kiểm tra `FRONTEND/.env.local` có dòng:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

---

## ✅ Checklist

- [ ] Đã chạy SQL script trong Supabase (9 tables)
- [ ] Đã điền `BACKEND/.env` (3 dòng Supabase + JWT_SECRET)
- [ ] Backend chạy tại http://localhost:5000
- [ ] Frontend chạy tại http://localhost:3000
- [ ] Mở browser http://localhost:3000
- [ ] Thấy trang đăng nhập
- [ ] ✅ Done!

---

## 📝 File Đã Fix

1. ✅ `BACKEND/src/config/database.sql` - Thêm `CREATE EXTENSION vector`
2. ✅ `BACKEND/src/utils/jwt.ts` - Fix TypeScript error với jsonwebtoken
3. ✅ `BACKEND/.env` - Đã có JWT_SECRET mạnh

---

## 🎯 Tóm Tắt

| Terminal | Command | URL |
|----------|---------|-----|
| Terminal 1 | `cd BACKEND && npm run dev` | http://localhost:5000 |
| Terminal 2 | `cd FRONTEND && npm run dev` | http://localhost:3000 |

**Chỉ cần 2 terminals!** 🚀

---

Made with ❤️ for SMIMSO

