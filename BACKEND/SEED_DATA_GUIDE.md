# 🌱 Hướng Dẫn Seed Data - SMIMSO

## 📋 Tổng Quan

File này hướng dẫn cách seed (tạo dữ liệu mẫu) cho database SMIMSO.

---

## 🎯 Dữ Liệu Mẫu Bao Gồm:

- ✅ **10 Categories** - Các danh mục (Thiết kế, Nhiếp ảnh, Công nghệ, etc.)
- ✅ **10 Users** - Người dùng mẫu (password: `Password123!`)
- ✅ **5 Surveys** - Khảo sát của một số users
- ✅ **15 Posts** - Bài viết mẫu với đa dạng nội dung
- ✅ **25+ Post Images** - Hình ảnh từ Unsplash
- ✅ **20+ Likes** - Lượt thích
- ✅ **15+ Comments** - Bình luận
- ✅ **7 Saved Posts** - Bài viết đã lưu
- ✅ **10+ User Activities** - Hoạt động người dùng

---

## 🚀 Cách 1: Seed Bằng Supabase SQL Editor (Khuyến Nghị)

### **Bước 1: Mở Supabase Dashboard**

1. Truy cập: https://supabase.com/dashboard
2. Chọn project của bạn
3. Click **SQL Editor** (bên trái)

### **Bước 2: Chạy SQL Script**

1. Click **New query**
2. Mở file `BACKEND/src/config/seed.sql`
3. Copy **TOÀN BỘ** nội dung
4. Paste vào SQL Editor
5. Click **Run** (hoặc Ctrl+Enter)
6. Đợi thấy **"Success. No rows returned"** ✅

### **Bước 3: Kiểm Tra Dữ Liệu**

Vào **Table Editor** → Kiểm tra các tables:

- **categories**: Phải có 10 rows
- **users**: Phải có 10 rows
- **posts**: Phải có 15 rows
- **post_images**: Phải có 25+ rows
- **likes**: Phải có 20+ rows
- **comments**: Phải có 15+ rows

---

## 🔧 Cách 2: Seed Bằng Script Node.js

### **Chạy Script:**

```powershell
cd D:\Download\SMIMSO\BACKEND
npm run seed
```

### **Kết Quả:**

```
🌱 Starting database seeding...
📄 Reading seed.sql file...
📊 Found X SQL statements to execute

⏳ Executing statement 1/X...
✅ Statement 1 executed successfully
...

🎉 Seeding completed!
✅ Successful: X
⚠️  Errors/Skipped: 0
```

**Lưu ý:** Script này có thể gặp lỗi do Supabase không hỗ trợ RPC `exec_sql`. Nếu gặp lỗi, hãy dùng **Cách 1** (SQL Editor).

---

## 👥 Danh Sách Users Mẫu

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

---

## 📝 Danh Sách Posts Mẫu

1. **Xu hướng AI 2024** - Công nghệ
2. **React vs Vue: So sánh chi tiết** - Công nghệ
3. **Bảng màu Pastel 2024** - Thiết kế
4. **UI/UX Trends** - Thiết kế
5. **Chụp ảnh phong cảnh Đà Lạt** - Nhiếp ảnh
6. **Kỹ thuật chụp chân dung** - Nhiếp ảnh
7. **Thiết kế nhà phố hiện đại** - Kiến trúc
8. **Nội thất tối giản** - Kiến trúc
9. **Học guitar cơ bản** - Âm nhạc
10. **Top 10 bài hát hay nhất** - Âm nhạc
11. **Tranh sơn dầu phong cảnh** - Nghệ thuật
12. **Street style Hàn Quốc** - Thời trang
13. **Công thức làm bánh mì** - Ẩm thực
14. **Phú Quốc - Thiên đường biển** - Du lịch
15. **Bài tập Yoga buổi sáng** - Thể thao

---

## 🔄 Reset Database (Xóa Dữ Liệu Cũ)

Nếu muốn xóa dữ liệu cũ và seed lại:

### **Cách 1: Chạy Lại database.sql**

1. Mở `BACKEND/src/config/database.sql`
2. Copy toàn bộ nội dung
3. Paste vào Supabase SQL Editor
4. Run → Sẽ DROP và tạo lại tất cả tables

### **Cách 2: Xóa Thủ Công**

Vào **Table Editor** → Chọn table → Click **...** → **Truncate table**

---

## ⚠️ Lưu Ý Quan Trọng

1. **Password Hash**: Tất cả users có password `Password123!` nhưng hash trong SQL là mẫu. Để login được, bạn cần:
   - Đăng ký user mới qua API `/api/auth/register`
   - Hoặc update password_hash bằng bcrypt thật

2. **Images**: Sử dụng ảnh từ Unsplash (placeholder). Trong production nên upload ảnh thật lên Supabase Storage.

3. **UUIDs**: Đã dùng UUIDs cố định để dễ test. Trong production nên để database tự generate.

4. **Categories**: Đã có sẵn 10 categories. Nếu chạy lại seed.sql sẽ bị duplicate. Hãy DROP tables trước.

---

## 🧪 Test Sau Khi Seed

### **1. Test Login:**

```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "email": "nguyen.van.a@gmail.com",
    "password": "Password123!"
  }'
```

**Lưu ý:** Sẽ fail vì password hash là mẫu. Hãy đăng ký user mới.

### **2. Test Get Posts:**

```powershell
curl http://localhost:5000/api/posts
```

Phải trả về 15 posts.

### **3. Test Get Categories:**

```powershell
curl http://localhost:5000/api/options/categories
```

Phải trả về 10 categories.

---

## 🎉 Hoàn Thành!

Sau khi seed xong, bạn có thể:

1. ✅ Test API với dữ liệu mẫu
2. ✅ Phát triển frontend với dữ liệu thật
3. ✅ Demo ứng dụng cho khách hàng
4. ✅ Test các tính năng like, comment, save

---

**Happy Coding! 🚀**

