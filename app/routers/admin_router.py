import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
import openpyxl
from app.database import get_db
from app.models import (
    User, Faculty, Group, Subject, Teacher, Student, Schedule, Lesson, Attendance, AuditLog, LeaveRequest
)
from app.schemas import FacultyCreate, GroupCreate, SubjectCreate, ScheduleCreate, UserCreate
from app.auth import require_role, hash_password, get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_role("admin"))])

# ----------------- Dashboard Stats -----------------
@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_students = db.query(Student).count()
    total_teachers = db.query(Teacher).count()
    total_groups = db.query(Group).count()
    total_faculties = db.query(Faculty).count()
    total_lessons = db.query(Lesson).count()
    
    # Attendance summary
    attendances = db.query(Attendance.status, func.count(Attendance.id)).group_by(Attendance.status).all()
    status_map = {"keldi": 0, "kechikdi": 0, "sababli": 0, "sababsiz": 0}
    for st, cnt in attendances:
        if st in status_map:
            status_map[st] = cnt
            
    total_records = sum(status_map.values())
    attendance_rate = round(((status_map["keldi"] + status_map["kechikdi"] * 0.8) / total_records * 100), 1) if total_records > 0 else 100.0

    # At risk students count (missed > 20%)
    at_risk_count = 0
    students = db.query(Student).all()
    for s in students:
        s_total = db.query(Attendance).filter(Attendance.student_id == s.id).count()
        if s_total >= 3:
            s_absent = db.query(Attendance).filter(
                Attendance.student_id == s.id,
                Attendance.status.in_(["sababsiz", "sababli"])
            ).count()
            if (s_absent / s_total) > 0.2:
                at_risk_count += 1

    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_groups": total_groups,
        "total_faculties": total_faculties,
        "total_lessons": total_lessons,
        "attendance_rate": attendance_rate,
        "at_risk_count": at_risk_count,
        "status_distribution": status_map
    }

# ----------------- Faculties -----------------
@router.get("/faculties")
def list_faculties(db: Session = Depends(get_db)):
    faculties = db.query(Faculty).all()
    res = []
    for f in faculties:
        res.append({
            "id": f.id,
            "name": f.name,
            "code": f.code,
            "description": f.description,
            "groups_count": len(f.groups)
        })
    return res

@router.post("/faculties")
def create_faculty(data: FacultyCreate, db: Session = Depends(get_db)):
    if db.query(Faculty).filter(Faculty.code == data.code).first():
        raise HTTPException(status_code=400, detail="Ushbu kodli fakultet allaqachon mavjud")
    fac = Faculty(name=data.name, code=data.code, description=data.description)
    db.add(fac)
    db.commit()
    db.refresh(fac)
    return fac

@router.delete("/faculties/{fac_id}")
def delete_faculty(fac_id: int, db: Session = Depends(get_db)):
    fac = db.query(Faculty).filter(Faculty.id == fac_id).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Fakultet topilmadi")
    db.delete(fac)
    db.commit()
    return {"message": "Fakultet o'chirildi"}

# ----------------- Groups -----------------
@router.get("/groups")
def list_groups(db: Session = Depends(get_db)):
    groups = db.query(Group).all()
    res = []
    for g in groups:
        res.append({
            "id": g.id,
            "name": g.name,
            "course_year": g.course_year,
            "faculty_id": g.faculty_id,
            "faculty_name": g.faculty.name if g.faculty else "",
            "students_count": len(g.students)
        })
    return res

@router.post("/groups")
def create_group(data: GroupCreate, db: Session = Depends(get_db)):
    if db.query(Group).filter(Group.name == data.name).first():
        raise HTTPException(status_code=400, detail="Ushbu nomli guruh allaqachon mavjud")
    group = Group(faculty_id=data.faculty_id, name=data.name, course_year=data.course_year)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group

@router.delete("/groups/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi")
    db.delete(group)
    db.commit()
    return {"message": "Guruh o'chirildi"}

