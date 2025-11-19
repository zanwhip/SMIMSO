from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import torch
from PIL import Image
import io
import numpy as np
from transformers import CLIPProcessor, CLIPModel, BlipProcessor, BlipForConditionalGeneration
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SMIMSO AI Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global models
clip_model = None
clip_processor = None
blip_model = None
blip_processor = None
device = "cuda" if torch.cuda.is_available() else "cpu"

# Pydantic models
class ImageFeaturesResponse(BaseModel):
    embedding: List[float]
    caption: Optional[str] = None

class ClassifyRequest(BaseModel):
    labels: List[str]

class ClassifyResponse(BaseModel):
    predictions: List[dict]

class SearchByTextRequest(BaseModel):
    query: str
    limit: int = 20

class SimilarImagesRequest(BaseModel):
    embedding: List[float]
    limit: int = 20

class RecommendationsRequest(BaseModel):
    user_id: str
    limit: int = 20

@app.on_event("startup")
async def load_models():
    """Load CLIP and BLIP models on startup"""
    global clip_model, clip_processor, blip_model, blip_processor
    
    try:
        logger.info(f"Loading models on device: {device}")
        
        # Load CLIP model (ViT-B/32)
        logger.info("Loading CLIP model...")
        clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
        clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        logger.info("✅ CLIP model loaded successfully")
        
        # Load BLIP model for image captioning
        logger.info("Loading BLIP model...")
        blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(device)
        blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        logger.info("✅ BLIP model loaded successfully")
        
        logger.info("🎉 All models loaded successfully!")
        
    except Exception as e:
        logger.error(f"❌ Error loading models: {str(e)}")
        raise

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "SMIMSO AI Service",
        "status": "running",
        "device": device,
        "models": {
            "clip": "openai/clip-vit-base-patch32",
            "blip": "Salesforce/blip-image-captioning-base"
        }
    }

@app.post("/api/ai/image-features", response_model=ImageFeaturesResponse)
async def generate_image_features(image: UploadFile = File(...)):
    """
    Generate CLIP embedding and BLIP caption for an image
    """
    try:
        # Read and process image
        image_data = await image.read()
        pil_image = Image.open(io.BytesIO(image_data)).convert("RGB")
        
        # Generate CLIP embedding
        logger.info("Generating CLIP embedding...")
        with torch.no_grad():
            inputs = clip_processor(images=pil_image, return_tensors="pt").to(device)
            image_features = clip_model.get_image_features(**inputs)
            # Normalize embedding
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            embedding = image_features.cpu().numpy()[0].tolist()
        
        # Generate BLIP caption
        logger.info("Generating BLIP caption...")
        caption = None
        try:
            with torch.no_grad():
                inputs = blip_processor(pil_image, return_tensors="pt").to(device)
                out = blip_model.generate(**inputs, max_length=50)
                caption = blip_processor.decode(out[0], skip_special_tokens=True)
        except Exception as e:
            logger.warning(f"Caption generation failed: {str(e)}")
        
        logger.info(f"✅ Generated embedding (dim: {len(embedding)}) and caption: {caption}")
        
        return ImageFeaturesResponse(
            embedding=embedding,
            caption=caption
        )
        
    except Exception as e:
        logger.error(f"❌ Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/api/ai/classify", response_model=ClassifyResponse)
async def classify_image(
    image: UploadFile = File(...),
    labels: str = None
):
    """
    Zero-shot image classification using CLIP
    """
    try:
        import json
        
        # Parse labels
        if labels:
            label_list = json.loads(labels)
        else:
            # Default labels
            label_list = ["photo", "drawing", "painting", "screenshot", "diagram"]
        
        # Read and process image
        image_data = await image.read()
        pil_image = Image.open(io.BytesIO(image_data)).convert("RGB")
        
        # Prepare text prompts
        text_prompts = [f"a photo of {label}" for label in label_list]
        
        # Generate predictions
        logger.info(f"Classifying image with labels: {label_list}")
        with torch.no_grad():
            inputs = clip_processor(
                text=text_prompts,
                images=pil_image,
                return_tensors="pt",
                padding=True
            ).to(device)
            
            outputs = clip_model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=1).cpu().numpy()[0]
        
        # Create predictions
        predictions = [
            {"label": label, "score": float(score)}
            for label, score in zip(label_list, probs)
        ]
        predictions.sort(key=lambda x: x["score"], reverse=True)
        
        logger.info(f"✅ Classification complete. Top: {predictions[0]}")

        return ClassifyResponse(predictions=predictions)

    except Exception as e:
        logger.error(f"❌ Error classifying image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error classifying image: {str(e)}")

@app.post("/api/ai/text-embedding")
async def generate_text_embedding(request: SearchByTextRequest):
    """
    Generate CLIP text embedding for search
    """
    try:
        logger.info(f"Generating text embedding for: {request.query}")

        with torch.no_grad():
            inputs = clip_processor(text=[request.query], return_tensors="pt", padding=True).to(device)
            text_features = clip_model.get_text_features(**inputs)
            # Normalize embedding
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            embedding = text_features.cpu().numpy()[0].tolist()

        logger.info(f"✅ Generated text embedding (dim: {len(embedding)})")

        return {
            "embedding": embedding,
            "query": request.query
        }

    except Exception as e:
        logger.error(f"❌ Error generating text embedding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating text embedding: {str(e)}")

@app.post("/api/ai/search-by-text")
async def search_by_text(request: SearchByTextRequest):
    """
    Search images by text query (returns text embedding for database search)
    Note: Actual database search should be done in the backend
    """
    try:
        logger.info(f"Text search query: {request.query}")

        # Generate text embedding
        with torch.no_grad():
            inputs = clip_processor(text=[request.query], return_tensors="pt", padding=True).to(device)
            text_features = clip_model.get_text_features(**inputs)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            embedding = text_features.cpu().numpy()[0].tolist()

        logger.info(f"✅ Text embedding generated for search")

        return {
            "query": request.query,
            "embedding": embedding,
            "message": "Use this embedding to search in your database with vector similarity"
        }

    except Exception as e:
        logger.error(f"❌ Error in text search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in text search: {str(e)}")

@app.post("/api/ai/similar-images")
async def find_similar_images(request: SimilarImagesRequest):
    """
    Find similar images based on embedding
    Note: Actual database search should be done in the backend
    """
    try:
        logger.info(f"Finding similar images for embedding (dim: {len(request.embedding)})")

        return {
            "embedding": request.embedding,
            "limit": request.limit,
            "message": "Use this embedding to search in your database with vector similarity"
        }

    except Exception as e:
        logger.error(f"❌ Error finding similar images: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error finding similar images: {str(e)}")

@app.post("/api/ai/recommendations")
async def get_recommendations(request: RecommendationsRequest):
    """
    Get personalized recommendations
    Note: Recommendation logic should be implemented in the backend
    """
    try:
        logger.info(f"Getting recommendations for user: {request.user_id}")

        return {
            "user_id": request.user_id,
            "limit": request.limit,
            "message": "Recommendation logic should be implemented in the backend based on user activities"
        }

    except Exception as e:
        logger.error(f"❌ Error getting recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting recommendations: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "device": device,
        "models_loaded": {
            "clip": clip_model is not None,
            "blip": blip_model is not None
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

