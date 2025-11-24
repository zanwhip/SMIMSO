# Hướng dẫn xử lý Notification Permission Denied

## Nguyên nhân

"Notification permission denied" xảy ra khi:
1. Người dùng từ chối quyền thông báo khi trình duyệt hỏi
2. Quyền đã bị từ chối trước đó và trình duyệt không cho phép yêu cầu lại tự động

## Cách khắc phục

### Chrome/Edge (Windows/Mac/Linux)

1. **Click vào biểu tượng khóa hoặc thông tin** ở bên trái thanh địa chỉ (URL bar)
2. Tìm mục **"Thông báo"** (Notifications)
3. Chọn **"Cho phép"** (Allow)
4. Tải lại trang (F5 hoặc Ctrl+R)

**Hoặc:**

1. Vào **Cài đặt** (Settings) > **Quyền** (Privacy and security) > **Cài đặt trang web** (Site settings)
2. Tìm trang web của bạn
3. Click vào và chọn **"Cho phép"** ở mục Thông báo
4. Tải lại trang

### Firefox

1. Click vào biểu tượng **khóa** ở bên trái thanh địa chỉ
2. Tìm mục **"Thông báo"** (Notifications)
3. Chọn **"Cho phép"** (Allow)
4. Tải lại trang

**Hoặc:**

1. Vào **Cài đặt** (Preferences) > **Quyền** (Privacy & Security)
2. Tìm mục **"Thông báo"** (Notifications)
3. Click **"Cài đặt"** (Settings)
4. Tìm trang web và chọn **"Cho phép"** (Allow)
5. Tải lại trang

### Safari (Mac)

1. Vào **Cài đặt hệ thống** (System Preferences) > **Bảo mật & Quyền riêng tư** (Security & Privacy)
2. Chọn tab **"Thông báo"** (Notifications)
3. Tìm Safari và đảm bảo nó được bật
4. Vào Safari > **Cài đặt** (Preferences) > **Trang web** (Websites) > **Thông báo** (Notifications)
5. Tìm trang web và chọn **"Cho phép"** (Allow)
6. Tải lại trang

## Lưu ý

- Sau khi bật quyền, bạn cần **tải lại trang** để hệ thống nhận diện
- Nếu vẫn không hoạt động, thử **xóa cache và cookies** của trang web
- Một số trình duyệt có thể chặn thông báo ở chế độ **Incognito/Private**

## Kiểm tra quyền hiện tại

Bạn có thể kiểm tra quyền thông báo hiện tại bằng cách:

1. Mở **Developer Console** (F12)
2. Chạy lệnh: `Notification.permission`
3. Kết quả có thể là:
   - `"granted"` - Đã được cấp quyền ✅
   - `"denied"` - Đã bị từ chối ❌
   - `"default"` - Chưa được hỏi ⏳




