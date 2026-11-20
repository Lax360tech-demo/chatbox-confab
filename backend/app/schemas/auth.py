from typing import Optional
from pydantic import BaseModel, Field

class SendOtpRequest(BaseModel):
    phone_number: str = Field(..., description="Mobile number with country code, e.g. +919876543210")

class VerifyOtpRequest(BaseModel):
    phone_number: str = Field(..., description="Mobile number with country code")
    otp_code: str = Field(..., min_length=4, max_length=6)

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=30)
    phone_number: str = Field(..., description="Mobile number with country code")
    password: str = Field(..., min_length=6, max_length=100)
    profile_picture: Optional[str] = None
    signature_emoji: Optional[str] = "🚀"
    about: Optional[str] = "Hey there! I am using Confab."

class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Mobile number with country code OR username")
    password: str = Field(..., min_length=1)

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    phone_number: str
    otp_code: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict
