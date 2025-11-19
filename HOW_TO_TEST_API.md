# 🧪 Hướng Dẫn Kiểm Tra Toàn Bộ API

## 📊 Tổng Quan

SMIMSO có **28 API endpoints** chia thành **6 modules**:

| Module | Endpoints | Auth Required |
|--------|-----------|---------------|
| **Auth** | 4 | 1/4 |
| **Survey** | 4 | 4/4 |
| **Posts** | 11 | 6/11 |
| **Users** | 6 | 6/6 |
| **Options** | 3 | 0/3 |
| **Health** | 1 | 0/1 |

---

## 🚀 Cách 1: Test Tự Động (Khuyến Nghị)

### **Chạy PowerShell Script**

```powershell
# Đảm bảo backend đang chạy
cd D:\Download\SMIMSO\BACKEND
npm run dev

# Mở terminal mới và chạy test
cd D:\Download\SMIMSO
.\test-api.ps1
```

**Script sẽ tự động:**
- ✅ Kiểm tra server health
- ✅ Test Options API (jobs, categories)
- ✅ Đăng ký user mới với timestamp
- ✅ Đăng nhập
- ✅ Submit survey
- ✅ Test posts API
- ✅ Like, comment, save post
- ✅ Test users API
- ✅ Hiển thị kết quả chi tiết

**Kết quả mong đợi:**
```
╔═══════════════════════════════════════════════════════════╗
║          🧪 SMIMSO API Testing Script                    ║
╚═══════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  HEALTH CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Testing: Health Check
  → GET http://localhost:5000/api/health
  ✅ SUCCESS

...

╔═══════════════════════════════════════════════════════════╗
║                  ✅ TEST COMPLETED                        ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🔧 Cách 2: Test Bằng Postman

### **Bước 1: Import Collection**

1. Mở Postman
2. Click **Import**
3. Chọn file `SMIMSO.postman_collection.json`
4. Click **Import**

### **Bước 2: Cấu Hình Variables**

1. Click vào collection **SMIMSO API**
2. Chọn tab **Variables**
3. Đảm bảo:
   - `baseUrl` = `http://localhost:5000/api`
   - `token` = (để trống, sẽ tự động set sau khi login)

### **Bước 3: Test Theo Thứ Tự**

#### **1. Health Check**
- Chạy request **Health Check**
- Phải thấy `"success": true`

#### **2. Options API**
- Chạy **Get All Options**
- Chạy **Get Job Options** → Phải có 14 jobs
- Chạy **Get Categories** → Phải có 10 categories

#### **3. Auth - Register**
- Chạn **Register**
- Copy `token` từ response
- Paste vào collection variable `token`

#### **4. Auth - Login**
- Chạy **Login**
- Verify token giống với register

#### **5. Auth - Get Me**
- Chạy **Get Current User**
- Phải thấy thông tin user vừa đăng ký

#### **6. Survey**
- Chạy **Check Survey Status** → `hasCompletedSurvey: false`
- Chạy **Submit Survey**
- Chạy **Get User Survey** → Phải thấy survey vừa submit
- Chạy lại **Check Survey Status** → `hasCompletedSurvey: true`

#### **7. Posts**
- Chạy **Get All Posts**
- Copy `id` của post đầu tiên
- Thay `:postId` trong các request khác
- Chạy **Get Post Detail**
- Chạy **Like Post**
- Chạy **Add Comment**

#### **8. Users**
- Chạy **Get User Profile**
- Chạy **Update Profile**

---

## 🖥️ Cách 3: Test Bằng PowerShell (Thủ Công)

### **Bước 1: Kiểm Tra Server**

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
```

### **Bước 2: Test Options API**

```powershell
# Get all options
Invoke-RestMethod -Uri "http://localhost:5000/api/options" -Method GET

# Get jobs
$jobs = Invoke-RestMethod -Uri "http://localhost:5000/api/options/jobs" -Method GET
Write-Host "Found $($jobs.data.Count) jobs"

