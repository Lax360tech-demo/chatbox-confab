from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends
from app.database.mongodb import get_database
from app.core.security import get_current_user_id
from app.schemas.conversation import ConversationCreateRequest, ConversationSettingsRequest, ConversationResponse
from app.utils.helpers import serialize_doc

router = APIRouter(prefix="/conversations", tags=["Conversations"])

@router.post("", response_model=ConversationResponse)
async def create_or_get_conversation(req: ConversationCreateRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    
    if req.type == "private":
        if not req.recipient_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="recipient_id is required for private conversation")
        
        recipient_id = str(req.recipient_id)
        if recipient_id == current_user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot start a private conversation with yourself")

        # Check if conversation already exists between these 2 users
        existing = await db.conversations.find_one({
            "type": "private",
            "participants": {"$all": [current_user_id, recipient_id], "$size": 2}
        })
        if existing:
            return await enrich_conversation(existing, current_user_id, db)

        # Create new private conversation
        now = datetime.now(timezone.utc)
        doc = {
            "type": "private",
            "participants": [current_user_id, recipient_id],
            "group_id": None,
            "last_message": None,
            "created_at": now,
            "updated_at": now
        }
        res = await db.conversations.insert_one(doc)
        doc["_id"] = res.inserted_id
        return await enrich_conversation(doc, current_user_id, db)

    elif req.type == "group":
        if not req.group_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="group_id is required for group conversation")
        
        existing = await db.conversations.find_one({"type": "group", "group_id": req.group_id})
        if existing:
            return await enrich_conversation(existing, current_user_id, db)
        
        # Else fetch group and create conversation
        group = await db.groups.find_one({"_id": ObjectId(req.group_id) if ObjectId.is_valid(req.group_id) else req.group_id})
        if not group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

        now = datetime.now(timezone.utc)
        doc = {
            "type": "group",
            "participants": group.get("members", []),
            "group_id": req.group_id,
            "last_message": None,
            "created_at": now,
            "updated_at": now
        }
        res = await db.conversations.insert_one(doc)
        doc["_id"] = res.inserted_id
        return await enrich_conversation(doc, current_user_id, db)

@router.get("", response_model=list[ConversationResponse])
async def list_conversations(current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    cursor = db.conversations.find({"participants": current_user_id}).sort("updated_at", -1)
    convs = await cursor.to_list(length=200)

    results = []
    for c in convs:
        enriched = await enrich_conversation(c, current_user_id, db)
        results.append(enriched)
    return results

@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(conversation_id)} if ObjectId.is_valid(conversation_id) else {"_id": conversation_id}
    conv = await db.conversations.find_one(query)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if current_user_id not in conv.get("participants", []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a participant in this conversation")
    return await enrich_conversation(conv, current_user_id, db)

@router.put("/{conversation_id}/settings")
async def update_conversation_settings(conversation_id: str, req: ConversationSettingsRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"user_id": current_user_id, "conversation_id": conversation_id}
    update_data = {}
    if req.wallpaper is not None:
        update_data["wallpaper"] = req.wallpaper
    if req.muted is not None:
        update_data["muted"] = req.muted
    if req.archived is not None:
        update_data["archived"] = req.archived
    if req.pinned is not None:
        update_data["pinned"] = req.pinned

    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.chat_settings.update_one(query, {"$set": update_data}, upsert=True)

    return {"success": True, "message": "Conversation settings updated"}

async def enrich_conversation(conv: dict, current_user_id: str, db) -> dict:
    conv_id = str(conv["_id"])
    participants = conv.get("participants", [])

    # Fetch participant user objects
    part_obj_ids = [ObjectId(p) for p in participants if ObjectId.is_valid(p)]
    users_cursor = db.users.find({"_id": {"$in": part_obj_ids}})
    user_list = await users_cursor.to_list(length=100)
    
    participant_details = []
    for u in user_list:
        privacy = u.get("privacy_settings", {})
        participant_details.append({
            "id": str(u["_id"]),
            "full_name": u.get("full_name"),
            "username": u.get("username"),
            "profile_picture": u.get("profile_picture", "") if privacy.get("profile_picture") != "nobody" else "",
            "signature_emoji": u.get("signature_emoji", "🚀"),
            "online_status": u.get("online_status", False) if privacy.get("online_status") == "everyone" else False,
            "last_seen": u.get("last_seen").isoformat() if u.get("last_seen") and privacy.get("last_seen") == "everyone" else None
        })

    # Group details
    group_details = None
    if conv.get("type") == "group" and conv.get("group_id"):
        gid = ObjectId(conv["group_id"]) if ObjectId.is_valid(conv["group_id"]) else conv["group_id"]
        grp = await db.groups.find_one({"_id": gid})
        if grp:
            group_details = {
                "id": str(grp["_id"]),
                "group_name": grp.get("group_name"),
                "group_picture": grp.get("group_picture", ""),
                "description": grp.get("description", ""),
                "creator_id": grp.get("creator_id"),
                "admins": grp.get("admins", []),
                "members_count": len(grp.get("members", []))
            }

    # Fetch user specific settings (wallpaper, muted, archived, pinned)
    c_settings = await db.chat_settings.find_one({"user_id": current_user_id, "conversation_id": conv_id}) or {}

    # Calculate unread messages count for this user
    unread_count = await db.messages.count_documents({
        "conversation_id": conv_id,
        "sender_id": {"$ne": current_user_id},
        "read_by": {"$ne": current_user_id},
        "deleted_for": {"$ne": current_user_id},
        "deleted_for_everyone": {"$ne": True}
    })

    return {
        "id": conv_id,
        "type": conv.get("type", "private"),
        "participants": participants,
        "participant_details": participant_details,
        "group_id": conv.get("group_id"),
        "group_details": group_details,
        "last_message": conv.get("last_message"),
        "unread_count": unread_count,
        "wallpaper": c_settings.get("wallpaper"),
        "is_muted": c_settings.get("muted", False),
        "is_archived": c_settings.get("archived", False),
        "is_pinned": c_settings.get("pinned", False),
        "created_at": conv.get("created_at").isoformat() if isinstance(conv.get("created_at"), datetime) else str(conv.get("created_at", "")),
        "updated_at": conv.get("updated_at").isoformat() if isinstance(conv.get("updated_at"), datetime) else str(conv.get("updated_at", ""))
    }
