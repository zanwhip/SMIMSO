# 🐛 AI Imagine Features - Debug Guide

## Kiểm tra cấu hình

### 1. Kiểm tra Backend Environment Variables

Đảm bảo file `BACKEND/.env` có:

```env
IMAGINE_TOKEN=vk-G0L8QiCBFuL3XydqNnzB14kDYjkxNDnlD5hbOgVmDAidF
```

**Lưu ý:** Không cần thêm prefix `Bearer`, code sẽ tự động thêm.

### 2. Kiểm tra Backend Server đang chạy

```bash
cd BACKEND
npm run dev
```

Kiểm tra console có hiển thị:
```
✅ Socket.IO initialized
🚀 SMIMSO API Server
...
║   - Imagine:  http://localhost:5000/api/imagine         ║
```

### 3. Kiểm tra Frontend đang chạy

```bash
cd FRONTEND
npm run dev
```

Truy cập: http://localhost:3000

### 4. Kiểm tra Authentication

Đảm bảo bạn đã đăng nhập. Các endpoint `/api/imagine/*` yêu cầu authentication.

## Test từng tính năng

### Text to Image

1. Truy cập: http://localhost:3000/imagine/text-to-image
2. Nhập prompt: "A futuristic cityscape at night with neon lights"
3. Chọn style: "realistic"
4. Click "Generate Image"
5. Mở Browser DevTools (F12) > Console để xem logs

**Kiểm tra Backend logs:**
- `📥 Text to Image request received`
- `🔄 Calling imagine service...`
- `🚀 Sending Text to Image request`
- `✅ Text to Image response` hoặc `❌ Text to Image API error`

**Kiểm tra Frontend logs:**
- `📥 Text to Image response`

### Text to Video

1. Truy cập: http://localhost:3000/imagine/text-to-video
2. Nhập prompt: "a flying dinosaur"
3. Click "Generate Video"
4. Mở Browser DevTools (F12) > Console

**Lưu ý:** Video generation có thể mất 2-5 phút.

### Image to Video

1. Truy cập: http://localhost:3000/imagine/image-to-video
2. Upload một hình ảnh
3. Nhập prompt mô tả chuyển động
4. Click "Generate Video"

## Các lỗi thường gặp

### Lỗi: "Failed to generate image/video"

**Kiểm tra:**
1. Token API có đúng không? Mở `BACKEND/.env` và kiểm tra `IMAGINE_TOKEN`
2. Token có còn hiệu lực không? Kiểm tra tại dashboard Vyro.ai
3. Có đủ quota không? Kiểm tra tại dashboard Vyro.ai

**Debug:**
- Mở Backend console, tìm log `❌ Text to Image API error`
- Kiểm tra `status` và `data` trong error log
- Nếu status là 401: Token sai hoặc hết hạn
- Nếu status là 429: Hết quota

### Lỗi: "Prompt is required"

**Nguyên nhân:** Prompt bị empty hoặc không được gửi lên

**Giải pháp:**
- Kiểm tra frontend có gửi prompt không
- Kiểm tra backend logs: `📥 Text to Image request received` và xem `body`

### Lỗi: "Image file not found"

**Nguyên nhân:** File upload không thành công

**Giải pháp:**
- Kiểm tra thư mục `BACKEND/uploads/` có tồn tại không
- Kiểm tra permissions của thư mục
- Kiểm tra backend logs: `📥 Image to Video request received` và xem `file.path`

### Lỗi: "Failed to get image/video URL from response"

**Nguyên nhân:** API Vyro trả về format response khác với expected

**Debug:**
1. Mở Browser DevTools > Console
2. Tìm log `📥 Text to Image response`
3. Copy toàn bộ response object
4. Kiểm tra structure của response
5. Cập nhật code trong service để handle đúng format

**Response formats có thể:**
- `{ image: "url" }`
- `{ url: "url" }`
- `{ data: { url: "url" } }`
- `{ data: [{ url: "url" }] }`
- `{ output: "url" }`
- `{ output: ["url"] }`

## Test API trực tiếp

### Test bằng curl

**Text to Image:**
```bash
curl --location --request POST 'https://api.vyro.ai/v2/image/generations' \
--header 'Authorization: Bearer vk-G0L8QiCBFuL3XydqNnzB14kDYjkxNDnlD5hbOgVmDAidF' \
--form 'prompt="A futuristic cityscape at night with neon lights"' \
--form 'style="realistic"' \
--form 'aspect_ratio="1:1"'
```

**Text to Video:**
```bash
curl --location --request POST 'https://api.vyro.ai/v2/video/text-to-video' \
--header 'Authorization: Bearer vk-G0L8QiCBFuL3XydqNnzB14kDYjkxNDnlD5hbOgVmDAidF' \
--form 'style="kling-1.0-pro"' \
--form 'prompt="a flying dinosaur"'
```

Nếu curl command hoạt động nhưng ứng dụng không hoạt động, vấn đề nằm ở code.

## Kiểm tra Network Requests

1. Mở Browser DevTools (F12)
2. Vào tab "Network"
3. Filter: "imagine"
4. Click "Generate"
5. Kiểm tra request:
   - Status code
   - Request payload
   - Response data

## Logs cần kiểm tra

### Backend Logs (Console)
```
📥 Text to Image request received: { body: {...}, user: "..." }
🔄 Calling imagine service...
🚀 Sending Text to Image request: { prompt: "...", style: "..." }
✅ Text to Image response: {...}
```

### Frontend Logs (Browser Console)
```
📥 Text to Image response: {...}
❌ Could not extract image URL from response: {...}
```

## Cập nhật code để handle response mới

Nếu API Vyro trả về format khác, sửa trong:
- `BACKEND/src/services/imagine.service.ts` - Xử lý response từ API
- `FRONTEND/src/app/imagine/*/page.tsx` - Xử lý response từ backend

## Liên hệ

Nếu vẫn không hoạt động sau khi kiểm tra tất cả các bước trên:
1. Copy toàn bộ error logs từ Backend và Frontend
2. Copy response từ API Vyro (từ curl command)
3. Mô tả chi tiết các bước đã thực hiện

