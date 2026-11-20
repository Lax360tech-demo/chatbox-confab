import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Load .env file from backend directory or project root
backend_dir = Path(__file__).resolve().parent.parent.parent
env_path = backend_dir / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    root_env = backend_dir.parent / ".env"
    if root_env.exists():
        load_dotenv(dotenv_path=root_env)

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "CONFAB")
    API_V1_STR: str = os.getenv("API_V1_STR", "/api")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "confab_super_secret_jwt_key_premium_messenger_2026_change_in_production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200")) # 30 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "60"))
    
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "confab_db")
    
    # Allowed CORS Origins
    _raw_cors = os.getenv(
        "CORS_ORIGINS",
        "https://chatbox-confab.vercel.app,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
    )
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in _raw_cors.split(",")
        if origin.strip() and origin.strip() != "*"
    ]
    
    UPLOAD_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", os.getenv("UPLOAD_DIR", "uploads")))
    SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "mock")
    DEMO_OTP: str = os.getenv("DEMO_OTP", "123456")
    STUN_SERVERS: str = os.getenv("STUN_SERVERS", "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302")

settings = Settings()