# ----------------- Subjects -----------------
@router.get("/subjects")
def list_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).all()

@router.post("/subjects")
def create_subject(data: SubjectCreate, db: Session = Depends(get_db)):
    if db.query(Subject).filter(Subject.code == data.code).first():
        raise HTTPException(status_code=400, detail="Ushbu kodli fan mavjud")
    subj = Subject(name=data.name, code=data.code, hours_total=data.hours_total)
    db.add(subj)
    db.commit()
    db.refresh(subj)
    return subj

@router.delete("/subjects/{subj_id}")
def delete_subject(subj_id: int, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subj_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Fan topilmadi")
    db.delete(subj)
    db.commit()
    return {"message": "Fan o'chirildi"}

# ----------------- Users -----------------
@router.get("/users")
def list_users(role: str = None, db: Session = Depends(get_db)):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    users = query.all()
    res = []
    for u in users:
        extra = {}
        if u.role == "teacher" and u.teacher_profile:
            extra = {
                "teacher_id": u.teacher_profile.id,
                "department": u.teacher_profile.department,
                "title": u.teacher_profile.title
            }
        elif u.role == "student" and u.student_profile:
            extra = {
                "student_id": u.student_profile.id,
                "group_id": u.student_profile.group_id,
                "group_name": u.student_profile.group.name if u.student_profile.group else "",
                "student_id_number": u.student_profile.student_id_number
            }
        res.append({
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role,
            "email": u.email,
            "phone": u.phone,
            "is_active": u.is_active,
            "created_at": u.created_at.strftime("%Y-%m-%d %H:%M") if u.created_at else "",
            **extra
        })
    return res

@router.post("/users")
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username.strip()).first():
        raise HTTPException(status_code=400, detail="Ushbu login band")
    
    user = User(
        username=data.username.strip(),
        password_hash=hash_password(data.password),
        full_name=data.full_name.strip(),
        role=data.role,
        email=data.email,
        phone=data.phone,
        is_active=data.is_active
    )
    db.add(user)
    db.flush()

    if data.role == "teacher":
        teacher = Teacher(
            user_id=user.id,
            department=data.department or "Umumiy",
            title=data.title or "O'qituvchi"
        )
        db.add(teacher)
    elif data.role == "student":
        if not data.group_id:
            raise HTTPException(status_code=400, detail="Talaba uchun guruh tanlanishi shart")
        std_num = data.student_id_number or f"STU-{user.id:04d}"
        student = Student(
            user_id=user.id,
            group_id=data.group_id,
            student_id_number=std_num
        )
        db.add(student)

    db.commit()
    db.refresh(user)
    return {"message": "Foydalanuvchi muvaffaqiyatli yaratildi", "id": user.id}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if user.username == "admin":
        raise HTTPException(status_code=400, detail="Bosh adminni o'chirish taqiqlanadi")
    db.delete(user)
    db.commit()
    return {"message": "Foydalanuvchi o'chirildi"}

# ----------------- Schedules -----------------
@router.get("/schedules")
def list_schedules(db: Session = Depends(get_db)):
    schedules = db.query(Schedule).all()
    res = []
    day_names = {1: "Dushanba", 2: "Seshanba", 3: "Chorshanba", 4: "Payshanba", 5: "Juma", 6: "Shanba"}
    for s in schedules:
        res.append({
            "id": s.id,
            "teacher_id": s.teacher_id,
            "teacher_name": s.teacher.user.full_name if s.teacher and s.teacher.user else "",
            "subject_id": s.subject_id,
            "subject_name": s.subject.name if s.subject else "",
            "group_id": s.group_id,
            "group_name": s.group.name if s.group else "",
            "day_of_week": s.day_of_week,
            "day_name": day_names.get(s.day_of_week, str(s.day_of_week)),
            "start_time": s.start_time,
            "end_time": s.end_time,
            "room": s.room
        })
    return res

