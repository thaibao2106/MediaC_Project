# backend/routers/analytics.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import os
import requests
from bs4 import BeautifulSoup
import time

# Các thư viện AI
from transformers import pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans

# Các thư viện Selenium (cho URL động)
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options

# Import Database (Để lưu tin tức vào MySQL)
# Lưu ý: database.py nằm ở thư mục cha (backend/), nên import thẳng
from database import SessionLocal, ArticleDB 
from sqlalchemy.exc import IntegrityError

# --- KHỞI TẠO ROUTER ---
router = APIRouter(
    prefix="/analytics",
    tags=["Analytics Module 3"]
)

# --- 1. TẢI MÔ HÌNH AI (CHẠY OFFLINE) ---
LOCAL_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "local_model")
sentiment_analyzer = None

if os.path.exists(LOCAL_MODEL_PATH):
    try:
        print(f"[Analytics] Đang tải mô hình từ: {LOCAL_MODEL_PATH}...")
        sentiment_analyzer = pipeline("sentiment-analysis", model=LOCAL_MODEL_PATH)
        print("[Analytics] Mô hình cảm xúc đã sẵn sàng!")
    except Exception as e:
        print(f"!!! LỖI TẢI MODEL: {e}")
else:
    print(f"!!! CẢNH BÁO: Không tìm thấy thư mục '{LOCAL_MODEL_PATH}'.")

# --- 2. KHỞI TẠO VECTORIZERS ---
# Dùng để trích xuất chủ đề (Cụm 2-3 từ)
topic_vectorizer = TfidfVectorizer(ngram_range=(2, 3))

# Dùng để gom cụm (Từ đơn - hiệu quả hơn cho K-Means)
cluster_vectorizer = TfidfVectorizer(ngram_range=(1, 1), max_features=1000)

# --- 3. ĐỊNH NGHĨA INPUT MODELS ---
class TextInput(BaseModel):
    texts: List[str]

class NewsInput(BaseModel):
    keyword: str
    limit: int = 40

class UrlInput(BaseModel):
    url: HttpUrl

class ClusterInput(BaseModel):
    texts: List[str]
    num_clusters: int = 4

# --- 4. CÁC API ENDPOINTS ---

