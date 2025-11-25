# backend/database.py
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Kết nối đến MySQL (XAMPP)
# Lưu ý: charset=utf8mb4 để hỗ trợ icon và tiếng Việt tốt nhất
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:@localhost/mediac_db?charset=utf8mb4"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Định nghĩa bảng bài báo (Thêm cột URL và Image để hiển thị đẹp hơn)
class ArticleDB(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100)) # Lưu từ khóa tìm kiếm (ví dụ: "Bóng đá")
    title = Column(String(500))
    content = Column(Text)         # Nội dung mô tả
    url = Column(String(500), unique=True) # Link gốc (Unique để không lưu trùng)
    image_url = Column(String(500)) # Link ảnh bìa

# Hàm lấy DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Tự động tạo bảng nếu chưa có
Base.metadata.create_all(bind=engine)