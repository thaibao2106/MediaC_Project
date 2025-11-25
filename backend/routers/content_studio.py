# backend/routers/content_studio.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import openai  # Dùng thư viện openai để gọi Groq
from dotenv import load_dotenv
import requests
import io
import base64
from PIL import Image

# --- KHỞI TẠO ROUTER ---
router = APIRouter(
    prefix="/content",
    tags=["Content Studio Module 1"]
)

# --- CẤU HÌNH API KEYS ---
load_dotenv()
STABILITY_API_KEY = os.getenv("STABILITY_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Cấu hình Client cho Groq (Dùng chuẩn OpenAI)
if GROQ_API_KEY:
    groq_client = openai.OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=GROQ_API_KEY
    )
else:
    groq_client = None

# --- ĐỊNH NGHĨA INPUT ---
class TextGenerateInput(BaseModel):
    prompt: str; task_type: str

class ImageFromTextInput(BaseModel):
    prompt: str; negative_prompt: str = ""; style_preset: Optional[str] = ""

class ImageFromImageInput(BaseModel):
    prompt: str; init_image_base64: str; strength: float = 0.6; negative_prompt: str = ""

class ImageUpscaleInput(BaseModel):
    init_image_base64: str

# === HÀM HELPER: GỌI GROQ ĐỂ XỬ LÝ VĂN BẢN (Thay thế HF) ===
def query_groq_text(system_content, user_content):
    if not groq_client:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY chưa được cấu hình.")
    
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant", # <-- ĐÃ CẬP NHẬT MODEL MỚI NHẤT
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content}
            ],
            temperature=0.7,
            max_tokens=1024,
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"Lỗi Groq: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi Groq API: {str(e)}")

# === HÀM DỊCH THUẬT (DÙNG GROQ) ===
def translate_prompt_to_english(prompt: str) -> str:
    try:
        prompt.encode(encoding='ascii')
        return prompt
    except UnicodeEncodeError:
        print(f"[Translate] Đang dịch: '{prompt}'")
        system_msg = "You are a translator. Translate the following Vietnamese text to English. Return ONLY the translation, no explanation text."
        return query_groq_text(system_msg, prompt).replace('"', '').strip()

# === CÁC HÀM STABILITY AI (GIỮ NGUYÊN KHÔNG ĐỔI) ===
def check_stability_key():
    if not STABILITY_API_KEY: raise HTTPException(status_code=503, detail="STABILITY_API_KEY thiếu.")

def stability_text_to_image(prompt: str, negative_prompt: str, style_preset: str):
    check_stability_key(); url = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"; headers = { "Authorization": f"Bearer {STABILITY_API_KEY}", "Accept": "application/json" }; text_prompts = [{"text": prompt, "weight": 1.0}];
    if negative_prompt: text_prompts.append({"text": negative_prompt, "weight": -1.0});
    payload = {"text_prompts": text_prompts, "cfg_scale": 7, "height": 1024, "width": 1024, "samples": 1, "steps": 30};
    if style_preset and style_preset != "": payload["style_preset"] = style_preset;
    response = requests.post(url, headers=headers, json=payload, timeout=30);
    if not response.ok: raise HTTPException(status_code=response.status_code, detail=response.json())
    return response.json()["artifacts"][0]["base64"]

def stability_image_to_image(prompt: str, negative_prompt: str, init_image_bytes: bytes, strength: float):
    check_stability_key(); url = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image"; headers = {"Authorization": f"Bearer {STABILITY_API_KEY}", "Accept": "application/json"};
    text_prompts = [{"text": prompt, "weight": 1.0}, {"text": negative_prompt, "weight": -1.0} if negative_prompt else None]; text_prompts = [p for p in text_prompts if p is not None];
    files = {'init_image': init_image_bytes, 'text_prompts[0][text]': (None, text_prompts[0]['text']), 'text_prompts[1][text]': (None, text_prompts[1]['text']) if len(text_prompts) > 1 else None, 'text_prompts[1][weight]': (None, str(text_prompts[1]['weight'])) if len(text_prompts) > 1 else None, 'image_strength': (None, str(strength)), 'cfg_scale': (None, '7.0'), 'samples': (None, '1'), 'steps': (None, '30')}; files = {k: v for k, v in files.items() if v is not None};
    response = requests.post(url, headers=headers, files=files, timeout=30);
    if not response.ok: raise HTTPException(status_code=response.status_code, detail=response.json())
    return response.json()["artifacts"][0]["base64"]

def stability_upscale_image(init_image_bytes: bytes):
    check_stability_key(); url = "https://api.stability.ai/v1/generation/esrgan-v1-x2plus/image-to-image/upscale"; headers = {"Authorization": f"Bearer {STABILITY_API_KEY}", "Accept": "application/json"}; files = { 'image': init_image_bytes }; response = requests.post(url, headers=headers, files=files, timeout=30);
    if not response.ok: raise HTTPException(status_code=response.status_code, detail=response.json())
    return response.json()["artifacts"][0]["base64"]


# --- API 1: TẠO VĂN BẢN (DÙNG GROQ) ---
@router.post("/generate-text")
async def generate_text(input_data: TextGenerateInput):
    system_prompt = "Bạn là trợ lý Marketing chuyên nghiệp tại Việt Nam. Hãy viết nội dung sáng tạo, hấp dẫn bằng tiếng Việt."
    user_prompt = f"Yêu cầu: {input_data.task_type}. {input_data.prompt}"
    
    print("[Content] Gọi Groq (Llama 3.1)...")
    generated_text = query_groq_text(system_prompt, user_prompt)
    return {"status": "success", "generated_text": generated_text}


# --- API 2, 3, 4: HÌNH ẢNH (Dịch bằng Groq -> Vẽ bằng Stability) ---
@router.post("/generate-text-to-image")
def generate_text_to_image(input_data: ImageFromTextInput):
    try:
        en_prompt = translate_prompt_to_english(input_data.prompt)
        img = stability_text_to_image(en_prompt, input_data.negative_prompt, input_data.style_preset)
        return {"status": "success", "image_base64": img}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-image-to-image")
def generate_image_to_image(input_data: ImageFromImageInput):
    try:
        en_prompt = translate_prompt_to_english(input_data.prompt)
        img_bytes = io.BytesIO(base64.b64decode(input_data.init_image_base64.split(',')[-1]))
        img = stability_image_to_image(en_prompt, input_data.negative_prompt, img_bytes, input_data.strength)
        return {"status": "success", "image_base64": img}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.post("/upscale-image")
def upscale_image(input_data: ImageUpscaleInput):
    try:
        img_bytes = io.BytesIO(base64.b64decode(input_data.init_image_base64.split(',')[-1]))
        img = stability_upscale_image(img_bytes)
        return {"status": "success", "image_base64": img}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))