from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends
from app.database.mongodb import get_database
from app.core.security import get_current_user_id
from app.schemas.call import CallInitiateRequest, CallActionRequest, CallResponse
from app.sockets.socket_manager import sio
from app.utils.helpers import serialize_doc

router = APIRouter(prefix="/calls", tags=["Calls"])

@router.post("", response_model=CallResponse)
async def initiate_call(req: CallInitiateRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    
    caller_query = {"_id": ObjectId(current_user_id)} if ObjectId.is_valid(current_user_id) else {"_id": current_user_id}
    caller = await db.users.find_one(caller_query)

    receiver_id = req.receiver_ids[0] if req.receiver_ids else None
    receiver = None
    if receiver_id:
        receiver_query = {"_id": ObjectId(receiver_id)} if ObjectId.is_valid(receiver_id) else {"_id": receiver_id}
        receiver = await db.users.find_one(receiver_query)

    now = datetime.now(timezone.utc)
    call_doc = {
        "caller_id": current_user_id,
        "caller_name": caller.get("full_name", "User") if caller else "User",
        "caller_avatar": caller.get("profile_picture", "") if caller else "",
        "caller_emoji": caller.get("signature_emoji", "🚀") if caller else "🚀",
        "receiver_ids": req.receiver_ids,
        "receiver_name": receiver.get("full_name", "User") if receiver else "User",
        "receiver_avatar": receiver.get("profile_picture", "") if receiver else "",
        "receiver_emoji": receiver.get("signature_emoji", "🚀") if receiver else "🚀",
        "conversation_id": req.conversation_id,
        "call_type": req.call_type,
        "status": "ringing",
        "started_at": now,
        "ended_at": None,
        "duration": 0
    }

    insert_res = await db.calls.insert_one(call_doc)
    call_doc["id"] = str(insert_res.inserted_id)
    call_doc["_id"] = call_doc["id"]

    serialized = serialize_doc(call_doc)

    # Broadcast incoming call via Socket.IO
    for rid in req.receiver_ids:
        try:
            await sio.emit("incoming_call", {
                "call_id": call_doc["id"],
                "caller_id": current_user_id,
                "caller_name": caller.get("full_name", "User") if caller else "User",
                "caller_avatar": caller.get("profile_picture", "") if caller else "",
                "caller_emoji": caller.get("signature_emoji", "🚀") if caller else "🚀",
                "call_type": req.call_type,
                "conversation_id": req.conversation_id
            }, room=f"user:{rid}")
        except Exception:
            pass

    return serialized

@router.get("/history", response_model=list[CallResponse])
async def get_call_history(current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    cursor = db.calls.find({
        "$or": [
            {"caller_id": current_user_id},
            {"receiver_ids": current_user_id}
        ]
    }).sort("started_at", -1).limit(100)

    calls = await cursor.to_list(length=100)
    results = []
    for c in calls:
        c["id"] = str(c["_id"])
        # Format direction
        if c.get("caller_id") == current_user_id:
            c["direction"] = "outgoing"
        else:
            c["direction"] = "incoming" if c.get("status") == "accepted" else "missed"
        results.append(serialize_doc(c))
    return results

@router.delete("/history")
async def clear_call_history(current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    await db.calls.delete_many({
        "$or": [
            {"caller_id": current_user_id},
            {"receiver_ids": current_user_id}
        ]
    })
    return {"success": True, "message": "Call history cleared"}

@router.post("/{call_id}/action")
async def call_action(call_id: str, req: CallActionRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(call_id)} if ObjectId.is_valid(call_id) else {"_id": call_id}
    call = await db.calls.find_one(query)
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call record not found")

    action_status = {
        "accept": "accepted",
        "reject": "rejected",
        "end": "ended",
        "busy": "busy"
    }.get(req.action, "ended")

    now = datetime.now(timezone.utc)
    update_data = {"status": action_status}
    if req.action in ["end", "reject", "busy"]:
        update_data["ended_at"] = now
        update_data["duration"] = req.duration or 0

    await db.calls.update_one(query, {"$set": update_data})

    # Notify caller or receivers
    target_ids = [call["caller_id"]] + [r for r in call.get("receiver_ids", []) if r != current_user_id]
    for tid in target_ids:
        try:
            if req.action == "accept":
                await sio.emit("call_accepted", {"call_id": call_id}, room=f"user:{tid}")
            elif req.action == "reject":
                await sio.emit("call_rejected", {"call_id": call_id}, room=f"user:{tid}")
            elif req.action == "end":
                await sio.emit("call_ended", {"call_id": call_id, "duration": req.duration}, room=f"user:{tid}")
        except Exception:
            pass

    return {"success": True, "status": action_status}
