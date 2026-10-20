from datetime import date, datetime, timedelta
import random
from app.database import engine, SessionLocal, Base
from app.models import (
    User, Faculty, Group, Teacher, Student, Subject, Schedule, Lesson, Attendance, LeaveRequest, AuditLog
)
from app.auth import hash_password

def seed():
    print("Ma'lumotlar bazasi jadvallari yaratilmoqda...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).filter(User.username == "admin").first():
            print("Namunaviy ma'lumotlar allaqachon mavjud.")
            return

        print("Namunaviy ma'lumotlar kiritilmoqda...")

        # 1. Administrator
        admin_user = User(
            username="admin",
            password_hash=hash_password("admin123"),
            full_name="Bosh Administrator",
            role="admin",
            email="admin@otm.uz",
            phone="+998901234567",
            is_active=True
        )
        db.add(admin_user)

        # 2. Fakultetlar
        f1 = Faculty(name="Kompyuter injiniringi fakulteti", code="KIF", description="Axborot texnologiyalari va dasturlash")
        f2 = Faculty(name="Kiberxavfsizlik fakulteti", code="KXF", description="Axborot xavfsizligi va tizimlar")
        db.add_all([f1, f2])
        db.flush()

        # 3. Guruhlar
        g1 = Group(faculty_id=f1.id, name="KI-21-01", course_year=3)
        g2 = Group(faculty_id=f1.id, name="DI-22-04", course_year=2)
        g3 = Group(faculty_id=f2.id, name="AX-23-02", course_year=1)
        db.add_all([g1, g2, g3])
        db.flush()

        # 4. Fanlar
        sub1 = Subject(name="Veb dasturlash (FastAPI & JS)", code="WEB-301", hours_total=60)
        sub2 = Subject(name="Ma'lumotlar bazasi (SQL & ORM)", code="DB-302", hours_total=60)
        sub3 = Subject(name="Sun'iy intellekt asoslari", code="AI-401", hours_total=45)
        sub4 = Subject(name="Algoritmlar va ma'lumotlar tuzilmasi", code="ALG-201", hours_total=70)
        db.add_all([sub1, sub2, sub3, sub4])
        db.flush()

        # 5. O'qituvchilar
        u_t1 = User(
            username="muallim1",
            password_hash=hash_password("teacher123"),
            full_name="Alisher Qodirov",
            role="teacher",
            email="alisher@otm.uz",
            phone="+998912345678",
            is_active=True
        )
        u_t2 = User(
            username="muallim2",
            password_hash=hash_password("teacher123"),
            full_name="Nodira Rahimova",
            role="teacher",
            email="nodira@otm.uz",
            phone="+998933456789",
            is_active=True
        )
        db.add_all([u_t1, u_t2])
        db.flush()

        t1 = Teacher(user_id=u_t1.id, department="Dasturiy injiniring kafedrasi", title="Dotsent")
        t2 = Teacher(user_id=u_t2.id, department="Axborot texnologiyalari kafedrasi", title="Katta o'qituvchi")
        db.add_all([t1, t2])
        db.flush()

        # 6. Talabalar (KI-21-01 guruhi)
        students_info = [
            ("talaba1", "student123", "Jasur Ergashev", "STU-2024-001", "+998941112233"),
            ("talaba2", "student123", "Zilola Karimova", "STU-2024-002", "+998942223344"),
            ("talaba3", "student123", "Otabek Umarov", "STU-2024-003", "+998943334455"),
            ("talaba4", "student123", "Madina Saidova", "STU-2024-004", "+998944445566"),
            ("talaba5", "student123", "Bobur Mirzayev", "STU-2024-005", "+998945556677"),
            ("talaba6", "student123", "Gulnoza Aliyeva", "STU-2024-006", "+998946667788"),
        ]

        created_students = []
        for username, pwd, fname, st_num, phone in students_info:
            u_s = User(
                username=username,
                password_hash=hash_password(pwd),
                full_name=fname,
                role="student",
                email=f"{username}@student.otm.uz",
                phone=phone,
                is_active=True
            )
            db.add(u_s)
            db.flush()

            st = Student(user_id=u_s.id, group_id=g1.id, student_id_number=st_num)
            db.add(st)
            db.flush()
            created_students.append(st)

        # 7. Dars jadvallari (Schedules)
        sch1 = Schedule(
            teacher_id=t1.id,
            subject_id=sub1.id,
            group_id=g1.id,
            day_of_week=1, # Dushanba
            start_time="08:30",
            end_time="09:50",
            room="304-auditoriya"
        )
        sch2 = Schedule(
            teacher_id=t1.id,
            subject_id=sub2.id,
            group_id=g1.id,
            day_of_week=3, # Chorshanba
            start_time="10:00",
            end_time="11:20",
            room="402-laboratoriya"
        )
        sch3 = Schedule(
            teacher_id=t2.id,
            subject_id=sub3.id,
            group_id=g1.id,
            day_of_week=5, # Juma
            start_time="13:30",
            end_time="14:50",
            room="210-auditoriya"
        )
        db.add_all([sch1, sch2, sch3])
        db.flush()

        # 8. O'tgan darslar va Davomat tarixi (So'nggi 3 hafta)
        today = date.today()
        lesson_dates = [
            (today - timedelta(days=14), "1-Mavzu: Kirish va asosiy tushunchalar", sch1),
            (today - timedelta(days=12), "1-Laboratoriya: SQL so'rovlar", sch2),
            (today - timedelta(days=7),  "2-Mavzu: RESTful API arxitekturasi", sch1),
            (today - timedelta(days=5),  "2-Laboratoriya: Indexlar va optimizatsiya", sch2),
            (today - timedelta(days=2),  "3-Mavzu: Autentifikatsiya va RBAC xavfsizligi", sch1),
        ]

        for l_date, topic, sch in lesson_dates:
            lesson = Lesson(
                schedule_id=sch.id,
                teacher_id=sch.teacher_id,
                subject_id=sch.subject_id,
                group_id=sch.group_id,
                lesson_date=l_date,
                topic=topic
            )
            db.add(lesson)
            db.flush()

            # Davomat yozish
            for idx, st in enumerate(created_students):
                # talaba5 ni ko'proq sababsiz qoldirgan qilamiz (>20% xavf testi uchun)
                if idx == 4:
                    status = "sababsiz" if random.random() < 0.6 else "keldi"
                elif idx == 0:
                    status = "sababli" if l_date == (today - timedelta(days=7)) else "keldi"
                else:
                    status = "keldi" if random.random() < 0.85 else ("kechikdi" if random.random() < 0.5 else "sababsiz")

                att = Attendance(
                    lesson_id=lesson.id,
                    student_id=st.id,
                    status=status,
                    comment="Elektron jurnal orqali kiritildi" if status != "keldi" else None
                )
                db.add(att)

        # 9. Namunaviy sababli ariza (LeaveRequest)
        lr = LeaveRequest(
            student_id=created_students[0].id,
            start_date=today - timedelta(days=7),
            end_date=today - timedelta(days=6),
            reason="Mavsumiy shamollash va tibbiy ko'rik sababli",
            document_path=None,
            status="tasdiqlandi",
            reviewed_by=admin_user.id
        )
        db.add(lr)

        # 10. Audit log
        db.add(AuditLog(user_id=admin_user.id, action="SEED_DATA", details="Tizimga birlamchi namunaviy ma'lumotlar yuklandi"))

        db.commit()
        print("Birlamchi ma'lumotlar muvaffaqiyatli yuklandi!")
        print("-" * 50)
        print("Tizimga kirish ma'lumotlari:")
        print("Administrator:  login: admin     | parol: admin123")
        print("O'qituvchi:     login: muallim1  | parol: teacher123")
        print("Talaba:         login: talaba1   | parol: student123")
        print("Talaba (Xavf):  login: talaba5   | parol: student123")
        print("-" * 50)

    except Exception as e:
        db.rollback()
        print("Xatolik yuz berdi:", e)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
