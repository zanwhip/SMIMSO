# 🗄️ Setup Database - Hướng Dẫn Chi Tiết

## ✅ Đã Fix Lỗi "type vector does not exist"

File `BACKEND/src/config/database.sql` đã được cập nhật để tự động bật extension `pgvector`.

---

## 🚀 Cách Chạy SQL Script

### **Bước 1: Mở Supabase SQL Editor**

1. Truy cập: https://supabase.com/dashboard
2. Chọn project: **zthdhnhbgccebdvgcsxh**
3. Click **SQL Editor** (icon database bên trái)
4. Click **"New query"**

### **Bước 2: Copy & Paste SQL Script**

1. Mở file `BACKEND/src/config/database.sql` trên máy bạn
2. Copy **TOÀN BỘ** nội dung (Ctrl+A → Ctrl+C)
3. Paste vào SQL Editor (Ctrl+V)

### **Bước 3: Chạy Script**

1. Click nút **"Run"** (hoặc nhấn Ctrl+Enter)
2. Đợi ~5-10 giây
3. Thấy thông báo **"Success"** → OK!

### **Bước 4: Kiểm Tra**

1. Vào **Table Editor** (icon bảng bên trái)
2. Phải thấy **9 tables**:
   - ✅ users
   - ✅ surveys
   - ✅ categories
   - ✅ posts
   - ✅ post_images
   - ✅ likes
   - ✅ comments
   - ✅ saved_posts
   - ✅ user_activities

3. Click vào table **categories** → Phải thấy **10 rows** (10 categories đã được insert sẵn)

---

## 🎯 Nếu Gặp Lỗi

### ❌ Lỗi: "type vector does not exist"

**Nguyên nhân**: File SQL cũ chưa có lệnh bật pgvector extension.

**Giải pháp**: File đã được fix! Chạy lại từ Bước 2.

---

### ❌ Lỗi: "relation already exists"

**Nguyên nhân**: Bạn đã chạy script trước đó.

**Giải pháp**: Script có lệnh `DROP TABLE IF EXISTS` nên sẽ tự động xóa tables cũ. Chạy lại bình thường.

---

### ❌ Lỗi: "permission denied"

**Nguyên nhân**: Supabase project chưa được tạo đúng.

**Giải pháp**: 
1. Kiểm tra bạn đang ở đúng project
2. Đảm bảo bạn là owner của project

---

## ✅ Sau Khi Chạy Xong

File `.env` của bạn đã có đầy đủ thông tin:

```env
SUPABASE_URL=https://zthdhnhbgccebdvgcsxh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Bây giờ có thể chạy backend:

```bash
cd BACKEND
npm install
npm run dev
```

Thấy:
```
✓ Server is running on port 5000
```

→ **Thành công!** 🎉

---

## 📊 Database Schema Overview

### 1. **users** - Người dùng
- Lưu thông tin tài khoản
- Email, phone, password
- Google OAuth support

### 2. **surveys** - Khảo sát
- Sở thích người dùng
- Mục đích sử dụng
- Nguồn biết đến

### 3. **categories** - Danh mục (10 categories)
- Art & Design
- Photography
- Fashion
- Food & Drink
- Travel
- Technology
- Home Decor
- DIY & Crafts
- Fitness & Health
- Education

### 4. **posts** - Bài đăng
- Tiêu đề, mô tả
- Category
- User

### 5. **post_images** - Hình ảnh
- URL ảnh
- **CLIP embeddings** (vector 512 chiều) cho AI
- Caption tự động

### 6. **likes** - Lượt thích
- User + Post

### 7. **comments** - Bình luận
- Hỗ trợ reply (parent_comment_id)

### 8. **saved_posts** - Bài đã lưu
- User + Post

### 9. **user_activities** - Hoạt động
- Lịch sử xem, like, comment
- Dùng cho AI recommendations

---

## 🔍 Kiểm Tra Dữ Liệu

Chạy query này trong SQL Editor để xem categories:

```sql
SELECT * FROM categories ORDER BY name;
```

Kết quả phải có 10 rows.

---

**Database đã sẵn sàng!** ✅

