import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AppProvider, useApp } from "./context/AppContext.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import HowItWorksPage from "./pages/HowItWorksPage.jsx";
import FeaturesPage from "./pages/FeaturesPage.jsx";
import AlgorithmPage from "./pages/AlgorithmPage.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import CategoryManager from "./pages/CategoryManager.jsx";
import JudgeInterface from "./pages/JudgeInterface.jsx";
import ResultsPage from "./pages/ResultsPage.jsx";
import EventList from "./pages/EventList.jsx";
import ManageEvent from "./pages/ManageEvent.jsx";
import JudgeDashboard from "./pages/JudgeDashboard.jsx";
import AdminResults from "./pages/AdminResults.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import TermsOfUse from "./pages/TermsOfUse.jsx";
import DataRetention from "./pages/DataRetention.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import TransparencyDashboard from "./pages/TransparencyDashboard.jsx";
import SkipLink from "./components/SkipLink.jsx";
import { Box, Typography, Button, CircularProgress, Alert } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

function LoadingScreen({ error, onRetry }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        gap: 3,
      }}
    >
      {error ? (
        <>
          <Alert severity="error" sx={{ mb: 2, maxWidth: 400 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            sx={{
              background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
              textTransform: "none",
              px: 4,
              py: 1.5,
              fontWeight: 600,
              borderRadius: "12px",
              "&:hover": {
                background: "linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)",
              },
            }}
          >
            Try Again
          </Button>
        </>
      ) : (
        <>
          <CircularProgress
            size={48}
            sx={{ color: "#7c3aed" }}
          />
          <Typography
            variant="body1"
            sx={{
              color: "#64748b",
              fontWeight: 500,
            }}
          >
            Loading JudgeFlow...
          </Typography>
        </>
      )}
    </Box>
  );
}

function AppContent() {
  const { user, loading, authError, retry } = useApp();

  if (loading) {
    return <LoadingScreen error={authError} onRetry={retry} />;
  }

  if (authError && !loading) {
    return <LoadingScreen error={authError} onRetry={retry} />;
  }

  return (
    <Router>
      <SkipLink targetId="main-content" />
      <main id="main-content" tabIndex="-1" style={{ outline: 'none' }}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/algorithm" element={<AlgorithmPage />} />
        
        {/* Legal pages */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />
        <Route path="/data-retention" element={<DataRetention />} />
        
        {/* Unauthorized page */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Auth routes */}
        <Route
          path="/login"
          element={user ? <Navigate to="/admin/events" /> : <Login />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/admin/events" /> : <Register />}
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <PrivateRoute role="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/events"
          element={
            <PrivateRoute role="admin">
              <EventList />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/event/:eventId"
          element={
            <PrivateRoute role="admin">
              <ManageEvent />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/event/:eventId/results"
          element={
            <PrivateRoute role="admin">
              <AdminResults />
            </PrivateRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <PrivateRoute role="admin">
              <CategoryManager />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PrivateRoute role="admin">
              <UserManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/event/:eventId/transparency"
          element={
            <PrivateRoute role="admin">
              <TransparencyDashboard />
            </PrivateRoute>
          }
        />

        <Route path="/judge-dashboard" element={<JudgeDashboard />} />

        {/* Judge route */}
        <Route
          path="/judge"
          element={
            <PrivateRoute role="judge">
              <JudgeInterface />
            </PrivateRoute>
          }
        />

        {/* Results - any logged-in user */}
        <Route
          path="/results"
          element={
            <PrivateRoute>
              <ResultsPage />
            </PrivateRoute>
          }
        />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </main>
    </Router>
  );
}

function App() {
  return (
    <AppProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AppProvider>
  );
}

export default App;
