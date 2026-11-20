import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from app.core.config import settings
from app.core.security import get_current_user_id

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# Ensure upload folders exist
for folder in ["avatars", "media", "documents", "voice", "stories", "wallpapers"]:
    os.makedirs(os.path.join(settings.UPLOAD_DIR, folder), exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024 # 50 MB

@router.post("/profile")
async def upload_profile_picture(file: UploadFile = File(...), current_user_id: str = Depends(get_current_user_id)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed for profile pictures")

    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"avatar_{current_user_id}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, "avatars", filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"/uploads/avatars/{filename}"
    return {"url": file_url, "filename": filename}

@router.post("/media")
async def upload_media(file: UploadFile = File(...), current_user_id: str = Depends(get_current_user_id)):
    content_type = file.content_type or ""
    is_img = content_type.startswith("image/")
    is_vid = content_type.startswith("video/")

    if not (is_img or is_vid):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image and video files are supported here")

    ext = os.path.splitext(file.filename)[1]
    filename = f"media_{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, "media", filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(dest_path)
    file_url = f"/uploads/media/{filename}"
    return {
        "url": file_url,
        "filename": file.filename,
        "file_size": file_size,
        "media_type": "video" if is_vid else "image",
        "mime_type": content_type
    }

@router.post("/documents")
async def upload_document(file: UploadFile = File(...), current_user_id: str = Depends(get_current_user_id)):
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".zip", ".csv"]
    if ext not in allowed_exts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"File extension {ext} is not allowed")

    filename = f"doc_{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, "documents", filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(dest_path)
    file_url = f"/uploads/documents/{filename}"
    return {
        "url": file_url,
        "filename": file.filename,
        "file_size": file_size,
        "file_type": ext.lstrip(".").upper(),
        "mime_type": file.content_type
    }

@router.post("/voice")
async def upload_voice(file: UploadFile = File(...), current_user_id: str = Depends(get_current_user_id)):
    ext = os.path.splitext(file.filename)[1] or ".webm"
    filename = f"voice_{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, "voice", filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(dest_path)
    file_url = f"/uploads/voice/{filename}"
    return {
        "url": file_url,
        "filename": filename,
        "file_size": file_size,
        "mime_type": file.content_type or "audio/webm"
    }
