import re
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.database.mongodb import get_database
from app.core.security import get_current_user_id
from app.schemas.message import MessageSendRequest, MessageEditRequest, MessageReactionRequest, MessageDeleteRequest, MessageResponse
from app.sockets.socket_manager import sio
from app.utils.helpers import serialize_doc

router = APIRouter(prefix="/messages", tags=["Messages"])

@router.post("", response_model=MessageResponse)
async def send_message(req: MessageSendRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    
    # Verify conversation existence and membership
    conv_query = {"_id": ObjectId(req.conversation_id)} if ObjectId.is_valid(req.conversation_id) else {"_id": req.conversation_id}
    conv = await db.conversations.find_one(conv_query)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if current_user_id not in conv.get("participants", []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this conversation")

    # Fetch sender user profile
    sender_query = {"_id": ObjectId(current_user_id)} if ObjectId.is_valid(current_user_id) else {"_id": current_user_id}
    sender = await db.users.find_one(sender_query)
    sender_name = sender.get("full_name", "User") if sender else "User"
    sender_avatar = sender.get("profile_picture", "") if sender else ""
    sender_emoji = sender.get("signature_emoji", "🚀") if sender else "🚀"

    # Handle reply_to preview if present
    reply_preview = None
    if req.reply_to:
        reply_query = {"_id": ObjectId(req.reply_to)} if ObjectId.is_valid(req.reply_to) else {"_id": req.reply_to}
        reply_msg = await db.messages.find_one(reply_query)
        if reply_msg:
            reply_preview = {
                "id": str(reply_msg["_id"]),
                "sender_id": reply_msg.get("sender_id"),
                "sender_name": reply_msg.get("sender_name", ""),
                "content": reply_msg.get("content", ""),
                "message_type": reply_msg.get("message_type", "text")
            }

    now = datetime.now(timezone.utc)
    msg_doc = {
        "conversation_id": req.conversation_id,
        "sender_id": current_user_id,
        "sender_name": sender_name,
        "sender_avatar": sender_avatar,
        "sender_emoji": sender_emoji,
        "message_type": req.message_type,
        "content": req.content or "",
        "attachment": req.attachment,
        "reply_to": reply_preview,
        "reactions": {},
        "delivered_to": [current_user_id],
        "read_by": [current_user_id],
        "is_edited": False,
        "edited_at": None,
        "is_pinned": False,
        "is_starred": False,
        "deleted_for": [],
        "deleted_for_everyone": False,
        "disappearing_hours": 24,
        "viewed_at": None,
        "expires_at": None,
        "status": "sent",
        "created_at": now
    }

    insert_res = await db.messages.insert_one(msg_doc)
    msg_id = str(insert_res.inserted_id)
    msg_doc["_id"] = msg_id
    msg_doc["id"] = msg_id

    # Update conversation's last_message and updated_at
    last_msg_summary = {
        "id": msg_id,
        "sender_id": current_user_id,
        "sender_name": sender_name,
        "content": req.content if req.message_type == "text" else f"[{req.message_type.capitalize()}] {req.content or ''}".strip(),
        "message_type": req.message_type,
        "created_at": now.isoformat()
    }
    await db.conversations.update_one(
        conv_query,
        {
            "$set": {"last_message": last_msg_summary, "updated_at": now},
            "$pull": {"deleted_for": {"$in": conv.get("participants", [])}}
        }
    )

    serialized = serialize_doc(msg_doc)

    # Broadcast via Socket.IO room and user rooms for instant delivery without reload
    try:
        await sio.emit("receive_message", serialized, room=f"conv:{req.conversation_id}")
        for p in conv.get("participants", []):
            await sio.emit("receive_message", serialized, room=f"user:{p}")
            if p != current_user_id:
                await sio.emit("conversation_update", {
                    "conversation_id": req.conversation_id,
                    "last_message": last_msg_summary,
                    "unread_increment": True
                }, room=f"user:{p}")
    except Exception as e:
        pass

    return serialized

@router.get("/{conversation_id}")
async def get_messages(
    conversation_id: str,
    limit: int = Query(50, le=100),
    before: str = Query(None),
    q: str = Query(None),
    current_user_id: str = Depends(get_current_user_id)
):
    db = get_database()
    conv_query = {"_id": ObjectId(conversation_id)} if ObjectId.is_valid(conversation_id) else {"_id": conversation_id}
    conv = await db.conversations.find_one(conv_query)
    if not conv or current_user_id not in conv.get("participants", []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    now = datetime.now(timezone.utc)

    # Purge expired messages in the background
    try:
        await db.messages.delete_many({
            "conversation_id": conversation_id,
            "expires_at": {"$ne": None, "$lte": now}
        })
    except Exception:
        pass

    filter_query = {
        "conversation_id": conversation_id,
        "deleted_for": {"$ne": current_user_id},
        "deleted_for_everyone": {"$ne": True},
        "$or": [
            {"expires_at": None},
            {"expires_at": {"$gt": now}}
        ]
    }

    if before:
        # Cursor pagination
        try:
            cursor_dt = datetime.fromisoformat(before)
            filter_query["created_at"] = {"$lt": cursor_dt}
        except Exception:
            pass

    if q:
        # In-chat message search
        filter_query["content"] = {"$regex": re.escape(q.strip()), "$options": "i"}

    cursor = db.messages.find(filter_query).sort("created_at", -1).limit(limit)
    raw_messages = await cursor.to_list(length=limit)

    # Reverse so they are returned in chronological order
    raw_messages.reverse()
    
    # Auto mark messages as read by current user and start 24h expiration timer
    unread_msg_ids = [m["_id"] for m in raw_messages if current_user_id not in m.get("read_by", []) and m.get("sender_id") != current_user_id]
    if unread_msg_ids:
        viewed_now = datetime.now(timezone.utc)
        expires_at = viewed_now + timedelta(hours=24)
        await db.messages.update_many(
            {"_id": {"$in": unread_msg_ids}},
            {
                "$addToSet": {"read_by": current_user_id, "delivered_to": current_user_id},
                "$set": {"viewed_at": viewed_now, "expires_at": expires_at}
            }
        )
        try:
            await sio.emit("message_read", {
                "conversation_id": conversation_id,
                "read_by_user_id": current_user_id,
                "message_ids": [str(mid) for mid in unread_msg_ids]
            }, room=f"conv:{conversation_id}")
        except Exception:
            pass

    return [serialize_doc(m) for m in raw_messages]

@router.put("/{message_id}")
async def edit_message(message_id: str, req: MessageEditRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(message_id)} if ObjectId.is_valid(message_id) else {"_id": message_id}
    msg = await db.messages.find_one(query)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if msg.get("sender_id") != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own messages")

    now = datetime.now(timezone.utc)
    await db.messages.update_one(
        query,
        {"$set": {"content": req.content.strip(), "is_edited": True, "edited_at": now}}
    )

    updated_msg = await db.messages.find_one(query)
    serialized = serialize_doc(updated_msg)

    try:
        await sio.emit("message_edited", serialized, room=f"conv:{msg['conversation_id']}")
    except Exception:
        pass

    return serialized

@router.post("/{message_id}/react")
async def react_to_message(message_id: str, req: MessageReactionRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(message_id)} if ObjectId.is_valid(message_id) else {"_id": message_id}
    msg = await db.messages.find_one(query)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    emoji = req.emoji.strip()
    reactions = msg.get("reactions", {})

    # If user already reacted with this emoji, toggle it off
    if emoji in reactions and current_user_id in reactions[emoji]:
        reactions[emoji].remove(current_user_id)
        if not reactions[emoji]:
            del reactions[emoji]
    else:
        # Remove user from any other emoji in this message
        for em in list(reactions.keys()):
            if current_user_id in reactions[em]:
                reactions[em].remove(current_user_id)
                if not reactions[em]:
                    del reactions[em]
        if emoji not in reactions:
            reactions[emoji] = []
        reactions[emoji].append(current_user_id)

    await db.messages.update_one(query, {"$set": {"reactions": reactions}})
    
    try:
        await sio.emit("message_reaction", {
            "message_id": message_id,
            "conversation_id": msg["conversation_id"],
            "reactions": reactions
        }, room=f"conv:{msg['conversation_id']}")
    except Exception:
        pass

    return {"success": True, "reactions": reactions}

@router.post("/{message_id}/pin")
async def toggle_pin_message(message_id: str, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(message_id)} if ObjectId.is_valid(message_id) else {"_id": message_id}
    msg = await db.messages.find_one(query)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    new_pinned = not msg.get("is_pinned", False)
    await db.messages.update_one(query, {"$set": {"is_pinned": new_pinned}})
    
    try:
        await sio.emit("message_pinned", {
            "message_id": message_id,
            "conversation_id": msg["conversation_id"],
            "is_pinned": new_pinned
        }, room=f"conv:{msg['conversation_id']}")
    except Exception:
        pass

    return {"success": True, "is_pinned": new_pinned}

@router.post("/{message_id}/star")
async def toggle_star_message(message_id: str, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(message_id)} if ObjectId.is_valid(message_id) else {"_id": message_id}
    msg = await db.messages.find_one(query)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    new_starred = not msg.get("is_starred", False)
    await db.messages.update_one(query, {"$set": {"is_starred": new_starred}})
    return {"success": True, "is_starred": new_starred}

@router.delete("/{message_id}")
async def delete_message(message_id: str, req: MessageDeleteRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(message_id)} if ObjectId.is_valid(message_id) else {"_id": message_id}
    msg = await db.messages.find_one(query)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    if req.delete_for == "everyone":
        if msg.get("sender_id") != current_user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own message for everyone")
        await db.messages.update_one(
            query,
            {"$set": {"deleted_for_everyone": True, "content": "This message was deleted."}}
        )
        try:
            await sio.emit("message_deleted", {
                "message_id": message_id,
                "conversation_id": msg["conversation_id"],
                "delete_for": "everyone"
            }, room=f"conv:{msg['conversation_id']}")
        except Exception:
            pass
    else:
        # Delete for me
        await db.messages.update_one(
            query,
            {"$addToSet": {"deleted_for": current_user_id}}
        )

    return {"success": True, "message": "Message deleted"}

@router.post("/{message_id}/read")
async def mark_message_read(message_id: str, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(message_id)} if ObjectId.is_valid(message_id) else {"_id": message_id}
    msg = await db.messages.find_one(query)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    await db.messages.update_one(
        query,
        {"$addToSet": {"read_by": current_user_id, "delivered_to": current_user_id}}
    )

    try:
        await sio.emit("message_read", {
            "conversation_id": msg["conversation_id"],
            "read_by_user_id": current_user_id,
            "message_ids": [message_id]
        }, room=f"conv:{msg['conversation_id']}")
    except Exception:
        pass

    return {"success": True}
