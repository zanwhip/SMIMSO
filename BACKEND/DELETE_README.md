# 🗑️ Xóa Hết Bài Đăng - Quick Guide

## ⚠️ CẢNH BÁO
**Hành động này sẽ xóa TẤT CẢ bài đăng và KHÔNG THỂ KHÔI PHỤC!**

---

## 🚀 2 Bước Đơn Giản

### Bước 1: Xóa Database (5 phút)

1. Mở [Supabase Dashboard](https://app.supabase.com)
2. SQL Editor → New Query
3. Copy nội dung file `delete-all-posts.sql`
4. Paste và Run

✅ **Done!**

---

### Bước 2: Xóa Files (2 phút)

```powershell
cd BACKEND
.\delete-uploads.ps1
# Type 'DELETE' to confirm
```

✅ **Done!**

---

## ✅ Verify

**Database:**
```sql
SELECT COUNT(*) FROM posts;  -- Should be 0
```

**Files:**
- Check `BACKEND/uploads` → Should be empty

**Web:**
- Refresh trang → Không còn bài đăng

---

## 📚 Chi Tiết

Xem file: **[DELETE_ALL_POSTS_GUIDE.md](../DELETE_ALL_POSTS_GUIDE.md)**

---

**⚠️ Nhớ backup trước khi xóa!**

