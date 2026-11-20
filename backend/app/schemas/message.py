from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class MessageSendRequest(BaseModel):
    conversation_id: str
    message_type: str = Field(default="text", pattern="^(text|image|video|document|voice|contact|poll)$")
    content: Optional[str] = ""
    attachment: Optional[Dict[str, Any]] = None
    reply_to: Optional[str] = None # message_id

class MessageEditRequest(BaseModel):
    content: str = Field(..., min_length=1)

class MessageReactionRequest(BaseModel):
    emoji: str

class MessageDeleteRequest(BaseModel):
    delete_for: str = Field(default="me", pattern="^(me|everyone)$")

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None
    sender_emoji: Optional[str] = None
    message_type: str
    content: Optional[str] = ""
    attachment: Optional[Dict[str, Any]] = None
    reply_to: Optional[Dict[str, Any]] = None
    reactions: Dict[str, List[str]] = {} # emoji -> list of user_ids
    delivered_to: List[str] = []
    read_by: List[str] = []
    is_edited: bool = False
    edited_at: Optional[str] = None
    is_pinned: bool = False
    is_starred: bool = False
    deleted_for: List[str] = []
    deleted_for_everyone: bool = False
    status: str = "sent" # "sending", "sent", "delivered", "read"
    created_at: str
