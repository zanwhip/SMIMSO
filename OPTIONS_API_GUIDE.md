# 📋 Options API - Hướng Dẫn

## ✅ Đã Tạo API Options

API để lấy danh sách options cho các dropdown/select trong form.

---

## 🚀 API Endpoints

### **1. GET /api/options**
Lấy tất cả options cho form

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      { "value": "student", "label": "Sinh viên" },
      { "value": "developer", "label": "Lập trình viên" },
      { "value": "designer", "label": "Thiết kế" },
      ...
    ],
    "categories": [
      { 
        "value": "uuid-1", 
        "label": "Art & Design",
        "description": "...",
        "icon": "🎨"
      },
      ...
    ],
    "purposes": [
      { "value": "inspiration", "label": "Tìm cảm hứng" },
      ...
    ],
    "sources": [
      { "value": "google", "label": "Google Search" },
      ...
    ],
    "expectations": [
      { "value": "very_high", "label": "Rất cao" },
      ...
    ]
  }
}
```

---

### **2. GET /api/options/jobs**
Lấy danh sách công việc

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "student", "label": "Sinh viên" },
    { "value": "developer", "label": "Lập trình viên" },
    { "value": "designer", "label": "Thiết kế" },
    { "value": "marketing", "label": "Marketing" },
    { "value": "business", "label": "Kinh doanh" },
    { "value": "teacher", "label": "Giáo viên" },
    { "value": "doctor", "label": "Bác sĩ" },
    { "value": "engineer", "label": "Kỹ sư" },
    { "value": "artist", "label": "Nghệ sĩ" },
    { "value": "photographer", "label": "Nhiếp ảnh gia" },
    { "value": "writer", "label": "Nhà văn" },
    { "value": "entrepreneur", "label": "Doanh nhân" },
    { "value": "freelancer", "label": "Freelancer" },
    { "value": "other", "label": "Khác" }
  ]
}
```

---

### **3. GET /api/options/categories**
Lấy danh sách categories từ database

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "value": "uuid-1",
      "label": "Art & Design",
      "description": "Nghệ thuật và thiết kế",
      "icon": "🎨"
    },
    {
      "value": "uuid-2",
      "label": "Photography",
      "description": "Nhiếp ảnh",
      "icon": "📸"
    },
    ...
  ]
}
```

---

## 💻 Frontend Usage

### **1. Sử dụng Hook**

```tsx
import { useJobOptions, useCategoryOptions, useFormOptions } from '@/hooks/useOptions';

function MyComponent() {
  // Lấy job options
  const { data: jobs, isLoading } = useJobOptions();
  
  // Lấy category options
  const { data: categories } = useCategoryOptions();
  
  // Lấy tất cả options
  const { data: allOptions } = useFormOptions();
  
  return (
    <select>
      {jobs?.map(job => (
        <option key={job.value} value={job.value}>
          {job.label}
        </option>
      ))}
    </select>
  );
}
```

---

### **2. Trong Register Page**

File `FRONTEND/src/app/(auth)/register/page.tsx` đã được cập nhật:

```tsx
const { data: jobOptions, isLoading: jobsLoading } = useJobOptions();

<select
  value={formData.job}
  onChange={(e) => setFormData({ ...formData, job: e.target.value })}
  disabled={jobsLoading}
>
  <option value="">
    {jobsLoading ? 'Đang tải...' : 'Chọn công việc'}
  </option>
  {jobOptions?.map((job) => (
    <option key={job.value} value={job.value}>
      {job.label}
    </option>
  ))}
</select>
```

---

## 📁 Files Đã Tạo

### **Backend:**
1. ✅ `BACKEND/src/controllers/options.controller.ts` - Controller
2. ✅ `BACKEND/src/services/options.service.ts` - Service logic
3. ✅ `BACKEND/src/routes/options.routes.ts` - Routes

### **Frontend:**
1. ✅ `FRONTEND/src/hooks/useOptions.ts` - React Query hooks

### **Updated:**
1. ✅ `BACKEND/src/routes/index.ts` - Thêm options routes
2. ✅ `BACKEND/src/server.ts` - Thêm endpoint vào docs
3. ✅ `FRONTEND/src/app/(auth)/register/page.tsx` - Dropdown cho Job

---

## 🧪 Test API

### **PowerShell:**
```powershell
# Test get all options
Invoke-RestMethod -Uri "http://localhost:5000/api/options" -Method GET

# Test get jobs
Invoke-RestMethod -Uri "http://localhost:5000/api/options/jobs" -Method GET

# Test get categories
Invoke-RestMethod -Uri "http://localhost:5000/api/options/categories" -Method GET
```

### **Browser:**
```
http://localhost:5000/api/options
http://localhost:5000/api/options/jobs
http://localhost:5000/api/options/categories
```

---

## 🎯 Tính Năng

✅ **Job Options** - 14 công việc phổ biến  
✅ **Categories** - Lấy từ database (10 categories)  
✅ **Purpose Options** - 8 mục đích sử dụng  
✅ **Source Options** - 8 nguồn biết đến  
✅ **Expectation Options** - 5 mức độ kỳ vọng  
✅ **Caching** - React Query cache 1 giờ  
✅ **Loading State** - Hiển thị "Đang tải..."  
✅ **Responsive** - Dropdown đẹp với icon  

---

**API Options đã sẵn sàng!** 🎉

