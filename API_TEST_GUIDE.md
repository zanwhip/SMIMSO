# 🧪 API Testing Guide - SMIMSO

## 📋 Tổng Quan API

Dự án có **6 modules chính**:
1. **Auth** - Xác thực người dùng
2. **Survey** - Khảo sát người dùng
3. **Posts** - Quản lý bài viết
4. **Users** - Quản lý người dùng
5. **Options** - Lấy danh sách options
6. **Health** - Kiểm tra server

---

## 🔐 1. AUTH API (`/api/auth`)

### **POST /api/auth/register** - Đăng ký
```powershell
$body = @{
    email = "test@example.com"
    phone = "0123456789"
    password = "123456"
    confirmPassword = "123456"
    first_name = "Nguyen"
    last_name = "Van A"
    date_of_birth = "2000-01-01"
    job = "developer"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
$token = $response.data.token
Write-Host "Token: $token"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "first_name": "Nguyen",
      "last_name": "Van A"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Registration successful"
}
```

---

### **POST /api/auth/login** - Đăng nhập
```powershell
$body = @{
    emailOrPhone = "test@example.com"
    password = "123456"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.data.token
Write-Host "Token: $token"
```

---

### **POST /api/auth/google-login** - Đăng nhập Google
```powershell
$body = @{
    token = "google-oauth-token"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/google-login" -Method POST -Body $body -ContentType "application/json"
```

---

### **GET /api/auth/me** - Lấy thông tin user hiện tại (Protected)
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method GET -Headers $headers
```

---

## 📊 2. SURVEY API (`/api/survey`)

**Tất cả routes yêu cầu authentication**

### **POST /api/survey** - Gửi khảo sát
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$body = @{
    favorite_categories = @("uuid-1", "uuid-2", "uuid-3")
    purpose = "inspiration"
    how_did_you_know = "google"
    expectation = "high"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/survey" -Method POST -Body $body -ContentType "application/json" -Headers $headers
```

---

### **GET /api/survey** - Lấy khảo sát của user
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/survey" -Method GET -Headers $headers
```

---

### **GET /api/survey/status** - Kiểm tra đã làm khảo sát chưa
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/survey/status" -Method GET -Headers $headers
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasCompletedSurvey": true
  }
}
```

---

### **GET /api/survey/options** - Lấy options cho survey
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/survey/options" -Method GET -Headers $headers
```

---

## 📝 3. POSTS API (`/api/posts`)

### **GET /api/posts** - Lấy danh sách posts (Public)
```powershell
# Không cần token
Invoke-RestMethod -Uri "http://localhost:5000/api/posts?page=1&limit=10" -Method GET

# Với token (để biết user đã like/save chưa)
$headers = @{
    "Authorization" = "Bearer $token"
}
Invoke-RestMethod -Uri "http://localhost:5000/api/posts?page=1&limit=10&category=uuid-1" -Method GET -Headers $headers
```

**Query params:**
- `page` - Trang (default: 1)
- `limit` - Số lượng (default: 10)
- `category` - Filter theo category
- `search` - Tìm kiếm

---

### **GET /api/posts/:id** - Lấy chi tiết post (Public)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/posts/uuid-post-id" -Method GET
```

---

### **GET /api/posts/user/:userId** - Lấy posts của user (Public)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/posts/user/uuid-user-id" -Method GET
```

---

### **POST /api/posts** - Tạo post mới (Protected)
```powershell
# Cần multipart/form-data để upload ảnh
# Dùng Postman hoặc curl
```

**Form data:**
- `title` - Tiêu đề
- `content` - Nội dung
- `category_id` - UUID category
- `images` - File[] (tối đa 5 ảnh)

---

### **POST /api/posts/:postId/like** - Like post (Protected)
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/posts/uuid-post-id/like" -Method POST -Headers $headers
```

---

### **DELETE /api/posts/:postId/like** - Unlike post (Protected)
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/posts/uuid-post-id/like" -Method DELETE -Headers $headers
```

---

### **POST /api/posts/:postId/comments** - Thêm comment (Protected)
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$body = @{
    content = "Great post!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/posts/uuid-post-id/comments" -Method POST -Body $body -ContentType "application/json" -Headers $headers
```

---

### **GET /api/posts/:postId/comments** - Lấy comments (Public)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/posts/uuid-post-id/comments" -Method GET
```

---

### **POST /api/posts/:postId/save** - Save post (Protected)
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/posts/uuid-post-id/save" -Method POST -Headers $headers
```

---

### **DELETE /api/posts/:postId/save** - Unsave post (Protected)
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/posts/uuid-post-id/save" -Method DELETE -Headers $headers
```

---

## 👤 4. USERS API (`/api/users`)

**Tất cả routes yêu cầu authentication**

### **GET /api/users/profile** - Lấy profile của user hiện tại
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/users/profile" -Method GET -Headers $headers
```

---

