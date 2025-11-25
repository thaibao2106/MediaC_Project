import {
  Article as ArticleIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  HelpOutline as HelpOutlineIcon,
  Send as SendIcon,
  Tag as TagIcon,
  UploadFile as UploadFileIcon,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Skeleton,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import axios from "axios";
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import Papa from "papaparse";
import { useState } from "react";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const API_BASE_URL = "http://localhost:8000/analytics";

function AnalyticsModule() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [url, setUrl] = useState("");
  const [inputType, setInputType] = useState("text");

  const [sentimentData, setSentimentData] = useState(null);
  const [sentimentCounts, setSentimentCounts] = useState(null);
  const [topicData, setTopicData] = useState([]);
  const [articles, setArticles] = useState([]);
  const [clusterResults, setClusterResults] = useState(null);
  const [numClusters, setNumClusters] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // State cho Reader View (Đọc báo bên phải)
  const [readingArticle, setReadingArticle] = useState(null); // Bài báo đang đọc
  const [isReadingLoading, setIsReadingLoading] = useState(false); // Loading riêng cho khung đọc
  const [selectedUrl, setSelectedUrl] = useState(""); // URL đang chọn để highlight

  const handleInputTypeChange = (e, n) => {
    if (n) {
      setInputType(n);
      setError(null);
      setArticles([]);
      setClusterResults(null);
      setReadingArticle(null);
    }
  };
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFileName(f.name);
      setIsLoading(true);
      Papa.parse(f, {
        complete: (r) => {
          setText(
            r.data
              .slice(1)
              .map((x) => x[0])
              .filter((y) => y && y.trim())
              .join("\n")
          );
          setIsLoading(false);
        },
        error: () => {
          alert("Lỗi CSV");
          setIsLoading(false);
        },
      });
    }
  };

  const processResults = (sent, top, arts = [], clust = null) => {
    const pos = sent.filter((r) => r.label === "Tích cực").length;
    const neg = sent.filter((r) => r.label === "Tiêu cực").length;
    setSentimentCounts({
      positive: pos,
      negative: neg,
      neutral: sent.length - pos - neg,
      total: sent.length,
    });
    setSentimentData({
      labels: ["Tích cực", "Tiêu cực", "Trung lập"],
      datasets: [
        {
          data: [pos, neg, sent.length - pos - neg],
          backgroundColor: ["#2e7d32", "#d32f2f", "#ffc107"],
          borderColor: "#fff",
          borderWidth: 1,
        },
      ],
    });
    setTopicData(top);
    setArticles(arts);
    setClusterResults(clust);
  };

  // Hàm click vào bài báo để đọc
  const handleArticleClick = async (article) => {
    setSelectedUrl(article.url);
    setReadingArticle(null); // Reset khung đọc
    setIsReadingLoading(true);

    try {
      // Gọi API /analyze-url để cào nội dung chi tiết
      const res = await axios.post(`${API_BASE_URL}/url`, { url: article.url });
      if (res.data.status === "success") {
        setReadingArticle({
          title: article.title,
          content: res.data.content, // Nội dung chi tiết từ Selenium/BS4
          url: article.url,
          sentiment: res.data.sentiments[0], // Cảm xúc của bài này
        });
      } else {
        setReadingArticle({
          title: "Lỗi",
          content: res.data.message || "Không thể tải nội dung bài báo.",
        });
      }
    } catch (err) {
      setReadingArticle({
        title: "Lỗi",
        content: "Không thể kết nối để tải bài báo.",
      });
    } finally {
      setIsReadingLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setSentimentData(null);
    setTopicData([]);
    setSentimentCounts(null);
    setArticles([]);
    setClusterResults(null);
    setReadingArticle(null);
    try {
      if (inputType === "news") {
        if (!keyword.trim()) {
          setError("Nhập từ khóa.");
          setIsLoading(false);
          return;
        }
        const res = await axios.post(`${API_BASE_URL}/news`, {
          keyword,
          limit: 40,
        });
        if (res.data.status === "success")
          processResults(
            res.data.sentiments,
            res.data.topics,
            res.data.articles
          );
        else setError(res.data.message);
      } else if (inputType === "url") {
        if (!url.trim()) {
          setError("Nhập URL.");
          setIsLoading(false);
          return;
        }
        const res = await axios.post(`${API_BASE_URL}/url`, { url });
        if (res.data.status === "success") {
          processResults(res.data.sentiments, res.data.topics);
          // Tự động hiển thị nội dung bên phải luôn
          setReadingArticle({
            title: "Nội dung từ URL",
            content: res.data.content,
            sentiment: res.data.sentiments[0],
          });
        } else setError(res.data.message);
      } else {
        const lines = text.split("\n").filter((l) => l.trim());
        if (!lines.length) {
          setError("Không có dữ liệu.");
          setIsLoading(false);
          return;
        }
        const [res1, res2, res3] = await Promise.all([
          axios.post(`${API_BASE_URL}/sentiment`, { texts: lines }),
          axios.post(`${API_BASE_URL}/topics`, { texts: lines }),
          axios.post(`${API_BASE_URL}/cluster`, {
            texts: lines,
            num_clusters: numClusters,
          }),
        ]);
        if (res1.data.status === "success")
          processResults(
            res1.data.results,
            res2.data.topics,
            [],
            res3.data.clusters
          );
        else setError("Lỗi phân tích.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi không xác định.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPercentage = (c, t) =>
    t === 0 ? "0%" : `${((c / t) * 100).toFixed(1)}%`;
  const isAnalyzeDisabled = () =>
    isLoading ||
    (inputType === "news"
      ? !keyword.trim()
      : inputType === "url"
      ? !url.trim()
      : !text.trim());
  const getSentimentIcon = (label) => {
    if (label === "Tích cực")
      return <CheckCircleIcon color="success" sx={{ fontSize: "1.2rem" }} />;
    if (label === "Tiêu cực")
      return <CancelIcon color="error" sx={{ fontSize: "1.2rem" }} />;
    return <HelpOutlineIcon color="warning" sx={{ fontSize: "1.2rem" }} />;
  };

  return (
    <Box sx={{ mt: 3 }}>
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* CỘT 1: INPUT (Giữ nguyên) */}
        <Grid item xs={12} md={3}>
          <Paper
            sx={{
              p: 3,
              display: "flex",
              flexDirection: "column",
              height: "calc(100vh - 120px)",
            }}
          >
            <Typography variant="h5" component="h2" gutterBottom>
              {" "}
              Dữ liệu đầu vào{" "}
            </Typography>
            <ToggleButtonGroup
              color="primary"
              value={inputType}
              exclusive
              onChange={handleInputTypeChange}
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value="text">Văn bản</ToggleButton>
              <ToggleButton value="file">CSV</ToggleButton>
              <ToggleButton value="news">Tin tức</ToggleButton>
              <ToggleButton value="url">URL</ToggleButton>
            </ToggleButtonGroup>
            {inputType === "text" && (
              <TextField
                id="text-input"
                label="Dán bình luận"
                multiline
                rows={10}
                variant="outlined"
                fullWidth
                value={text}
                onChange={(e) => setText(e.target.value)}
                sx={{ flexGrow: 1 }}
              />
            )}
            {inputType === "file" && (
              <Box sx={{ flexGrow: 1, minHeight: 280 }}>
                {" "}
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={<UploadFileIcon />}
                  sx={{ py: 2, mb: 1 }}
                >
                  {" "}
                  Chọn CSV{" "}
                  <input
                    type="file"
                    hidden
                    accept=".csv"
                    onChange={handleFileChange}
                  />{" "}
                </Button>{" "}
                <Typography variant="body2">
                  {fileName || "Chưa chọn file."}
                </Typography>{" "}
              </Box>
            )}
            {inputType === "news" && (
              <Box sx={{ flexGrow: 1, minHeight: 280 }}>
                {" "}
                <TextField
                  label="Nhập từ khóa (VD: Lạm phát)"
                  variant="outlined"
                  fullWidth
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />{" "}
              </Box>
            )}
            {inputType === "url" && (
              <Box sx={{ flexGrow: 1, minHeight: 280 }}>
                {" "}
                <TextField
                  label="Dán URL bài báo"
                  variant="outlined"
                  fullWidth
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />{" "}
              </Box>
            )}
            {(inputType === "text" || inputType === "file") && (
              <Box sx={{ mt: 2, px: 1 }}>
                {" "}
                <Typography variant="caption">Số cụm:</Typography>{" "}
                <Slider
                  value={numClusters}
                  onChange={(e, val) => setNumClusters(val)}
                  step={1}
                  min={2}
                  max={8}
                  valueLabelDisplay="auto"
                />{" "}
              </Box>
            )}
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              onClick={handleAnalyze}
              disabled={isAnalyzeDisabled()}
              sx={{ mt: "auto", py: 1.5 }}
            >
              {" "}
              Phân tích{" "}
            </Button>
          </Paper>
        </Grid>

        {/* CỘT 2 + 3: KẾT QUẢ */}
        <Grid item xs={12} md={9}>
          <Grid container spacing={3}>
            {/* Hàng 1: Sentiment & Topic (Giữ nguyên) */}
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  Phân tích Cảm xúc
                </Typography>
                {sentimentData ? (
                  <Box
                    sx={{
                      height: "60%",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Pie
                      data={sentimentData}
                      options={{ maintainAspectRatio: false }}
                    />
                  </Box>
                ) : (
                  <Typography color="textSecondary" align="center">
                    Chưa có dữ liệu
                  </Typography>
                )}
                <Divider sx={{ my: 1 }} />
                {sentimentCounts && (
                  <Box sx={{ mt: 1, textAlign: "center" }}>
                    <Chip
                      label={`Tích cực: ${getPercentage(
                        sentimentCounts.positive,
                        sentimentCounts.total
                      )}`}
                      color="success"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={`Tiêu cực: ${getPercentage(
                        sentimentCounts.negative,
                        sentimentCounts.total
                      )}`}
                      color="error"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={`Trung lập: ${getPercentage(
                        sentimentCounts.neutral,
                        sentimentCounts.total
                      )}`}
                      color="warning"
                    />
                  </Box>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2, height: 400, overflowY: "auto" }}>
                <Typography variant="h6" gutterBottom>
                  Chủ đề & Gom cụm
                </Typography>
                {topicData.length > 0 ? (
                  <List dense>
                    {topicData.map((t, i) => (
                      <ListItem key={i}>
                        <ListItemIcon>
                          <TagIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={t.text} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="textSecondary" align="center">
                    Chưa có dữ liệu
                  </Typography>
                )}
                {clusterResults &&
                  Object.entries(clusterResults).map(([k, v]) => (
                    <Accordion key={k}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight="bold">{k}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {v.map((w, i) => (
                            <Chip key={i} label={w} size="small" />
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
              </Paper>
            </Grid>

            {/* HÀNG 2: KHU VỰC ĐỌC BÁO (MỚI) */}
            {(articles.length > 0 || readingArticle) && (
              <Grid item xs={12}>
                <Grid container spacing={2} sx={{ height: 600 }}>
                  {" "}
                  {/* Chiều cao cố định cho khu vực này */}
                  {/* DANH SÁCH BÀI BÁO (BÊN TRÁI - 40%) */}
                  {inputType === "news" && (
                    <Grid item xs={12} md={4} sx={{ height: "100%" }}>
                      <Paper
                        sx={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <Box sx={{ p: 2, borderBottom: "1px solid #eee" }}>
                          <Typography variant="h6">
                            Danh sách bài ({articles.length})
                          </Typography>
                        </Box>
                        <List sx={{ overflowY: "auto", flexGrow: 1 }}>
                          {articles.map((article, index) => (
                            <ListItemButton
                              key={index}
                              divider
                              selected={selectedUrl === article.url}
                              onClick={() => handleArticleClick(article)}
                              alignItems="flex-start"
                            >
                              <ListItemIcon sx={{ minWidth: 30, mt: 0.5 }}>
                                {getSentimentIcon(article.sentiment_label)}
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Typography variant="body2" fontWeight="bold">
                                    {article.title}
                                  </Typography>
                                }
                                secondary={
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {article.description}
                                  </Typography>
                                }
                              />
                            </ListItemButton>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                  )}
                  {/* KHUNG ĐỌC (BÊN PHẢI - 60% HOẶC 100% NẾU LÀ URL MODE) */}
                  <Grid
                    item
                    xs={12}
                    md={inputType === "news" ? 8 : 12}
                    sx={{ height: "100%" }}
                  >
                    <Paper
                      sx={{
                        height: "100%",
                        p: 3,
                        overflowY: "auto",
                        bgcolor: "#f9f9f9",
                      }}
                    >
                      {isReadingLoading ? (
                        <Box sx={{ width: "100%" }}>
                          <Skeleton height={40} width="80%" />
                          <Skeleton height={20} width="40%" sx={{ mb: 2 }} />
                          <Skeleton count={5} />
                          <Skeleton count={5} />
                        </Box>
                      ) : readingArticle ? (
                        <>
                          <Chip
                            icon={getSentimentIcon(
                              readingArticle.sentiment?.label || "Trung lập"
                            )}
                            label={`Đánh giá AI: ${
                              readingArticle.sentiment?.label || "Chưa rõ"
                            } (${
                              readingArticle.sentiment?.score
                                ? (
                                    readingArticle.sentiment.score * 100
                                  ).toFixed(1)
                                : 0
                            }%)`}
                            sx={{ mb: 2 }}
                            variant="outlined"
                          />
                          <Typography
                            variant="h5"
                            gutterBottom
                            sx={{ fontWeight: "bold", color: "#2c3e50" }}
                          >
                            {readingArticle.title}
                          </Typography>
                          <Link
                            href={readingArticle.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              mb: 3,
                              display: "block",
                              fontSize: "0.85rem",
                            }}
                          >
                            Xem bài gốc tại đây
                          </Link>
                          <Typography
                            variant="body1"
                            sx={{
                              whiteSpace: "pre-line",
                              lineHeight: 1.8,
                              fontSize: "1.1rem",
                              color: "#333",
                            }}
                          >
                            {readingArticle.content}
                          </Typography>
                        </>
                      ) : (
                        <Box
                          sx={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: 0.6,
                          }}
                        >
                          <ArticleIcon sx={{ fontSize: 60, mb: 2 }} />
                          <Typography variant="h6">
                            Chọn một bài báo để đọc chi tiết
                          </Typography>
                          <Typography variant="body2">
                            Nội dung sẽ được AI tổng hợp và phân tích tại đây.
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AnalyticsModule;
