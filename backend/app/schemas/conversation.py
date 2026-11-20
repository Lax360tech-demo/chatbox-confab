from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ConversationCreateRequest(BaseModel):
    recipient_id: Optional[str] = None
    type: str = Field(default="private", pattern="^(private|group)$")
    group_id: Optional[str] = None

class ConversationSettingsRequest(BaseModel):
    wallpaper: Optional[str] = None
    muted: Optional[bool] = None
    archived: Optional[bool] = None
    pinned: Optional[bool] = None

class ConversationResponse(BaseModel):
    id: str
    type: str # "private" or "group"
    participants: List[str]
    participant_details: List[Dict[str, Any]] = []
    group_id: Optional[str] = None
    group_details: Optional[Dict[str, Any]] = None
    last_message: Optional[Dict[str, Any]] = None
    unread_count: int = 0
    wallpaper: Optional[str] = None
    is_muted: bool = False
    is_archived: bool = False
    is_pinned: bool = False
    created_at: str
    updated_at: str
