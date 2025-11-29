# 🎨 AI Imagine API Setup Guide

Hướng dẫn cấu hình API keys cho tính năng AI Imagine (Text to Image, Text to Video, Image to Video).

## 📋 Yêu cầu

Bạn cần có API token từ [Vyro.ai](https://vyro.ai) để sử dụng các tính năng:
- Text to Image
- Text to Video
- Image to Video

## 🔑 Cấu hình API Token

### 1. Lấy API Token

1. Đăng ký tài khoản tại [Vyro.ai](https://vyro.ai)
2. Lấy API token từ dashboard
3. Token có dạng: `vk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Thêm vào Backend `.env`

Mở file `.env` trong thư mục `BACKEND` và thêm:

```env
# AI Imagine API Token
IMAGINE_TOKEN=vk-G0L8QiCBFuL3XydqNnzB14kDYjkxNDnlD5hbOgVmDAidF
```

**Lưu ý:**
- Không cần thêm prefix `Bearer` vì code sẽ tự động thêm
- Token trong file .env trên chỉ là ví dụ, hãy thay bằng token thật của bạn

### 3. Khởi động lại Backend Server

Sau khi thêm token, khởi động lại backend server:

```bash
cd BACKEND
npm run dev
```

## ✅ Kiểm tra

Sau khi cấu hình, bạn có thể:

1. Truy cập trang chủ tại http://localhost:3000
2. Thấy 3 button "Create with AI" ở trên cùng
3. Click vào bất kỳ button nào để test tính năng

## 🎯 Tính năng

### Text to Image 🎨
- Generate images from text descriptions
- Styles: Realistic, Anime, Cartoon, Digital Art, Oil Painting, Watercolor
- Aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4

### Text to Video 🎬
- Create videos from text prompts
- Styles: Kling 1.0 Pro, Realistic, Anime, Cinematic

### Image to Video 🎥
- Animate static images
- Upload an image and describe the motion
- Supports JPEG, PNG, WebP formats

## 🐛 Troubleshooting

### Lỗi: "Failed to generate image/video"

**Nguyên nhân:**
- API token không đúng hoặc hết hạn
- Hết quota API
- Network timeout

**Giải pháp:**
1. Kiểm tra token trong `.env` file
2. Đảm bảo token còn hiệu lực
3. Kiểm tra quota API tại dashboard Vyro.ai
4. Thử lại sau vài phút

### Lỗi: "Image file not found"

**Nguyên nhân:**
- File upload bị lỗi
- Đường dẫn file không đúng

**Giải pháp:**
1. Đảm bảo file upload thành công
2. Kiểm tra permissions của thư mục `uploads/`
3. Thử upload lại file

## 📝 Notes

- Video generation có thể mất 2-5 phút, vui lòng đợi
- Image generation thường mất 30-60 giây
- Generated files có thể được download về máy
- Prompt templates có sẵn để bạn tham khảo

## 🔒 Security

- **KHÔNG** commit file `.env` vào git
- **KHÔNG** chia sẻ API token công khai
- Token được lưu an toàn trong environment variables


