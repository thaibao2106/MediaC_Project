import csv
import random

print("Đang tạo file dataset...")

# --- Định nghĩa 4 chủ đề (Clusters) ---

# Chủ đề 1: Khen Chất lượng (Tích cực)
theme_1_templates = [
    "Sản phẩm {adj}, {aspect} rất {adj}. Sẽ ủng hộ shop.",
    "Rất {adj} với {aspect} của sản phẩm. {adj} lắm.",
    "Shop làm việc {adj}, {aspect} cẩn thận. Cho 5 sao.",
    "Hàng {adj}, {aspect} đúng như mong đợi. Rất {adj}.",
]
theme_1_adj = ["tuyệt vời", "tốt", "đẹp", "ưng ý", "hài lòng"]
theme_1_aspect = ["chất lượng", "đóng gói", "ngoại hình"]

# Chủ đề 2: Phàn nàn Giao hàng (Tiêu cực)
theme_2_templates = [
    "Quá thất vọng. {shipping} rất {adj}. {shipping} quá {adj}.",
    "{shipper} có thái độ {adj}. Làm {aspect} của tôi.",
    "Sẽ không bao giờ quay lại vì {shipping} quá {adj}.",
    "Chờ đợi {shipping} {adj}, {aspect} hết cả.",
]
theme_2_shipping = ["Giao hàng", "Vận chuyển", "Shipper"]
theme_2_adj = ["chậm", "lâu", "tệ", "kém", "khó chịu"]
theme_2_shipper = ["Người giao hàng", "Anh shipper"]
theme_2_aspect = ["hộp bị móp", "hàng bị vỡ"]

# Chủ đề 3: Phàn nàn Chất lượng (Tiêu cực)
theme_3_templates = [
    "Sản phẩm {adj}, {aspect}. Quá {adj}.",
    "Hoàn toàn {adj} với {aspect}. Không {aspect} shop đăng.",
    "{aspect} làm tôi rất {adj}. Sẽ không mua lại.",
    "Đây chắc chắn là {aspect}. {adj}!",
]
theme_3_adj = ["tệ", "kém", "thất vọng", "bực mình"]
theme_3_aspect = ["chất lượng kém", "hàng giả", "không giống mô tả", "sai màu", "bị hỏng"]

# Chủ đề 4: Trung lập/Hỗn hợp (Trung lập)
theme_4_templates = [
    "Với {price} này thì {quality}.",
    "Sản phẩm {quality}, {price} thì {adv_price}.",
    "{price} cũng {adv_price}, {quality}.",
    "Nói chung là {quality}. {price} {adv_price}.",
]
theme_4_price = ["giá tiền", "mức giá", "giá cả"]
theme_4_quality = ["cũng được", "tạm ổn", "bình thường", "chấp nhận được"]
theme_4_adv_price = ["hơi cao", "hợp lý", "khá đắt", "ổn"]


# --- Bắt đầu tạo file CSV ---
filename = 'test_dataset_1000.csv'
header = ['BinhLuan'] # Tên cột (để khớp với logic slice(1) của papaparse)
data = []

total_rows = 1000
weights = [0.30, 0.30, 0.20, 0.20] # 30% Theme1, 30% Theme2, 20% Theme3, 20% Theme4

for i in range(total_rows):
    # Chọn ngẫu nhiên 1 chủ đề (có trọng số)
    theme = random.choices([1, 2, 3, 4], weights=weights, k=1)[0]
    comment = ""

    if theme == 1:
        comment = random.choice(theme_1_templates).format(
            adj=random.choice(theme_1_adj),
            aspect=random.choice(theme_1_aspect)
        )
    elif theme == 2:
        comment = random.choice(theme_2_templates).format(
            shipping=random.choice(theme_2_shipping),
            adj=random.choice(theme_2_adj),
            shipper=random.choice(theme_2_shipper),
            aspect=random.choice(theme_2_aspect)
        )
    elif theme == 3:
        comment = random.choice(theme_3_templates).format(
            adj=random.choice(theme_3_adj),
            aspect=random.choice(theme_3_aspect)
        )
    elif theme == 4:
        comment = random.choice(theme_4_templates).format(
            price=random.choice(theme_4_price),
            quality=random.choice(theme_4_quality),
            adv_price=random.choice(theme_4_adv_price)
        )
    
    data.append([comment])

# Ghi file CSV
# Dùng 'utf-8-sig' để Excel (Windows) đọc tiếng Việt không bị lỗi font
with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(data)

print(f"Đã tạo thành công file '{filename}' với {total_rows} dòng!")
