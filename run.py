import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("Talabalar Davomatini Boshqarish Tizimi serveri ishga tushmoqda...")
    print("Manzil: http://127.0.0.1:8000")
    print("Swagger API hujjatlari: http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
