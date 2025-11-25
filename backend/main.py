# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Import các router (Module con)
from routers import analytics, content_studio, personalization

# --- KHỞI TẠO APP ---
load_dotenv() # Đọc biến môi trường từ .env
app = FastAPI(title="Media.C API")

# --- CẤU HÌNH CORS (Cho phép Frontend gọi API) ---
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === KẾT NỐI CÁC ROUTER VÀO APP CHÍNH ===

# Module 3: Phân tích & Xu hướng (Prefix: /analytics)
app.include_router(analytics.router)

# Module 1: Sáng tạo Nội dung (Prefix: /content)
app.include_router(content_studio.router)

# Module 2: Cá nhân hóa (Prefix: /personalization)
app.include_router(personalization.router)


# === API GỐC (Health Check) ===
@app.get("/")
def read_root():
    return {"message": "Welcome to Media.C API - System Ready"}

# Lệnh chạy server: uvicorn main:app --reload