from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import User, Student, Teacher, AuditLog
from app.auth import verify_password, hash_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class LoginSchema(BaseModel):
    username: str
    password: str

class PasswordChangeSchema(BaseModel):
    old_password: str
    new_password: str

@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username.strip()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Foydalanuvchi nomi yoki parol noto'g'ri"
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Hisobingiz faol emas. Administratorga murojaat qiling.")

    # Audit log
    audit = AuditLog(user_id=user.id, action="LOGIN", details=f"{user.username} tizimga kirdi")
    db.add(audit)
    db.commit()

    token = create_access_token(data={"sub": user.id, "role": user.role, "name": user.full_name})
    
    # Extra role details
    role_info = {}
    if user.role == "student" and user.student_profile:
        role_info = {
            "student_id": user.student_profile.id,
            "group_id": user.student_profile.group_id,
            "group_name": user.student_profile.group.name if user.student_profile.group else "",
            "student_id_number": user.student_profile.student_id_number
        }
    elif user.role == "teacher" and user.teacher_profile:
        role_info = {
            "teacher_id": user.teacher_profile.id,
            "department": user.teacher_profile.department,
            "title": user.teacher_profile.title
        }

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "email": user.email,
            "phone": user.phone,
            **role_info
        }
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    role_info = {}
    if current_user.role == "student" and current_user.student_profile:
        role_info = {
            "student_id": current_user.student_profile.id,
            "group_id": current_user.student_profile.group_id,
            "group_name": current_user.student_profile.group.name if current_user.student_profile.group else "",
            "student_id_number": current_user.student_profile.student_id_number
        }
    elif current_user.role == "teacher" and current_user.teacher_profile:
        role_info = {
            "teacher_id": current_user.teacher_profile.id,
            "department": current_user.teacher_profile.department,
            "title": current_user.teacher_profile.title
        }
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "email": current_user.email,
        "phone": current_user.phone,
        **role_info
    }

@router.post("/change-password")
def change_password(data: PasswordChangeSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Amaldagi parol noto'g'ri")
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Parol muvaffaqiyatli yangilandi"}
