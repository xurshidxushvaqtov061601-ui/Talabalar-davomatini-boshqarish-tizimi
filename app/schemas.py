from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field

# Auth schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# User schemas
class UserBase(BaseModel):
    username: str
    full_name: str
    role: str
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str
    # Teacher specific
    department: Optional[str] = None
    title: Optional[str] = None
    # Student specific
    group_id: Optional[int] = None
    student_id_number: Optional[str] = None

class UserOut(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Faculty schemas
class FacultyCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None

class FacultyOut(FacultyCreate):
    id: int
    class Config:
        from_attributes = True

# Group schemas
class GroupCreate(BaseModel):
    faculty_id: int
    name: str
    course_year: int = 1

class GroupOut(GroupCreate):
    id: int
    faculty_name: Optional[str] = None
    students_count: Optional[int] = 0
    class Config:
        from_attributes = True

# Subject schemas
class SubjectCreate(BaseModel):
    name: str
    code: str
    hours_total: int = 60

class SubjectOut(SubjectCreate):
    id: int
    class Config:
        from_attributes = True

# Schedule schemas
class ScheduleCreate(BaseModel):
    teacher_id: int
    subject_id: int
    group_id: int
    day_of_week: int
    start_time: str
    end_time: str
    room: Optional[str] = None

class ScheduleOut(BaseModel):
    id: int
    teacher_id: int
    teacher_name: Optional[str] = None
    subject_id: int
    subject_name: Optional[str] = None
    group_id: int
    group_name: Optional[str] = None
    day_of_week: int
    start_time: str
    end_time: str
    room: Optional[str] = None
    class Config:
        from_attributes = True

# Lesson & Attendance schemas
class AttendanceItem(BaseModel):
    student_id: int
    status: str  # keldi, kechikdi, sababli, sababsiz
    comment: Optional[str] = None

class MarkAttendanceRequest(BaseModel):
    lesson_date: date
    topic: Optional[str] = "Dars mashg'uloti"
    attendances: List[AttendanceItem]

class LeaveRequestCreate(BaseModel):
    start_date: date
    end_date: date
    reason: str
