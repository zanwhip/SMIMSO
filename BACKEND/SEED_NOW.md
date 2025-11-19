# 🌱 SEED DATA NGAY BÂY GIỜ!

## 🚀 Cách Nhanh Nhất (Khuyến Nghị)

### **Bước 1: Mở Supabase SQL Editor**

1. Truy cập: **https://supabase.com/dashboard**
2. Đăng nhập
3. Chọn project: **zthdhnhbgccebdvgcsxh**
4. Click **SQL Editor** (menu bên trái)
5. Click **New query**

### **Bước 2: Copy Seed SQL**

1. Mở file: `BACKEND/src/config/seed.sql`
2. **Copy TOÀN BỘ** nội dung (267 dòng)
3. Paste vào SQL Editor

### **Bước 3: Run!**

1. Click **Run** (hoặc nhấn `Ctrl + Enter`)
2. Đợi 5-10 giây
3. Thấy **"Success. No rows returned"** ✅

### **Bước 4: Kiểm Tra**

Vào **Table Editor** → Kiểm tra:

- **categories**: 10 rows ✅
- **users**: 10 rows ✅
- **posts**: 15 rows ✅
- **post_images**: 25+ rows ✅
- **likes**: 20+ rows ✅
- **comments**: 15+ rows ✅

---

## 🎯 Dữ Liệu Sẽ Được Tạo:

✅ **10 Categories:**
- Thiết kế, Nhiếp ảnh, Công nghệ, Nghệ thuật, Kiến trúc
- Thời trang, Ẩm thực, Du lịch, Âm nhạc, Thể thao

✅ **10 Users:**
- Email: `nguyen.van.a@gmail.com` → `ngo.thi.k@gmail.com`
- Password: `Password123!` (tất cả users)

✅ **15 Posts:**
- Đa dạng chủ đề: AI, React, Design, Photography, etc.

✅ **25+ Images:**
- Từ Unsplash (placeholder)

✅ **20+ Likes, 15+ Comments, 7 Saved Posts**

---

## 🔧 Cách 2: Dùng Script Node.js

```powershell
cd BACKEND
npm run seed
```

**Lưu ý:** Có thể gặp lỗi do Supabase không hỗ trợ RPC `exec_sql`. Nếu lỗi, dùng **Cách 1**.

---

## ⚠️ Lưu Ý Quan Trọng

### **1. Password Hash:**

Users trong seed data có password hash **MẪU**, không thể login được!

**Để login được, bạn cần:**

**Option A: Đăng ký user mới qua API**
```powershell
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test@gmail.com",
    "password": "Password123!",
    "full_name": "Test User",
    "job": "developer"
  }'
```

**Option B: Update password hash trong database**

1. Tạo hash mới:
```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('Password123!', 10);
console.log(hash);
```

2. Update trong Supabase SQL Editor:
```sql
UPDATE users 
SET password_hash = '$2a$10$...' 
WHERE email = 'nguyen.van.a@gmail.com';
```

### **2. Nếu Chạy Lại Seed:**

Sẽ bị lỗi **duplicate key** vì UUIDs cố định.

**Giải pháp:**

**Option A: Xóa dữ liệu cũ**
```sql
-- Chạy trong Supabase SQL Editor
TRUNCATE TABLE user_activities CASCADE;
TRUNCATE TABLE saved_posts CASCADE;
TRUNCATE TABLE comments CASCADE;
TRUNCATE TABLE likes CASCADE;
TRUNCATE TABLE post_images CASCADE;
TRUNCATE TABLE posts CASCADE;
TRUNCATE TABLE surveys CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE categories CASCADE;
```

**Option B: Drop và tạo lại tables**
```powershell
# Copy nội dung từ BACKEND/src/config/database.sql
# Paste vào Supabase SQL Editor
# Run
```

---

## 🧪 Test Sau Khi Seed

### **1. Test Get Posts:**

```powershell
curl http://localhost:5000/api/posts
```

**Kết quả:** Phải trả về 15 posts

### **2. Test Get Categories:**

```powershell
curl http://localhost:5000/api/options/categories
```

**Kết quả:** Phải trả về 10 categories

### **3. Test Register (Tạo user mới):**

```powershell
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "email": "myemail@gmail.com",
    "password": "Password123!",
    "full_name": "My Name",
    "job": "developer"
  }'
```

### **4. Test Login:**

```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "email": "myemail@gmail.com",
    "password": "Password123!"
  }'
```

---

## 📊 Danh Sách Users Mẫu

| Email | Password | Tên | Công việc |
|-------|----------|-----|-----------|
| nguyen.van.a@gmail.com | Password123! | Nguyễn Văn A | Lập trình viên |
| tran.thi.b@gmail.com | Password123! | Trần Thị B | Designer |
| le.van.c@gmail.com | Password123! | Lê Văn C | Nhiếp ảnh gia |
| pham.thi.d@gmail.com | Password123! | Phạm Thị D | Kiến trúc sư |
| hoang.van.e@gmail.com | Password123! | Hoàng Văn E | Sinh viên |
| vo.thi.f@gmail.com | Password123! | Võ Thị F | Nghệ sĩ |
| dang.van.g@gmail.com | Password123! | Đặng Văn G | Content Creator |
| bui.thi.h@gmail.com | Password123! | Bùi Thị H | Marketing |
| do.van.i@gmail.com | Password123! | Đỗ Văn I | Freelancer |
| ngo.thi.k@gmail.com | Password123! | Ngô Thị K | Teacher |

**⚠️ Lưu ý:** Password hash là mẫu, không login được! Hãy đăng ký user mới.

---

## 🎉 Hoàn Thành!

Sau khi seed xong:

1. ✅ Vào **Table Editor** kiểm tra data
2. ✅ Test API với `curl`
3. ✅ Đăng ký user mới để login
4. ✅ Chạy Frontend để xem posts

---

**Bây giờ hãy mở Supabase SQL Editor và seed data ngay!** 🚀

