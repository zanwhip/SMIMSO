# Hướng dẫn Debug Image Search với CLIP

## Các vấn đề đã sửa:

### 1. **CLIP Embedding Generation**
- ✅ Đã implement `generateImageEmbedding()` trong CLIP service
- ✅ Sử dụng model `Xenova/clip-vit-base-patch32` với pipeline `image-feature-extraction`
- ✅ Cải thiện cách extract embedding từ model result
- ✅ Normalize embeddings trước khi trả về

### 2. **Database Storage**
- ✅ Embeddings được lưu dưới dạng array trực tiếp vào Supabase
- ✅ Đảm bảo dimension = 512 (CLIP standard)
- ✅ Parse embeddings từ database đúng cách (hỗ trợ cả array và string format)

### 3. **Search Service**
- ✅ Image-to-Image search: So sánh embeddings bằng cosine similarity
- ✅ Text-to-Image search: Generate text embedding và so sánh
- ✅ Sắp xếp kết quả theo similarity score từ cao đến thấp
- ✅ Filter theo minSimilarity threshold

### 4. **API Endpoints**
- ✅ `POST /api/search/image` - Upload ảnh để tìm ảnh tương tự
- ✅ `POST /api/search/text` - Tìm ảnh bằng text query

### 5. **Frontend**
- ✅ Thêm Image Search mode
- ✅ Upload ảnh và hiển thị preview
- ✅ Hiển thị similarity score cho mỗi kết quả

## Cách kiểm tra và debug:

### 1. Kiểm tra embeddings có được generate không:
```sql
-- Chạy trong Supabase SQL Editor
SELECT 
  id, 
  post_id, 
  image_url,
  embedding IS NOT NULL as has_embedding,
  array_length(embedding::float[], 1) as embedding_dim
FROM post_images
LIMIT 10;
```

### 2. Kiểm tra logs khi upload ảnh mới:
- Xem console logs khi tạo post mới
- Tìm các log: `[CLIP] Generating image embedding`
- Kiểm tra: `[CLIP] Generated embedding with dimension: 512`

### 3. Test API trực tiếp:
```bash
# Test image search
curl -X POST http://localhost:5000/api/search/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg" \
  -F "limit=10" \
  -F "minSimilarity=0.3"
```

### 4. Kiểm tra frontend:
- Mở `/search` page
- Chọn "Image Search" tab
- Upload một ảnh
- Xem console logs và network requests

## Các vấn đề có thể gặp:

### 1. **Embeddings không được generate**
- **Nguyên nhân**: CLIP model không load được
- **Giải pháp**: 
  - Kiểm tra `@xenova/transformers` đã được cài đặt
  - Xem logs: `[CLIP] Failed to load CLIP model`
  - Model sẽ tự động download lần đầu (có thể mất vài phút)

### 2. **Embeddings không được lưu vào database**
- **Nguyên nhân**: Format không đúng hoặc dimension sai
- **Giải pháp**:
  - Kiểm tra logs: `[POST] Embedding dimension mismatch`
  - Đảm bảo embedding có 512 elements
  - Kiểm tra Supabase có extension `vector` enabled

### 3. **Search không trả về kết quả**
- **Nguyên nhân**: 
  - Không có embeddings trong database
  - Similarity threshold quá cao
  - Embeddings không được parse đúng
- **Giải pháp**:
  - Kiểm tra có images với embeddings không: `SELECT COUNT(*) FROM post_images WHERE embedding IS NOT NULL`
  - Giảm minSimilarity xuống 0.2 hoặc 0.1
  - Xem logs: `[SEARCH] Found X images with embeddings`

### 4. **CLIP model load chậm**
- **Nguyên nhân**: Model cần download lần đầu (khoảng 200MB)
- **Giải pháp**: 
  - Chờ model download hoàn tất
  - Model sẽ được cache sau lần đầu
  - Có thể pre-download bằng cách gọi API một lần

## Next Steps:

1. **Tối ưu performance**: 
   - Sử dụng pgvector index cho cosine similarity search
   - Cache embeddings đã generate
   
2. **Cải thiện accuracy**:
   - Fine-tune CLIP model cho domain cụ thể
   - Sử dụng larger model nếu cần

3. **Text embedding**:
   - Hiện tại text embedding có thể chưa hoạt động tốt
   - Có fallback về text search thông thường








