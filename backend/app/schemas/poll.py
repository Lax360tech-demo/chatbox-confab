from typing import Optional, List, Dict
from pydantic import BaseModel, Field

class PollOptionInput(BaseModel):
    text: str = Field(..., min_length=1)

class PollCreateRequest(BaseModel):
    conversation_id: str
    question: str = Field(..., min_length=2, max_length=300)
    options: List[str] = Field(..., min_items=2, max_items=10)
    allow_multiple: bool = False
    expires_at: Optional[str] = None

class PollVoteRequest(BaseModel):
    option_indices: List[int] = Field(..., min_items=1)

class PollOptionResponse(BaseModel):
    index: int
    text: str
    votes: List[str] = [] # list of user_ids who voted for this option
    vote_count: int = 0
    percentage: float = 0.0

class PollResponse(BaseModel):
    id: str
    conversation_id: str
    message_id: Optional[str] = None
    question: str
    options: List[PollOptionResponse]
    allow_multiple: bool
    total_votes: int
    created_by: str
    user_votes: List[int] = [] # indices voted by the current requesting user
    is_closed: bool = False
    created_at: str
