import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/AdminDashboard";
import CandidateDashboard from "./pages/CandidateDashboard";
import CreateSession from "./pages/CreateSession";
import InterviewLanding from "./pages/InterviewLanding";
import InterviewRoom from "./pages/InterviewRoom";
import SessionReport from "./pages/SessionReport";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/create"
            element={
              <ProtectedRoute requiredRole="admin">
                <CreateSession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/report/:sessionId"
            element={
              <ProtectedRoute requiredRole="admin">
                <SessionReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate"
            element={
              <ProtectedRoute requiredRole="candidate">
                <CandidateDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/interview/:sessionId" element={<InterviewLanding />} />
          <Route path="/interview/:sessionId/start" element={<InterviewRoom />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}