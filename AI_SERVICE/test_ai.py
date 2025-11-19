"""
Test script for SMIMSO AI Service
"""
import requests
import json
from PIL import Image
import io
import numpy as np

AI_SERVICE_URL = "http://localhost:8000"

def test_health():
    """Test health check endpoint"""
    print("\n" + "="*50)
    print("🏥 Testing Health Check...")
    print("="*50)
    
    response = requests.get(f"{AI_SERVICE_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.status_code == 200

def test_image_features(image_path):
    """Test image features generation (CLIP + BLIP)"""
    print("\n" + "="*50)
    print("🖼️  Testing Image Features Generation...")
    print("="*50)
    
    try:
        with open(image_path, 'rb') as f:
            files = {'image': f}
            response = requests.post(
                f"{AI_SERVICE_URL}/api/ai/image-features",
                files=files,
                timeout=60
            )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Embedding dimension: {len(data['embedding'])}")
            print(f"✅ Caption: {data['caption']}")
            print(f"✅ Embedding sample (first 10): {data['embedding'][:10]}")
            return True
        else:
            print(f"❌ Error: {response.text}")
            return False
            
    except FileNotFoundError:
        print(f"❌ Image file not found: {image_path}")
        print("💡 Please create a test image or update the path")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_classification(image_path):
    """Test zero-shot classification"""
    print("\n" + "="*50)
    print("🏷️  Testing Zero-shot Classification...")
    print("="*50)
    
    labels = ["photo", "drawing", "painting", "screenshot", "diagram", "nature", "city", "people"]
    
    try:
        with open(image_path, 'rb') as f:
            files = {'image': f}
            data = {'labels': json.dumps(labels)}
            response = requests.post(
                f"{AI_SERVICE_URL}/api/ai/classify",
                files=files,
                data=data,
                timeout=60
            )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Predictions:")
            for pred in result['predictions'][:5]:
                print(f"   - {pred['label']}: {pred['score']:.4f}")
            return True
        else:
            print(f"❌ Error: {response.text}")
            return False
            
    except FileNotFoundError:
        print(f"❌ Image file not found: {image_path}")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_text_embedding():
    """Test text embedding generation"""
    print("\n" + "="*50)
    print("📝 Testing Text Embedding Generation...")
    print("="*50)
    
    query = "beautiful sunset over the ocean"
    
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/ai/text-embedding",
            json={"query": query, "limit": 20},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Query: {data['query']}")
            print(f"✅ Embedding dimension: {len(data['embedding'])}")
            print(f"✅ Embedding sample (first 10): {data['embedding'][:10]}")
            return True
        else:
            print(f"❌ Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def create_test_image():
    """Create a simple test image if none exists"""
    print("\n💡 Creating test image...")
    
    # Create a simple gradient image
    img = Image.new('RGB', (512, 512))
    pixels = img.load()
    
    for i in range(512):
        for j in range(512):
            pixels[i, j] = (i % 256, j % 256, (i+j) % 256)
    
    img.save('test_image.jpg')
    print("✅ Test image created: test_image.jpg")
    return 'test_image.jpg'

def main():
    """Run all tests"""
    print("\n" + "="*50)
    print("🤖 SMIMSO AI Service Test Suite")
    print("="*50)
    
    # Test 1: Health check
    health_ok = test_health()
    
    if not health_ok:
        print("\n❌ AI Service is not running!")
        print("💡 Please start the AI service first:")
        print("   cd AI_SERVICE")
        print("   python main.py")
        return
    
    # Check if test image exists, if not create one
    import os
    test_image = 'test_image.jpg'
    if not os.path.exists(test_image):
        test_image = create_test_image()
    
    # Test 2: Image features
    features_ok = test_image_features(test_image)
    
    # Test 3: Classification
    classify_ok = test_classification(test_image)
    
    # Test 4: Text embedding
    text_ok = test_text_embedding()
    
    # Summary
    print("\n" + "="*50)
    print("📊 Test Summary")
    print("="*50)
    print(f"Health Check: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"Image Features: {'✅ PASS' if features_ok else '❌ FAIL'}")
    print(f"Classification: {'✅ PASS' if classify_ok else '❌ FAIL'}")
    print(f"Text Embedding: {'✅ PASS' if text_ok else '❌ FAIL'}")
    print("="*50)
    
    if all([health_ok, features_ok, classify_ok, text_ok]):
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")

if __name__ == "__main__":
    main()

