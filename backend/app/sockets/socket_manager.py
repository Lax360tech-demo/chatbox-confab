import socketio
import logging
from datetime import datetime, timezone
from app.core.config import settings
from app.core.security import decode_token
from app.database.mongodb import get_database

logger = logging.getLogger("confab.socket")

# Create Async Socket.IO server with permissive CORS for development/production
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False
)

# Active connected users: user_id -> set of sid
connected_users = {}
# Socket ID -> user_id
sid_to_user = {}

def get_user_sids(user_id: str) -> set:
    return connected_users.get(str(user_id), set())

@sio.event
async def connect(sid, environ, auth=None):
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get("token")
    if not token and "QUERY_STRING" in environ:
        # Extract from query string
        from urllib.parse import parse_qs
        qs = parse_qs(environ["QUERY_STRING"])
        if "token" in qs:
            token = qs["token"][0]

    if not token:
        logger.warning("Socket connect refused: No token provided for sid=%s", sid)
        # Allow connection but unauthenticated, or disconnect
        return False

    payload = decode_token(token)
    if not payload:
        logger.warning("Socket connect refused: Invalid token for sid=%s", sid)
        return False

    user_id = str(payload.get("sub"))
    sid_to_user[sid] = user_id
    if user_id not in connected_users:
        connected_users[user_id] = set()
    connected_users[user_id].add(sid)

    # Automatically join a private user room so we can emit to room `user:<user_id>` easily!
    await sio.enter_room(sid, f"user:{user_id}")

    # Update online status in database
    db = get_database()
    if db is not None:
        await db.users.update_one(
            {"_id": db.users.find_one({"_id": user_id}) and user_id or None},
            {"$set": {"online_status": True, "last_seen": datetime.now(timezone.utc)}}
        )
    logger.info("User %s connected on sid %s", user_id, sid)
    
    # Broadcast user online
    await sio.emit("user_status", {"user_id": user_id, "online": True}, skip_sid=sid)

@sio.event
async def disconnect(sid):
    user_id = sid_to_user.pop(sid, None)
    if user_id:
        if user_id in connected_users:
            connected_users[user_id].discard(sid)
            if not connected_users[user_id]:
                del connected_users[user_id]
                # User has no more active tabs -> mark offline
                now_iso = datetime.now(timezone.utc).isoformat()
                db = get_database()
                if db is not None:
                    try:
                        from bson import ObjectId
                        query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
                        await db.users.update_one(
                            query,
                            {"$set": {"online_status": False, "last_seen": datetime.now(timezone.utc)}}
                        )
                    except Exception:
                        pass
                await sio.emit("user_status", {"user_id": user_id, "online": False, "last_seen": now_iso})
        logger.info("User %s disconnected from sid %s", user_id, sid)

@sio.event
async def join_conversation(sid, data):
    conversation_id = data.get("conversation_id")
    if conversation_id:
        await sio.enter_room(sid, f"conv:{conversation_id}")
        logger.debug("SID %s joined conv:%s", sid, conversation_id)

@sio.event
async def leave_conversation(sid, data):
    conversation_id = data.get("conversation_id")
    if conversation_id:
        await sio.leave_room(sid, f"conv:{conversation_id}")

@sio.event
async def typing_start(sid, data):
    user_id = sid_to_user.get(sid)
    conversation_id = data.get("conversation_id")
    user_name = data.get("user_name", "Someone")
    if user_id and conversation_id:
        await sio.emit(
            "user_typing",
            {"conversation_id": conversation_id, "user_id": user_id, "user_name": user_name, "is_typing": True},
            room=f"conv:{conversation_id}",
            skip_sid=sid
        )

@sio.event
async def typing_stop(sid, data):
    user_id = sid_to_user.get(sid)
    conversation_id = data.get("conversation_id")
    if user_id and conversation_id:
        await sio.emit(
            "user_typing",
            {"conversation_id": conversation_id, "user_id": user_id, "is_typing": False},
            room=f"conv:{conversation_id}",
            skip_sid=sid
        )

# WebRTC Call Signaling Events
@sio.event
async def call_user(sid, data):
    caller_id = sid_to_user.get(sid)
    receiver_id = data.get("receiver_id")
    call_id = data.get("call_id")
    call_type = data.get("call_type", "audio")
    caller_info = data.get("caller_info", {})

    logger.info("Call signaling: %s calling %s (call_id: %s)", caller_id, receiver_id, call_id)
    if receiver_id:
        await sio.emit(
            "incoming_call",
            {
                "call_id": call_id,
                "caller_id": caller_id,
                "call_type": call_type,
                "caller_info": caller_info,
                "conversation_id": data.get("conversation_id")
            },
            room=f"user:{receiver_id}"
        )

@sio.event
async def call_answer(sid, data):
    call_id = data.get("call_id")
    caller_id = data.get("caller_id")
    accepted = data.get("accepted", True)
    if caller_id:
        await sio.emit(
            "call_answered",
            {"call_id": call_id, "accepted": accepted, "responder_id": sid_to_user.get(sid)},
            room=f"user:{caller_id}"
        )

@sio.event
async def call_end(sid, data):
    call_id = data.get("call_id")
    target_id = data.get("target_id")
    if target_id:
        await sio.emit("call_ended", {"call_id": call_id}, room=f"user:{target_id}")

@sio.event
async def webrtc_signal(sid, data):
    target_id = data.get("target_id")
    signal = data.get("signal")
    sender_id = sid_to_user.get(sid)
    if target_id and signal:
        await sio.emit(
            "webrtc_signal",
            {"sender_id": sender_id, "signal": signal},
            room=f"user:{target_id}"
        )
