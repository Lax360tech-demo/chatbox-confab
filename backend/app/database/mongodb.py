import logging
import urllib.parse
from typing import Optional
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import certifi

from app.core.config import settings

logger = logging.getLogger("confab.db")

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    is_connected: bool = False
    connection_error: Optional[str] = None

db_instance = Database()

def normalize_mongo_uri(raw_uri: str) -> str:
    """Safely format and validate MongoDB URI, encoding passwords with special characters if needed."""
    if not raw_uri:
        return ""
    uri = raw_uri.strip().strip("'").strip('"')
    
    # Remove accidental angle brackets like <password>
    if "://" in uri:
        scheme, remainder = uri.split("://", 1)
        if "@" in remainder:
            # Check if there are credentials before host
            cred_part, host_part = remainder.rsplit("@", 1)
            if ":" in cred_part:
                username, password = cred_part.split(":", 1)
                # Strip angle brackets if user left <pass>
                password = password.strip("<> ")
                # Ensure password is URL encoded if it contains special characters like @ or #
                if "@" in password or "#" in password or ":" in password:
                    unquoted = urllib.parse.unquote_plus(password)
                    password = urllib.parse.quote_plus(unquoted)
                cred_part = f"{username}:{password}"
            remainder = f"{cred_part}@{host_part}"
        uri = f"{scheme}://{remainder}"
    return uri

async def connect_to_mongo():
    raw_uri = settings.MONGODB_URI
    if not raw_uri:
        error_msg = "MONGODB_URI environment variable is not configured."
        logger.error(error_msg)
        db_instance.is_connected = False
        db_instance.connection_error = error_msg
        return

    uri = normalize_mongo_uri(raw_uri)
    
    # Mask password for secure logging
    masked_uri = uri
    if "@" in uri:
        try:
            parts = uri.split("@")
            prefix = parts[0].split("://")
            masked_uri = f"{prefix[0]}://****@{parts[1]}"
        except Exception:
            masked_uri = "mongodb+srv://****"

    db_name = settings.MONGODB_DB_NAME or "confab_db"
    logger.info("Connecting to MongoDB Atlas at %s (Database: %s)...", masked_uri, db_name)

    client_options = {
        "serverSelectionTimeoutMS": 7500,
        "connectTimeoutMS": 7500,
        "socketTimeoutMS": 15000,
        "maxPoolSize": 50,
        "minPoolSize": 5,
        "retryWrites": True,
        "retryReads": True,
    }

    # If connecting with SSL/TLS (Atlas SRV or explicit tls=true), use certifi CA bundle
    if "mongodb+srv" in uri or "tls=true" in uri.lower() or "ssl=true" in uri.lower():
        client_options["tls"] = True
        client_options["tlsCAFile"] = certifi.where()

    try:
        client = AsyncIOMotorClient(uri, **client_options)
        database = client[db_name]

        # Execute ping to verify live cluster reachability and authentication
        await client.admin.command('ping')
        
        db_instance.client = client
        db_instance.db = database
        db_instance.is_connected = True
        db_instance.connection_error = None
        logger.info("MongoDB Atlas connection established and verified successfully.")

        # Initialize collections and indexes
        await _create_indexes(db_instance.db)
        logger.info("MongoDB indexes verified successfully.")
    except Exception as e:
        db_instance.is_connected = False
        db_instance.client = None
        db_instance.db = None
        db_instance.connection_error = str(e)
        logger.error(
            "CRITICAL: Failed to connect to MongoDB Atlas at %s: %s. "
            "Please verify that MONGODB_URI is correct and that MongoDB Atlas Network Access has 0.0.0.0/0 allowed.",
            masked_uri,
            e
        )

async def _create_indexes(db: AsyncIOMotorDatabase):
    try:
        # Users indexes
        await db.users.create_index("phone_number", unique=True)
        await db.users.create_index("username", unique=True)
        await db.users.create_index("full_name")
        
        # Contacts indexes
        await db.contacts.create_index([("owner_id", 1), ("phone_number", 1)], unique=True)
        await db.contacts.create_index("owner_id")
        await db.contacts.create_index("registered_user_id")
        
        # Conversations indexes
        await db.conversations.create_index("participants")
        await db.conversations.create_index([("updated_at", -1)])
        
        # Messages indexes
        await db.messages.create_index([("conversation_id", 1), ("created_at", -1)])
        await db.messages.create_index("sender_id")
        
        # Stories indexes
        await db.stories.create_index("user_id")
        await db.stories.create_index("expires_at")
        
        # Calls indexes
        await db.calls.create_index([("caller_id", 1), ("started_at", -1)])
        await db.calls.create_index([("receiver_ids", 1), ("started_at", -1)])
        
        # Polls indexes
        await db.polls.create_index("conversation_id")
        
        # Categories indexes
        await db.categories.create_index([("user_id", 1), ("category_name", 1)], unique=True)

        # OTP index with TTL
        await db.otps.create_index("expires_at", expireAfterSeconds=0)
        await db.otps.create_index("phone_number")
    except Exception as e:
        logger.warning("MongoDB index initialization notice: %s", e)

async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()
        db_instance.client = None
        db_instance.db = None
        db_instance.is_connected = False

def get_database() -> AsyncIOMotorDatabase:
    if not db_instance.is_connected or db_instance.db is None:
        error_detail = db_instance.connection_error or "Database connection is not available"
        logger.error("Database access requested but database is unavailable: %s", error_detail)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable. Please check MongoDB Atlas connectivity."
        )
    return db_instance.db