# Get categories
$categories = Invoke-RestMethod -Uri "http://localhost:5000/api/options/categories" -Method GET
Write-Host "Found $($categories.data.Count) categories"
```

### **Bước 3: Đăng Ký User**

```powershell
$registerBody = @{
    email = "test123@example.com"
    phone = "0123456789"
    password = "123456"
    confirmPassword = "123456"
    first_name = "Test"
    last_name = "User"
    date_of_birth = "2000-01-01"
    job = "developer"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json"

# Lưu token
$token = $response.data.token
Write-Host "Token: $token"
```

### **Bước 4: Test Với Token**

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

# Get current user
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method GET -Headers $headers

# Get profile
Invoke-RestMethod -Uri "http://localhost:5000/api/users/profile" -Method GET -Headers $headers

# Submit survey
$surveyBody = @{
    favorite_categories = @($categories.data[0].value, $categories.data[1].value)
    purpose = "inspiration"
    how_did_you_know = "google"
    expectation = "high"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/survey" -Method POST -Body $surveyBody -ContentType "application/json" -Headers $headers
```

---

## 🌐 Cách 4: Test Bằng Browser

### **Public Endpoints (Mở trực tiếp trong browser):**

```
http://localhost:5000/api/health
http://localhost:5000/api/options
http://localhost:5000/api/options/jobs
http://localhost:5000/api/options/categories
http://localhost:5000/api/posts
```

### **Protected Endpoints (Dùng Browser Console):**

1. Mở http://localhost:3000
2. Đăng ký/đăng nhập
3. Mở Console (F12)
4. Chạy:

```javascript
// Get token from localStorage
const token = localStorage.getItem('token');

// Test API
fetch('http://localhost:5000/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log(data));
```

---

## 📋 Checklist Kiểm Tra

### **✅ Health & Options**
- [ ] GET /api/health → Success
- [ ] GET /api/options → 5 option types
- [ ] GET /api/options/jobs → 14 jobs
- [ ] GET /api/options/categories → 10 categories

### **✅ Auth**
- [ ] POST /api/auth/register → User created + token
- [ ] POST /api/auth/login → Token returned
- [ ] GET /api/auth/me → User info returned
- [ ] Invalid token → 401 error

### **✅ Survey**
- [ ] GET /api/survey/status → hasCompletedSurvey: false
- [ ] POST /api/survey → Survey created
- [ ] GET /api/survey → Survey returned
- [ ] GET /api/survey/status → hasCompletedSurvey: true

### **✅ Posts**
- [ ] GET /api/posts → List of posts
- [ ] GET /api/posts/:id → Post detail
- [ ] POST /api/posts/:id/like → Like added
- [ ] POST /api/posts/:id/comments → Comment added
- [ ] GET /api/posts/:id/comments → Comments returned
- [ ] POST /api/posts/:id/save → Post saved

### **✅ Users**
- [ ] GET /api/users/profile → Profile returned
- [ ] PUT /api/users/profile → Profile updated
- [ ] GET /api/users/activities → Activities returned
- [ ] GET /api/users/liked-posts → Liked posts returned

---

## 🐛 Troubleshooting

### **Lỗi: "Unable to connect"**
```powershell
# Kiểm tra backend có chạy không
cd D:\Download\SMIMSO\BACKEND
npm run dev
```

### **Lỗi: "401 Unauthorized"**
```powershell
# Token hết hạn hoặc sai, đăng nhập lại
$loginBody = @{
    emailOrPhone = "test@example.com"
    password = "123456"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $response.data.token
```

### **Lỗi: "User already exists"**
```powershell
# Dùng email khác hoặc xóa user trong Supabase
DELETE FROM users WHERE email = 'test@example.com';
```

---

## 📚 Tài Liệu Liên Quan

- `API_TEST_GUIDE.md` - Chi tiết tất cả API endpoints
- `OPTIONS_API_GUIDE.md` - Hướng dẫn Options API
- `test-api.ps1` - Script test tự động
- `SMIMSO.postman_collection.json` - Postman collection

---

**Chúc bạn test thành công!** 🎉

