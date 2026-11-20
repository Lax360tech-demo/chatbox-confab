import random
import logging
from datetime import datetime, timedelta, timezone
from app.database.mongodb import get_database
from app.core.config import settings

logger = logging.getLogger("confab.otp")

class OTPService:
    @staticmethod
    def generate_otp() -> str:
        if settings.SMS_PROVIDER == "mock" and settings.DEMO_OTP:
            return settings.DEMO_OTP
        return f"{random.randint(100000, 999999)}"

    @staticmethod
    async def send_otp(phone_number: str) -> dict:
        db = get_database()
        otp_code = OTPService.generate_otp()
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=10)

        # Store or update OTP record
        await db.otps.update_one(
            {"phone_number": phone_number},
            {
                "$set": {
                    "otp_code": otp_code,
                    "created_at": now,
                    "expires_at": expires_at,
                    "verified": False,
                    "attempts": 0
                }
            },
            upsert=True
        )

        logger.info("OTP for %s is [%s] (expires in 10 minutes)", phone_number, otp_code)
        
        # In mock mode, we also return the OTP in the API response for seamless testing!
        return {
            "success": True,
            "message": f"Verification code sent to {phone_number}",
            "expires_in_seconds": 600,
            "debug_otp": otp_code if settings.SMS_PROVIDER == "mock" else None
        }

    @staticmethod
    async def verify_otp(phone_number: str, otp_code: str) -> bool:
        db = get_database()
        record = await db.otps.find_one({"phone_number": phone_number})
        if not record:
            return False

        # Check expiration
        now = datetime.now(timezone.utc)
        record_expiry = record.get("expires_at")
        if record_expiry.tzinfo is None:
            record_expiry = record_expiry.replace(tzinfo=timezone.utc)

        if now > record_expiry:
            return False

        # Check code
        if record.get("otp_code") != otp_code.strip():
            await db.otps.update_one({"phone_number": phone_number}, {"$inc": {"attempts": 1}})
            return False

        # Mark verified
        await db.otps.update_one(
            {"phone_number": phone_number},
            {"$set": {"verified": True}}
        )
        return True
