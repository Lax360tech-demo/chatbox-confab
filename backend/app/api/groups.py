from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends
from app.database.mongodb import get_database
from app.core.security import get_current_user_id
from app.schemas.group import GroupCreateRequest, GroupUpdateRequest, GroupMemberActionRequest, GroupResponse
from app.sockets.socket_manager import sio
from app.utils.helpers import serialize_doc

router = APIRouter(prefix="/groups", tags=["Groups"])

@router.post("", response_model=GroupResponse)
async def create_group(req: GroupCreateRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    
    # Ensure creator is in members and unique
    members_set = set(req.member_ids)
    members_set.add(current_user_id)
    all_members = list(members_set)

    now = datetime.now(timezone.utc)
    group_doc = {
        "group_name": req.group_name.strip(),
        "group_picture": req.group_picture or "",
        "description": req.description or "",
        "creator_id": current_user_id,
        "admins": [current_user_id],
        "members": all_members,
        "created_at": now,
        "updated_at": now
    }

    insert_grp = await db.groups.insert_one(group_doc)
    group_id = str(insert_grp.inserted_id)
    group_doc["id"] = group_id

    # Create associated group conversation
    conv_doc = {
        "type": "group",
        "participants": all_members,
        "group_id": group_id,
        "last_message": {
            "id": "",
            "sender_id": current_user_id,
            "sender_name": "System",
            "content": f"Group '{req.group_name.strip()}' created",
            "message_type": "text",
            "created_at": now.isoformat()
        },
        "created_at": now,
        "updated_at": now
    }
    insert_conv = await db.conversations.insert_one(conv_doc)
    group_doc["conversation_id"] = str(insert_conv.inserted_id)

    # Fetch member details for response
    member_obj_ids = [ObjectId(m) for m in all_members if ObjectId.is_valid(m)]
    members_cursor = db.users.find({"_id": {"$in": member_obj_ids}})
    members_list = await members_cursor.to_list(length=100)
    group_doc["member_details"] = [
        {
            "id": str(u["_id"]),
            "full_name": u.get("full_name"),
            "username": u.get("username"),
            "profile_picture": u.get("profile_picture", ""),
            "signature_emoji": u.get("signature_emoji", "🚀"),
            "role": "creator" if str(u["_id"]) == current_user_id else "member"
        }
        for u in members_list
    ]

    serialized = serialize_doc(group_doc)

    # CRITICAL: Notify every member via Socket.IO room user:<user_id> so group automatically appears in everyone's chat list!
    for mid in all_members:
        try:
            await sio.emit("group_created", serialized, room=f"user:{mid}")
        except Exception:
            pass

    return serialized

@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(group_id: str, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(group_id)} if ObjectId.is_valid(group_id) else {"_id": group_id}
    group = await db.groups.find_one(query)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    if current_user_id not in group.get("members", []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this group")

    group["id"] = str(group["_id"])
    
    # Find conversation_id
    conv = await db.conversations.find_one({"type": "group", "group_id": group_id})
    group["conversation_id"] = str(conv["_id"]) if conv else None

    # Fetch member details
    member_obj_ids = [ObjectId(m) for m in group.get("members", []) if ObjectId.is_valid(m)]
    members_cursor = db.users.find({"_id": {"$in": member_obj_ids}})
    members_list = await members_cursor.to_list(length=100)
    group["member_details"] = [
        {
            "id": str(u["_id"]),
            "full_name": u.get("full_name"),
            "username": u.get("username"),
            "profile_picture": u.get("profile_picture", ""),
            "signature_emoji": u.get("signature_emoji", "🚀"),
            "role": "creator" if str(u["_id"]) == group.get("creator_id") else ("admin" if str(u["_id"]) in group.get("admins", []) else "member")
        }
        for u in members_list
    ]

    return serialize_doc(group)

@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(group_id: str, req: GroupUpdateRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(group_id)} if ObjectId.is_valid(group_id) else {"_id": group_id}
    group = await db.groups.find_one(query)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    if current_user_id not in group.get("admins", []) and current_user_id != group.get("creator_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can edit group information")

    update_fields = {"updated_at": datetime.now(timezone.utc)}
    if req.group_name is not None:
        update_fields["group_name"] = req.group_name.strip()
    if req.group_picture is not None:
        update_fields["group_picture"] = req.group_picture
    if req.description is not None:
        update_fields["description"] = req.description.strip()

    await db.groups.update_one(query, {"$set": update_fields})
    updated_group = await db.groups.find_one(query)
    updated_group["id"] = str(updated_group["_id"])

    # Broadcast update to group room
    conv = await db.conversations.find_one({"type": "group", "group_id": group_id})
    if conv:
        conv_id = str(conv["_id"])
        updated_group["conversation_id"] = conv_id
        try:
            await sio.emit("group_updated", serialize_doc(updated_group), room=f"conv:{conv_id}")
        except Exception:
            pass

    return serialize_doc(updated_group)

@router.post("/{group_id}/members")
async def add_group_member(group_id: str, req: GroupMemberActionRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(group_id)} if ObjectId.is_valid(group_id) else {"_id": group_id}
    group = await db.groups.find_one(query)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    if current_user_id not in group.get("admins", []) and current_user_id != group.get("creator_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can add members")

    target_user_id = req.user_id
    if target_user_id in group.get("members", []):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member")

    await db.groups.update_one(query, {"$addToSet": {"members": target_user_id}})
    await db.conversations.update_one({"type": "group", "group_id": group_id}, {"$addToSet": {"participants": target_user_id}})

    # Notify via Socket.IO
    conv = await db.conversations.find_one({"type": "group", "group_id": group_id})
    if conv:
        try:
            await sio.emit("member_added", {"group_id": group_id, "user_id": target_user_id}, room=f"conv:{str(conv['_id'])}")
            await sio.emit("group_created", {"group_id": group_id}, room=f"user:{target_user_id}")
        except Exception:
            pass

    return {"success": True, "message": "Member added successfully"}

@router.delete("/{group_id}/members/{user_id}")
async def remove_group_member(group_id: str, user_id: str, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(group_id)} if ObjectId.is_valid(group_id) else {"_id": group_id}
    group = await db.groups.find_one(query)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    if current_user_id not in group.get("admins", []) and current_user_id != group.get("creator_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can remove members")
    if user_id == group.get("creator_id"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the group creator")

    await db.groups.update_one(query, {"$pull": {"members": user_id, "admins": user_id}})
    await db.conversations.update_one({"type": "group", "group_id": group_id}, {"$pull": {"participants": user_id}})

    conv = await db.conversations.find_one({"type": "group", "group_id": group_id})
    if conv:
        try:
            await sio.emit("member_removed", {"group_id": group_id, "user_id": user_id}, room=f"conv:{str(conv['_id'])}")
        except Exception:
            pass

    return {"success": True, "message": "Member removed successfully"}

@router.post("/{group_id}/leave")
async def leave_group(group_id: str, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(group_id)} if ObjectId.is_valid(group_id) else {"_id": group_id}
    group = await db.groups.find_one(query)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    await db.groups.update_one(query, {"$pull": {"members": current_user_id, "admins": current_user_id}})
    await db.conversations.update_one({"type": "group", "group_id": group_id}, {"$pull": {"participants": current_user_id}})

    conv = await db.conversations.find_one({"type": "group", "group_id": group_id})
    if conv:
        try:
            await sio.emit("member_removed", {"group_id": group_id, "user_id": current_user_id}, room=f"conv:{str(conv['_id'])}")
        except Exception:
            pass

    return {"success": True, "message": "You left the group"}
