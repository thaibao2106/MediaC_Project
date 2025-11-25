// frontend/src/PersonalizationModule.js
import ArticleIcon from "@mui/icons-material/Article";
import HistoryIcon from "@mui/icons-material/History";
import LoginIcon from "@mui/icons-material/Login";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PersonIcon from "@mui/icons-material/Person";
import RecommendIcon from "@mui/icons-material/Recommend";
import {
  Alert,
  Avatar,
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
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:8000/personalization";

function PersonalizationModule() {
  // State User
  const [username, setUsername] = useState("demo_user");
  const [currentUser, setCurrentUser] = useState(null); // { id, username }

  // State Data
  const [articles, setArticles] = useState([]);
  const [history, setHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  // State UI
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [readingArticle, setReadingArticle] = useState(null);

  // 1. Khởi tạo: Tải danh sách bài báo
  useEffect(() => {
    fetchArticles();
  }, []);

  // 2. Khi đăng nhập thành công: Tải lịch sử và gợi ý
  useEffect(() => {
    if (currentUser) {
      fetchHistory();
      fetchRecommendations();
    }
  }, [currentUser]);

  // === CÁC HÀM GỌI API ===
  const handleLogin = async () => {
    if (!username.trim()) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/login`, { username });
      if (res.data.status === "success") {
        setCurrentUser({ id: res.data.user_id, username: res.data.username });
        setError(null);
      }
    } catch (err) {
      setError("Lỗi đăng nhập.");
    }
  };

  const fetchArticles = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/articles`);
      if (res.data.status === "success") setArticles(res.data.articles);
    } catch (err) {
      setError("Lỗi tải bài báo.");
    }
  };

  const fetchHistory = async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/history/${currentUser.id}`);
      if (res.data.status === "success") setHistory(res.data.history);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecommendations = async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/recommend/${currentUser.id}`
      );
      if (res.data.status === "success")
        setRecommendations(res.data.recommendations);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReadArticle = async (article) => {
    if (!currentUser) {
      setError(
        "Vui lòng nhập tên và đăng nhập trước để hệ thống ghi nhận sở thích!"
      );
      return;
    }

    // Mở dialog đọc
    setReadingArticle(article);
    setOpenDialog(true);

    // Gửi log lên server
    try {
      await axios.post(`${API_BASE_URL}/log_view`, {
        user_id: currentUser.id,
        article_id: article.id,
      });
      // Cập nhật lại giao diện ngay lập tức
      fetchHistory();
      fetchRecommendations();
    } catch (err) {
      console.error("Lỗi lưu lịch sử", err);
    }
  };

  // ... (Phần handleCloseDialog và ArticleCard giữ nguyên như cũ) ...
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setReadingArticle(null);
  };

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
            variant="subtitle1"
            sx={{ fontWeight: "bold", lineHeight: 1.2, mb: 1 }}
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
      {/* THANH ĐĂNG NHẬP */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 2,
          bgcolor: "#f5f5f5",
        }}
      >
        <Avatar sx={{ bgcolor: currentUser ? "primary.main" : "grey.500" }}>
          <PersonIcon />
        </Avatar>
        {currentUser ? (
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1">
              Xin chào, <b>{currentUser.username}</b>!
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {currentUser.id} • Hệ thống đang cá nhân hóa cho bạn.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flexGrow: 1, display: "flex", gap: 1 }}>
            <TextField
              size="small"
              label="Nhập tên người dùng"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ width: 300 }}
            />
            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={handleLogin}
            >
              Đăng nhập / Tạo mới
            </Button>
          </Box>
        )}
        {currentUser && (
          <Button
            color="error"
            onClick={() => {
              setCurrentUser(null);
              setHistory([]);
              setRecommendations([]);
            }}
          >
            Đăng xuất
          </Button>
        )}
      </Paper>

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
              height: "calc(100vh - 200px)",
              overflowY: "auto",
              bgcolor: "#fafafa",
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center" }}
            >
              <ArticleIcon sx={{ mr: 1 }} /> Kho Tin Tức
            </Typography>
            {articles.map((art) => (
              <ArticleCard
                key={art.id}
                article={art}
                onClick={handleReadArticle}
              />
            ))}
          </Paper>
        </Grid>

        {/* CỘT 2: AI ENGINE */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3} sx={{ height: "100%" }}>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{ p: 2, height: "calc(100vh - 200px)", overflowY: "auto" }}
              >
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <HistoryIcon sx={{ mr: 1 }} /> Lịch sử Đọc ({history.length})
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {history.length === 0 && (
                  <Typography
                    color="textSecondary"
                    align="center"
                    sx={{ mt: 5 }}
                  >
                    Chưa đọc bài nào.
                  </Typography>
                )}
                {history.map((art) => (
                  <ArticleCard
                    key={art.id}
                    article={art}
                    onClick={handleReadArticle}
                  />
                ))}
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 2,
                  height: "calc(100vh - 200px)",
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
                  <RecommendIcon sx={{ mr: 1 }} /> Gợi ý (AI)
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {recommendations.length === 0 && (
                  <Typography
                    color="textSecondary"
                    align="center"
                    sx={{ mt: 5 }}
                  >
                    Chưa đủ dữ liệu để gợi ý.
                  </Typography>
                )}
                {recommendations.map((art) => (
                  <ArticleCard
                    key={art.id}
                    article={art}
                    isRecommendation={true}
                    onClick={handleReadArticle}
                  />
                ))}
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* DIALOG ĐỌC BÁO (Giữ nguyên) */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {readingArticle && (
          <>
            <DialogTitle sx={{ fontWeight: "bold" }}>
              {readingArticle.title}
            </DialogTitle>
            <DialogContent dividers>
              <Typography
                variant="body1"
                sx={{ fontSize: "1.1rem", lineHeight: 1.8 }}
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
            <DialogActions>
              <Button
                startIcon={<OpenInNewIcon />}
                href={readingArticle.url}
                target="_blank"
              >
                Đọc bài gốc
              </Button>
              <Button onClick={handleCloseDialog} variant="contained">
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
