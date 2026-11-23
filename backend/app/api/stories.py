from datetime import datetime, timedelta, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends
from app.database.mongodb import get_database
from app.core.security import get_current_user_id
from app.schemas.story import StoryCreateRequest, StoryReactionRequest, StoryResponse
from app.sockets.socket_manager import sio
from app.utils.helpers import serialize_doc

router = APIRouter(prefix="/stories", tags=["Chronicle Stories"])

@router.post("", response_model=StoryResponse)
async def create_story(req: StoryCreateRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    
    # Fetch user info
    user_query = {"_id": ObjectId(current_user_id)} if ObjectId.is_valid(current_user_id) else {"_id": current_user_id}
    user = await db.users.find_one(user_query)
    user_name = user.get("full_name", "User") if user else "User"
    user_avatar = user.get("profile_picture", "") if user else ""
    user_emoji = user.get("signature_emoji", "🚀") if user else "🚀"

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=24)

    story_doc = {
        "user_id": current_user_id,
        "user_name": user_name,
        "user_avatar": user_avatar,
        "user_emoji": user_emoji,
        "media_url": req.media_url,
        "media_type": req.media_type,
        "caption": req.caption or "",
        "background_color": req.background_color or "#1e1e2f",
        "visibility": req.visibility,
        "hidden_from": req.hidden_from or [],
        "viewers": [],
        "reactions": [],
        "created_at": now,
        "expires_at": expires_at
    }

    insert_res = await db.stories.insert_one(story_doc)
    story_doc["id"] = str(insert_res.inserted_id)
    story_doc["_id"] = story_doc["id"]
    story_doc["viewer_count"] = 0
    story_doc["has_viewed"] = False

    serialized = serialize_doc(story_doc)

    # Broadcast story created to contacts / friends
    try:
        await sio.emit("story_created", serialized)
    except Exception:
        pass

    return serialized

@router.get("")
async def get_active_stories(current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    now = datetime.now(timezone.utc)

    # Find active unexpired stories (created in last 24h) in FIFO order
    cursor = db.stories.find({
        "expires_at": {"$gt": now},
        "hidden_from": {"$ne": current_user_id}
    }).sort("created_at", 1)

    stories = await cursor.to_list(length=200)

    # Group stories by user:
    # 1. "my_stories" (current user's stories)
    # 2. "recent_stories" (unviewed contact stories)
    # 3. "viewed_stories" (viewed contact stories)
    my_stories = []
    contact_stories_map = {}

    for s in stories:
        s["id"] = str(s["_id"])
        uid = s.get("user_id")
        
        # Check if current user is in viewers
        viewers = s.get("viewers", [])
        has_viewed = any(v.get("user_id") == current_user_id for v in viewers)
        s["has_viewed"] = has_viewed
        s["viewer_count"] = len(viewers)

        # Only expose viewer list to the story author
        if uid != current_user_id:
            s["viewers"] = []

        serialized_story = serialize_doc(s)

        if uid == current_user_id:
            my_stories.append(serialized_story)
        else:
            if uid not in contact_stories_map:
                contact_stories_map[uid] = {
                    "user_id": uid,
                    "user_name": s.get("user_name"),
                    "user_avatar": s.get("user_avatar"),
                    "user_emoji": s.get("user_emoji"),
                    "all_viewed": True,
                    "stories": []
                }
            contact_stories_map[uid]["stories"].append(serialized_story)
            if not has_viewed:
                contact_stories_map[uid]["all_viewed"] = False

    recent_updates = []
    viewed_updates = []

    for item in contact_stories_map.values():
        if item["all_viewed"]:
            viewed_updates.append(item)
        else:
            recent_updates.append(item)

    return {
        "my_chronicle": {
            "user_id": current_user_id,
            "stories": my_stories
        },
        "recent_updates": recent_updates,
        "viewed_updates": viewed_updates
    }

@router.post("/{story_id}/view")
async def mark_story_viewed(story_id: str, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(story_id)} if ObjectId.is_valid(story_id) else {"_id": story_id}
    story = await db.stories.find_one(query)
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")

    # Don't add author to their own viewers
    if story.get("user_id") == current_user_id:
        return {"success": True, "viewer_count": len(story.get("viewers", []))}

    # Check if already in viewers
    viewers = story.get("viewers", [])
    if not any(v.get("user_id") == current_user_id for v in viewers):
        user_query = {"_id": ObjectId(current_user_id)} if ObjectId.is_valid(current_user_id) else {"_id": current_user_id}
        viewer_user = await db.users.find_one(user_query)
        viewer_record = {
            "user_id": current_user_id,
            "user_name": viewer_user.get("full_name") if viewer_user else "User",
            "user_avatar": viewer_user.get("profile_picture", "") if viewer_user else "",
            "viewed_at": datetime.now(timezone.utc).isoformat()
        }
        await db.stories.update_one(query, {"$push": {"viewers": viewer_record}})

        # Notify story author in real-time
        author_id = story.get("user_id")
        if author_id and author_id != current_user_id:
            try:
                await sio.emit("story_viewed", {
                    "story_id": story_id,
                    "viewer": viewer_record,
                    "viewer_count": len(viewers) + 1
                }, room=f"user:{author_id}")
            except Exception:
                pass

    return {"success": True}

@router.post("/{story_id}/react")
async def react_to_story(story_id: str, req: StoryReactionRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(story_id)} if ObjectId.is_valid(story_id) else {"_id": story_id}
    story = await db.stories.find_one(query)
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")

    user_query = {"_id": ObjectId(current_user_id)} if ObjectId.is_valid(current_user_id) else {"_id": current_user_id}
    reacting_user = await db.users.find_one(user_query)
    react_doc = {
        "user_id": current_user_id,
        "user_name": reacting_user.get("full_name") if reacting_user else "User",
        "emoji": req.emoji,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.stories.update_one(query, {"$push": {"reactions": react_doc}})

    # Notify story owner in real-time
    owner_id = story.get("user_id")
    try:
        await sio.emit("story_reacted", {
            "story_id": story_id,
            "reaction": react_doc
        }, room=f"user:{owner_id}")
    except Exception:
        pass

    return {"success": True, "reaction": react_doc}

@router.delete("/{story_id}")
async def delete_story(story_id: str, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(story_id)} if ObjectId.is_valid(story_id) else {"_id": story_id}
    story = await db.stories.find_one(query)
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    if story.get("user_id") != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own stories")

    await db.stories.delete_one(query)
    return {"success": True, "message": "Story deleted"}
