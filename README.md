# 🎨 SMIMSO - Smart Image & Idea Social Network

A modern, AI-powered social media platform for sharing and discovering creative content with real-time interactions.

## ✨ Features

### 🤖 AI-Powered
- **Smart Metadata Generation**: Automatically generate titles, descriptions, categories, and tags from images
- **BLIP Image Captioning**: Natural language descriptions of uploaded images
- **CLIP Classification**: Zero-shot category classification
- **Intelligent Fallbacks**: Meaningful metadata even when AI service is unavailable

### 🔔 Real-Time Notifications
- **Server-Sent Events (SSE)**: Instant notifications for likes, comments, and follows
- **Live Updates**: Real-time notification count and dropdown
- **Toast Notifications**: Non-intrusive notification alerts
- **Mark as Read**: Individual and bulk read status management

### ❤️ Interactive Features
- **Like/Unlike System**: Optimistic UI updates with purple heart icons
- **Comments**: Engage with posts through comments
- **User Profiles**: View and edit user profiles
- **Post Discovery**: Browse, search, and filter posts by category

### 🎨 Modern UI/UX
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Masonry Layout**: Pinterest-style post grid
- **Image Size Limits**: Prevents layout overflow
- **Beautiful Animations**: Smooth transitions and hover effects
- **Dark Mode Ready**: Prepared for dark theme implementation

### 🔒 Security & Performance
- **JWT Authentication**: Secure token-based auth
- **Session Persistence**: Stay logged in across browser restarts
- **Row Level Security**: Supabase RLS policies
- **Optimized Queries**: Efficient database operations
- **Image Optimization**: Next.js Image component

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (via Supabase)
- Python 3.8+ (for AI service)

### 1. Clone Repository
```bash
git clone <repository-url>
cd SMIMSO
```

### 2. Setup Backend
```bash
cd BACKEND
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### 3. Setup Frontend
```bash
cd FRONTEND
npm install
cp .env.example .env.local
# Edit .env.local with your API URL
npm run dev
```

### 4. Run Database Migration
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Open SQL Editor
3. Run `BACKEND/src/migrations/complete_migration.sql`

### 5. Open Application
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## 📚 Documentation

- **[FINAL_SUMMARY.md](FINAL_SUMMARY.md)** - Complete feature overview
- **[COMPLETE_TESTING_GUIDE.md](COMPLETE_TESTING_GUIDE.md)** - Testing instructions
- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - Implementation details
- **[WEBSOCKET_WEBRTC_GUIDE.md](WEBSOCKET_WEBRTC_GUIDE.md)** - Future features guide
- **[FIX_NOTIFICATIONS_ERROR.md](FIX_NOTIFICATIONS_ERROR.md)** - Troubleshooting

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persist
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast
- **Icons**: React Icons

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT
- **File Upload**: Multer
- **Real-Time**: Server-Sent Events (SSE)

### AI Services
- **BLIP**: Image captioning
- **CLIP**: Image classification and embeddings
- **Python**: FastAPI service

---

## 📁 Project Structure

```
SMIMSO/
├── BACKEND/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Business logic
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth, upload, etc.
│   │   ├── migrations/       # Database migrations
│   │   └── utils/            # Helper functions
│   └── uploads/              # Uploaded files
├── FRONTEND/
│   ├── src/
│   │   ├── app/              # Next.js pages
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom hooks
│   │   ├── store/            # Zustand stores
│   │   ├── lib/              # Utilities
│   │   └── types/            # TypeScript types
│   └── public/               # Static assets
└── docs/                     # Documentation
```

---

## 🧪 Testing

Follow the comprehensive testing guide:

```bash
# See COMPLETE_TESTING_GUIDE.md for detailed instructions
```

**Test Coverage:**
- ✅ AI Metadata Generation
- ✅ Like/Unlike Functionality
- ✅ Real-Time Notifications
- ✅ Session Persistence
- ✅ Image Size Limits
- ✅ Notification Dropdown

---

## 🐛 Troubleshooting

### SSE Connection Failed
- Check if migration was run
- Restart backend server
- Clear browser cache

### Like/Unlike Not Working
- Verify you're logged in
- Check backend logs
- Ensure `isLiked` field in API response

### AI Metadata Returns Empty
- AI service may be down (fallbacks will work)
- Check backend logs
- Verify image upload successful

See [FIX_NOTIFICATIONS_ERROR.md](FIX_NOTIFICATIONS_ERROR.md) for more solutions.

---

## 🔮 Future Features

- 💬 **WebSocket Messaging**: Real-time chat
- 📹 **WebRTC Video Calls**: Video/audio calls
- 🖥️ **Screen Sharing**: Share your screen
- 👥 **Follow System**: Follow users
- 🔍 **Advanced Search**: Full-text search
- 📊 **Analytics**: User insights

See [WEBSOCKET_WEBRTC_GUIDE.md](WEBSOCKET_WEBRTC_GUIDE.md) for implementation guide.

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👥 Contributors

Built with ❤️ by the SMIMSO team

---

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Supabase for the backend infrastructure
- OpenAI for CLIP model
- Salesforce for BLIP model

---

**Made with 💜 and ☕**