# === API 1: PHÂN TÍCH CẢM XÚC ===
@router.post("/sentiment")
async def analyze_sentiment_route(input_data: TextInput):
    if sentiment_analyzer is None:
        raise HTTPException(status_code=503, detail="Model cảm xúc chưa được tải.")
    
    try:
        results = sentiment_analyzer(input_data.texts, truncation=True)
        processed_results = []
        
        for res in results:
            original_label = res['label'].upper()
            final_label = "Trung lập"
            
            if original_label == "POS": final_label = "Tích cực"
            elif original_label == "NEG": final_label = "Tiêu cực"
                
            processed_results.append({"label": final_label, "score": res['score']})
            
        return {"status": "success", "results": processed_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích cảm xúc: {e}")

# === API 2: TRÍCH XUẤT CHỦ ĐỀ ===
@router.post("/topics")
async def extract_topics_route(input_data: TextInput):
    full_text = " ".join(input_data.texts)
    try:
        tfidf_matrix = topic_vectorizer.fit_transform([full_text])
        feature_names = topic_vectorizer.get_feature_names_out()
        scores = tfidf_matrix.toarray().flatten()
        
        word_scores = [{"text": phrase, "value": int(scores[i] * 1000)} 
                       for i, phrase in enumerate(feature_names) if scores[i] > 0.01]
        
        topics = sorted(word_scores, key=lambda x: x['value'], reverse=True)[:50]
        return {"status": "success", "topics": topics}
    except ValueError:
        return {"status": "success", "topics": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi trích xuất chủ đề: {e}")

# === API 3: LẤY TIN TỨC + LƯU DB + PHÂN TÍCH ===
@router.post("/news")
async def analyze_news_topic_route(input_data: NewsInput):
    NEWS_API_KEY = os.getenv("NEWS_API_KEY")
    if not NEWS_API_KEY:
        raise HTTPException(status_code=503, detail="NEWS_API_KEY chưa được cấu hình.")
    
    print(f"[News] Đang tìm kiếm: {input_data.keyword}")
    search_url = "https://newsapi.org/v2/everything"
    headers = {"Authorization": f"Bearer {NEWS_API_KEY}"}
    params = {
        'q': input_data.keyword,
        'language': 'vi',
        'pageSize': input_data.limit,
        'sortBy': 'publishedAt'
    }
    
    try:
        # 1. Gọi NewsAPI
        response = requests.get(search_url, headers=headers, params=params)
        response.raise_for_status()
        articles_raw = response.json().get("articles", [])
        
        if not articles_raw:
            return {"status": "success", "sentiments": [], "topics": [], "articles": [], "message": "Không tìm thấy bài báo nào."}

        # 2. Xử lý và Lưu vào Database
        db = SessionLocal()
        saved_count = 0
        articles_processed = []
        texts_to_analyze = []
        
        for article in articles_raw:
            title = article.get('title', '')
            description = article.get('description', '')
            url = article.get('url', '')
            image_url = article.get('urlToImage', '')

            if description and title:
                # Chuẩn bị text để phân tích AI
                texts_to_analyze.append(f"{title}. {description}")
                
                # Chuẩn bị object trả về Frontend
                articles_processed.append({
                    "title": title, 
                    "description": description, 
                    "url": url, 
                    "sentiment_label": "Chưa rõ", 
                    "sentiment_score": 0.0
                })

                # Lưu vào MySQL (Bỏ qua nếu trùng URL)
                try:
                    exists = db.query(ArticleDB).filter(ArticleDB.url == url).first()
                    if not exists:
                        new_article = ArticleDB(
                            category=input_data.keyword,
                            title=title, content=description, url=url, image_url=image_url
                        )
                        db.add(new_article)
                        db.commit()
                        saved_count += 1
                except Exception:
                    db.rollback()
        
        db.close()
        print(f"[DB] Đã lưu {saved_count} bài báo mới vào Database.")

        if not texts_to_analyze:
            return {"status": "success", "message": "Không có bài báo nào đủ nội dung."}

        # 3. Chạy AI: Phân tích Cảm xúc
        processed_sentiments_chart = []
        if sentiment_analyzer:
            sentiment_results = sentiment_analyzer(texts_to_analyze, truncation=True)
            
            for i, res in enumerate(sentiment_results):
                lbl = "Trung lập"
                if res['label'] == 'POS': lbl = "Tích cực"
                elif res['label'] == 'NEG': lbl = "Tiêu cực"
                
                if i < len(articles_processed):
                    articles_processed[i]['sentiment_label'] = lbl
                    articles_processed[i]['sentiment_score'] = res['score']
                
                processed_sentiments_chart.append({"label": lbl, "score": res['score']})

        # 4. Chạy AI: Trích xuất Chủ đề
        full_text = " ".join(texts_to_analyze)
        topics = []
        try:
            tfidf = topic_vectorizer.fit_transform([full_text])
            names = topic_vectorizer.get_feature_names_out()
            scores = tfidf.toarray().flatten()
            words = [{"text": n, "value": int(s*1000)} for i, (n, s) in enumerate(zip(names, scores)) if s > 0.01]
            topics = sorted(words, key=lambda x: x['value'], reverse=True)[:50]
        except ValueError:
            topics = []

        return {
            "status": "success",
            "sentiments": processed_sentiments_chart,
            "topics": topics,
            "articles": articles_processed
        }

    except Exception as e:
        print(f"Lỗi News: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý tin tức: {e}")

# === API 4: PHÂN TÍCH URL (SELENIUM) ===
@router.post("/url")
async def analyze_url_route(input_data: UrlInput):
    if sentiment_analyzer is None:
        raise HTTPException(status_code=503, detail="Model chưa tải.")
    
    url_str = str(input_data.url)
    print(f"[URL] Đang cào dữ liệu từ: {url_str}")
    
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

    driver = None
    try:
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        driver.get(url_str)
        time.sleep(5) # Chờ load
        html_content = driver.page_source
        driver.quit()
        
        soup = BeautifulSoup(html_content, 'lxml')
        main_content = soup.find('article') or soup.find('main') or soup.body
        if not main_content:
             raise HTTPException(status_code=400, detail="Không tìm thấy nội dung chính.")
             
        for s in main_content(['script', 'style', 'nav', 'footer', 'header']): s.decompose()
        article_text = main_content.get_text(separator='\n\n', strip=True) # Giữ đoạn văn
        
        if len(article_text) < 50:
             raise HTTPException(status_code=400, detail="Nội dung quá ngắn hoặc bị chặn.")

        # Chạy AI
        sentiment_results = sentiment_analyzer([article_text], truncation=True)
        processed_sentiments = []
        for res in sentiment_results:
            lbl = "Trung lập"
            if res['label'] == 'POS': lbl = "Tích cực"
            elif res['label'] == 'NEG': lbl = "Tiêu cực"
            processed_sentiments.append({"label": lbl, "score": res['score']})

        topics = []
        try:
            tfidf = topic_vectorizer.fit_transform([article_text])
            names = topic_vectorizer.get_feature_names_out()
            scores = tfidf.toarray().flatten()
            words = [{"text": n, "value": int(s*1000)} for i, (n, s) in enumerate(zip(names, scores)) if s > 0.01]
            topics = sorted(words, key=lambda x: x['value'], reverse=True)[:50]
        except ValueError:
            topics = []

        return {
            "status": "success", 
            "sentiments": processed_sentiments, 
            "topics": topics,
            "content": article_text # Trả về nội dung để đọc
        }

    except Exception as e:
        if driver: driver.quit()
        print(f"Lỗi URL: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý URL: {e}")

# === API 5: GOM CỤM (CLUSTERING) ===
@router.post("/cluster")
async def cluster_analysis_route(input_data: ClusterInput):
    if len(input_data.texts) < input_data.num_clusters:
         return {"status": "success", "clusters": {}, "message": "Không đủ dữ liệu để gom cụm."}
         
    try:
        vectorized_data = cluster_vectorizer.fit_transform(input_data.texts)
        kmeans = KMeans(n_clusters=input_data.num_clusters, random_state=42, n_init='auto')
        kmeans.fit(vectorized_data)
        labels = kmeans.labels_
        
        cluster_texts = [""] * input_data.num_clusters
        for i, text in enumerate(input_data.texts):
            cluster_texts[labels[i]] += text + " "
            
        clusters_with_phrases = {}
        for i in range(input_data.num_clusters):
            try:
                tfidf = topic_vectorizer.fit_transform([cluster_texts[i]])
                names = topic_vectorizer.get_feature_names_out()
                scores = tfidf.toarray().flatten()
                phrase_scores = [{"text": n, "value": s} for n, s in zip(names, scores)]
                top_phrases = sorted(phrase_scores, key=lambda x: x['value'], reverse=True)[:10]
                clusters_with_phrases[f"Nhóm {i+1}"] = [p["text"] for p in top_phrases]
            except ValueError:
                clusters_with_phrases[f"Nhóm {i+1}"] = ["(Dữ liệu ít)"]
                
        return {"status": "success", "clusters": clusters_with_phrases}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi gom cụm: {e}")