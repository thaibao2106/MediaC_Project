# backend/database.py
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

# Kết nối MySQL (XAMPP)
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:@localhost/mediac_db?charset=utf8mb4"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 1. BẢNG BÀI BÁO ---
class ArticleDB(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100))
    title = Column(String(500))
    content = Column(Text)
    url = Column(String(500), unique=True)
    image_url = Column(String(500), nullable=True)

# --- 2. BẢNG NGƯỜI DÙNG (MỚI) ---
class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    # Quan hệ với bảng interactions
    interactions = relationship("InteractionDB", back_populates="user")

# --- 3. BẢNG TƯƠNG TÁC/LỊCH SỬ (MỚI) ---
class InteractionDB(Base):
    __tablename__ = "interactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    article_id = Column(Integer, ForeignKey("articles.id"))
    timestamp = Column(DateTime, default=datetime.utcnow) # Lưu thời gian đọc
    
    user = relationship("UserDB", back_populates="interactions")
    article = relationship("ArticleDB")

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# Tạo bảng mới (User & Interaction)
Base.metadata.create_all(bind=engine)