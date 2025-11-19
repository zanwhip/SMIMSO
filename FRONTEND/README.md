# SMIMSO Frontend

Frontend cho hệ thống mạng xã hội chia sẻ hình ảnh và ý tưởng thông minh.

## 🚀 Công nghệ sử dụng

- **Next.js 14** - React framework với App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management
- **React Query** - Data fetching và caching
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications
- **React Dropzone** - File upload
- **Framer Motion** - Animations

## 📁 Cấu trúc thư mục

```
FRONTEND/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/         # Auth pages (login, register)
│   │   ├── post/           # Post detail page
│   │   ├── profile/        # Profile pages
│   │   ├── create/         # Create post page
│   │   ├── survey/         # Survey page
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Home page
│   │   └── globals.css     # Global styles
│   ├── components/         # Reusable components
│   │   ├── Navbar.tsx
│   │   ├── PostCard.tsx
│   │   └── Providers.tsx
│   ├── lib/                # Utilities
│   │   ├── api.ts          # Axios instance
│   │   └── utils.ts        # Helper functions
│   ├── store/              # Zustand stores
│   │   └── authStore.ts
│   └── types/              # TypeScript types
│       └── index.ts
├── public/                 # Static files
├── .env.example
├── next.config.js
├── tailwind.config.ts
└── package.json
```

## 🔧 Cài đặt

### 1. Cài đặt dependencies

```bash
cd FRONTEND
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env.local` từ `.env.example`:

```bash
cp .env.example .env.local
```

Cập nhật các biến môi trường:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Chạy development server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại: `http://localhost:3000`

### 4. Build cho production

```bash
npm run build
npm start
```

## 📱 Tính năng

### Authentication
- ✅ Đăng ký tài khoản
- ✅ Đăng nhập (Email/SĐT + Password)
- ✅ Đăng nhập Google OAuth
- ✅ Quản lý session với JWT

### Survey
- ✅ Khảo sát người dùng mới
- ✅ Chọn thể loại yêu thích
- ✅ Mục đích sử dụng
- ✅ Nguồn biết đến hệ thống

### Posts
- ✅ Tạo bài đăng với nhiều ảnh
- ✅ Upload ảnh (drag & drop)
- ✅ Thêm tiêu đề, mô tả, tags
- ✅ Chọn thể loại
- ✅ Cài đặt quyền riêng tư
- ✅ Xem danh sách bài đăng (Masonry grid)
- ✅ Xem chi tiết bài đăng
- ✅ Like/Unlike bài đăng
- ✅ Comment
- ✅ Lưu bài đăng

### User Profile
- ✅ Xem profile
- ✅ Thống kê (bài đăng, likes, comments)
- ✅ Danh sách bài đăng của user
- ✅ Bài đã thích
- ✅ Bài đã lưu
- ✅ Chỉnh sửa profile

### UI/UX
- ✅ Responsive design
- ✅ Dark mode ready
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications
- ✅ Infinite scroll
- ✅ Image lazy loading
- ✅ Smooth animations

## 🎨 Thiết kế

### Color Palette
- **Primary**: Red (#ef4444)
- **Secondary**: Blue (#0ea5e9)
- **Background**: Gray (#f9fafb)

### Typography
- **Font**: Inter (Google Fonts)

### Components
- Navbar với search
- Post cards (Masonry layout)
- Modal dialogs
- Form inputs
- Buttons
- Avatars
- Badges

## 🔐 Authentication Flow

1. User đăng ký/đăng nhập
2. Nhận JWT token từ backend
3. Lưu token vào localStorage
4. Tự động thêm token vào headers của mọi request
5. Redirect đến survey (nếu user mới)
6. Redirect đến home page

## 📊 State Management

### Zustand Stores
- **authStore**: User authentication state
  - user
  - token
  - isAuthenticated
  - login()
  - register()
  - logout()

### React Query
- Caching API responses
- Automatic refetching
- Optimistic updates

## 🚀 Performance

- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic với Next.js
- **Lazy Loading**: React.lazy và Suspense
- **Caching**: React Query
- **Infinite Scroll**: Intersection Observer

## 📝 Best Practices

- TypeScript cho type safety
- Component composition
- Custom hooks
- Error boundaries
- Loading states
- Responsive design
- Accessibility (a11y)

## 🐛 Debugging

```bash
# Check console for errors
# Use React DevTools
# Use Network tab để xem API calls
```

## 📄 License

MIT

