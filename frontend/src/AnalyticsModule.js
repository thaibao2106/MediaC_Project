// frontend/src/AnalyticsModule.js
import axios from "axios";
import Papa from "papaparse";
import { useState } from "react";
import { Pie } from "react-chartjs-2";

import {
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  HelpOutline as HelpOutlineIcon,
  Link as LinkIcon,
  Newspaper as NewspaperIcon,
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
  ListItemIcon,
  ListItemText,
  Tooltip as MuiTooltip,
  Paper,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);

const API_BASE_URL = "http://localhost:8000/analytics";

// === HÀM HELPER XỬ LÝ LỖI (ĐỂ SỬA LỖI MÀN HÌNH ĐỎ) ===
const getErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    // Lỗi từ FastAPI (HTTPException)
    return error.response.data.detail;
  }
  if (error.response?.data?.message) {
    // Lỗi 4xx/5xx từ API (ví dụ: NewsAPI)
    return error.response.data.message;
  }
  if (error.message) {
    // Lỗi JS (Network error, etc.)
    return error.message;
  }
  return "Lỗi không xác định.";
};

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

  const handleInputTypeChange = (event, newType) => {
    if (newType !== null) {
      setInputType(newType);
      setError(null);
      setArticles([]);
      setClusterResults(null);
    }
  };
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setIsLoading(true);
    Papa.parse(file, {
      complete: (res) => {
        const c = res.data
          .slice(1)
          .map((r) => r[0])
          .filter((t) => t && t.trim());
        setText(c.join("\n"));
        setIsLoading(false);
      },
      error: (err) => {
        alert("Lỗi CSV");
        setIsLoading(false);
      },
    });
  };

  // Hàm xử lý kết quả
  const processResults = (
    sentiments,
    topics,
    fetchedArticles = [],
    fetchedClusters = null
  ) => {
    const positive = sentiments.filter((r) => r.label === "Tích cực").length;
    const negative = sentiments.filter((r) => r.label === "Tiêu cực").length;
    const neutral = sentiments.length - positive - negative;
    setSentimentCounts({
      positive,
      negative,
      neutral,
      total: sentiments.length,
    });
    setSentimentData({
      labels: ["Tích cực", "Tiêu cực", "Trung lập"],
      datasets: [
        {
          data: [positive, negative, neutral],
          backgroundColor: ["#2e7d32", "#d32f2f", "#ffc107"],
          borderColor: "#fff",
          borderWidth: 1,
        },
      ],
    });
    setTopicData(topics);
    setArticles(fetchedArticles);
    setClusterResults(fetchedClusters);
  };

  // Hàm Phân tích chính
  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setSentimentData(null);
    setTopicData([]);
    setSentimentCounts(null);
    setArticles([]);
    setClusterResults(null);
    try {
      if (inputType === "news") {
        if (!keyword.trim()) {
          setError("Nhập từ khóa.");
          setIsLoading(false);
          return;
        }
        const response = await axios.post(`${API_BASE_URL}/news`, {
          keyword: keyword,
          limit: 40,
        });
        if (response.data.status === "success") {
          if (response.data.message) setError(response.data.message); // Hiển thị thông báo (ví dụ: không tìm thấy)
          processResults(
            response.data.sentiments,
            response.data.topics,
            response.data.articles
          );
        } else {
          setError(response.data.message);
        }
      } else if (inputType === "url") {
        if (!url.trim()) {
          setError("Nhập URL.");
          setIsLoading(false);
          return;
        }
        try {
          new URL(url);
        } catch (_) {
          setError("URL không hợp lệ.");
          setIsLoading(false);
          return;
        }
        const response = await axios.post(`${API_BASE_URL}/url`, { url: url });
        if (response.data.status === "success") {
          processResults(response.data.sentiments, response.data.topics);
        } else {
          setError(response.data.message);
        }
      } else {
        const lines = text.split("\n").filter((line) => line.trim() !== "");
        if (lines.length === 0) {
          setError("Không có dữ liệu.");
          setIsLoading(false);
          return;
        }
        const [sentimentRes, topicRes, clusterRes] = await Promise.all([
          axios.post(`${API_BASE_URL}/sentiment`, { texts: lines }),
          axios.post(`${API_BASE_URL}/topics`, { texts: lines }),
          axios.post(`${API_BASE_URL}/cluster`, {
            texts: lines,
            num_clusters: numClusters,
          }),
        ]);
        if (
          sentimentRes.data.status === "success" &&
          topicRes.data.status === "success" &&
          clusterRes.data.status === "success"
        ) {
          processResults(
            sentimentRes.data.results,
            topicRes.data.topics,
            [],
            clusterRes.data.clusters
          );
        } else {
          let errorMessages = [];
          if (sentimentRes.data.status !== "success")
            errorMessages.push(sentimentRes.data.message || "Lỗi Sentiment");
          if (topicRes.data.status !== "success")
            errorMessages.push(topicRes.data.message || "Lỗi Topic");
          if (clusterRes.data.status !== "success")
            errorMessages.push(clusterRes.data.message || "Lỗi Cluster");
          setError("Lỗi khi phân tích: " + errorMessages.join("; "));
        }
      }
    } catch (err) {
      // <-- SỬA LỖI Ở ĐÂY
      console.error("Lỗi:", err);
      setError(getErrorMessage(err)); // Dùng hàm helper
    } finally {
      setIsLoading(false);
    }
  };

  const getPercentage = (count, total) =>
    total === 0 ? "0%" : `${((count / total) * 100).toFixed(1)}%`;
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
        {/* === CỘT 1: NHẬP LIỆU (md={3}) === */}
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
                  Chọn file CSV{" "}
                  <input
                    type="file"
                    hidden
                    accept=".csv"
                    onChange={handleFileChange}
                  />{" "}
                </Button>{" "}
                <Typography variant="body2" color="textSecondary">
                  {fileName || "Chưa chọn tệp."}
                </Typography>{" "}
                <Typography variant="caption" color="textSecondary">
                  *Đọc cột đầu tiên.
                </Typography>{" "}
              </Box>
            )}
            {inputType === "news" && (
              <Box sx={{ flexGrow: 1, minHeight: 280 }}>
                {" "}
                <TextField
                  id="keyword-input"
                  label="Nhập chủ đề/từ khóa"
                  placeholder="Ví dụ: Lạm phát..."
                  variant="outlined"
                  fullWidth
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <NewspaperIcon sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                />{" "}
              </Box>
            )}
            {inputType === "url" && (
              <Box sx={{ flexGrow: 1, minHeight: 280 }}>
                {" "}
                <TextField
                  id="url-input"
                  label="Dán URL bài báo"
                  placeholder="https://..."
                  variant="outlined"
                  fullWidth
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <LinkIcon sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                />{" "}
              </Box>
            )}
            {(inputType === "text" || inputType === "file") && (
              <Box sx={{ mt: 2, px: 1 }}>
                {" "}
                <Typography gutterBottom variant="caption">
                  Số nhóm (Cluster):
                </Typography>{" "}
                <Slider
                  value={numClusters}
                  onChange={(e, val) => setNumClusters(val)}
                  step={1}
                  marks
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
              sx={{ mt: "auto", py: 1.5, fontSize: "1.1rem" }}
            >
              {" "}
              Phân tích{" "}
            </Button>
          </Paper>
        </Grid>

        {/* === CỘT 2: PHÂN TÍCH CẢM XÚC (md={4}) === */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              height: "calc(100vh - 120px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Phân tích Cảm xúc
            </Typography>
            {sentimentData ? (
              <Box
                sx={{
                  height: "50%",
                  display: "flex",
                  justifyContent: "center",
                  mb: 1,
                }}
              >
                <Pie
                  data={sentimentData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  height: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography color="textSecondary">Chưa có dữ liệu</Typography>
              </Box>
            )}
            <Divider sx={{ mb: 1 }} />
            {sentimentCounts ? (
              <List
                dense
                sx={{ height: "calc(50% - 25px)", overflowY: "auto" }}
              >
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Tích cực"
                    secondary={`${sentimentCounts.positive}/${sentimentCounts.total} bình luận`}
                    primaryTypographyProps={{
                      fontSize: "1.1rem",
                      fontWeight: "500",
                    }}
                  />
                  <Typography variant="h6" color="success.main">
                    {getPercentage(
                      sentimentCounts.positive,
                      sentimentCounts.total
                    )}
                  </Typography>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CancelIcon color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Tiêu cực"
                    secondary={`${sentimentCounts.negative}/${sentimentCounts.total} bình luận`}
                    primaryTypographyProps={{
                      fontSize: "1.1rem",
                      fontWeight: "500",
                    }}
                  />
                  <Typography variant="h6" color="error.main">
                    {getPercentage(
                      sentimentCounts.negative,
                      sentimentCounts.total
                    )}
                  </Typography>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <HelpOutlineIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Trung lập"
                    secondary={`${sentimentCounts.neutral}/${sentimentCounts.total} bình luận`}
                    primaryTypographyProps={{
                      fontSize: "1.1rem",
                      fontWeight: "500",
                    }}
                  />
                  <Typography variant="h6" color="warning.main">
                    {getPercentage(
                      sentimentCounts.neutral,
                      sentimentCounts.total
                    )}
                  </Typography>
                </ListItem>
              </List>
            ) : (
              <Box
                sx={{
                  height: "calc(50% - 25px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography color="textSecondary"></Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* === CỘT 3: CHỦ ĐỀ & GOM CỤM (md={5}) === */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: "calc(50vh - 66px)", mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Chủ đề Nổi bật (Cụm từ)
            </Typography>
            {topicData.length > 0 ? (
              <Box sx={{ height: "calc(100% - 40px)", overflowY: "auto" }}>
                <List dense>
                  {topicData.map((topic, index) => (
                    <ListItem key={index} sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <TagIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={topic.text} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ) : (
              <Box
                sx={{
                  height: "calc(100% - 40px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography color="textSecondary">Chưa có dữ liệu</Typography>
              </Box>
            )}
          </Paper>
          {clusterResults && (
            <Paper sx={{ p: 2, height: "calc(50vh - 66px)" }}>
              <Typography variant="h6" gutterBottom>
                Gom cụm Khán giả (K-Means)
              </Typography>
              <Box sx={{ height: "calc(100% - 40px)", overflowY: "auto" }}>
                {Object.entries(clusterResults).map(([clusterName, words]) => (
                  <Accordion key={clusterName}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography sx={{ fontWeight: "bold" }}>
                        {clusterName}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails
                      sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                    >
                      {words.map((word, idx) => (
                        <Chip key={idx} label={word} size="small" />
                      ))}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </Paper>
          )}
        </Grid>

        {/* === HÀNG 2 (NẾU CÓ): DANH SÁCH BÀI BÁO === */}
        {articles.length > 0 && inputType === "news" && (
          <Grid item xs={12}>
            {" "}
            <Paper sx={{ p: 2, mt: clusterResults ? 0 : -3 }}>
              {" "}
              <Typography variant="h6" gutterBottom>
                Bài báo ({articles.length})
              </Typography>
              <List sx={{ maxHeight: 400, overflow: "auto" }}>
                {articles.map((article, index) => (
                  <ListItem key={index} divider alignItems="flex-start">
                    <ListItemIcon sx={{ minWidth: 35, mt: 0.5 }}>
                      {" "}
                      <MuiTooltip
                        title={`Cảm xúc: ${article.sentiment_label} (${(
                          article.sentiment_score * 100
                        ).toFixed(1)}%)`}
                        placement="top"
                      >
                        {" "}
                        {getSentimentIcon(article.sentiment_label)}{" "}
                      </MuiTooltip>{" "}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          component="span"
                          sx={{ fontWeight: "bold" }}
                        >
                          {" "}
                          {article.title || "-"}{" "}
                        </Typography>
                      }
                      secondary={
                        <>
                          {" "}
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                            sx={{ display: "block" }}
                          >
                            {" "}
                            {article.description || "-"}{" "}
                          </Typography>{" "}
                          <Link
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="caption"
                            underline="hover"
                          >
                            {" "}
                            {article.url}{" "}
                          </Link>{" "}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>{" "}
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default AnalyticsModule;
