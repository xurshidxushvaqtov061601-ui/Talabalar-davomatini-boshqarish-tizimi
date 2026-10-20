# Talabalar Davomatini Boshqarish Tizimi (Student Attendance Management System)

Mazkur tizim oliy ta'lim muassasalarida talabalar davomatini avtomatlashtirish, qog'ozbozlikka barham berish, elektron jurnal yuritish hamda davomat hisobotlarini tahlil qilish uchun mo'ljallangan to'liq veb-ilovadir.

---

## 🚀 Asosiy Imkoniyatlar va Modullar

### 1. 🛡 Administrator Moduli
* **Tizim statistikasi:** Jami talabalar, o'qituvchilar, guruhlar soni, o'rtacha davomat ko'rsatkichi hamda darslarni 20% dan ortiq qoldirgan xavf ostidagi talabalar soni.
* **Foydalanuvchilarni boshqarish (CRUD):** Yangi administrator, o'qituvchi va talabalarni yaratish, tahrirlash va o'chirish.
* **Tuzilma boshqaruvi:** Fakultetlar, akademik guruhlar, fanlar katalogi va auditoriyalar.
* **Dars jadvallari:** O'qituvchi, fan, guruh va vaqtlarni o'zaro bog'lash.
* **Excel Import / Export:**
  * Talabalar yoki o'qituvchilar ro'yxatini Excel (.xlsx) orqali ommaviy yuklash.
  * Barcha talabalar va guruhlar davomat statistikasini professional Excel hisoboti ko'rinishida yuklab olish.
* **Tibbiy ma'lumotnomalar (Spravkalar):** Talabalar yuklagan kasallik/sababli qoldirish ma'lumotnomalarini ko'rib chiqish, tasdiqlash yoki rad etish.
* **Audit loglari:** Tizimga kirishlar va amallar tarixini yuritish.

### 2. 👨‍🏫 O'qituvchi Moduli (Elektron Jurnal)
* **Dars jadvali:** Haftalik biriktirilgan darslar ro'yxati va auditoriyalar.
* **Interaktiv Elektron Jurnal:**
  * Dars va sanani tanlash, dars mavzusini kiritish.
  * Har bir talabaga tezkor holat belgilash: **Keldi**, **Kechikdi**, **Sababli**, **Sababsiz**.
  * Bitta tugma orqali "Barchasi keldi" qilish imkoniyati.
  * Har bir yozuvga alohida izoh qoldirish.

### 3. 🎓 Talaba Moduli (Shaxsiy Kabinet)
* **Davomat ko'rsatkichlari:** Umumiy davomat foizi, qoldirilgan soatlar, qatnashgan darslar soni.
* **Avtomatik Xavf Ogohlantirishi:** Agar talaba 20% dan ortiq dars qoldirsa, ekranda darhol qizil ogohlantirish banneri paydo bo'ladi.
* **Fanlar kesimidagi davomat:** Har bir fan bo'yicha vizual progress bar ko'rinishida davomat darajasi.
* **Darslar tarixi:** O'tilgan barcha darslar, sanasi, mavzusi, o'qituvchisi va qayd etilgan davomat holati.
* **Elektron Spravka topshirish:** Kasallik yoki uzrli sabab bo'yicha hujjat (PDF yoki rasm) ilova qilgan holda ariza yuborish.

---

## 🛠 Texnologiyalar Steki

* **Backend:** Python 3.13, FastAPI, Uvicorn, SQLAlchemy ORM, Pydantic, PyJWT, OpenPyXL.
* **Ma'lumotlar Bazasi:** SQLite (sozlashsiz ishlaydi; PostgreSQL yoki MySQL ga oson o'tish imkoniyati).
* **Frontend:** HTML5, Modern CSS, TailwindCSS (CDN), FontAwesome Icons, Chart.js.
* **Xavfsizlik:** PBKDF2-HMAC-SHA256 parollarni xeshlash, JWT tokenlar bilan RBAC roli autentifikatsiyasi.

---

## ⚡ Ishga Tushirish Qo'llanmasi

### 1. Talab qilinadigan kutubxonalarni o'rnatish
```bash
pip install -r requirements.txt
```

### 2. Birlamchi namunaviy ma'lumotlarni yuklash (ixtiyoriy)
```bash
python seed_data.py
```

### 3. Serverni ishga tushirish
```bash
python run.py
```

Ilova brauzerda quyidagi manzilda ochiladi:
* **Asosiy ilova:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Interaktiv Swagger API:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🔑 Tizimga Kirish Ma'lumotlari (Demo)

| Rol | Login | Parol | Izoh |
| :--- | :--- | :--- | :--- |
| **Bosh Administrator** | `admin` | `admin123` | Barcha vakolatlar va to'liq boshqaruv |
| **O'qituvchi** | `muallim1` | `teacher123` | Alisher Qodirov (Dotsent), Elektron jurnal |
| **Talaba (Faol)** | `talaba1` | `student123` | Jasur Ergashev (80% qatnashish) |
| **Talaba (&gt;20% Xavf)** | `talaba5` | `student123` | Bobur Mirzayev (Avtomatik ogohlantirish testi) |

*(Kirish oynasida har bir rol uchun tezkor to'ldirish tugmalari mavjud).*
