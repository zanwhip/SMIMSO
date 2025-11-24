# Hướng dẫn tạo VAPID Keys cho Push Notifications

## Cách 1: Sử dụng script tự động (Khuyến nghị)

### Bước 1: Cài đặt dependencies
```bash
cd BACKEND
npm install
```

### Bước 2: Chạy script để generate VAPID keys
```bash
npm run generate-vapid-keys
```

Script sẽ tự động tạo và hiển thị:
- Public Key
- Private Key
- Hướng dẫn thêm vào .env files

### Bước 3: Thêm keys vào .env files

**Backend `.env`:**
```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
```

## Cách 2: Sử dụng Node.js trực tiếp

Nếu không muốn dùng script, bạn có thể chạy trực tiếp:

```bash
cd BACKEND
node -e "const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys(); console.log('Public:', keys.publicKey); console.log('Private:', keys.privateKey);"
```

## Cách 3: Sử dụng online tool

Bạn cũng có thể sử dụng các tool online như:
- https://web-push-codelab.glitch.me/
- https://daviddalbusco.com/blog/generate-vapid-keys

## Lưu ý quan trọng

1. **Bảo mật**: 
   - Private Key phải được giữ bí mật, chỉ dùng ở Backend
   - Public Key có thể công khai, dùng ở Frontend

2. **Environment Variables**:
   - Backend cần cả Public và Private Key
   - Frontend chỉ cần Public Key (với prefix `NEXT_PUBLIC_`)

3. **Testing**:
   - Sau khi thêm keys, restart cả Backend và Frontend
   - Kiểm tra browser console để xem có lỗi không

## Kiểm tra cấu hình

Sau khi thêm keys, bạn có thể test bằng cách:

1. Mở browser console
2. Kiểm tra xem service worker đã register chưa
3. Kiểm tra xem push subscription đã tạo chưa

## Troubleshooting

### Lỗi: "VAPID keys not set"
- Kiểm tra xem đã thêm keys vào .env chưa
- Kiểm tra xem đã restart server chưa

### Lỗi: "Invalid VAPID key format"
- Đảm bảo keys không có khoảng trắng
- Đảm bảo keys là base64 URL-safe string

### Service Worker không register
- Kiểm tra xem file `public/sw.js` có tồn tại không
- Kiểm tra browser console để xem lỗi cụ thể




