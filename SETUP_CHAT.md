# Hướng dẫn Setup Chat System hoàn chỉnh

## Bước 1: Cài đặt Dependencies

### Backend
```bash
cd BACKEND
npm install
```

### Frontend
```bash
cd FRONTEND
npm install
```

## Bước 2: Chạy Migrations

Chạy các file SQL sau trong database (theo thứ tự):

1. `BACKEND/src/migrations/create_chat_tables.sql`
2. `BACKEND/src/migrations/add_chat_features.sql`
3. `BACKEND/src/migrations/add_push_subscriptions_table.sql`

## Bước 3: Tạo VAPID Keys cho Push Notifications

```bash
cd BACKEND
npm run generate-vapid-keys
```

Copy keys được hiển thị và thêm vào:

**Backend `.env`:**
```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
```

## Bước 4: Cấu hình Environment Variables

### Backend `.env`:
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# JWT
JWT_SECRET=your_jwt_secret

# Server
PORT=5000
FRONTEND_URL=http://localhost:3000

# VAPID Keys (sau khi generate)
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```

### Frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
```

## Bước 5: Chạy Servers

### Backend
```bash
cd BACKEND
npm run dev
```

### Frontend
```bash
cd FRONTEND
npm run dev
```

## Tính năng đã implement

✅ **Nhắn tin văn bản realtime** - Socket.io
✅ **Gửi emoji/sticker/GIF** - EmojiPicker component
✅ **Gửi ảnh, video, file** - File upload với preview
✅ **Gửi voice message** - MediaRecorder API
✅ **Reactions** - Thêm/xóa reactions với UI
✅ **Trạng thái:**
   - Typing indicator
   - Online/offline status
   - Delivered/read receipts
✅ **Chat nhóm** - Add/remove members với UI
✅ **Gọi thoại & video** - WebRTC với CallModal
✅ **Push notifications** - Service Worker + Notification API
✅ **Xoá/sửa tin nhắn** - UI và socket events

## Troubleshooting

### Lỗi: "Cannot find module 'web-push'"
```bash
cd BACKEND
npm install web-push
```

### Lỗi: "VAPID keys not configured"
- Kiểm tra xem đã thêm keys vào .env chưa
- Kiểm tra xem đã restart server chưa

### Service Worker không register
- Kiểm tra xem file `FRONTEND/public/sw.js` có tồn tại không
- Kiểm tra browser console để xem lỗi cụ thể

### Socket không kết nối
- Kiểm tra `NEXT_PUBLIC_SOCKET_URL` trong frontend .env
- Kiểm tra CORS settings trong backend
- Kiểm tra JWT token có hợp lệ không

## API Endpoints

### Chat
- `GET /chat/conversations` - Lấy danh sách conversations
- `GET /chat/conversations/direct/:userId` - Tạo/lấy direct conversation
- `POST /chat/conversations/group` - Tạo group conversation
- `GET /chat/conversations/:id` - Lấy conversation by ID
- `GET /chat/conversations/:conversationId/messages` - Lấy messages
- `POST /chat/conversations/:conversationId/read` - Đánh dấu đã đọc
- `POST /chat/messages/:messageId/reactions` - Thêm reaction
- `DELETE /chat/messages/:messageId/reactions` - Xóa reaction
- `PATCH /chat/messages/:messageId` - Sửa message
- `DELETE /chat/messages/:messageId` - Xóa message
- `POST /chat/status` - Cập nhật online status
- `GET /chat/status` - Lấy online status
- `POST /chat/conversations/:conversationId/members` - Thêm member vào group
- `DELETE /chat/conversations/:conversationId/members/:userId` - Xóa member khỏi group
- `POST /chat/push/subscribe` - Subscribe push notifications
- `DELETE /chat/push/unsubscribe` - Unsubscribe push notifications

### Users
- `GET /users/search?q=query` - Tìm kiếm users

## Socket Events

### Client → Server
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `send_message` - Gửi message
- `typing_start` - Bắt đầu typing
- `typing_stop` - Dừng typing
- `call_offer` - Gửi call offer
- `call_answer` - Gửi call answer
- `call_ice_candidate` - Gửi ICE candidate
- `call_end` - Kết thúc call
- `call_decline` - Từ chối call
- `add_reaction` - Thêm reaction
- `remove_reaction` - Xóa reaction
- `edit_message` - Sửa message
- `delete_message` - Xóa message
- `update_online_status` - Cập nhật online status
- `add_group_member` - Thêm member vào group
- `remove_group_member` - Xóa member khỏi group

### Server → Client
- `new_message` - Message mới
- `conversation_updated` - Conversation được cập nhật
- `user_typing` - User đang typing
- `call_offer` - Nhận call offer
- `call_answer` - Nhận call answer
- `call_ice_candidate` - Nhận ICE candidate
- `call_end` - Call kết thúc
- `call_decline` - Call bị từ chối
- `reaction_added` - Reaction được thêm
- `reaction_removed` - Reaction bị xóa
- `message_edited` - Message được sửa
- `message_deleted` - Message bị xóa
- `user_online_status` - Online status được cập nhật
- `member_added` - Member được thêm vào group
- `member_removed` - Member bị xóa khỏi group
- `error` - Lỗi xảy ra




