# backend/routers/analytics.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import os
import requests
from bs4 import BeautifulSoup
import time
from transformers import pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options

# --- KHỞI TẠO ROUTER ---
router = APIRouter(
    prefix="/analytics", # Tất cả API trong file này sẽ bắt đầu bằng /analytics/...
    tags=["Analytics Module 3"] # Nhóm API trong tài liệu tự động
)

# --- TẢI MODEL VÀ VECTORIZER (Chỉ tải 1 lần khi server khởi động) ---
# Điều chỉnh đường dẫn tương đối từ vị trí file router
LOCAL_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "local_model")

sentiment_analyzer = None
if os.path.exists(LOCAL_MODEL_PATH) and os.path.isdir(LOCAL_MODEL_PATH):
    print(f"[Analytics Router] Đang tải mô hình từ: {LOCAL_MODEL_PATH}...")
    try:
        sentiment_analyzer = pipeline("sentiment-analysis", model=LOCAL_MODEL_PATH)
        print("[Analytics Router] Mô hình cảm xúc sẵn sàng!")
    except Exception as e: print(f"!!! [Analytics Router] LỖI TẢI MODEL: {e}")
else: print(f"!!! [Analytics Router] LỖI: Không tìm thấy thư mục model '{LOCAL_MODEL_PATH}'.")

# Vectorizer cho CHỦ ĐỀ (Cụm 2-3 từ)
topic_vectorizer = TfidfVectorizer(ngram_range=(2, 3))

# Vectorizer cho GOM CỤM (Từ đơn)
cluster_vectorizer = TfidfVectorizer(ngram_range=(1, 1), max_features=1000)


# --- ĐỊNH NGHĨA INPUT MODELS (Có thể tách ra file models.py) ---
class TextInput(BaseModel): texts: List[str]
class NewsInput(BaseModel): keyword: str; limit: int = 40
class UrlInput(BaseModel): url: HttpUrl
class ClusterInput(BaseModel): texts: List[str]; num_clusters: int = 4

# --- API ENDPOINTS CHO MODULE 3 ---

@router.post("/sentiment")
async def analyze_sentiment_route(input_data: TextInput):
    """ Phân tích cảm xúc cho danh sách văn bản. """
    if sentiment_analyzer is None: raise HTTPException(status_code=503, detail="Model cảm xúc chưa sẵn sàng.")
    try:
        results = sentiment_analyzer(input_data.texts, truncation=True)
        processed_results = []
        for res in results:
            original_label = res['label'].upper(); final_label = "Trung lập"
            if original_label == "POS": final_label = "Tích cực"
            elif original_label == "NEG": final_label = "Tiêu cực"
            processed_results.append({"label": final_label, "score": res['score']})
        return {"status": "success", "results": processed_results}
    except Exception as e:
        print(f"Lỗi /sentiment: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi phân tích cảm xúc: {e}")

@router.post("/topics")
async def extract_topics_route(input_data: TextInput):
    """ Trích xuất các chủ đề (cụm 2-3 từ) nổi bật. """
    full_text = " ".join(input_data.texts)
    try:
        tfidf_matrix = topic_vectorizer.fit_transform([full_text])
        feature_names = topic_vectorizer.get_feature_names_out()
        scores = tfidf_matrix.toarray().flatten()
        word_scores = [{"text": phrase, "value": int(scores[i] * 1000)} for i, phrase in enumerate(feature_names) if scores[i] > 0.01]; topics = sorted(word_scores, key=lambda x: x['value'], reverse=True)[:50]
        return {"status": "success", "topics": topics}
    except ValueError: # Xảy ra nếu không đủ từ để tạo cụm
        return {"status": "success", "topics": []}
    except Exception as e:
        print(f"Lỗi /topics: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi trích xuất chủ đề: {e}")

@router.post("/news")
async def analyze_news_topic_route(input_data: NewsInput):
    """ Lấy tin tức từ NewsAPI, phân tích cảm xúc và chủ đề. """
    NEWS_API_KEY = os.getenv("NEWS_API_KEY") # Đọc key ở đây
    if not NEWS_API_KEY: raise HTTPException(status_code=503, detail="NEWS_API_KEY chưa được cấu hình.")
    if sentiment_analyzer is None: raise HTTPException(status_code=503, detail="Model cảm xúc chưa sẵn sàng.")

    print(f"[News Route] Tìm {input_data.limit} tin tức: {input_data.keyword}")
    search_url = "https://newsapi.org/v2/everything"; headers = {"Authorization": f"Bearer {NEWS_API_KEY}"}; params = {'q': input_data.keyword, 'language': 'vi', 'pageSize': input_data.limit, 'sortBy': 'publishedAt'}
    try:
        response = requests.get(search_url, headers=headers, params=params); response.raise_for_status()
        articles_raw = response.json().get("articles", []); articles_processed = []; texts_to_analyze = []
        if not articles_raw: return {"status": "success", "sentiments": [], "topics": [], "articles": [], "message": "Không tìm thấy bài báo."} # Trả về thành công nhưng rỗng

        for article in articles_raw:
            title = article.get('title', ''); description = article.get('description', ''); url = article.get('url', '')
            if description: texts_to_analyze.append(f"{title}. {description}"); articles_processed.append({"title": title, "description": description, "url": url, "sentiment_label": "Chưa rõ", "sentiment_score": 0.0})

        if not texts_to_analyze: return {"status": "success", "sentiments": [], "topics": [], "articles": articles_processed, "message": "Không có bài báo đủ nội dung."} # Vẫn trả về articles đã lọc

        # Phân tích Cảm xúc
        sentiment_results_batch = sentiment_analyzer(texts_to_analyze, truncation=True); processed_sentiments_for_chart = []
        for i, sentiment_result in enumerate(sentiment_results_batch):
            original_label = sentiment_result['label'].upper(); final_label = "Trung lập";
            if original_label == "POS": final_label = "Tích cực";
            elif original_label == "NEG": final_label = "Tiêu cực"
            if i < len(articles_processed): # Gán sentiment vào bài báo
                 articles_processed[i]["sentiment_label"] = final_label
                 articles_processed[i]["sentiment_score"] = sentiment_result['score']
            processed_sentiments_for_chart.append({"label": final_label, "score": sentiment_result['score']})

        # Trích xuất Chủ đề
        full_text = " ".join(texts_to_analyze)
        try:
             tfidf_matrix = topic_vectorizer.fit_transform([full_text]); feature_names = topic_vectorizer.get_feature_names_out(); scores = tfidf_matrix.toarray().flatten()
             word_scores = [{"text": phrase, "value": int(scores[i] * 1000)} for i, phrase in enumerate(feature_names) if scores[i] > 0.01]; topics = sorted(word_scores, key=lambda x: x['value'], reverse=True)[:50]
        except ValueError: topics = []

        return {"status": "success", "sentiments": processed_sentiments_for_chart, "topics": topics, "articles": articles_processed}

    except requests.exceptions.HTTPError as e:
        try: error_data = e.response.json(); api_message = error_data.get('message', 'Lỗi không rõ từ NewsAPI'); raise HTTPException(status_code=e.response.status_code, detail=f"Lỗi NewsAPI: {api_message}")
        except Exception: raise HTTPException(status_code=e.response.status_code, detail="Lỗi HTTP khi gọi NewsAPI.")
    except Exception as e:
        print(f"Lỗi /news: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi không xác định khi xử lý tin tức: {e}")

