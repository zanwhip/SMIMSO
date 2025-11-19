# 🐛 Debug Lỗi Đăng Ký

## 🔍 Cách Kiểm Tra Lỗi

### **Bước 1: Mở Browser Console**

1. Mở trang đăng ký: http://localhost:3000/register
2. Nhấn **F12** hoặc **Ctrl+Shift+I**
3. Chọn tab **Console**
4. Chọn tab **Network**

### **Bước 2: Thử Đăng Ký**

Điền form và click "Đăng ký"

### **Bước 3: Xem Lỗi**

#### **Trong Console Tab:**
- Có lỗi màu đỏ không?
- Copy lỗi và gửi cho tôi

#### **Trong Network Tab:**
- Tìm request **register** (màu đỏ nếu lỗi)
- Click vào request đó
- Chọn tab **Response**
- Copy nội dung response

#### **Trong Terminal Backend:**
- Có lỗi gì in ra không?
- Copy lỗi

---

## 🔧 Các Lỗi Thường Gặp

### ❌ **Lỗi 1: "Failed to fetch" hoặc "Network Error"**

**Nguyên nhân**: Frontend không kết nối được Backend

**Kiểm tra**:
1. Backend có đang chạy không? (http://localhost:5000)
2. File `FRONTEND/.env.local` có đúng không?
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

**Giải pháp**:
```powershell
# Terminal 1 - Backend
cd D:\Download\SMIMSO\BACKEND
npm run dev

# Terminal 2 - Frontend
cd D:\Download\SMIMSO\FRONTEND
npm run dev
```

---

### ❌ **Lỗi 2: "User with this email already exists"**

**Nguyên nhân**: Email đã được đăng ký

**Giải pháp**: Dùng email khác hoặc xóa user cũ trong Supabase:

```sql
-- Chạy trong Supabase SQL Editor
DELETE FROM users WHERE email = 'your-email@example.com';
```

---

### ❌ **Lỗi 3: "Passwords do not match"**

**Nguyên nhân**: Mật khẩu và xác nhận mật khẩu không giống nhau

**Giải pháp**: Nhập lại cho khớp

---

### ❌ **Lỗi 4: "Failed to create user"**

**Nguyên nhân**: Lỗi database

**Kiểm tra**:
1. Đã chạy SQL script chưa?
2. Vào Supabase → Table Editor → Có table `users` không?

**Giải pháp**: Chạy lại SQL script

---

### ❌ **Lỗi 5: CORS Error**

**Nguyên nhân**: Backend chưa cho phép Frontend truy cập

**Kiểm tra**: File `BACKEND/.env` có dòng:
```
FRONTEND_URL=http://localhost:3000
```

**Giải pháp**: Thêm dòng trên vào `.env` và restart backend

---

## 🧪 Test Backend Trực Tiếp

Dùng PowerShell để test API:

```powershell
# Test register endpoint
$body = @{
    email = "test@example.com"
    password = "123456"
    confirmPassword = "123456"
    first_name = "Test"
    last_name = "User"
    date_of_birth = "2000-01-01"
    job = "Developer"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
```

**Kết quả mong đợi**:
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Registration successful"
}
```

**Nếu lỗi**: Copy lỗi và gửi cho tôi

---

## 📋 Checklist Debug

- [ ] Backend đang chạy (http://localhost:5000)
- [ ] Frontend đang chạy (http://localhost:3000)
- [ ] Database đã có 9 tables
- [ ] File `.env` đã điền đúng
- [ ] Browser Console không có lỗi CORS
- [ ] Network tab thấy request đến `/api/auth/register`
- [ ] Response có status code gì? (200, 400, 500?)

---

## 🆘 Gửi Thông Tin Debug

Nếu vẫn lỗi, gửi cho tôi:

1. **Screenshot Browser Console** (tab Console + Network)
2. **Lỗi trong Terminal Backend**
3. **Response từ API** (trong Network tab)
4. **Thông tin đã điền** (email, password length, etc.)

---

## ✅ Test Nhanh

Thử đăng ký với thông tin này:

```
Email: test123@example.com
Phone: (để trống)
Password: 123456
Confirm Password: 123456
Họ: Nguyễn
Tên: Văn A
Ngày sinh: 2000-01-01
Nghề nghiệp: Developer
```

Nếu thành công → Chuyển sang trang Survey ✅
Nếu lỗi → Gửi thông tin debug cho tôi

