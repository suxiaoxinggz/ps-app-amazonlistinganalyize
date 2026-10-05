
# cpuinfo mock is handled in app/__init__.py

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.core.llm_client import LLMClient
from typing import List, Dict, Any, Optional
import shutil
import os
from app.core.analyzer import ListingAnalyzer
from app.core import project_manager

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

# Per-project Analyzer instances (lazy-loaded)
_analyzers: Dict[str, ListingAnalyzer] = {}
# Legacy fallback for gateway endpoints
_default_analyzer = ListingAnalyzer()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _get_analyzer(project_id: Optional[str] = None) -> ListingAnalyzer:
    """Returns a project-specific or default analyzer."""
    if not project_id:
        return _default_analyzer
    if project_id not in _analyzers:
        _analyzers[project_id] = ListingAnalyzer(project_id=project_id)
    return _analyzers[project_id]

class ListingInput(BaseModel):
    asin: str
    text: str

class AnalyzeRequest(BaseModel):
    listings: List[ListingInput]
    project_id: Optional[str] = None

@app.get("/")
def read_root():
    return {"message": "Amazon Listing Analyzer API is running"}

@app.get("/template/download", tags=["Template"])
async def download_template():
    """Generate and return a keyword template Excel file."""
    from fastapi.responses import StreamingResponse
    from openpyxl import Workbook
    import io

    wb = Workbook()
    ws = wb.active
    ws.title = "Keywords"

    # Headers matching data_processor.py field_mappings exactly
    headers = [
        "关键词",           # keyword
        "关键词翻译",       # translation
        "月搜索量",         # search_volume
        "词搜索转换比(%)",  # conversion_rate
        "点击转化占比TOP3 ASIN",  # top3_click_share
        "包含ASIN",         # asin_coverage
        "cpc精准竞价($)",   # cpc_exact
        "周搜索排名",       # search_rank
        "竞品数量",         # competitor_count
    ]
    ws.append(headers)

    # Example rows
    ws.append(["wireless earbuds", "无线耳机", 450000, "5.2%", "B09XYZ1234,B09ABC5678,B09DEF9012", "B09XYZ1234", 1.25, 1, 850])
    ws.append(["bluetooth headphones", "蓝牙耳机", 320000, "3.8%", "B08AAA1111,B08BBB2222,B08CCC3333", "", 0.98, 5, 1200])
    ws.append(["noise cancelling earphones", "降噪耳机", 180000, "4.1%", "B07DDD4444,B07EEE5555,B07FFF6666", "B07DDD4444", 1.50, 12, 620])

    # Auto-fit column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = max_len + 4

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="keyword_template.xlsx"'},
    )

import logging
import traceback

# Configure logging
logging.basicConfig(
    filename='backend_debug.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), project_id: Optional[str] = Query(None)):
    # Sanitize filename to prevent path traversal
    import re
    safe_filename = re.sub(r'[^\w.\-]', '_', os.path.basename(file.filename or 'upload.xlsx'))
    try:
        logging.info(f"Starting upload for file: {file.filename}, project: {project_id}")
        
        # Use project-specific upload directory if project_id is provided
        if project_id:
            upload_dir = project_manager.get_upload_dir(project_id)
        else:
            upload_dir = UPLOAD_DIR
        
        file_path = os.path.join(upload_dir, safe_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        logging.info(f"File saved to {file_path}. Starting indexing...")
        
        # Index the data using project-specific analyzer
        analyzer = _get_analyzer(project_id)
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
        logging.info(f"Received analysis request for {len(request.listings)} listings, project: {request.project_id}")
        # Convert Pydantic models to dicts
        listings_data = [{"asin": l.asin, "text": l.text} for l in request.listings]
        
        analyzer = _get_analyzer(request.project_id)
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
    model: str = "gpt-4o-mini"

class OptimizationRequest(BaseModel):
    listing: Dict[str, str] # title, bullets
    missing_keywords: List[str]
    api_key: str
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o-mini"
    custom_prompt: Optional[str] = None

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

# --- Project Management Endpoints ---

class ProjectCreateRequest(BaseModel):
    name: str
    password: str
    contact: str = ""

class ProjectVerifyRequest(BaseModel):
    project_id: str
    password: str

class ProjectDeleteRequest(BaseModel):
    project_id: str
    password: str

class AdminClearRequest(BaseModel):
    admin_password: str

@app.post("/project/create", tags=["Project"])
async def create_project(request: ProjectCreateRequest):
    """Create a new isolated project."""
    if not request.name or not request.password:
        raise HTTPException(status_code=400, detail="Name and password are required")
    if len(request.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    result = project_manager.create_project(request.name, request.password, request.contact)
    return result

@app.post("/project/verify", tags=["Project"])
async def verify_project(request: ProjectVerifyRequest):
    """Verify project password and return project info."""
    if not project_manager.verify_project(request.project_id, request.password):
        raise HTTPException(status_code=403, detail="Invalid project ID or password")
    info = project_manager.get_project_info(request.project_id)
    return info

@app.post("/project/delete", tags=["Project"])
async def delete_project(request: ProjectDeleteRequest):
    """Delete a project and its data (requires password)."""
    if not project_manager.delete_project(request.project_id, request.password):
        raise HTTPException(status_code=403, detail="Invalid project ID or password")
    # Remove cached analyzer instance
    _analyzers.pop(request.project_id, None)
    # Try to clean ChromaDB collection
    try:
        from chromadb import PersistentClient
        client = PersistentClient(path="./chroma_db")
        col_name = project_manager.get_collection_name(request.project_id)
        client.delete_collection(col_name)
    except Exception:
        pass
    return {"message": "Project deleted successfully"}

@app.post("/admin/clear", tags=["Admin"])
async def admin_clear(request: AdminClearRequest):
    """Admin: clear ALL projects and data."""
    admin_pw = os.getenv("ADMIN_PASSWORD")
    if not admin_pw:
        raise HTTPException(status_code=500, detail="Admin password not configured on server")
    if not project_manager.admin_clear_all(request.admin_password, admin_pw):
        raise HTTPException(status_code=403, detail="Invalid admin password")
    # Clear all cached analyzers and ChromaDB
    _analyzers.clear()
    try:
        import shutil as _shutil
        if os.path.exists("./chroma_db"):
            _shutil.rmtree("./chroma_db")
    except Exception:
        pass
    return {"message": "All data cleared successfully"}

@app.get("/project/list", tags=["Project"])
async def list_projects():
    """List all projects (public info only)."""
    return project_manager.list_projects()

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
        embeddings = _default_analyzer.matcher.get_embeddings(request.texts)
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
        score = _default_analyzer.matcher.calculate_similarity(request.text_1, request.text_2)
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
        results = _default_analyzer.matcher.analyze_sentiment(request.texts)
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
        keywords = _default_analyzer.matcher.extract_keywords(request.text, request.top_n)
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
    if _default_analyzer.matcher.sentiment_analyzer:
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
