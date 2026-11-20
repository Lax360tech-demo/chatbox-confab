import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger("confab.db")

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_instance = Database()

async def connect_to_mongo():
    uri = settings.MONGODB_URI
    masked_uri = uri
    if "@" in uri:
        # Mask password in logs
        parts = uri.split("@")
        prefix = parts[0].split("://")
        masked_uri = f"{prefix[0]}://****@{parts[1]}"
    
    if "<db_password>" in uri:
        logger.error(
            "CRITICAL: MONGODB_URI in backend/.env still contains the placeholder '<db_password>'. "
            "Please replace '<db_password>' with your actual MongoDB Atlas database password!"
        )

    logger.info("Connecting to MongoDB at %s (Database: %s)...", masked_uri, settings.MONGODB_DB_NAME)
    
    try:
        db_instance.client = AsyncIOMotorClient(
            uri,
            serverSelectionTimeoutMS=5000,
            maxPoolSize=50,
            minPoolSize=5
        )
        db_instance.db = db_instance.client[settings.MONGODB_DB_NAME]
        
        # Test connection ping
        await db_instance.client.admin.command('ping')
        logger.info("MongoDB connection ping successful!")

        # Create indexes
        await _create_indexes(db_instance.db)
        logger.info("MongoDB connected and indexes verified successfully.")
    except Exception as e:
        logger.error("Failed to connect to primary MongoDB URI (%s): %s", masked_uri, e)
        if "localhost" not in uri and "127.0.0.1" not in uri:
            logger.warning("Attempting fallback connection to local MongoDB (mongodb://localhost:27017)...")
            try:
                db_instance.client = AsyncIOMotorClient(
                    "mongodb://localhost:27017",
                    serverSelectionTimeoutMS=3000
                )
                db_instance.db = db_instance.client[settings.MONGODB_DB_NAME]
                await db_instance.client.admin.command('ping')
                await _create_indexes(db_instance.db)
                logger.info("Connected to fallback local MongoDB successfully.")
            except Exception as fallback_err:
                logger.error("Fallback to local MongoDB also failed: %s", fallback_err)

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
        logger.warning("Index initialization notice: %s", e)

async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()

def get_database() -> AsyncIOMotorDatabase:
    return db_instance.db
