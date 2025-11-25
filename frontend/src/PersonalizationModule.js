// frontend/src/PersonalizationModule.js
import ArticleIcon from "@mui/icons-material/Article";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RecommendIcon from "@mui/icons-material/Recommend";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:8000/personalization";

function PersonalizationModule() {
  const [articles, setArticles] = useState([]); // Tất cả bài báo
  const [viewedIds, setViewedIds] = useState([]); // Lịch sử đã xem (IDs)
  const [recommendations, setRecommendations] = useState([]); // Gợi ý
  const [error, setError] = useState(null);

  // State cho việc Đọc bài (Dialog)
  const [openDialog, setOpenDialog] = useState(false);
  const [readingArticle, setReadingArticle] = useState(null);

  // Tải danh sách bài báo ban đầu
  useEffect(() => {
    fetchArticles();
  }, []);

  // Mỗi khi lịch sử thay đổi, gọi API gợi ý lại
  useEffect(() => {
    if (viewedIds.length > 0) {
      fetchRecommendations();
    }
  }, [viewedIds]);

  const fetchArticles = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/articles`);
      if (res.data.status === "success") setArticles(res.data.articles);
    } catch (err) {
      setError("Lỗi tải bài báo (Kiểm tra Backend/Database).");
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/recommend`, {
        viewed_article_ids: viewedIds,
      });
      if (res.data.status === "success")
        setRecommendations(res.data.recommendations);
    } catch (err) {
      console.error(err);
    }
  };

  // Xử lý khi click vào bài báo
  const handleReadArticle = (article) => {
    // 1. Mở cửa sổ đọc
    setReadingArticle(article);
    setOpenDialog(true);

    // 2. Thêm vào lịch sử (AI học)
    if (!viewedIds.includes(article.id)) {
      setViewedIds([...viewedIds, article.id]);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setReadingArticle(null);
  };

  // Component hiển thị 1 bài báo nhỏ
  const ArticleCard = ({ article, isRecommendation = false, onClick }) => (
    <Card
      sx={{
        mb: 2,
        border: isRecommendation ? "2px solid #1976d2" : "1px solid #eee",
        transition: "0.3s",
        "&:hover": { boxShadow: 3, transform: "translateY(-2px)" },
      }}
    >
      <CardActionArea onClick={() => onClick(article)}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Chip
              label={article.category || "Tin tức"}
              size="small"
              color={isRecommendation ? "primary" : "default"}
            />
            {isRecommendation && (
              <Chip
                label={`${Math.round(article.score * 100)}% Phù hợp`}
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Box>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontSize: "1.05rem",
              fontWeight: "bold",
              lineHeight: 1.3,
              mb: 0.5,
            }}
          >
            {article.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {article.content}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );

  return (
    <Box sx={{ mt: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* CỘT 1: KHO NỘI DUNG */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              height: "calc(100vh - 120px)",
              overflowY: "auto",
              bgcolor: "#fafafa",
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center" }}
            >
              <ArticleIcon sx={{ mr: 1 }} /> Kho Tin Tức (MySQL)
            </Typography>
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ mb: 2, display: "block" }}
            >
              Dữ liệu được lấy tự động từ Module Phân tích.
            </Typography>
            {articles.length === 0 && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Chưa có tin. Hãy qua Tab <b>Phân tích & Xu hướng</b> để tìm và
                nạp tin tức!
              </Typography>
            )}
            {articles.map((art) => (
              <ArticleCard
                key={art.id}
                article={art}
                onClick={handleReadArticle}
              />
            ))}
          </Paper>
        </Grid>

        {/* CỘT 2: AI ENGINE (LỊCH SỬ & GỢI Ý) */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3} sx={{ height: "100%" }}>
            {/* LỊCH SỬ ĐỌC */}
            <Grid item xs={12} md={6}>
              <Paper
                sx={{ p: 2, height: "calc(100vh - 120px)", overflowY: "auto" }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <HistoryIcon sx={{ mr: 1 }} /> Lịch sử Đọc ({viewedIds.length}
                  )
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {viewedIds.length === 0 ? (
                  <Typography
                    color="textSecondary"
                    align="center"
                    sx={{ mt: 10 }}
                  >
                    Bạn chưa đọc bài nào.
                  </Typography>
                ) : (
                  // Hiển thị ngược (bài mới đọc lên đầu)
                  [...viewedIds].reverse().map((id) => {
                    const art = articles.find((a) => a.id === id);
                    // Truyền hàm rỗng để click vào lịch sử không làm gì (hoặc có thể mở lại dialog nếu muốn)
                    return art ? (
                      <ArticleCard
                        key={id}
                        article={art}
                        onClick={handleReadArticle}
                      />
                    ) : null;
                  })
                )}
              </Paper>
            </Grid>

            {/* GỢI Ý TỪ AI */}
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 2,
                  height: "calc(100vh - 120px)",
                  overflowY: "auto",
                  bgcolor: "#e3f2fd",
                }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    color: "#1565c0",
                  }}
                >
                  <RecommendIcon sx={{ mr: 1 }} /> Gợi ý cho Bạn (AI)
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ mb: 2, display: "block", color: "#1565c0" }}
                >
                  Dựa trên phân tích nội dung (Content-Based Filtering).
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {viewedIds.length === 0 ? (
                  <Typography
                    color="textSecondary"
                    align="center"
                    sx={{ mt: 10 }}
                  >
                    Hãy đọc bài để AI học sở thích của bạn.
                  </Typography>
                ) : recommendations.length === 0 ? (
                  <Typography
                    color="textSecondary"
                    align="center"
                    sx={{ mt: 10 }}
                  >
                    Không còn bài nào phù hợp hơn trong kho.
                  </Typography>
                ) : (
                  recommendations.map((art) => (
                    <ArticleCard
                      key={art.id}
                      article={art}
                      isRecommendation={true}
                      onClick={handleReadArticle}
                    />
                  ))
                )}
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* === DIALOG ĐỌC BÁO === */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {readingArticle && (
          <>
            <DialogTitle sx={{ fontWeight: "bold", pr: 6 }}>
              {readingArticle.title}
            </DialogTitle>

            <DialogContent dividers>
              <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
                <Chip
                  label={readingArticle.category || "Tin tức"}
                  color="primary"
                  size="small"
                />
                {readingArticle.score && (
                  <Chip
                    label={`Độ phù hợp: ${Math.round(
                      readingArticle.score * 100
                    )}%`}
                    color="success"
                    size="small"
                  />
                )}
              </Box>

              <Typography
                variant="body1"
                sx={{
                  fontSize: "1.1rem",
                  lineHeight: 1.8,
                  whiteSpace: "pre-line",
                }}
              >
                {readingArticle.content}
              </Typography>

              {readingArticle.image_url && (
                <Box sx={{ mt: 3, textAlign: "center" }}>
                  <img
                    src={readingArticle.image_url}
                    alt="Ảnh bài báo"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 400,
                      borderRadius: 8,
                    }}
                  />
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
              <Button
                startIcon={<OpenInNewIcon />}
                href={readingArticle.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Đọc bài gốc
              </Button>
              <Button
                onClick={handleCloseDialog}
                variant="contained"
                startIcon={<CloseIcon />}
              >
                Đóng
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default PersonalizationModule;
