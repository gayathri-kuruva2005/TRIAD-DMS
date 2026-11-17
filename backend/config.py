
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Project root directory
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")


class Config:

    # Environment
    APP_ENV = os.getenv("APP_ENV", "development").lower()

    # Security keys
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

    # Allow fallback keys only for local development
    if APP_ENV == "development":
        SECRET_KEY = SECRET_KEY or "local-development-secret-change-before-deployment"
        JWT_SECRET_KEY = JWT_SECRET_KEY or "local-development-jwt-secret-change-before-deployment"

    # Never start production with missing secret keys
    if APP_ENV == "production":
        if not SECRET_KEY or not JWT_SECRET_KEY:
            raise RuntimeError(
                "SECRET_KEY and JWT_SECRET_KEY must be configured in production."
            )

    # JWT settings
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)

    # MongoDB
    MONGO_URI = os.getenv(
        "MONGO_URI",
        "mongodb://127.0.0.1:27017/triad_dms"
    )

    # Maximum upload size: 16 MB
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

    # Allowed frontend origins
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]

    # Tesseract OCR executable
    TESSERACT_CMD = os.getenv(
        "TESSERACT_CMD",
        r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    )
