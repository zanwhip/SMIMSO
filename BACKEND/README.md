# SMIMSO Backend API

Backend API cho hệ thống mạng xã hội chia sẻ hình ảnh và ý tưởng thông minh.

## 🚀 Công nghệ sử dụng

- **Node.js** + **Express.js** - Backend framework
- **TypeScript** - Type safety
- **Supabase** - Database (PostgreSQL) và Authentication
- **JWT** - Token-based authentication
- **Multer** - File upload handling
- **Google OAuth** - Social login
- **CLIP AI** - Image understanding và recommendations

## 📁 Cấu trúc thư mục

```
BACKEND/
├── src/
│   ├── config/          # Cấu hình (Supabase, database)
│   ├── controllers/     # Controllers xử lý request
│   ├── services/        # Business logic
│   ├── middleware/      # Middleware (auth, upload)
│   ├── routes/          # API routes
│   ├── types/           # TypeScript types
│   ├── utils/           # Utilities (JWT, response)
│   └── server.ts        # Entry point
├── uploads/             # Uploaded images
├── .env                 # Environment variables
└── package.json
```

## 🔧 Cài đặt

### 1. Cài đặt dependencies

```bash
cd BACKEND
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Cập nhật các biến môi trường:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT
JWT_SECRET=your_secret_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Thiết lập Database

Chạy SQL script trong `src/config/database.sql` trên Supabase:

1. Mở Supabase Dashboard
2. Vào SQL Editor
3. Copy nội dung file `database.sql` và chạy

### 4. Chạy server

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Server sẽ chạy tại: `http://localhost:5000`

## 📚 API Endpoints

### Authentication (`/api/auth`)

- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/google-login` - Đăng nhập Google
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Survey (`/api/survey`)

- `POST /api/survey` - Submit khảo sát
- `GET /api/survey` - Lấy khảo sát của user
- `GET /api/survey/status` - Kiểm tra trạng thái khảo sát
- `GET /api/survey/options` - Lấy options cho khảo sát

### Posts (`/api/posts`)

- `GET /api/posts` - Lấy danh sách bài đăng
- `GET /api/posts/:id` - Lấy chi tiết bài đăng
- `POST /api/posts` - Tạo bài đăng mới
- `POST /api/posts/:postId/like` - Like bài đăng
- `DELETE /api/posts/:postId/like` - Unlike bài đăng
- `POST /api/posts/:postId/comments` - Thêm comment
- `GET /api/posts/:postId/comments` - Lấy comments
- `POST /api/posts/:postId/save` - Lưu bài đăng
- `DELETE /api/posts/:postId/save` - Bỏ lưu bài đăng

### Users (`/api/users`)

- `GET /api/users/profile` - Lấy profile user hiện tại
- `PUT /api/users/profile` - Cập nhật profile
- `GET /api/users/:userId` - Lấy profile user khác
- `GET /api/users/:userId/posts` - Lấy bài đăng của user
- `GET /api/users/activities` - Lấy hoạt động của user
- `GET /api/users/liked-posts` - Lấy bài đăng đã like

## 🔐 Authentication

API sử dụng JWT Bearer token. Thêm header:

```
Authorization: Bearer <your_token>
```

## 📝 Ví dụ Request

### Đăng ký

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "0123456789",
  "date_of_birth": "1990-01-01",
  "job": "Developer"
}
```

### Tạo bài đăng

```bash
POST /api/posts
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "title": "Beautiful sunset",
  "description": "Amazing sunset at the beach",
  "category_id": "uuid",
  "tags": ["sunset", "beach", "nature"],
  "visibility": "public",
  "images": [file1, file2]
}
```

## 🤖 AI Features

Backend tích hợp với AI service (CLIP) để:

- Tự động sinh mô tả ảnh (Image Captioning)
- Phân loại ảnh (Zero-shot Classification)
- Tìm kiếm ảnh theo văn bản (Text-to-Image Search)
- Gợi ý bài đăng cá nhân hóa (Recommendations)

## 📄 License

MIT

