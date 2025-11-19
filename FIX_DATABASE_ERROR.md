# 🔧 Fix Lỗi "relation users already exists"

## ✅ Đã Fix!

File `BACKEND/src/config/database.sql` đã được cập nhật để **tự động xóa tables cũ** trước khi tạo mới.

---

## 🚀 Bây Giờ Làm Gì

### **Bước 1: Mở Supabase SQL Editor**

1. Truy cập: https://supabase.com/dashboard
2. Chọn project: **zthdhnhbgccebdvgcsxh**
3. Click **SQL Editor** (icon database bên trái)
4. Click **"New query"**

### **Bước 2: Copy & Paste SQL Script**

1. Mở file `BACKEND/src/config/database.sql`
2. Copy **TOÀN BỘ** nội dung (Ctrl+A → Ctrl+C)
3. Paste vào SQL Editor (Ctrl+V)

### **Bước 3: Chạy Script**

1. Click **"Run"** (hoặc Ctrl+Enter)
2. Đợi ~5-10 giây
3. Thấy **"Success"** ✅

Script sẽ:
- ✅ Xóa tất cả tables cũ (nếu có)
- ✅ Tạo lại 9 tables mới
- ✅ Insert 10 categories

### **Bước 4: Kiểm Tra**

Vào **Table Editor** → Phải thấy **9 tables**:
- users
- surveys
- categories (10 rows)
- posts
- post_images
- likes
- comments
- saved_posts
- user_activities

---

## 🎯 Script Đã Được Cập Nhật

File `database.sql` bây giờ có:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables (TỰ ĐỘNG XÓA)
DROP TABLE IF EXISTS user_activities CASCADE;
DROP TABLE IF EXISTS saved_posts CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS post_images CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS surveys CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create tables...
```

---

## ✅ Sau Khi Chạy Xong

Database đã sẵn sàng! Bây giờ chạy backend:

```powershell
cd D:\Download\SMIMSO\BACKEND
npm run dev
```

Thấy:
```
╔═══════════════════════════════════════════════════════════╗
║   🚀 SMIMSO API Server                                    ║
║   Server running on: http://localhost:5000              ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🐛 Nếu Vẫn Lỗi

### ❌ "permission denied for schema public"

**Giải pháp**: Chạy lệnh này trước:

```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### ❌ "type vector does not exist"

**Giải pháp**: Script đã có lệnh bật extension. Nếu vẫn lỗi, chạy thủ công:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

**Chạy lại SQL script là OK!** 🎉

