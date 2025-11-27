# NextAuth Setup Guide

## Cấu hình NextAuth

### 1. Tạo NEXTAUTH_SECRET

Chạy lệnh sau để tạo secret key:

**Windows (PowerShell):**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Linux/Mac:**
```bash
openssl rand -base64 32
```

### 2. Tạo file `.env.local`

Tạo file `.env.local` trong thư mục `FRONTEND` với nội dung:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth (Optional - nếu muốn dùng Google login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Thay thế `your-secret-key-here`

Thay thế `your-secret-key-here` bằng secret key đã tạo ở bước 1.

### 4. Khởi động lại server

Sau khi cấu hình, khởi động lại Next.js development server:

```bash
npm run dev
```

## Tính năng

- ✅ Session được lưu tự động (30 ngày)
- ✅ Không cần đăng nhập lại mỗi khi mở web
- ✅ Tương thích với hệ thống auth hiện tại (Zustand)
- ✅ Hỗ trợ Google OAuth (nếu cấu hình)

## Lưu ý

- NEXTAUTH_SECRET là bắt buộc cho production
- Không commit file `.env.local` vào git
- Đảm bảo NEXTAUTH_URL khớp với domain của bạn trong production






