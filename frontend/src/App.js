import AssessmentIcon from "@mui/icons-material/Assessment";
import CreateIcon from "@mui/icons-material/Create";
import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";
import React, { useState } from "react";

// Import các module (tab)
import AnalyticsModule from "./AnalyticsModule"; // Module Phân tích

// === Component Tab Panel (Hàm trợ giúp) ===
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

// === Component Module 2 (Placeholder) ===
function ContentStudioModule() {
  return (
    <Box sx={{ p: 3, mt: 3 }}>
      <Typography variant="h4">Module 1: AI Content Studio</Typography>
      <Typography>
        Đây là nơi đặt giao diện cho tính năng tạo nội dung (viết blog,
        slogan...).
      </Typography>
    </Box>
  );
}

// === APP CHÍNH ===
function App() {
  const [currentTab, setCurrentTab] = useState(0); // Tab 0 là Analytics

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <React.Fragment>
      <CssBaseline />
      <AppBar position="static">
        {/* === THAY ĐỔI 1: DÙNG maxWidth={false} ĐỂ CONTAINER RỘNG 100% === */}
        <Container maxWidth={false} sx={{ px: 3 }}>
          <Toolbar disableGutters>
            <Typography
              variant="h6"
              noWrap
              component="a"
              href="#/"
              sx={{
                mr: 2,
                display: { xs: "none", md: "flex" },
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: ".1rem",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              AI SO HARD - Media.C
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={currentTab}
                onChange={handleTabChange}
                textColor="inherit"
                indicatorColor="secondary"
              >
                <Tab
                  label="Phân tích & Xu hướng"
                  icon={<AssessmentIcon />}
                  iconPosition="start"
                />
                <Tab
                  label="Sáng tạo Nội dung"
                  icon={<CreateIcon />}
                  iconPosition="start"
                />
              </Tabs>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* === THAY ĐỔI 2: DÙNG maxWidth={false} CHO NỘI DUNG TAB === */}
      <Container maxWidth={false} sx={{ px: 3 }}>
        {/* Panel cho Tab 0 (Phân tích) */}
        <TabPanel value={currentTab} index={0}>
          <AnalyticsModule />
        </TabPanel>

        {/* Panel cho Tab 1 (Sáng tạo) */}
        <TabPanel value={currentTab} index={1}>
          <ContentStudioModule />
        </TabPanel>
      </Container>
    </React.Fragment>
  );
}

export default App;
