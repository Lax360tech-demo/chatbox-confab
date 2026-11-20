from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class StoryCreateRequest(BaseModel):
    media_url: str
    media_type: str = Field(..., pattern="^(image|video|text)$")
    caption: Optional[str] = ""
    background_color: Optional[str] = "#1e1e2f"
    visibility: str = Field(default="contacts", pattern="^(contacts|selected|exclude)$")
    hidden_from: Optional[List[str]] = Field(default_factory=list)

class StoryReactionRequest(BaseModel):
    emoji: str

class StoryResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    user_emoji: Optional[str] = None
    media_url: str
    media_type: str
    caption: Optional[str] = ""
    background_color: Optional[str] = None
    visibility: str
    viewers: List[Dict[str, Any]] = []
    viewer_count: int = 0
    has_viewed: bool = False
    reactions: List[Dict[str, Any]] = []
    created_at: str
    expires_at: str
