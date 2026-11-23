from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class PrivacySettings(BaseModel):
    last_seen: str = "everyone" # "everyone", "contacts", "nobody"
    online_status: str = "everyone"
    profile_picture: str = "everyone"
    about: str = "everyone"
    read_receipts: bool = True
    chronicle_privacy: str = "contacts" # "contacts", "selected", "exclude"

class NotificationSettings(BaseModel):
    messages: bool = True
    groups: bool = True
    calls: bool = True
    sound: bool = True
    preview: bool = True

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    about: Optional[str] = Field(None, max_length=150)
    profile_picture: Optional[str] = None
    signature_emoji: Optional[str] = None
    theme: Optional[str] = None
    privacy_settings: Optional[PrivacySettings] = None
    notification_settings: Optional[NotificationSettings] = None

class UserThemeRequest(BaseModel):
    theme: str = Field(..., pattern="^(night|light|ocean|lavender|forest|bw)$")

class UserResponse(BaseModel):
    id: str
    full_name: str
    username: str
    phone_number: str
    phone_verified: bool = True
    profile_picture: Optional[str] = None
    about: Optional[str] = "Hey there! I am using Confab."
    signature_emoji: Optional[str] = "🚀"
    theme: str = "night"
    privacy_settings: Dict[str, Any] = {}
    notification_settings: Dict[str, Any] = {}
    last_seen: Optional[str] = None
    online_status: bool = False
    created_at: Optional[str] = None
