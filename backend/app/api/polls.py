from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends
from app.database.mongodb import get_database
from app.core.security import get_current_user_id
from app.schemas.poll import PollCreateRequest, PollVoteRequest, PollResponse
from app.sockets.socket_manager import sio
from app.utils.helpers import serialize_doc

router = APIRouter(prefix="/polls", tags=["Polls"])

@router.post("", response_model=PollResponse)
async def create_poll(req: PollCreateRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    
    # Check conversation
    conv_query = {"_id": ObjectId(req.conversation_id)} if ObjectId.is_valid(req.conversation_id) else {"_id": req.conversation_id}
    conv = await db.conversations.find_one(conv_query)
    if not conv or current_user_id not in conv.get("participants", []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    now = datetime.now(timezone.utc)
    options_data = [{"index": idx, "text": opt.strip(), "votes": []} for idx, opt in enumerate(req.options)]

    poll_doc = {
        "conversation_id": req.conversation_id,
        "question": req.question.strip(),
        "options": options_data,
        "allow_multiple": req.allow_multiple,
        "expires_at": req.expires_at,
        "created_by": current_user_id,
        "created_at": now
    }

    insert_poll = await db.polls.insert_one(poll_doc)
    poll_id = str(insert_poll.inserted_id)
    poll_doc["id"] = poll_id

    # Create associated message in conversation so poll appears directly in the chat!
    sender_query = {"_id": ObjectId(current_user_id)} if ObjectId.is_valid(current_user_id) else {"_id": current_user_id}
    sender = await db.users.find_one(sender_query)

    msg_doc = {
        "conversation_id": req.conversation_id,
        "sender_id": current_user_id,
        "sender_name": sender.get("full_name", "User") if sender else "User",
        "sender_avatar": sender.get("profile_picture", "") if sender else "",
        "sender_emoji": sender.get("signature_emoji", "🚀") if sender else "🚀",
        "message_type": "poll",
        "content": req.question.strip(),
        "attachment": {"poll_id": poll_id},
        "reply_to": None,
        "reactions": {},
        "delivered_to": [current_user_id],
        "read_by": [current_user_id],
        "is_edited": False,
        "is_pinned": False,
        "is_starred": False,
        "deleted_for": [],
        "deleted_for_everyone": False,
        "status": "sent",
        "created_at": now
    }
    insert_msg = await db.messages.insert_one(msg_doc)
    msg_id = str(insert_msg.inserted_id)
    await db.polls.update_one({"_id": insert_poll.inserted_id}, {"$set": {"message_id": msg_id}})

    # Update conversation's last message
    last_summary = {
        "id": msg_id,
        "sender_id": current_user_id,
        "sender_name": msg_doc["sender_name"],
        "content": f"[Poll] {req.question.strip()}",
        "message_type": "poll",
        "created_at": now.isoformat()
    }
    await db.conversations.update_one(conv_query, {"$set": {"last_message": last_summary, "updated_at": now}})

    # Format response
    formatted = format_poll_response(poll_doc, current_user_id)

    # Broadcast message and poll update via Socket.IO
    msg_doc["id"] = msg_id
    try:
        await sio.emit("receive_message", serialize_doc(msg_doc), room=f"conv:{req.conversation_id}")
        await sio.emit("poll_updated", formatted, room=f"conv:{req.conversation_id}")
    except Exception:
        pass

    return formatted

@router.get("/{poll_id}", response_model=PollResponse)
async def get_poll(poll_id: str, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(poll_id)} if ObjectId.is_valid(poll_id) else {"_id": poll_id}
    poll = await db.polls.find_one(query)
    if not poll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poll not found")
    poll["id"] = str(poll["_id"])
    return format_poll_response(poll, current_user_id)

@router.post("/{poll_id}/vote", response_model=PollResponse)
async def vote_poll(poll_id: str, req: PollVoteRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(poll_id)} if ObjectId.is_valid(poll_id) else {"_id": poll_id}
    poll = await db.polls.find_one(query)
    if not poll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poll not found")

    options = poll.get("options", [])
    allow_multiple = poll.get("allow_multiple", False)

    selected_indices = req.option_indices if allow_multiple else req.option_indices[:1]

    # Update votes: remove previous votes by user
    for opt in options:
        opt["votes"] = [uid for uid in opt.get("votes", []) if uid != current_user_id]
        if opt["index"] in selected_indices:
            opt["votes"].append(current_user_id)

    await db.polls.update_one(query, {"$set": {"options": options}})
    poll["options"] = options
    poll["id"] = str(poll["_id"])

    formatted = format_poll_response(poll, current_user_id)

    # Broadcast poll vote update in real-time
    try:
        await sio.emit("poll_updated", formatted, room=f"conv:{poll['conversation_id']}")
    except Exception:
        pass

    return formatted

def format_poll_response(poll: dict, current_user_id: str) -> dict:
    options = poll.get("options", [])
    total_votes = sum(len(opt.get("votes", [])) for opt in options)
    
    formatted_opts = []
    user_votes = []
    for opt in options:
        votes = opt.get("votes", [])
        vote_count = len(votes)
        percentage = round((vote_count / total_votes * 100), 1) if total_votes > 0 else 0.0
        if current_user_id in votes:
            user_votes.append(opt.get("index"))
        formatted_opts.append({
            "index": opt.get("index"),
            "text": opt.get("text"),
            "votes": votes,
            "vote_count": vote_count,
            "percentage": percentage
        })

    return {
        "id": str(poll["_id"]) if "_id" in poll else str(poll["id"]),
        "conversation_id": poll.get("conversation_id"),
        "message_id": poll.get("message_id"),
        "question": poll.get("question"),
        "options": formatted_opts,
        "allow_multiple": poll.get("allow_multiple", False),
        "total_votes": total_votes,
        "created_by": poll.get("created_by"),
        "user_votes": user_votes,
        "is_closed": False,
        "created_at": poll.get("created_at").isoformat() if isinstance(poll.get("created_at"), datetime) else str(poll.get("created_at", ""))
    }
