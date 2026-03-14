import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import ConnectPage from "./pages/ConnectPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import DashboardPage from "./pages/DashboardPage";
import FAQPage from "./pages/FAQPage";
import ForumPage from "./pages/ForumPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import MentorshipPage from "./pages/MentorshipPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import QuestionsPage from "./pages/QuestionsPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from "./pages/ChatPage";
import UserProfilePage from "./pages/UserProfilePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/connect" element={<ConnectPage />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/questions" element={<QuestionsPage />} />
          <Route path="/mentorships" element={<MentorshipPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:peerId" element={<ChatPage />} />
          <Route path="/users/:id" element={<UserProfilePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