@router.post("/url")
async def analyze_url_route(input_data: UrlInput):
    """ Cào nội dung URL bằng Selenium, phân tích cảm xúc và chủ đề. """
    if sentiment_analyzer is None: raise HTTPException(status_code=503, detail="Model cảm xúc chưa sẵn sàng.")

    url_str = str(input_data.url)
    print(f"https://www.merriam-webster.com/dictionary/route Lấy URL (Selenium): {url_str}")
    chrome_options = Options(); chrome_options.add_argument("--headless"); chrome_options.add_argument("--no-sandbox"); chrome_options.add_argument("--disable-dev-shm-usage"); chrome_options.add_argument("user-agent=Mozilla/5.0...");
    driver = None
    try:
        # Khởi động Selenium
        driver_path = ChromeDriverManager().install()
        print(f"https://www.merriam-webster.com/dictionary/route Sử dụng ChromeDriver tại: {driver_path}")
        driver = webdriver.Chrome(service=Service(driver_path), options=chrome_options)
        driver.get(url_str); print("https://www.merriam-webster.com/dictionary/route Đợi JS..."); time.sleep(5); html_content = driver.page_source; print("https://www.merriam-webster.com/dictionary/route Lấy HTML."); driver.quit()

        # Xử lý HTML bằng BeautifulSoup
        soup = BeautifulSoup(html_content, 'lxml'); main_content = soup.find('article') or soup.find('main') or soup.body
        if not main_content: raise HTTPException(status_code=404, detail="Không tìm thấy nội dung chính.")
        for script_or_style in main_content(['script', 'style']): script_or_style.decompose()
        article_text = main_content.get_text(separator=' ', strip=True)
        if not article_text or len(article_text) < 50: raise HTTPException(status_code=400, detail="Không trích xuất đủ nội dung.")

        text_to_analyze = article_text # Truncation=True lo phần cắt ngắn

        # Phân tích Cảm xúc
        sentiment_results = sentiment_analyzer([text_to_analyze], truncation=True); processed_sentiments = []
        for res in sentiment_results:
            original_label = res['label'].upper(); final_label = "Trung lập"
            if original_label == "POS": final_label = "Tích cực";
            elif original_label == "NEG": final_label = "Tiêu cực"
            processed_sentiments.append({"label": final_label, "score": res['score']})

        # Trích xuất Chủ đề
        try:
             tfidf_matrix = topic_vectorizer.fit_transform([text_to_analyze]); feature_names = topic_vectorizer.get_feature_names_out(); scores = tfidf_matrix.toarray().flatten()
             word_scores = [{"text": phrase, "value": int(scores[i] * 1000)} for i, phrase in enumerate(feature_names) if scores[i] > 0.01]; topics = sorted(word_scores, key=lambda x: x['value'], reverse=True)[:50]
        except ValueError: topics = []
        return {"status": "success", "sentiments": processed_sentiments, "topics": topics}

    except Exception as e:
        if driver: driver.quit() # Đảm bảo tắt driver
        print(f"Lỗi /url: {e}")
        # Trả về lỗi cụ thể hơn nếu có thể
        error_detail = f"Lỗi khi xử lý URL: {e}"
        status_code = 500
        if isinstance(e, requests.exceptions.Timeout): status_code=408; error_detail="Timeout khi truy cập URL."
        elif isinstance(e, requests.exceptions.RequestException): status_code=400; error_detail=f"Không thể truy cập URL: {e}"

        raise HTTPException(status_code=status_code, detail=error_detail)


@router.post("/cluster")
async def cluster_analysis_route(input_data: ClusterInput):
    """ Gom cụm văn bản bằng K-Means và trả về cụm từ cho mỗi nhóm. """
    if len(input_data.texts) < input_data.num_clusters:
         raise HTTPException(status_code=400, detail="Số lượng văn bản phải lớn hơn số cụm.")
    try:
        # Vectorize (1-gram)
        vectorized_data = cluster_vectorizer.fit_transform(input_data.texts)
        
        # K-Means
        kmeans = KMeans(n_clusters=input_data.num_clusters, random_state=42, n_init='auto') # Dùng n_init='auto' thay vì 10
        kmeans.fit(vectorized_data); labels = kmeans.labels_
        
        # Gộp text theo cụm
        cluster_texts = [""] * input_data.num_clusters
        for i, text in enumerate(input_data.texts): cluster_texts[labels[i]] += text + " "
        
        # Trích xuất cụm từ (2-3 grams) cho từng nhóm
        clusters_with_phrases = {}
        for i in range(input_data.num_clusters):
            cluster_corpus = [cluster_texts[i]]
            try:
                tfidf_matrix = topic_vectorizer.fit_transform(cluster_corpus)
                feature_names = topic_vectorizer.get_feature_names_out(); scores = tfidf_matrix.toarray().flatten()
                phrase_scores = [{"text": p, "value": int(scores[j]*1000)} for j, p in enumerate(feature_names) if scores[j] > 0.01]
                top_phrases_text = [p["text"] for p in sorted(phrase_scores, key=lambda x: x['value'], reverse=True)[:10]]
                clusters_with_phrases[f"Nhóm {i+1}"] = top_phrases_text
            except ValueError: clusters_with_phrases[f"Nhóm {i+1}"] = ["(Không đủ dữ liệu)"]
            
        return {"status": "success", "clusters": clusters_with_phrases}
        
    except Exception as e:
        print(f"Lỗi /cluster: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi gom cụm: {e}")