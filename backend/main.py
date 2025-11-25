# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Import các router từ thư mục routers
from routers import analytics, content_studio

# --- KHỞI TẠO APP VÀ CẤU HÌNH ---
load_dotenv() # Tải biến môi trường từ .env
app = FastAPI(title="Media.C API", description="API cho ứng dụng AI vào Truyền thông")

# Cấu hình CORS
origins = ["http://localhost:3000"] # Cho phép Frontend React gọi
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Cho phép tất cả methods
    allow_headers=["*"], # Cho phép tất cả headers
)

# === INCLUDE CÁC ROUTER ===
# Nhúng router của Module 3 (Phân tích) với tiền tố /analytics
app.include_router(analytics.router)

# Nhúng router của Module 1 (Sáng tạo) với tiền tố /content
app.include_router(content_studio.router)


# === API GỐC (Tùy chọn) ===
@app.get("/")
def read_root():
    """ API gốc để kiểm tra server có hoạt động không. """
    return {"message": "Welcome to Media.C API - AI SO HARD"}

# --- TÙY CHỌN: Cấu hình static files nếu cần ---
# from fastapi.staticfiles import StaticFiles
# app.mount("/static", StaticFiles(directory="static"), name="static")

# Lệnh chạy server (trong terminal, ở thư mục backend, đã kích hoạt venv):\
    # .\venv\Scripts\activate
# uvicorn main:app --reload