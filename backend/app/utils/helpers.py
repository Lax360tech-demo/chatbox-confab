import re
from datetime import datetime, timezone
from bson import ObjectId

def clean_phone_number(country_code: str, mobile_number: str) -> str:
    """Normalize phone number to international standard E.164-like string."""
    code = re.sub(r'[^\d+]', '', (country_code or "+91").strip())
    if not code.startswith('+'):
        code = '+' + code
    
    number = re.sub(r'[^\d]', '', (mobile_number or "").strip())
    # Remove leading 0 if present (common local dialing prefix in India e.g. 09876543210)
    if number.startswith('0'):
        number = number.lstrip('0')

    code_digits = code.replace('+', '')
    if number.startswith(code_digits):
        return '+' + number
    return f"{code}{number}"

def get_phone_search_filter(phone_or_number: str) -> dict:
    """Create a robust MongoDB query filter that matches a phone number regardless of formatting."""
    digits = re.sub(r'[^\d]', '', phone_or_number or "")
    if not digits:
        return {"phone_number": phone_or_number}
    
    last_10 = digits[-10:] if len(digits) >= 10 else digits
    return {
        "$or": [
            {"phone_number": phone_or_number},
            {"phone_number": f"+{digits}"},
            {"phone_number": digits},
            {"phone_number": f"+91{last_10}"},
            {"phone_number": {"$regex": f"{last_10}$"}}
        ]
    }

def validate_phone_number(full_phone: str) -> bool:
    """Check whether phone number matches valid international format."""
    # E.164: + followed by 7 to 15 digits
    pattern = r'^\+[1-9]\d{6,14}$'
    return bool(re.match(pattern, full_phone))

def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB _id to string id recursively."""
    if not doc:
        return {}
    res = {}
    for k, v in doc.items():
        if k == "_id":
            res["id"] = str(v)
        elif isinstance(v, ObjectId):
            res[k] = str(v)
        elif isinstance(v, datetime):
            res[k] = v.isoformat()
        elif isinstance(v, list):
            res[k] = [serialize_doc(item) if isinstance(item, dict) else (str(item) if isinstance(item, ObjectId) else item) for item in v]
        elif isinstance(v, dict):
            res[k] = serialize_doc(v)
        else:
            res[k] = v
    return res

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
