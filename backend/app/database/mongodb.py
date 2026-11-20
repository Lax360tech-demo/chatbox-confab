import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger("confab.db")

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_instance = Database()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB at %s...", settings.MONGODB_URI)
    db_instance.client = AsyncIOMotorClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=5000,
        maxPoolSize=50,
        minPoolSize=5
    )
    db_instance.db = db_instance.client[settings.MONGODB_DB_NAME]
    
    # Create indexes
    try:
        # Users indexes
        await db_instance.db.users.create_index("phone_number", unique=True)
        await db_instance.db.users.create_index("username", unique=True)
        await db_instance.db.users.create_index("full_name")
        
        # Contacts indexes
        await db_instance.db.contacts.create_index([("owner_id", 1), ("phone_number", 1)], unique=True)
        await db_instance.db.contacts.create_index("owner_id")
        await db_instance.db.contacts.create_index("registered_user_id")
        
        # Conversations indexes
        await db_instance.db.conversations.create_index("participants")
        await db_instance.db.conversations.create_index([("updated_at", -1)])
        
        # Messages indexes
        await db_instance.db.messages.create_index([("conversation_id", 1), ("created_at", -1)])
        await db_instance.db.messages.create_index("sender_id")
        
        # Stories indexes
        await db_instance.db.stories.create_index("user_id")
        await db_instance.db.stories.create_index("expires_at")
        
        # Calls indexes
        await db_instance.db.calls.create_index([("caller_id", 1), ("started_at", -1)])
        await db_instance.db.calls.create_index([("receiver_ids", 1), ("started_at", -1)])
        
        # Polls indexes
        await db_instance.db.polls.create_index("conversation_id")
        
        # Categories indexes
        await db_instance.db.categories.create_index([("user_id", 1), ("category_name", 1)], unique=True)

        # OTP index with TTL
        await db_instance.db.otps.create_index("expires_at", expireAfterSeconds=0)
        await db_instance.db.otps.create_index("phone_number")

        logger.info("MongoDB connected and indexes verified successfully.")
    except Exception as e:
        logger.warning("MongoDB index initialization warning (will continue): %s", e)

async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()

def get_database() -> AsyncIOMotorDatabase:
    return db_instance.db
