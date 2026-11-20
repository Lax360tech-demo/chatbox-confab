import re
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.database.mongodb import get_database
from app.core.security import get_current_user_id
from app.schemas.user import UserUpdateRequest, UserThemeRequest, UserResponse
from app.utils.helpers import serialize_doc

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(current_user_id)} if ObjectId.is_valid(current_user_id) else {"_id": current_user_id}
    user = await db.users.find_one(query)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user["id"] = str(user["_id"])
    return serialize_doc(user)

@router.put("/me", response_model=UserResponse)
async def update_my_profile(req: UserUpdateRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(current_user_id)} if ObjectId.is_valid(current_user_id) else {"_id": current_user_id}
    
    update_data = {}
    if req.full_name is not None:
        update_data["full_name"] = req.full_name.strip()
    if req.username is not None:
        new_username = req.username.strip().lower()
        # Ensure unique if changed
        existing = await db.users.find_one({"username": new_username, "_id": {"$ne": ObjectId(current_user_id) if ObjectId.is_valid(current_user_id) else current_user_id}})
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is already taken")
        update_data["username"] = new_username
    if req.about is not None:
        update_data["about"] = req.about.strip()
    if req.profile_picture is not None:
        update_data["profile_picture"] = req.profile_picture
    if req.signature_emoji is not None:
        update_data["signature_emoji"] = req.signature_emoji
    if req.theme is not None:
        update_data["theme"] = req.theme
    if req.privacy_settings is not None:
        update_data["privacy_settings"] = req.privacy_settings.model_dump()
    if req.notification_settings is not None:
        update_data["notification_settings"] = req.notification_settings.model_dump()

    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.users.update_one(query, {"$set": update_data})
    updated_user = await db.users.find_one(query)
    updated_user["id"] = str(updated_user["_id"])
    return serialize_doc(updated_user)

@router.put("/theme")
async def update_theme(req: UserThemeRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(current_user_id)} if ObjectId.is_valid(current_user_id) else {"_id": current_user_id}
    await db.users.update_one(query, {"$set": {"theme": req.theme, "updated_at": datetime.now(timezone.utc)}})
    return {"success": True, "theme": req.theme}

@router.get("/search")
async def search_users(q: str = Query(..., min_length=1), current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    regex_pattern = re.compile(re.escape(q.strip()), re.IGNORECASE)
    
    # Exclude current user from search
    self_id = ObjectId(current_user_id) if ObjectId.is_valid(current_user_id) else current_user_id

    # Search in registered users
    cursor = db.users.find({
        "_id": {"$ne": self_id},
        "$or": [
            {"username": regex_pattern},
            {"full_name": regex_pattern},
            {"phone_number": regex_pattern}
        ]
    }).limit(20)

    users = await cursor.to_list(length=20)
    results = []
    for u in users:
        # Privacy filter
        privacy = u.get("privacy_settings", {})
        results.append({
            "id": str(u["_id"]),
            "full_name": u.get("full_name"),
            "username": u.get("username"),
            "profile_picture": u.get("profile_picture") if privacy.get("profile_picture") != "nobody" else "",
            "about": u.get("about") if privacy.get("about") != "nobody" else "",
            "signature_emoji": u.get("signature_emoji", "🚀"),
            "online_status": u.get("online_status", False) if privacy.get("online_status") == "everyone" else False,
            "last_seen": u.get("last_seen").isoformat() if u.get("last_seen") and privacy.get("last_seen") == "everyone" else None,
            "is_registered": True
        })
    return results

@router.get("/{user_id}")
async def get_user_by_id(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    u = await db.users.find_one(query)
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    privacy = u.get("privacy_settings", {})
    return {
        "id": str(u["_id"]),
        "full_name": u.get("full_name"),
        "username": u.get("username"),
        "profile_picture": u.get("profile_picture") if privacy.get("profile_picture") != "nobody" else "",
        "about": u.get("about") if privacy.get("about") != "nobody" else "",
        "signature_emoji": u.get("signature_emoji", "🚀"),
        "online_status": u.get("online_status", False) if privacy.get("online_status") == "everyone" else False,
        "last_seen": u.get("last_seen").isoformat() if u.get("last_seen") and privacy.get("last_seen") == "everyone" else None,
        "is_registered": True
    }
