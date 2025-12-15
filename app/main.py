
# Forcefully patch cpuinfo to prevent crash on Leapcell/Docker
import sys
from unittest.mock import MagicMock

mock_cpuinfo = MagicMock()
mock_cpuinfo.get_cpu_info.return_value = {
    "arch": "X86_64", 
    "brand_raw": "Intel(R) Xeon(R) CPU @ 2.20GHz",
    "bits": 64,
    "count": 4,
    "flags": []
}
sys.modules["cpuinfo"] = mock_cpuinfo

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.core.llm_client import LLMClient
from typing import List, Dict, Any
import shutil
import os
from app.core.analyzer import ListingAnalyzer

app = FastAPI(title="Amazon Listing Analyzer")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://listing.mistorify.com",
        "https://api.mistorify.com",
        "http://listing.mistorify.com",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Analyzer Instance
analyzer = ListingAnalyzer()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ListingInput(BaseModel):
    asin: str
    text: str

class AnalyzeRequest(BaseModel):
    listings: List[ListingInput]

@app.get("/")
def read_root():
    return {"message": "Amazon Listing Analyzer API is running"}

import logging
import traceback

# Configure logging
logging.basicConfig(
    filename='backend_debug.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        logging.info(f"Starting upload for file: {file.filename}")
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        logging.info(f"File saved to {file_path}. Starting indexing...")
        
        # Index the data immediately
        count = analyzer.load_and_index_data(file_path)
        
        logging.info(f"Indexing successful. Count: {count}")
        
        return {
            "filename": file.filename,
            "indexed_count": count,
            "message": "File uploaded and indexed successfully"
        }
    except Exception as e:
        error_msg = str(e)
        stack_trace = traceback.format_exc()
        logging.error(f"Upload failed: {error_msg}\n{stack_trace}")
        raise HTTPException(status_code=500, detail=f"Server Error: {error_msg}")

@app.post("/analyze")
async def analyze_listings(request: AnalyzeRequest):
    try:
        logging.info(f"Received analysis request for {len(request.listings)} listings")
        # Convert Pydantic models to dicts
        listings_data = [{"asin": l.asin, "text": l.text} for l in request.listings]
        
        result = analyzer.analyze_listings(listings_data)
        logging.info("Analysis completed successfully")
        return result
    except ValueError as e:
        logging.error(f"Analysis validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_msg = str(e)
        stack_trace = traceback.format_exc()
        logging.error(f"Analysis failed: {error_msg}\n{stack_trace}")
        raise HTTPException(status_code=500, detail=f"Server Error: {error_msg}")

class TranslationRequest(BaseModel):
    keywords: List[str]
    api_key: str
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-3.5-turbo"

class OptimizationRequest(BaseModel):
    listing: Dict[str, str] # title, bullets
    missing_keywords: List[str]
    api_key: str
    base_url: str = "https://api.openai.com/v1"
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-3.5-turbo"
    custom_prompt: str = None

class TranslateListingRequest(BaseModel):
    text: str
    api_key: str
    base_url: str
    model: str

@app.post("/api/translate")
async def translate_keywords(request: TranslationRequest):
    try:
        client = LLMClient(api_key=request.api_key, base_url=request.base_url, model=request.model)
        translations = client.translate_keywords(request.keywords)
        return translations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/optimize")
async def optimize_listing(request: OptimizationRequest):
    try:
        client = LLMClient(api_key=request.api_key, base_url=request.base_url, model=request.model)
        suggestion = client.optimize_listing(request.listing, request.missing_keywords, request.custom_prompt)
        return {"suggestion": suggestion}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/translate_listing")
async def translate_listing(request: TranslateListingRequest):
    try:
        client = LLMClient(api_key=request.api_key, base_url=request.base_url, model=request.model)
        translation = client.translate_text(request.text)
        return {"translation": translation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- AI Gateway Implementation ---

from fastapi import Depends, Header, Security

# Load Gateway Key
GATEWAY_API_KEY = os.getenv("GATEWAY_API_KEY")

async def verify_gateway_key(x_gateway_key: str = Header(..., alias="X-Gateway-Key")):
    """
    Verifies that the request contains the correct Gateway API Key.
    """
    if not GATEWAY_API_KEY:
        raise HTTPException(status_code=500, detail="Gateway API Key not configured on server")
    
    if x_gateway_key != GATEWAY_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid Gateway API Key")
    return x_gateway_key

# Gateway Models
class EmbeddingRequest(BaseModel):
    texts: List[str]

class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    model: str = "all-MiniLM-L6-v2"
    count: int

class SimilarityRequest(BaseModel):
    text_1: str
    text_2: str

class SentimentRequest(BaseModel):
    texts: List[str]

class KeywordRequest(BaseModel):
    text: str
    top_n: int = 5

# Gateway Endpoints
@app.post("/gateway/v1/embeddings", 
         response_model=EmbeddingResponse, 
         dependencies=[Depends(verify_gateway_key)],
         tags=["Gateway"])
async def get_embeddings(request: EmbeddingRequest):
    """
    Gateway Endpoint: Generate embeddings for a list of texts.
    Secured by X-Gateway-Key header.
    """
    try:
        embeddings = analyzer.matcher.get_embeddings(request.texts)
        return {
            "embeddings": embeddings,
            "model": "all-MiniLM-L6-v2",
            "count": len(embeddings)
        }
    except Exception as e:
        logging.error(f"Gateway Embedding Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/gateway/v1/similarity", 
         dependencies=[Depends(verify_gateway_key)],
         tags=["Gateway"])
async def check_similarity(request: SimilarityRequest):
    """
    Gateway Endpoint: Calculate Cosine Similarity between two texts.
    """
    try:
        score = analyzer.matcher.calculate_similarity(request.text_1, request.text_2)
        return {"score": score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/gateway/v1/sentiment", 
         dependencies=[Depends(verify_gateway_key)],
         tags=["Gateway"])
async def analyze_sentiment(request: SentimentRequest):
    """
    Gateway Endpoint: Analyze sentiment (Positive/Negative) for list of texts.
    Uses 'distilbert-base-uncased-finetuned-sst-2-english'.
    """
    try:
        results = analyzer.matcher.analyze_sentiment(request.texts)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/gateway/v1/extract-keywords", 
         dependencies=[Depends(verify_gateway_key)],
         tags=["Gateway"])
async def extract_keywords(request: KeywordRequest):
    """
    Gateway Endpoint: Extract keywords using KeyBERT-Lite logic.
    """
    try:
        keywords = analyzer.matcher.extract_keywords(request.text, request.top_n)
        return {"keywords": keywords}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/gateway/v1/health", 
        dependencies=[Depends(verify_gateway_key)],
        tags=["Gateway"])
async def gateway_health():
    """
    Gateway Endpoint: Check system status.
    """
    models = ["all-MiniLM-L6-v2"]
    if analyzer.matcher.sentiment_analyzer:
        models.append("distilbert-sentiment")
        
    return {
        "status": "healthy",
        "service": "AI Gateway",
        "models_loaded": models,
        "backend": "PyTorch + SentenceTransformers + Transformers"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
