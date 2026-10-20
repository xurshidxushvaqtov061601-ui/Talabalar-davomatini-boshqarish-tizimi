import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import BASE_DIR, UPLOAD_DIR
from app.database import engine, Base
from app.routers.auth_router import router as auth_router
from app.routers.admin_router import router as admin_router
from app.routers.teacher_router import router as teacher_router
from app.routers.student_router import router as student_router
from app.routers.reports_router import router as reports_router

# Jadvallarni yaratish
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Talabalar Davomatini Boshqarish Tizimi",
    description="Student Attendance Management System REST API va Veb Ilovasi",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Statik fayllar va yuklamalar
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "app" / "static")), name="static")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Routerni ulash
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(teacher_router)
app.include_router(student_router)
app.include_router(reports_router)

@app.get("/", response_class=HTMLResponse)
def serve_index():
    index_file = BASE_DIR / "app" / "templates" / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return "<h1>Tizim ishlamoqda. index.html fayli kutilmoqda.</h1>"

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Talabalar Davomatini Boshqarish Tizimi"}
