# backend/routers/personalization.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

# Import các model DB mới
from database import get_db, ArticleDB, UserDB, InteractionDB

router = APIRouter(
    prefix="/personalization",
    tags=["Hyper-Personalization Module 2"]
)

# --- INPUT MODELS ---
class UserLogin(BaseModel):
    username: str

class LogInteraction(BaseModel):
    user_id: int
    article_id: int

# --- HÀM GỢI Ý (CONTENT-BASED) ---
def get_content_based_recommendations(db: Session, user_id: int, top_n: int = 3):
    # 1. Lấy lịch sử đọc từ DB (thay vì RAM)
    interactions = db.query(InteractionDB).filter(InteractionDB.user_id == user_id).all()
    viewed_ids = [i.article_id for i in interactions]

    if not viewed_ids: return []

    # 2. Lấy danh sách bài báo
    all_articles_db = db.query(ArticleDB).all()
    all_articles = [{"id": a.id, "title": a.title, "content": a.content, "category": a.category, "url": a.url} for a in all_articles_db]

    # 3. Tách bài đã xem và chưa xem
    viewed_articles = [art for art in all_articles if art["id"] in viewed_ids]
    candidate_articles = [art for art in all_articles if art["id"] not in viewed_ids]
    
    if not candidate_articles: return []

    # 4. Tạo User Profile (Gộp nội dung đã đọc)
    user_profile_text = " ".join([f"{art['title']} {art['content']}" for art in viewed_articles])
    candidate_texts = [f"{art['title']} {art['content']}" for art in candidate_articles]

    # 5. Tính TF-IDF & Cosine
    try:
        tfidf = TfidfVectorizer(stop_words=None)
        all_texts = [user_profile_text] + candidate_texts
        tfidf_matrix = tfidf.fit_transform(all_texts)
        cosine_sim = linear_kernel(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        
        related_indices = cosine_sim.argsort()[:-top_n-1:-1]
        recommendations = []
        for i in related_indices:
            if cosine_sim[i] > 0.05:
                rec = candidate_articles[i]
                rec["score"] = float(cosine_sim[i])
                recommendations.append(rec)
        return recommendations
    except ValueError: return []

# --- API ENDPOINTS ---

@router.post("/login")
async def login_user(user_input: UserLogin, db: Session = Depends(get_db)):
    """ Tạo user mới hoặc lấy user cũ (Giả lập đăng nhập) """
    user = db.query(UserDB).filter(UserDB.username == user_input.username).first()
    if not user:
        user = UserDB(username=user_input.username)
        db.add(user)
        db.commit()
        db.refresh(user)
    return {"status": "success", "user_id": user.id, "username": user.username}

@router.get("/articles")
async def get_articles(db: Session = Depends(get_db)):
    """ Lấy danh sách bài báo """
    articles = db.query(ArticleDB).order_by(ArticleDB.id.desc()).limit(50).all()
    return {"status": "success", "articles": articles}

@router.post("/log_view")
async def log_view(data: LogInteraction, db: Session = Depends(get_db)):
    """ Lưu hành động đọc vào DB """
    # Kiểm tra xem đã đọc bài này chưa để tránh trùng lặp (hoặc có thể cho phép lưu nhiều lần để tính tần suất)
    existing = db.query(InteractionDB).filter(InteractionDB.user_id == data.user_id, InteractionDB.article_id == data.article_id).first()
    if not existing:
        interaction = InteractionDB(user_id=data.user_id, article_id=data.article_id)
        db.add(interaction)
        db.commit()
    return {"status": "success"}

@router.get("/history/{user_id}")
async def get_history(user_id: int, db: Session = Depends(get_db)):
    """ Lấy lịch sử đọc từ DB """
    interactions = db.query(InteractionDB).filter(InteractionDB.user_id == user_id).order_by(InteractionDB.timestamp.desc()).all()
    # Lấy thông tin bài báo chi tiết
    history_articles = []
    for i in interactions:
        if i.article: # Kiểm tra bài báo còn tồn tại không
            history_articles.append(i.article)
    return {"status": "success", "history": history_articles}

@router.get("/recommend/{user_id}")
async def get_recommendations_api(user_id: int, db: Session = Depends(get_db)):
    """ Lấy gợi ý cho User ID cụ thể """
    recs = get_content_based_recommendations(db, user_id)
    return {"status": "success", "recommendations": recs}