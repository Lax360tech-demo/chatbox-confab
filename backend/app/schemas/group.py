from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class GroupCreateRequest(BaseModel):
    group_name: str = Field(..., min_length=2, max_length=100)
    member_ids: List[str] = Field(..., min_items=1, description="List of at least 1 or 2 user IDs to add")
    group_picture: Optional[str] = None
    description: Optional[str] = ""

class GroupUpdateRequest(BaseModel):
    group_name: Optional[str] = None
    group_picture: Optional[str] = None
    description: Optional[str] = None

class GroupMemberActionRequest(BaseModel):
    user_id: str
    role: Optional[str] = Field(default="member", pattern="^(admin|member)$")

class GroupResponse(BaseModel):
    id: str
    group_name: str
    group_picture: Optional[str] = None
    description: Optional[str] = ""
    creator_id: str
    admins: List[str]
    members: List[str]
    member_details: List[Dict[str, Any]] = []
    conversation_id: Optional[str] = None
    created_at: str
    updated_at: str
