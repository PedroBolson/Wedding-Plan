// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login/Login";
import { ThemeProvider } from "./contexts/ThemeContext";
import MainPage from "./pages/MainPage/MainPage";
import PrivateRoute from "./routes/PrivateRoute";
import InvitePage from './pages/Invite/InvitePage';
import { LoadingProvider } from "./contexts/LoadingContext";


function App() {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/invite/:code" element={<InvitePage />} />
            <Route
              path="/main"
              element={
                <PrivateRoute>
                  <MainPage />
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;