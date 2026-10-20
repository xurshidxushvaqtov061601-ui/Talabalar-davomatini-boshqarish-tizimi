import os
import shutil
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.config import UPLOAD_DIR
from app.database import get_db
from app.models import User, Student, Attendance, Lesson, Subject, LeaveRequest
from app.auth import require_role, get_current_user

router = APIRouter(prefix="/api/student", tags=["Student"], dependencies=[Depends(require_role("student", "admin"))])

@router.get("/dashboard")
def get_student_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Talaba ma'lumotlari topilmadi")

    attendances = db.query(Attendance).filter(Attendance.student_id == student.id).all()
    total = len(attendances)

    counts = {"keldi": 0, "kechikdi": 0, "sababli": 0, "sababsiz": 0}
    for a in attendances:
        if a.status in counts:
            counts[a.status] += 1

    attendance_pct = round(((counts["keldi"] + counts["kechikdi"] * 0.8) / total * 100), 1) if total > 0 else 100.0
    absent_total = counts["sababsiz"] + counts["sababli"]
    absent_pct = round((absent_total / total * 100), 1) if total > 0 else 0.0

    # Warning alert if missed > 20%
    is_warning = absent_pct >= 20.0 and total >= 3

    # Subject breakdown
    subject_stats = {}
    for a in attendances:
        s_name = a.lesson.subject.name if a.lesson and a.lesson.subject else "Boshqa"
        if s_name not in subject_stats:
            subject_stats[s_name] = {"total": 0, "present": 0, "absent": 0, "late": 0}
        subject_stats[s_name]["total"] += 1
        if a.status == "keldi":
            subject_stats[s_name]["present"] += 1
        elif a.status == "kechikdi":
            subject_stats[s_name]["late"] += 1
        else:
            subject_stats[s_name]["absent"] += 1

    subjects_list = []
    for s_name, stats in subject_stats.items():
        sub_pct = round(((stats["present"] + stats["late"] * 0.8) / stats["total"] * 100), 1) if stats["total"] > 0 else 100.0
        subjects_list.append({
            "subject": s_name,
            "total": stats["total"],
            "present": stats["present"],
            "absent": stats["absent"],
            "percentage": sub_pct
        })

    return {
        "student": {
            "full_name": current_user.full_name,
            "group_name": student.group.name if student.group else "",
            "student_id_number": student.student_id_number
        },
        "total_classes": total,
        "counts": counts,
        "attendance_percentage": attendance_pct,
        "absent_percentage": absent_pct,
        "is_warning": is_warning,
        "warning_message": "DIQQAT! Siz darslarning 20% dan ortig'ini qoldirdingiz. Ma'muriyatga sababli ma'lumotnoma taqdim eting!" if is_warning else None,
        "subjects": subjects_list
    }

@router.get("/attendance-history")
def get_attendance_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Talaba topilmadi")

    attendances = (
        db.query(Attendance)
        .filter(Attendance.student_id == student.id)
        .join(Lesson)
        .order_by(Lesson.lesson_date.desc())
        .all()
    )

    res = []
    for a in attendances:
        res.append({
            "id": a.id,
            "date": str(a.lesson.lesson_date) if a.lesson else "",
            "subject_name": a.lesson.subject.name if a.lesson and a.lesson.subject else "",
            "topic": a.lesson.topic if a.lesson else "",
            "teacher_name": a.lesson.teacher.user.full_name if a.lesson and a.lesson.teacher and a.lesson.teacher.user else "",
            "status": a.status,
            "comment": a.comment
        })
    return res

@router.get("/leave-requests")
def get_my_leave_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        return []
    reqs = db.query(LeaveRequest).filter(LeaveRequest.student_id == student.id).order_by(LeaveRequest.id.desc()).all()
    res = []
    for r in reqs:
        res.append({
            "id": r.id,
            "start_date": str(r.start_date),
            "end_date": str(r.end_date),
            "reason": r.reason,
            "document_path": r.document_path,
            "status": r.status,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else ""
        })
    return res

@router.post("/leave-requests")
async def create_leave_request(
    start_date: date = Form(...),
    end_date: date = Form(...),
    reason: str = Form(...),
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Talaba topilmadi")

    doc_filename = None
    if file and file.filename:
        filename = f"spravka_{student.id}_{date.today()}_{file.filename}"
        filepath = UPLOAD_DIR / filename
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        doc_filename = f"/uploads/{filename}"

    req = LeaveRequest(
        student_id=student.id,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        document_path=doc_filename,
        status="kutilmoqda"
    )
    db.add(req)
    db.commit()
    return {"message": "Ma'lumotnoma muvaffaqiyatli yuborildi. Administrator ko'rib chiqishini kuting."}
