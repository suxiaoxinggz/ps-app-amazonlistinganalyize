"""
Project Manager — handles multi-tenant project isolation.
Each project gets its own ChromaDB collection and keyword cache.
"""
import json
import os
import hashlib
import uuid
import shutil
from datetime import datetime
from typing import Optional, Dict, Any, List


DATA_DIR = "data"
PROJECTS_DB_FILE = os.path.join(DATA_DIR, "projects_db.json")
CACHE_DIR = os.path.join(DATA_DIR, "cache")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _load_projects() -> Dict[str, Any]:
    if os.path.exists(PROJECTS_DB_FILE):
        try:
            with open(PROJECTS_DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_projects(projects: Dict[str, Any]):
    with open(PROJECTS_DB_FILE, "w", encoding="utf-8") as f:
        json.dump(projects, f, ensure_ascii=False, indent=2)


def create_project(name: str, password: str, contact: str = "") -> Dict[str, str]:
    """Creates a new project and returns its info."""
    projects = _load_projects()
    project_id = uuid.uuid4().hex[:8]
    
    # Ensure unique ID
    while project_id in projects:
        project_id = uuid.uuid4().hex[:8]
    
    projects[project_id] = {
        "name": name,
        "password_hash": _hash_password(password),
        "contact": contact,
        "created_at": datetime.now().isoformat(),
    }
    _save_projects(projects)
    
    return {"project_id": project_id, "name": name}


def verify_project(project_id: str, password: str) -> bool:
    """Verifies project password. Returns True if valid."""
    projects = _load_projects()
    project = projects.get(project_id)
    if not project:
        return False
    return project["password_hash"] == _hash_password(password)


def get_project_info(project_id: str) -> Optional[Dict[str, Any]]:
    """Returns project info (without password hash)."""
    projects = _load_projects()
    project = projects.get(project_id)
    if not project:
        return None
    return {
        "project_id": project_id,
        "name": project["name"],
        "contact": project.get("contact", ""),
        "created_at": project["created_at"],
    }


def list_projects() -> List[Dict[str, Any]]:
    """Lists all projects (without password hashes)."""
    projects = _load_projects()
    result = []
    for pid, data in projects.items():
        result.append({
            "project_id": pid,
            "name": data["name"],
            "contact": data.get("contact", ""),
            "created_at": data["created_at"],
        })
    return result


def delete_project(project_id: str, password: str) -> bool:
    """Deletes a project and its data after password verification."""
    if not verify_project(project_id, password):
        return False
    
    projects = _load_projects()
    projects.pop(project_id, None)
    _save_projects(projects)
    
    # Clean up project data files
    cache_file = get_cache_path(project_id)
    if os.path.exists(cache_file):
        os.remove(cache_file)
    
    # Upload files in project subdirectory
    upload_dir = os.path.join("uploads", project_id)
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    
    return True


def admin_clear_all(admin_password: str, expected_password: str) -> bool:
    """Admin: clears ALL projects and data."""
    if not expected_password or admin_password != expected_password:
        return False
    
    # Clear projects DB
    _save_projects({})
    
    # Clear all caches
    if os.path.exists(CACHE_DIR):
        shutil.rmtree(CACHE_DIR)
        os.makedirs(CACHE_DIR, exist_ok=True)
    
    # Clear all uploads
    if os.path.exists("uploads"):
        shutil.rmtree("uploads")
        os.makedirs("uploads", exist_ok=True)
    
    # Clear legacy single-tenant files
    for f in ["keywords_cache.json"]:
        if os.path.exists(f):
            os.remove(f)
    
    return True


def get_cache_path(project_id: str) -> str:
    """Returns the cache file path for a project."""
    return os.path.join(CACHE_DIR, f"{project_id}_keywords.json")


def get_collection_name(project_id: str) -> str:
    """Returns the ChromaDB collection name for a project."""
    return f"project_{project_id}"


def get_upload_dir(project_id: str) -> str:
    """Returns the upload directory for a project."""
    upload_dir = os.path.join("uploads", project_id)
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir
