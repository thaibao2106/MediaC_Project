# backend/routers/content_studio.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import openai
from dotenv import load_dotenv

# --- KHỞI TẠO ROUTER ---
router = APIRouter(
    prefix="/content", # Tiền tố /content/...
    tags=["Content Studio Module 1"]
)

# --- CẤU HÌNH OPENAI ---
# Load key từ .env (đã load ở main.py nhưng load lại cho chắc)
load_dotenv()
openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- ĐỊNH NGHĨA INPUT ---
class GenerateInput(BaseModel):
    prompt: str
    task_type: str # Ví dụ: "Slogan", "Blog Post", "Email", "Facebook Post"

# --- API ENDPOINT CHO MODULE 1 ---
@router.post("/generate") # Đường dẫn sẽ là /content/generate
async def generate_content_route(input_data: GenerateInput):
    """ Nhận prompt và task_type, gọi OpenAI để tạo nội dung. """
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") # Kiểm tra lại key
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY chưa được cấu hình.")

    # Xây dựng System Prompt dựa trên task_type
    system_prompt = "Bạn là một trợ lý AI chuyên nghiệp về Marketing và Truyền thông tại Việt Nam."
    if input_data.task_type == "Slogan":
        system_prompt += " Hãy viết các slogan thật ngắn gọn, ấn tượng, và độc đáo."
    elif input_data.task_type == "Blog Post":
        system_prompt += " Hãy viết một bài blog chuẩn SEO, có tiêu đề hấp dẫn, cấu trúc rõ ràng với các đề mục H2, H3, và nội dung chất lượng."
    elif input_data.task_type == "Email":
         system_prompt += " Hãy viết một email marketing chuyên nghiệp, cá nhân hóa (nếu có thể), và có lời kêu gọi hành động (CTA) rõ ràng."
    elif input_data.task_type == "Facebook Post":
         system_prompt += " Hãy viết một bài đăng Facebook thu hút, có thể kèm theo emoji phù hợp, và hashtag liên quan."
    # Thêm các case khác nếu muốn

    print(f"[Content Route] Generating content for task: {input_data.task_type}")
    try:
        completion = openai_client.chat.completions.create(
            model="gpt-3.5-turbo", # Hoặc gpt-4o
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": input_data.prompt}
            ],
            temperature=0.7 # Tăng một chút sáng tạo
        )
        generated_text = completion.choices[0].message.content
        
        # Kiểm tra xem OpenAI có trả về nội dung không
        if not generated_text:
             raise HTTPException(status_code=500, detail="OpenAI không trả về nội dung.")

        return {"status": "success", "generated_text": generated_text.strip()}

    except openai.AuthenticationError as e:
        print(f"Lỗi OpenAI Authentication: {e}")
        raise HTTPException(status_code=401, detail=f"Lỗi xác thực OpenAI: API Key không hợp lệ hoặc hết hạn.")
    except openai.RateLimitError as e:
        print(f"Lỗi OpenAI Rate Limit: {e}")
        raise HTTPException(status_code=429, detail=f"Lỗi giới hạn truy cập OpenAI: Bạn đã gửi quá nhiều yêu cầu.")
    except Exception as e:
        print(f"Lỗi /content/generate: {e}")
        # Trả về lỗi cụ thể hơn nếu có thể
        error_detail = f"Lỗi không xác định khi gọi API OpenAI: {e}"
        status_code = 500
        # Cố gắng bắt các lỗi mạng hoặc lỗi API khác từ OpenAI nếu có thể
        # Ví dụ: if isinstance(e, openai.APIConnectionError): ...
        raise HTTPException(status_code=status_code, detail=error_detail)