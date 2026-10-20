from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app.models import User, Teacher, Schedule, Lesson, Attendance, Student, Group
from app.auth import require_role, get_current_user

router = APIRouter(prefix="/api/teacher", tags=["Teacher"], dependencies=[Depends(require_role("teacher", "admin"))])

class AttendanceEntry(BaseModel):
    student_id: int
    status: str  # keldi, kechikdi, sababli, sababsiz
    comment: Optional[str] = None

class SaveAttendanceRequest(BaseModel):
    lesson_date: date
    topic: Optional[str] = "Dars mashg'uloti"
    attendances: List[AttendanceEntry]

@router.get("/my-schedules")
def get_my_schedules(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "admin":
        schedules = db.query(Schedule).all()
    else:
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
        if not teacher:
            return []
        schedules = db.query(Schedule).filter(Schedule.teacher_id == teacher.id).all()

    day_names = {1: "Dushanba", 2: "Seshanba", 3: "Chorshanba", 4: "Payshanba", 5: "Juma", 6: "Shanba"}
    res = []
    for s in schedules:
        res.append({
            "id": s.id,
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

@router.get("/journal/{schedule_id}")
def get_journal(
    schedule_id: int,
    lesson_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not lesson_date:
        lesson_date = date.today()

    sch = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not sch:
        raise HTTPException(status_code=404, detail="Dars jadvali topilmadi")

    # Check or find lesson
    lesson = db.query(Lesson).filter(
        Lesson.schedule_id == schedule_id,
        Lesson.lesson_date == lesson_date
    ).first()

    # Get group students
    students = db.query(Student).filter(Student.group_id == sch.group_id).all()
    
    # Map existing attendance
    att_map = {}
    if lesson:
        for a in lesson.attendances:
            att_map[a.student_id] = {"status": a.status, "comment": a.comment, "id": a.id}

    students_list = []
    for s in students:
        att = att_map.get(s.id, {"status": "keldi", "comment": "", "id": None})
        students_list.append({
            "student_id": s.id,
            "full_name": s.user.full_name if s.user else "",
            "student_id_number": s.student_id_number,
            "status": att["status"],
            "comment": att["comment"],
            "attendance_id": att["id"]
        })

    # Sort alphabetically
    students_list.sort(key=lambda x: x["full_name"])

    return {
        "schedule": {
            "id": sch.id,
            "subject_name": sch.subject.name if sch.subject else "",
            "group_name": sch.group.name if sch.group else "",
            "room": sch.room,
            "start_time": sch.start_time,
            "end_time": sch.end_time
        },
        "lesson_date": str(lesson_date),
        "topic": lesson.topic if lesson else "",
        "is_marked": lesson is not None,
        "students": students_list
    }

@router.post("/journal/{schedule_id}")
def save_journal(
    schedule_id: int,
    data: SaveAttendanceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sch = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not sch:
        raise HTTPException(status_code=404, detail="Dars jadvali topilmadi")

    lesson = db.query(Lesson).filter(
        Lesson.schedule_id == schedule_id,
        Lesson.lesson_date == data.lesson_date
    ).first()

    if not lesson:
        lesson = Lesson(
            schedule_id=schedule_id,
            teacher_id=sch.teacher_id,
            subject_id=sch.subject_id,
            group_id=sch.group_id,
            lesson_date=data.lesson_date,
            topic=data.topic
        )
        db.add(lesson)
        db.flush()
    else:
        lesson.topic = data.topic

    # Save attendance items
    for item in data.attendances:
        att = db.query(Attendance).filter(
            Attendance.lesson_id == lesson.id,
            Attendance.student_id == item.student_id
        ).first()

        if att:
            att.status = item.status
            att.comment = item.comment
            att.marked_at = datetime.utcnow()
        else:
            att = Attendance(
                lesson_id=lesson.id,
                student_id=item.student_id,
                status=item.status,
                comment=item.comment
            )
            db.add(att)

    db.commit()
    return {"message": "Davomat muvaffaqiyatli saqlandi!", "lesson_id": lesson.id}

@router.get("/reports/{schedule_id}")
def get_teacher_report(schedule_id: int, db: Session = Depends(get_db)):
    sch = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not sch:
        raise HTTPException(status_code=404, detail="Dars jadvali topilmadi")

    lessons = db.query(Lesson).filter(Lesson.schedule_id == schedule_id).order_by(Lesson.lesson_date.asc()).all()
    students = db.query(Student).filter(Student.group_id == sch.group_id).all()
    students.sort(key=lambda s: s.user.full_name if s.user else "")

    lesson_dates = [str(l.lesson_date) for l in lessons]

    report_data = []
    for s in students:
        s_att_records = db.query(Attendance).filter(
            Attendance.lesson_id.in_([l.id for l in lessons]),
            Attendance.student_id == s.id
        ).all()
        att_by_lesson = {a.lesson_id: a.status for a in s_att_records}

        row = {
            "student_id": s.id,
            "full_name": s.user.full_name if s.user else "",
            "student_id_number": s.student_id_number,
            "records": [att_by_lesson.get(l.id, "-") for l in lessons]
        }

        # Calculations
        total_marked = len(s_att_records)
        absent_count = sum(1 for a in s_att_records if a.status in ["sababsiz", "sababli"])
        present_count = sum(1 for a in s_att_records if a.status == "keldi")
        late_count = sum(1 for a in s_att_records if a.status == "kechikdi")

        pct = round(((present_count + late_count * 0.8) / total_marked * 100), 1) if total_marked > 0 else 100.0
        row["total_lessons"] = len(lessons)
        row["present"] = present_count
        row["absent"] = absent_count
        row["late"] = late_count
        row["percentage"] = pct
        row["is_at_risk"] = pct < 80.0 and len(lessons) >= 3

        report_data.append(row)

    return {
        "subject_name": sch.subject.name if sch.subject else "",
        "group_name": sch.group.name if sch.group else "",
        "total_lessons": len(lessons),
        "dates": lesson_dates,
        "students": report_data
    }
