# 🤖 Hướng Dẫn Tích Hợp CLIP - SMIMSO

## 📋 Tổng Quan

SMIMSO đã tích hợp **CLIP (OpenAI)** và **BLIP (Salesforce)** để:

- ✅ **Tự động tạo embedding** khi upload ảnh (512 chiều)
- ✅ **Tự động tạo caption** cho ảnh
- ✅ **Zero-shot classification** - Phân loại ảnh
- ✅ **Text-to-Image Search** - Tìm ảnh bằng text
- ✅ **Image Similarity** - Tìm ảnh tương tự

---

## 🏗️ Kiến Trúc

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Frontend   │─────▶│   Backend   │─────▶│ AI Service  │
│  (Next.js)  │      │  (Node.js)  │      │  (Python)   │
└─────────────┘      └─────────────┘      └─────────────┘
                            │                     │
                            ▼                     ▼
                     ┌─────────────┐      ┌─────────────┐
                     │  Supabase   │      │    CLIP     │
                     │ (PostgreSQL)│      │    BLIP     │
                     └─────────────┘      └─────────────┘
```

### **Flow Khi Upload Ảnh:**

1. User upload ảnh từ Frontend
2. Backend nhận ảnh → Lưu vào `/uploads`
3. Backend gọi AI Service: `POST /api/ai/image-features`
4. AI Service:
   - CLIP tạo embedding (512 chiều)
   - BLIP tạo caption
5. Backend lưu vào database:
   - `posts` table: post info
   - `post_images` table: image_url, **embedding**, **caption**
6. Trả về kết quả cho Frontend

---

## 🚀 Cài Đặt AI Service

### **Bước 1: Cài Đặt Python Dependencies**

```powershell
cd AI_SERVICE

# Tạo virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Cài packages
pip install -r requirements.txt
```

**Lưu ý:**
- Cần Python 3.8+
- Download models lần đầu: ~1.5GB
- Cần ~3GB RAM

### **Bước 2: Chạy AI Service**

```powershell
python main.py
```

hoặc

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Kết quả:**
```
INFO:     Loading models on device: cpu
INFO:     Loading CLIP model...
INFO:     ✅ CLIP model loaded successfully
INFO:     Loading BLIP model...
INFO:     ✅ BLIP model loaded successfully
INFO:     🎉 All models loaded successfully!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### **Bước 3: Test AI Service**

```powershell
# Test health
curl http://localhost:8000/health

# Test với script
python test_ai.py
```

---

## 🔧 Cấu Hình Backend

### **File: `BACKEND/.env`**

Thêm dòng này:

```env
AI_SERVICE_URL=http://localhost:8000
```

**Lưu ý:**
- Nếu không chạy AI Service, để trống hoặc comment
- Backend vẫn hoạt động bình thường, chỉ không có embedding/caption

---

## 📡 API Endpoints

### **1. Generate Image Features**

**Endpoint:** `POST /api/ai/image-features`

**Request:**
```bash
curl -X POST http://localhost:8000/api/ai/image-features \
  -F "image=@test.jpg"
```

**Response:**
```json
{
  "embedding": [0.123, -0.456, ...],  // 512 dimensions
  "caption": "a beautiful sunset over the ocean"
}
```

### **2. Zero-shot Classification**

**Endpoint:** `POST /api/ai/classify`

**Request:**
```bash
curl -X POST http://localhost:8000/api/ai/classify \
  -F "image=@test.jpg" \
  -F 'labels=["photo","drawing","painting"]'
```

**Response:**
```json
{
  "predictions": [
    {"label": "photo", "score": 0.85},
    {"label": "drawing", "score": 0.10},
    {"label": "painting", "score": 0.05}
  ]
}
```

### **3. Text Embedding**

**Endpoint:** `POST /api/ai/text-embedding`

**Request:**
```json
{
  "query": "beautiful sunset",
  "limit": 20
}
```

**Response:**
```json
{
  "embedding": [0.123, -0.456, ...],
  "query": "beautiful sunset"
}
```

---

## 🧪 Test Tích Hợp

### **Test 1: Upload Ảnh Từ Frontend**

1. Chạy Backend: `npm run dev` (port 5000)
2. Chạy AI Service: `python main.py` (port 8000)
3. Chạy Frontend: `npm run dev` (port 3000)
4. Vào http://localhost:3000/create-post
5. Upload ảnh → Submit
6. Kiểm tra database:
   ```sql
   SELECT id, caption, embedding FROM post_images LIMIT 1;
   ```

### **Test 2: Text-to-Image Search**

```powershell
# Tạo text embedding
curl -X POST http://localhost:8000/api/ai/text-embedding \
  -H "Content-Type: application/json" \
  -d '{"query": "sunset beach"}'

# Dùng embedding để search trong database (pgvector)
# SELECT * FROM post_images 
# ORDER BY embedding <-> '[0.1, 0.2, ...]' 
# LIMIT 10;
```

---

## 📊 Database Schema

### **Table: `post_images`**

```sql
CREATE TABLE post_images (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  image_url TEXT NOT NULL,
  image_path TEXT,
  embedding vector(512),        -- CLIP embedding
  caption TEXT,                 -- BLIP caption
  display_order INTEGER,
  created_at TIMESTAMP
);

-- Index for vector similarity search
CREATE INDEX idx_post_images_embedding 
ON post_images 
USING ivfflat (embedding vector_cosine_ops);
```

---

## 🔍 Vector Similarity Search

### **Tìm Ảnh Tương Tự:**

```sql
-- Tìm 10 ảnh giống nhất với ảnh có id = 'xxx'
SELECT 
  pi2.id,
  pi2.image_url,
  pi2.caption,
  1 - (pi1.embedding <=> pi2.embedding) as similarity
FROM post_images pi1
CROSS JOIN post_images pi2
WHERE pi1.id = 'xxx' AND pi2.id != 'xxx'
ORDER BY pi1.embedding <=> pi2.embedding
LIMIT 10;
```

### **Tìm Ảnh Bằng Text:**

```sql
-- 1. Tạo text embedding từ AI Service
-- 2. Search trong database
SELECT 
  id,
  image_url,
  caption,
  1 - (embedding <=> '[0.1, 0.2, ...]') as similarity
FROM post_images
ORDER BY embedding <=> '[0.1, 0.2, ...]'
LIMIT 10;
```

---

## ⚡ Performance

### **Lần Đầu (Cold Start):**
- Load models: 10-30s
- CLIP: ~400MB
- BLIP: ~1GB

### **Sau Đó:**
- CPU: 2-5s per image
- GPU: 0.5-1s per image

### **Memory:**
- CPU: ~2-3GB RAM
- GPU: ~2-3GB VRAM

---

## 🐛 Troubleshooting

### **1. AI Service không chạy được:**

```
Error: No module named 'torch'
```

**Fix:**
```bash
pip install torch torchvision
```

### **2. Backend không kết nối được AI Service:**

```
AI service error: connect ECONNREFUSED
```

**Fix:**
- Kiểm tra AI Service đang chạy: `curl http://localhost:8000/health`
- Kiểm tra `AI_SERVICE_URL` trong `.env`

### **3. Models download chậm:**

**Fix:**
- Models tự động download lần đầu (~1.5GB)
- Lưu tại `~/.cache/huggingface/`
- Có thể download trước:
  ```python
  from transformers import CLIPModel, BlipForConditionalGeneration
  CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
  BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
  ```

---

## 📝 Notes

### **AI Service là Optional:**

- Backend vẫn chạy được nếu không có AI Service
- Nếu AI Service fail, ảnh vẫn được lưu, chỉ không có embedding/caption
- Có thể bật/tắt AI features bằng cách comment `AI_SERVICE_URL`

### **Production Deployment:**

- Nên chạy AI Service trên server riêng (có GPU)
- Dùng Docker để deploy
- Cache embeddings để tránh tính lại

---

## 🎯 Tóm Tắt

✅ **AI Service**: Python FastAPI + CLIP + BLIP  
✅ **Backend**: Tự động gọi AI Service khi upload  
✅ **Database**: Lưu embedding (512D) + caption  
✅ **Search**: Vector similarity với pgvector  
✅ **Optional**: Backend vẫn chạy nếu không có AI  

---

**Happy Coding! 🚀**