### **PUT /api/users/profile** - Cập nhật profile
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$body = @{
    first_name = "Updated"
    last_name = "Name"
    bio = "My bio"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/users/profile" -Method PUT -Body $body -ContentType "application/json" -Headers $headers
```

---

### **GET /api/users/activities** - Lấy hoạt động của user
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/users/activities" -Method GET -Headers $headers
```

---

### **GET /api/users/liked-posts** - Lấy posts đã like
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/users/liked-posts" -Method GET -Headers $headers
```

---

### **GET /api/users/:userId** - Lấy profile user khác
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/users/uuid-user-id" -Method GET -Headers $headers
```

---

### **GET /api/users/:userId/posts** - Lấy posts của user khác
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/users/uuid-user-id/posts" -Method GET -Headers $headers
```

---

## 📋 5. OPTIONS API (`/api/options`)

### **GET /api/options** - Lấy tất cả options (Public)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/options" -Method GET
```

---

### **GET /api/options/jobs** - Lấy job options (Public)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/options/jobs" -Method GET
```

---

### **GET /api/options/categories** - Lấy categories (Public)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/options/categories" -Method GET
```

---

## ❤️ 6. HEALTH API

### **GET /api/health** - Kiểm tra server
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
```

**Response:**
```json
{
  "success": true,
  "message": "SMIMSO API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 📊 Tổng Kết API Endpoints

| Module | Endpoint | Method | Auth | Mô tả |
|--------|----------|--------|------|-------|
| **Auth** | `/api/auth/register` | POST | ❌ | Đăng ký |
| | `/api/auth/login` | POST | ❌ | Đăng nhập |
| | `/api/auth/google-login` | POST | ❌ | Đăng nhập Google |
| | `/api/auth/me` | GET | ✅ | Lấy thông tin user |
| **Survey** | `/api/survey` | POST | ✅ | Gửi khảo sát |
| | `/api/survey` | GET | ✅ | Lấy khảo sát |
| | `/api/survey/status` | GET | ✅ | Kiểm tra status |
| | `/api/survey/options` | GET | ✅ | Lấy options |
| **Posts** | `/api/posts` | GET | 🔶 | Danh sách posts |
| | `/api/posts/:id` | GET | 🔶 | Chi tiết post |
| | `/api/posts/user/:userId` | GET | 🔶 | Posts của user |
| | `/api/posts` | POST | ✅ | Tạo post |
| | `/api/posts/:postId/like` | POST | ✅ | Like post |
| | `/api/posts/:postId/like` | DELETE | ✅ | Unlike post |
| | `/api/posts/:postId/comments` | POST | ✅ | Thêm comment |
| | `/api/posts/:postId/comments` | GET | 🔶 | Lấy comments |
| | `/api/posts/:postId/save` | POST | ✅ | Save post |
| | `/api/posts/:postId/save` | DELETE | ✅ | Unsave post |
| **Users** | `/api/users/profile` | GET | ✅ | Profile hiện tại |
| | `/api/users/profile` | PUT | ✅ | Cập nhật profile |
| | `/api/users/activities` | GET | ✅ | Hoạt động |
| | `/api/users/liked-posts` | GET | ✅ | Posts đã like |
| | `/api/users/:userId` | GET | ✅ | Profile user khác |
| | `/api/users/:userId/posts` | GET | ✅ | Posts của user |
| **Options** | `/api/options` | GET | ❌ | Tất cả options |
| | `/api/options/jobs` | GET | ❌ | Job options |
| | `/api/options/categories` | GET | ❌ | Categories |
| **Health** | `/api/health` | GET | ❌ | Health check |

**Legend:**
- ✅ Required Auth
- ❌ Public
- 🔶 Optional Auth

---

**Tổng cộng: 28 API endpoints**

---

## 🚀 Cách Chạy Test

### **Option 1: Dùng PowerShell Script (Tự động)**

```powershell
# Chạy script test tự động
.\test-api.ps1
```

Script sẽ:
- ✅ Kiểm tra server health
- ✅ Test tất cả Options API
- ✅ Tạo user mới và đăng nhập
- ✅ Submit survey
- ✅ Test posts API
- ✅ Test interactions (like, comment, save)
- ✅ Test users API
- ✅ Hiển thị kết quả chi tiết

---

### **Option 2: Test Thủ Công**

#### **Bước 1: Đăng ký user**
```powershell
$body = @{
    email = "test@example.com"
    password = "123456"
    confirmPassword = "123456"
    first_name = "Test"
    last_name = "User"
    date_of_birth = "2000-01-01"
    job = "developer"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
$token = $response.data.token
```

#### **Bước 2: Lưu token**
```powershell
Write-Host "Token: $token"
```

#### **Bước 3: Test các API khác**
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

# Test get profile
Invoke-RestMethod -Uri "http://localhost:5000/api/users/profile" -Method GET -Headers $headers

# Test get posts
Invoke-RestMethod -Uri "http://localhost:5000/api/posts" -Method GET

# Test submit survey
$surveyBody = @{
    favorite_categories = @("uuid-1", "uuid-2")
    purpose = "inspiration"
    how_did_you_know = "google"
    expectation = "high"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/survey" -Method POST -Body $surveyBody -ContentType "application/json" -Headers $headers
```

---

## 📝 Notes

### **Authentication:**
- Token format: `Bearer <jwt-token>`
- Token expires: 7 days (default)
- Header: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### **Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

### **Error Format:**
```json
{
  "success": false,
  "error": "Error message"
}
```

### **Pagination:**
- Default page: 1
- Default limit: 10
- Max limit: 100

### **File Upload:**
- Max file size: 5MB per image
- Max files: 5 images per post
- Allowed types: jpg, jpeg, png, gif, webp
- Field name: `images`

---

## 🔍 Debugging

### **Check if server is running:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
```

### **Check database connection:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/options/categories" -Method GET
```

### **Check authentication:**
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method GET -Headers $headers
```

---

## 📚 API Documentation

Xem chi tiết tại:
- `API_TEST_GUIDE.md` - Hướng dẫn test API
- `OPTIONS_API_GUIDE.md` - Hướng dẫn Options API
- `DEBUG_REGISTER.md` - Debug đăng ký
- `test-api.ps1` - Script test tự động

