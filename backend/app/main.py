import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import socketio

from app.core.config import settings
from app.database.mongodb import connect_to_mongo, close_mongo_connection, db_instance
from app.sockets.socket_manager import sio
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.contacts import router as contacts_router
from app.api.conversations import router as conversations_router
from app.api.messages import router as messages_router
from app.api.groups import router as groups_router
from app.api.stories import router as stories_router
from app.api.calls import router as calls_router
from app.api.polls import router as polls_router
from app.api.uploads import router as uploads_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("confab")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB Atlas
    logger.info("Initializing Confab server and database connection...")
    await connect_to_mongo()
    yield
    # Shutdown
    logger.info("Shutting down Confab API server...")
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Confab - Connect Beyond Conversations. Real-Time Messaging Platform API.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Robust Production CORS Configuration
# Note: Wildcard "*" is strictly avoided with allow_credentials=True for security.
cors_origins = [
    "https://chatbox-confab.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
for origin in settings.CORS_ORIGINS:
    if origin and origin != "*" and origin not in cors_origins:
        cors_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https:\/\/chatbox-confab.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Static Uploads directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API Routers under /api
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(contacts_router, prefix=settings.API_V1_STR)
app.include_router(conversations_router, prefix=settings.API_V1_STR)
app.include_router(messages_router, prefix=settings.API_V1_STR)
app.include_router(groups_router, prefix=settings.API_V1_STR)
app.include_router(stories_router, prefix=settings.API_V1_STR)
app.include_router(calls_router, prefix=settings.API_V1_STR)
app.include_router(polls_router, prefix=settings.API_V1_STR)
app.include_router(uploads_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
async def health_check():
    db_status = "connected" if db_instance.is_connected else "disconnected"
    if db_instance.client:
        try:
            await db_instance.client.admin.command('ping')
            db_status = "connected"
        except Exception as e:
            db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "service": "Confab Backend API",
        "database": db_status
    }

# Root endpoint or static frontend dist if available
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist) and os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {
            "app": "CONFAB",
            "tagline": "Connect Beyond Conversations",
            "version": "1.0.0",
            "status": "online",
            "docs": "/docs"
        }

# Mount Socket.IO to ASGI application
combined_asgi_app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=app,
    socketio_path="socket.io"
)
