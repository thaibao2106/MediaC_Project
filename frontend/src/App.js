// frontend/src/App.js
import AssessmentIcon from "@mui/icons-material/Assessment";
import CreateIcon from "@mui/icons-material/Create";
import PsychologyIcon from "@mui/icons-material/Psychology";
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

// === IMPORT CÁC MODULE THẬT ===
import AnalyticsModule from "./AnalyticsModule"; // Module 3
import ContentStudioModule from "./ContentStudioModule"; // Module 1
import PersonalizationModule from "./PersonalizationModule"; // Module 2 (Mới)

// === Component Tab Panel ===
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {" "}
          {/* p: 0 để module tự quản lý padding */}
          {children}
        </Box>
      )}
    </div>
  );
}

// === APP CHÍNH ===
function App() {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <React.Fragment>
      <CssBaseline />
      <AppBar position="static">
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
                <Tab
                  label="Cá nhân hóa (AI)"
                  icon={<PsychologyIcon />}
                  iconPosition="start"
                />
              </Tabs>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth={false} sx={{ px: 3 }}>
        <TabPanel value={currentTab} index={0}>
          <AnalyticsModule />
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <ContentStudioModule />
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          <PersonalizationModule />
        </TabPanel>
      </Container>
    </React.Fragment>
  );
}

export default App;
