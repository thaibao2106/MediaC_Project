# backend/routers/personalization.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

# Import từ file database chung
from database import get_db, ArticleDB

router = APIRouter(
    prefix="/personalization",
    tags=["Hyper-Personalization Module 2"]
)

class UserHistory(BaseModel):
    viewed_article_ids: List[int]

# --- HÀM HELPER: TÍNH TOÁN GỢI Ý ---
def get_recommendations(db: Session, viewed_ids: List[int], top_n: int = 3):
    if not viewed_ids: return []

    # Lấy tất cả bài báo
    all_articles_db = db.query(ArticleDB).all()
    
    # Chuyển sang dict
    all_articles = [
        {"id": a.id, "category": a.category, "title": a.title, "content": a.content, "url": a.url} 
        for a in all_articles_db
    ]

    viewed_articles = [art for art in all_articles if art["id"] in viewed_ids]
    if not viewed_articles: return []
    
    # Tạo profile người dùng từ bài đã xem
    user_profile_text = " ".join([f"{art['title']} {art['content']}" for art in viewed_articles])
    
    # Tìm bài chưa xem
    candidate_articles = [art for art in all_articles if art["id"] not in viewed_ids]
    if not candidate_articles: return []

    candidate_texts = [f"{art['title']} {art['content']}" for art in candidate_articles]

    # Tính độ tương đồng
    try:
        tfidf = TfidfVectorizer(stop_words=None)
        all_texts = [user_profile_text] + candidate_texts
        tfidf_matrix = tfidf.fit_transform(all_texts)
        
        # So sánh user profile (index 0) với các candidates (index 1 trở đi)
        cosine_sim = linear_kernel(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        
        related_indices = cosine_sim.argsort()[:-top_n-1:-1]
        recommendations = []
        
        for i in related_indices:
            if cosine_sim[i] > 0.05: # Chỉ lấy nếu có chút liên quan (> 5%)
                rec = candidate_articles[i]
                rec["score"] = float(cosine_sim[i])
                recommendations.append(rec)
        
        return recommendations
    except ValueError:
        return []

# --- API ENDPOINTS ---

@router.get("/articles")
async def get_articles(db: Session = Depends(get_db)):
    """ Lấy 50 bài báo mới nhất từ DB. """
    try:
        articles = db.query(ArticleDB).order_by(ArticleDB.id.desc()).limit(50).all()
        return {"status": "success", "articles": articles}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/recommend")
async def recommend(history: UserHistory, db: Session = Depends(get_db)):
    """ Gợi ý bài báo. """
    try:
        recs = get_recommendations(db, history.viewed_article_ids)
        return {"status": "success", "recommendations": recs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))