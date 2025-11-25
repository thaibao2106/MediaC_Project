// frontend/src/ContentStudioModule.js
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import HighQualityIcon from "@mui/icons-material/HighQuality";
import ImageSearchIcon from "@mui/icons-material/ImageSearch";
import PhotoFilterIcon from "@mui/icons-material/PhotoFilter";
import {
  Alert,
  Box,
  Button,
  Collapse,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useState } from "react";

const API_BASE_URL = "http://localhost:8000/content";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}
const getErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.message) {
    return error.message;
  }
  return "Lỗi không xác định.";
};

// === Module 1.1: TẠO VĂN BẢN (Dùng Hugging Face) ===
function TextGenerator() {
  const [taskType, setTaskType] = useState("Slogan");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResult("");
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/generate-text`, {
        prompt,
        task_type: taskType,
      });
      if (response.data.status === "success") {
        setResult(response.data.generated_text.replace(/\n/g, "<br />"));
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <Paper
          sx={{
            p: 3,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Yêu cầu (Prompt)
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Loại nội dung</InputLabel>
            <Select
              value={taskType}
              label="Loại nội dung"
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
            label="Nhập yêu cầu chi tiết"
            placeholder="Ví dụ: Viết 5 slogan cho..."
            multiline
            rows={10}
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
            sx={{ mt: 2, py: 1.5 }}
          >
            {" "}
            Tạo nội dung (Hugging Face){" "}
          </Button>
        </Paper>
      </Grid>
      <Grid item xs={12} md={7}>
        <Paper sx={{ p: 3, height: "100%" }}>
          <Typography variant="h6" gutterBottom>
            Kết quả (AI Miễn phí)
          </Typography>
          {isLoading && <LinearProgress sx={{ mb: 2 }} />}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              height: "calc(100% - 60px)",
              overflowY: "auto",
              background: "#f9f9f9",
              whiteSpace: "pre-wrap",
            }}
            dangerouslySetInnerHTML={{
              __html: result || "Kết quả sẽ xuất hiện ở đây...",
            }}
          />
        </Paper>
      </Grid>
    </Grid>
  );
}

// === Module 1.2: XỬ LÝ HÌNH ẢNH (Giữ nguyên UI) ===
function ImageStudio() {
  const [mode, setMode] = useState("txt2img");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [stylePreset, setStylePreset] = useState("");
  const [openNegative, setOpenNegative] = useState(false);
  const [initImage, setInitImage] = useState(null);
  const [imageStrength, setImageStrength] = useState(0.7);
  const [resultImage, setResultImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleModeChange = (e, newMode) => {
    if (newMode) setMode(newMode);
  };
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInitImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && mode !== "upscale") {
      setError("Cần nhập Prompt.");
      return;
    }
    if (!initImage && (mode === "img2img" || mode === "upscale")) {
      setError("Cần tải Ảnh gốc.");
      return;
    }
    setIsLoading(true);
    setResultImage(null);
    setError(null);
    try {
      let response;
      const dataToSend = {
        prompt: prompt,
        negative_prompt: negativePrompt,
        style_preset: stylePreset,
      };
      if (mode === "txt2img")
        response = await axios.post(
          `${API_BASE_URL}/generate-text-to-image`,
          dataToSend
        );
      else if (mode === "img2img") {
        dataToSend.init_image_base64 = initImage;
        dataToSend.strength = imageStrength;
        response = await axios.post(
          `${API_BASE_URL}/generate-image-to-image`,
          dataToSend
        );
      } else
        response = await axios.post(`${API_BASE_URL}/upscale-image`, {
          init_image_base64: initImage,
        });

      if (response.data.status === "success")
        setResultImage(`data:image/png;base64,${response.data.image_base64}`);
      else setError(response.data.message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <Paper sx={{ p: 3, display: "flex", flexDirection: "column" }}>
          <Typography variant="h6" gutterBottom>
            Cấu hình & Prompt
          </Typography>
          <ToggleButtonGroup
            color="primary"
            value={mode}
            exclusive
            onChange={handleModeChange}
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="txt2img">
              <ImageSearchIcon sx={{ mr: 1 }} />
              Tạo ảnh mới
            </ToggleButton>
            <ToggleButton value="img2img">
              <PhotoFilterIcon sx={{ mr: 1 }} />
              Phục chế/Vẽ lại
            </ToggleButton>
            <ToggleButton value="upscale">
              <HighQualityIcon sx={{ mr: 1 }} />
              Làm nét (2x)
            </ToggleButton>
          </ToggleButtonGroup>
          {(mode === "img2img" || mode === "upscale") && (
            <Box sx={{ mb: 2 }}>
              {" "}
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<AddPhotoAlternateIcon />}
              >
                {" "}
                Tải ảnh gốc (ảnh cũ, mờ...){" "}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileChange}
                />{" "}
              </Button>{" "}
              {initImage && (
                <img
                  src={initImage}
                  alt="Preview"
                  style={{
                    width: "100%",
                    marginTop: 10,
                    borderRadius: 4,
                    maxHeight: 150,
                    objectFit: "cover",
                  }}
                />
              )}{" "}
            </Box>
          )}
          {mode !== "upscale" && (
            <>
              {" "}
              <TextField
                label="Mô tả hình ảnh (Prompt)"
                placeholder="Ví dụ: Một poster về cà phê Việt Nam..."
                multiline
                rows={3}
                fullWidth
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                sx={{ mb: 1 }}
              />{" "}
              <FormControl fullWidth sx={{ mb: 1 }}>
                {" "}
                <InputLabel>Phong cách</InputLabel>{" "}
                <Select
                  value={stylePreset}
                  label="Phong cách"
                  onChange={(e) => setStylePreset(e.target.value)}
                >
                  {" "}
                  <MenuItem value={""}>Không kiểu dáng (Base) ✅</MenuItem>{" "}
                  <MenuItem value={"photographic"}>Nhiếp ảnh</MenuItem>{" "}
                  <MenuItem value={"digital-art"}>
                    Nghệ thuật Kỹ thuật số
                  </MenuItem>{" "}
                  <MenuItem value={"cinematic"}>Điện ảnh</MenuItem>{" "}
                  <MenuItem value={"anime"}>Anime</MenuItem>{" "}
                </Select>{" "}
              </FormControl>{" "}
            </>
          )}
          {mode === "img2img" && (
            <Box sx={{ mb: 2 }}>
              {" "}
              <Typography gutterBottom variant="caption">
                Độ mạnh (Strength): {Math.round(imageStrength * 100)}%
              </Typography>{" "}
              <Slider
                value={imageStrength}
                onChange={(e, val) => setImageStrength(val)}
                step={0.01}
                min={0.1}
                max={0.9}
              />{" "}
              <Alert severity="info" sx={{ mb: 2 }}>
                *Dùng Strength **cao** (0.6-0.8) cho Phục chế và Tô màu ảnh cũ.
              </Alert>{" "}
            </Box>
          )}
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
            {" "}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 1,
                cursor: "pointer",
              }}
              onClick={() => setOpenNegative(!openNegative)}
            >
              {" "}
              <Typography variant="caption" fontWeight="bold">
                Yêu cầu Phủ định (Negative Prompt)
              </Typography>{" "}
              <IconButton size="small">
                {" "}
                {openNegative ? <ExpandLess /> : <ExpandMore />}{" "}
              </IconButton>{" "}
            </Box>{" "}
            <Collapse in={openNegative} timeout="auto" unmountOnExit>
              {" "}
              <TextField
                label="Những gì KHÔNG muốn thấy"
                placeholder="Ví dụ: Chinese characters, ugly..."
                fullWidth
                multiline
                rows={2}
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  p: 1,
                  pt: 0,
                  "& .MuiOutlinedInput-root": { fieldset: { border: "none" } },
                }}
              />{" "}
            </Collapse>{" "}
          </Box>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={isLoading}
            sx={{ mt: 2, py: 1.5 }}
          >
            {" "}
            {mode === "txt2img"
              ? "Tạo Poster/Hình ảnh"
              : mode === "img2img"
              ? "Phục chế & Vẽ lại"
              : "Làm nét ảnh"}{" "}
          </Button>
        </Paper>
      </Grid>
      <Grid item xs={12} md={7}>
        <Paper sx={{ p: 3, height: "100%", minHeight: 500 }}>
          <Typography variant="h6" gutterBottom>
            Kết quả
          </Typography>
          {isLoading && <LinearProgress sx={{ mb: 2 }} />}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "calc(100% - 60px)",
              background: "#f9f9f9",
              borderRadius: 1,
            }}
          >
            {" "}
            {resultImage ? (
              <img
                src={resultImage}
                alt="AI generated"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <Typography color="textSecondary">
                Hình ảnh sẽ xuất hiện ở đây...
              </Typography>
            )}{" "}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}

function ContentStudioModule() {
  const [currentTab, setCurrentTab] = useState(0);
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  return (
    <Box sx={{ mt: 3, width: "100%" }}>
      {" "}
      <Paper>
        {" "}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          {" "}
          <Tabs value={currentTab} onChange={handleTabChange} centered>
            {" "}
            <Tab
              label="Viết Nội dung"
              icon={<AutoFixHighIcon />}
              iconPosition="start"
            />{" "}
            <Tab
              label="Xử lý Hình ảnh & Thiết kế"
              icon={<DesignServicesIcon />}
              iconPosition="start"
            />{" "}
          </Tabs>{" "}
        </Box>{" "}
        <TabPanel value={currentTab} index={0}>
          {" "}
          <TextGenerator />{" "}
        </TabPanel>{" "}
        <TabPanel value={currentTab} index={1}>
          {" "}
          <ImageStudio />{" "}
        </TabPanel>{" "}
      </Paper>{" "}
    </Box>
  );
}

export default ContentStudioModule;
