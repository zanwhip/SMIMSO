# 🗑️ Hướng Dẫn Xóa Hết Bài Đăng

## ⚠️ CẢNH BÁO

**Hành động này sẽ xóa:**
- ✅ Tất cả bài đăng (posts)
- ✅ Tất cả ảnh của bài đăng (post_images)
- ✅ Tất cả likes
- ✅ Tất cả comments
- ✅ Tất cả notifications liên quan đến posts
- ✅ Tất cả file ảnh đã upload

**⚠️ KHÔNG THỂ KHÔI PHỤC!**

---

## 📋 Cách Xóa (2 Bước)

### Bước 1: Xóa Dữ Liệu Trong Database (5 phút)

1. **Mở Supabase Dashboard**
   - Truy cập: https://app.supabase.com
   - Chọn project của bạn
   - Click **SQL Editor** → **New Query**

2. **Copy & Run Delete Script**
   - Mở file: `BACKEND/delete-all-posts.sql`
   - Copy toàn bộ nội dung
   - Paste vào SQL Editor
   - Click **Run** (hoặc Ctrl+Enter)

3. **Verify Deletion**
   - Chạy các verification queries ở cuối file
   - Tất cả counts phải = 0:
     ```
     posts_count: 0
     images_count: 0
     likes_count: 0
     comments_count: 0
     post_notifications_count: 0
     ```

✅ **Database đã sạch!**

---

### Bước 2: Xóa File Uploads (2 phút)

1. **Mở PowerShell**
   ```powershell
   cd D:\Download\SMIMSO\BACKEND
   ```

2. **Chạy Delete Script**
   ```powershell
   .\delete-uploads.ps1
   ```

3. **Confirm Deletion**
   - Script sẽ hỏi: `Type 'DELETE' to confirm`
   - Gõ: `DELETE` (viết hoa)
   - Enter

4. **Verify**
   - Script sẽ hiển thị số file đã xóa
   - Check folder `BACKEND/uploads` → Phải rỗng

✅ **Files đã xóa!**

---

## 🔍 Verification Checklist

Sau khi xóa, verify:

### Database
- [ ] `SELECT COUNT(*) FROM posts;` → 0
- [ ] `SELECT COUNT(*) FROM post_images;` → 0
- [ ] `SELECT COUNT(*) FROM likes;` → 0
- [ ] `SELECT COUNT(*) FROM comments;` → 0
- [ ] `SELECT COUNT(*) FROM notifications WHERE post_id IS NOT NULL;` → 0

### Files
- [ ] Folder `BACKEND/uploads` rỗng hoặc không tồn tại
- [ ] Không còn file ảnh nào

### Application
- [ ] Refresh trang web → Không còn bài đăng nào
- [ ] Home page trống
- [ ] Profile page không có bài đăng

---

## 📊 Thông Tin Về Notifications

### ✅ Notifications Đã Hoạt Động

Khi có người **like** hoặc **comment** bài đăng của bạn:

1. **Real-time notification** qua SSE
2. **Toast notification** hiện ở góc màn hình
3. **Badge đỏ** trên notification bell
4. **Dropdown** hiển thị chi tiết notification

### Notification Types

#### 1. Like Notification
```
❤️ [Tên người like] liked your post "[Tên bài đăng]"
```

**Khi nào trigger:**
- User A like bài đăng của User B
- User B nhận notification ngay lập tức

**Thông tin:**
- `type`: "like"
- `related_user_id`: ID của người like
- `post_id`: ID của bài đăng
- `content`: Message notification

#### 2. Comment Notification
```
💬 [Tên người comment] commented on your post "[Tên bài đăng]"
```

**Khi nào trigger:**
- User A comment bài đăng của User B
- User B nhận notification ngay lập tức

**Thông tin:**
- `type`: "comment"
- `related_user_id`: ID của người comment
- `post_id`: ID của bài đăng
- `content`: Message notification

### Notification Features

✅ **Real-time Updates**
- SSE connection tự động
- Không cần refresh page
- Toast notification tự động hiện

✅ **Notification Bell**
- Badge đỏ hiển thị số unread
- Click để mở dropdown
- Hiển thị tất cả notifications

✅ **Mark as Read**
- Click vào notification → Mark as read
- Click "Đánh dấu tất cả" → Mark all as read
- Badge tự động update

✅ **Navigation**
- Click notification → Đi đến bài đăng
- Tự động mark as read

---

## 🧪 Test Notifications

### Test Like Notification

1. **Setup:**
   - Mở 2 browser (hoặc 1 normal + 1 incognito)
   - Browser 1: Login as User A
   - Browser 2: Login as User B

2. **Test:**
   - User A tạo 1 bài đăng
   - User B like bài đăng của User A
   - Check Browser 1 (User A):
     - ✅ Toast notification hiện
     - ✅ Badge đỏ trên bell
     - ✅ Dropdown có notification mới

3. **Verify:**
   - Click notification → Đi đến bài đăng
   - Notification marked as read
   - Badge count giảm

### Test Comment Notification

1. **Setup:** (giống như trên)

2. **Test:**
   - User A tạo 1 bài đăng
   - User B comment bài đăng của User A
   - Check Browser 1 (User A):
     - ✅ Toast notification hiện
     - ✅ Badge đỏ trên bell
     - ✅ Dropdown có notification mới

3. **Verify:**
   - Click notification → Đi đến bài đăng
   - Notification marked as read
   - Badge count giảm

---

## 🔧 Troubleshooting

### Không nhận được notification

**Check:**
1. Console có `✅ SSE connected`?
2. Backend có chạy không?
3. Migration đã run chưa?
4. User có đang like/comment bài của chính mình không? (không có notification cho chính mình)

**Solution:**
```bash
# Restart backend
cd BACKEND
npm run dev

# Restart frontend
cd FRONTEND
npm run dev

# Clear browser cache
Ctrl+Shift+R
```

### Notification không hiện trong dropdown

**Check:**
1. Database có bảng `notifications` chưa?
2. API `/api/notifications` có hoạt động không?

**Solution:**
```sql
-- Check notifications table
SELECT * FROM notifications LIMIT 10;

-- Check if notifications exist
SELECT COUNT(*) FROM notifications;
```

---

## 📝 Summary

### Đã Implement
- ✅ Like notification cho người đăng bài
- ✅ Comment notification cho người đăng bài
- ✅ Real-time SSE connection
- ✅ Toast notifications
- ✅ Notification bell with badge
- ✅ Notification dropdown
- ✅ Mark as read functionality

### Scripts Created
- ✅ `delete-all-posts.sql` - Xóa data trong database
- ✅ `delete-uploads.ps1` - Xóa file uploads
- ✅ `DELETE_ALL_POSTS_GUIDE.md` - Hướng dẫn chi tiết

---

**Chúc bạn thành công! 🚀✨**

