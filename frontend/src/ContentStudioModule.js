// frontend/src/ContentStudioModule.js
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useState } from "react";

// === SỬA API PATH: THÊM /content ===
const API_BASE_URL = "http://localhost:8000/content"; // <-- THAY ĐỔI Ở ĐÂY

function ContentStudioModule() {
  const [taskType, setTaskType] = useState("Slogan");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResult("");
    try {
      // === SỬA API PATH ===
      const response = await axios.post(`${API_BASE_URL}/generate`, {
        // <-- THAY ĐỔI Ở ĐÂY
        prompt: prompt,
        task_type: taskType,
      });
      if (response.data.status === "success") {
        const formattedText = response.data.generated_text.replace(
          /\n/g,
          "<br />"
        );
        setResult(formattedText);
      } else {
        setResult(
          `<span style="color: red;">Lỗi: ${response.data.message}</span>`
        );
      }
    } catch (error) {
      console.error("Lỗi khi tạo nội dung:", error);
      // Hiển thị lỗi chi tiết hơn từ server nếu có
      const errorMsg =
        error.response?.data?.detail || "Không thể kết nối đến máy chủ AI.";
      setResult(`<span style="color: red;">Lỗi: ${errorMsg}</span>`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      {/* ... (Code giao diện của Module 1 giữ nguyên) ... */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
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
              Yêu cầu Sáng tạo{" "}
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="task-type-label">Chọn loại nội dung</InputLabel>
              <Select
                labelId="task-type-label"
                value={taskType}
                label="Chọn loại nội dung"
                onChange={(e) => setTaskType(e.target.value)}
              >
                <MenuItem value={"Slogan"}>Slogan / Tiêu đề</MenuItem>
                <MenuItem value={"Blog Post"}>Bài Blog</MenuItem>
                <MenuItem value={"Email"}>Email Marketing</MenuItem>
                <MenuItem value={"Facebook Post"}>Bài đăng Facebook</MenuItem>
              </Select>
            </FormControl>
            <TextField
              id="prompt-input"
              label="Nhập yêu cầu của bạn"
              placeholder="Ví dụ: Viết 5 slogan cho quán cà phê..."
              multiline
              rows={15}
              variant="outlined"
              fullWidth
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="contained"
              endIcon={<AutoFixHighIcon />}
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              sx={{ mt: 2, py: 1.5, fontSize: "1.1rem" }}
            >
              {" "}
              Tạo nội dung{" "}
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: "calc(100vh - 120px)" }}>
            <Typography variant="h5" component="h2" gutterBottom>
              {" "}
              Kết quả từ AI{" "}
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                height: "calc(100% - 60px)",
                overflowY: "auto",
                background: "#f9f9f9",
                whiteSpace: "pre-wrap" /* Giữ định dạng xuống dòng */,
              }}
              dangerouslySetInnerHTML={{
                __html: result || "Kết quả sẽ xuất hiện ở đây...",
              }}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
export default ContentStudioModule;
