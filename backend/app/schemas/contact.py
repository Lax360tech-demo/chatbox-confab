from typing import Optional, List
from pydantic import BaseModel, Field

class ContactCreateRequest(BaseModel):
    contact_name: str = Field(..., min_length=1, max_length=100)
    country_code: str = Field(default="+91")
    mobile_number: str = Field(..., min_length=4, max_length=15)
    contact_emoji: Optional[str] = None
    categories: Optional[List[str]] = Field(default_factory=list)

class ContactUpdateRequest(BaseModel):
    contact_name: Optional[str] = None
    contact_emoji: Optional[str] = None
    categories: Optional[List[str]] = None

class ContactResponse(BaseModel):
    id: str
    owner_id: str
    contact_name: str
    phone_number: str
    country_code: str
    contact_emoji: Optional[str] = None
    registered_user_id: Optional[str] = None
    registration_status: str = "unregistered" # "registered" or "unregistered"
    categories: List[str] = []
    created_at: str
    # Enriched fields if registered
    profile_picture: Optional[str] = None
    username: Optional[str] = None
    signature_emoji: Optional[str] = None
    about: Optional[str] = None
    online_status: Optional[bool] = None
    last_seen: Optional[str] = None

class CategoryCreateRequest(BaseModel):
    category_name: str = Field(..., min_length=1, max_length=50)

class CategoryResponse(BaseModel):
    id: str
    category_name: str
    contact_ids: List[str] = []
