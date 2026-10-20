import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

SECRET_KEY = os.getenv("SECRET_KEY", "talabalar-davomati-super-maxfiy-kalit-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 soat

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'davomat.db'}")
