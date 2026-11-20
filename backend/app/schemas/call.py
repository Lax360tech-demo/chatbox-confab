from typing import Optional, List
from pydantic import BaseModel, Field

class CallInitiateRequest(BaseModel):
    receiver_ids: List[str] = Field(..., min_items=1)
    conversation_id: Optional[str] = None
    call_type: str = Field(default="audio", pattern="^(audio|video)$")

class CallActionRequest(BaseModel):
    action: str = Field(..., pattern="^(accept|reject|end|busy)$")
    duration: Optional[int] = 0

class CallResponse(BaseModel):
    id: str
    caller_id: str
    caller_name: Optional[str] = None
    caller_avatar: Optional[str] = None
    caller_emoji: Optional[str] = None
    receiver_ids: List[str]
    receiver_name: Optional[str] = None
    receiver_avatar: Optional[str] = None
    receiver_emoji: Optional[str] = None
    conversation_id: Optional[str] = None
    call_type: str # audio or video
    status: str # "ringing", "accepted", "rejected", "ended", "missed"
    started_at: str
    ended_at: Optional[str] = None
    duration: int = 0
