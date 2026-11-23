from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends
from app.database.mongodb import get_database
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, get_current_user_id
from app.schemas.auth import SendOtpRequest, VerifyOtpRequest, RegisterRequest, LoginRequest, RefreshTokenRequest, ForgotPasswordRequest, TokenResponse
from app.services.otp_service import OTPService
from app.utils.helpers import clean_phone_number, validate_phone_number, serialize_doc

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/send-otp")
async def send_otp(req: SendOtpRequest):
    # Validate format
    phone = req.phone_number.strip()
    if not phone.startswith("+"):
        phone = "+" + phone
    if not validate_phone_number(phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid international mobile number with country code (e.g. +919876543210)"
        )
    result = await OTPService.send_otp(phone)
    return result

@router.post("/verify-otp")
async def verify_otp(req: VerifyOtpRequest):
    phone = req.phone_number.strip()
    if not phone.startswith("+"):
        phone = "+" + phone
    is_valid = await OTPService.verify_otp(phone, req.otp_code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    return {"success": True, "message": "Phone number successfully verified"}

@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    db = get_database()
    phone = req.phone_number.strip()
    if not phone.startswith("+"):
        phone = "+" + phone

    if not validate_phone_number(phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid mobile number with country code"
        )

    # Check if phone already registered
    existing_phone = await db.users.find_one({"phone_number": phone})
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This mobile number is already registered. Please login instead."
        )

    # Check username
    username_clean = req.username.strip().lower()
    existing_user = await db.users.find_one({"username": username_clean})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken. Please choose another username."
        )

    now = datetime.now(timezone.utc)
    new_user_doc = {
        "full_name": req.full_name.strip(),
        "username": username_clean,
        "phone_number": phone,
        "phone_verified": True,
        "password_hash": hash_password(req.password),
        "profile_picture": req.profile_picture or "",
        "about": req.about or "Hey there! I am using Confab.",
        "signature_emoji": req.signature_emoji or "🚀",
        "theme": "night",
        "privacy_settings": {
            "last_seen": "everyone",
            "online_status": "everyone",
            "profile_picture": "everyone",
            "about": "everyone",
            "read_receipts": True,
            "chronicle_privacy": "contacts"
        },
        "notification_settings": {
            "messages": True,
            "groups": True,
            "calls": True,
            "sound": True,
            "preview": True
        },
        "created_at": now,
        "updated_at": now,
        "last_seen": now,
        "online_status": True
    }

    insert_result = await db.users.insert_one(new_user_doc)
    user_id = str(insert_result.inserted_id)

    # Important requirement: Automatically update any saved contacts holding this mobile number to registered!
    import re
    digits = re.sub(r'[^\d]', '', phone)[-10:] if len(re.sub(r'[^\d]', '', phone)) >= 10 else re.sub(r'[^\d]', '', phone)
    await db.contacts.update_many(
        {"$or": [
            {"phone_number": phone},
            {"phone_number": f"+{digits}"},
            {"phone_number": digits},
            {"phone_number": {"$regex": f"{digits}$"}}
        ]},
        {"$set": {"registration_status": "registered", "registered_user_id": user_id}}
    )

    # Create tokens
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    new_user_doc["_id"] = user_id
    del new_user_doc["password_hash"]

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": serialize_doc(new_user_doc)
    }

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    db = get_database()
    identifier = req.identifier.strip()
    
    # Try finding user by phone_number or username
    user = await db.users.find_one({
        "$or": [
            {"phone_number": identifier},
            {"phone_number": "+" + identifier.lstrip("+")},
            {"username": identifier.lower()}
        ]
    })

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. No account found with that mobile number or username."
        )

    if not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again."
        )

    user_id = str(user["_id"])
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    # Update last seen and online
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_seen": datetime.now(timezone.utc), "online_status": True}}
    )

    user_data = dict(user)
    user_data["_id"] = user_id
    user_data.pop("password_hash", None)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": serialize_doc(user_data)
    }

@router.post("/refresh")
async def refresh_token(req: RefreshTokenRequest):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    user_id = payload.get("sub")
    db = get_database()
    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    user = await db.users.find_one(query)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    new_access_token = create_access_token(user_id)
    new_refresh_token = create_refresh_token(user_id)
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    db = get_database()
    phone = req.phone_number.strip()
    if not phone.startswith("+"):
        phone = "+" + phone

    is_valid = await OTPService.verify_otp(phone, req.otp_code)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    user = await db.users.find_one({"phone_number": phone})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found with this mobile number")

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(req.new_password)}}
    )
    return {"success": True, "message": "Password updated successfully. Please log in with your new password."}

@router.post("/logout")
async def logout(current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {"_id": ObjectId(current_user_id)} if ObjectId.is_valid(current_user_id) else {"_id": current_user_id}
    await db.users.update_one(
        query,
        {"$set": {"online_status": False, "last_seen": datetime.now(timezone.utc)}}
    )
    return {"success": True, "message": "Logged out successfully"}
