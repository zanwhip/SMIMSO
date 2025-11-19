# 🤖 SMIMSO AI Service

AI Service cho SMIMSO sử dụng CLIP và BLIP models.

## 🎯 Tính Năng

- ✅ **CLIP Image Embedding** - Tạo vector embedding 512 chiều cho ảnh
- ✅ **BLIP Image Captioning** - Tự động tạo mô tả cho ảnh
- ✅ **Zero-shot Classification** - Phân loại ảnh không cần training
- ✅ **Text-to-Image Search** - Tìm kiếm ảnh bằng text
- ✅ **Image Similarity** - Tìm ảnh tương tự

## 🚀 Cài Đặt

### **Option 1: Chạy Trực Tiếp (Python)**

#### **1. Tạo Virtual Environment:**

```bash
cd AI_SERVICE
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

#### **2. Cài Dependencies:**

```bash
pip install -r requirements.txt
```

**Lưu ý:** 
- Cần Python 3.8+
- PyTorch sẽ tự động cài CPU version
- Nếu có GPU, cài PyTorch GPU version:
  ```bash
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
  ```

#### **3. Chạy Service:**

```bash
python main.py
```

hoặc

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Service sẽ chạy tại: **http://localhost:8000**

---

### **Option 2: Chạy Bằng Docker**

#### **1. Build Image:**

```bash
cd AI_SERVICE
docker build -t smimso-ai-service .
```

#### **2. Run Container:**

```bash
docker run -p 8000:8000 smimso-ai-service
```

---

## 📡 API Endpoints

### **1. Health Check**

```bash
GET /
GET /health
```

**Response:**
```json
{
  "service": "SMIMSO AI Service",
  "status": "running",
  "device": "cpu",
  "models": {
    "clip": "openai/clip-vit-base-patch32",
    "blip": "Salesforce/blip-image-captioning-base"
  }
}
```

---

### **2. Generate Image Features (CLIP + BLIP)**

```bash
POST /api/ai/image-features
Content-Type: multipart/form-data
```

**Request:**
- `image`: File (JPG, PNG, etc.)

**Response:**
```json
{
  "embedding": [0.123, -0.456, ...],  // 512 dimensions
  "caption": "a beautiful sunset over the ocean"
}
```

**Example (PowerShell):**
```powershell
curl -X POST http://localhost:8000/api/ai/image-features `
  -F "image=@test.jpg"
```

---

### **3. Zero-shot Classification**

```bash
POST /api/ai/classify
Content-Type: multipart/form-data
```

**Request:**
- `image`: File
- `labels`: JSON array of labels

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

**Example:**
```powershell
curl -X POST http://localhost:8000/api/ai/classify `
  -F "image=@test.jpg" `
  -F 'labels=["photo","drawing","painting"]'
```

---

### **4. Generate Text Embedding**

```bash
POST /api/ai/text-embedding
Content-Type: application/json
```

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

## 🔧 Configuration

### **Environment Variables:**

Tạo file `.env`:

```env
# AI Service Port
PORT=8000

# Device (cpu or cuda)
DEVICE=cpu

# Model Cache Directory (optional)
TRANSFORMERS_CACHE=/path/to/cache
```

---

## 📊 Models

### **CLIP (OpenAI)**
- Model: `openai/clip-vit-base-patch32`
- Embedding Dimension: **512**
- Use: Image & Text embeddings

### **BLIP (Salesforce)**
- Model: `Salesforce/blip-image-captioning-base`
- Use: Image captioning

---

## 🧪 Testing

### **Test với cURL:**

```bash
# Health check
curl http://localhost:8000/health

# Upload image
curl -X POST http://localhost:8000/api/ai/image-features \
  -F "image=@test.jpg"
```

### **Test với Python:**

```python
import requests

# Upload image
with open('test.jpg', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/ai/image-features',
        files={'image': f}
    )
    print(response.json())
```

---

## ⚡ Performance

### **First Request:**
- Slow (~10-30s) - Models loading
- CLIP: ~400MB
- BLIP: ~1GB

### **Subsequent Requests:**
- Fast (~1-3s per image)
- CPU: 2-5s
- GPU: 0.5-1s

### **Memory Usage:**
- CPU: ~2-3GB RAM
- GPU: ~2-3GB VRAM

---

## 🐛 Troubleshooting

### **Error: "No module named 'torch'"**
```bash
pip install torch torchvision
```

### **Error: "CUDA out of memory"**
- Giảm batch size
- Hoặc dùng CPU: `device = "cpu"`

### **Models download chậm:**
- Models sẽ tự động download lần đầu (~1.5GB)
- Lưu tại `~/.cache/huggingface/`

---

## 🔗 Integration với Backend

Backend đã tích hợp sẵn AI Service:

1. **Upload ảnh** → Backend gọi `/api/ai/image-features`
2. **Nhận embedding + caption** → Lưu vào database
3. **Search** → Dùng vector similarity trong PostgreSQL

---

## 📝 Notes

- Service này là **optional** - Backend vẫn chạy được nếu không có AI Service
- Nếu AI Service fail, backend sẽ lưu ảnh mà không có embedding
- Có thể chạy AI Service trên server riêng

---

**Happy Coding! 🚀**