@router.post("/schedules")
def create_schedule(data: ScheduleCreate, db: Session = Depends(get_db)):
    sch = Schedule(
        teacher_id=data.teacher_id,
        subject_id=data.subject_id,
        group_id=data.group_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        room=data.room
    )
    db.add(sch)
    db.commit()
    db.refresh(sch)
    return sch

@router.delete("/schedules/{sch_id}")
def delete_schedule(sch_id: int, db: Session = Depends(get_db)):
    sch = db.query(Schedule).filter(Schedule.id == sch_id).first()
    if not sch:
        raise HTTPException(status_code=404, detail="Dars jadvali topilmadi")
    db.delete(sch)
    db.commit()
    return {"message": "Jadval o'chirildi"}

# ----------------- Audit Logs -----------------
@router.get("/audit-logs")
def list_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(100).all()
    res = []
    for l in logs:
        res.append({
            "id": l.id,
            "user": l.user.full_name if l.user else "Tizim",
            "action": l.action,
            "details": l.details,
            "timestamp": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else ""
        })
    return res

# ----------------- Excel Import -----------------
@router.post("/import-excel")
async def import_excel(
    file: UploadFile = File(...),
    role: str = Form("student"),
    group_id: int = Form(None),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(contents))
    sheet = wb.active

    imported = 0
    errors = []

    # Format expected:
    # Row 1: Header (FIO, Login, Parol, Telefon/ID)
    # Row 2+: Data
    for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
        if not row or not any(row):
            continue
        full_name = str(row[0]).strip() if row[0] else ""
        username = str(row[1]).strip() if len(row) > 1 and row[1] else ""
        password = str(row[2]).strip() if len(row) > 2 and row[2] else "123456"
        extra_val = str(row[3]).strip() if len(row) > 3 and row[3] else ""

        if not full_name or not username:
            errors.append(f"Qator {row_idx}: FIO yoki Login bo'sh")
            continue

        if db.query(User).filter(User.username == username).first():
            errors.append(f"Qator {row_idx}: '{username}' logini allaqachon mavjud")
            continue

        user = User(
            username=username,
            password_hash=hash_password(password),
            full_name=full_name,
            role=role,
            is_active=True
        )
        db.add(user)
        db.flush()

        if role == "student":
            g_id = group_id
            if not g_id:
                first_g = db.query(Group).first()
                g_id = first_g.id if first_g else 1
            student = Student(
                user_id=user.id,
                group_id=g_id,
                student_id_number=extra_val or f"STU-{user.id:04d}"
            )
            db.add(student)
        elif role == "teacher":
            teacher = Teacher(
                user_id=user.id,
                department=extra_val or "Kafedra",
                title="O'qituvchi"
            )
            db.add(teacher)

        imported += 1

    db.commit()
    return {
        "success": True,
        "imported_count": imported,
        "errors": errors
    }

# ----------------- Leave Requests Review -----------------
@router.get("/leave-requests")
def list_all_leave_requests(db: Session = Depends(get_db)):
    requests = db.query(LeaveRequest).order_by(LeaveRequest.id.desc()).all()
    res = []
    for r in requests:
        res.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": r.student.user.full_name if r.student and r.student.user else "",
            "group_name": r.student.group.name if r.student and r.student.group else "",
            "start_date": str(r.start_date),
            "end_date": str(r.end_date),
            "reason": r.reason,
            "document_path": r.document_path,
            "status": r.status,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else ""
        })
    return res

@router.post("/leave-requests/{req_id}/review")
def review_leave_request(
    req_id: int,
    status: str,  # 'tasdiqlandi' or 'rad_etildi'
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    req = db.query(LeaveRequest).filter(LeaveRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Arizasi topilmadi")
    req.status = status
    req.reviewed_by = current_user.id
    db.commit()
    return {"message": f"Ariza {status}"}
