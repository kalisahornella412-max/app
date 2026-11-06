import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "./lib/auth";
import { AudienceProvider } from "./lib/audience";
import Navbar from "./components/Navbar";
import AudienceBar from "./components/AudienceBar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import ProgramsPage from "./pages/ProgramsPage";
import ProgramDetailPage from "./pages/ProgramDetailPage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import EventsPage from "./pages/EventsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ResumeBuilderPage from "./pages/ResumeBuilderPage";
import AdminPage from "./pages/AdminPage";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <AudienceProvider>
          <BrowserRouter>
            <Navbar />
            <AudienceBar />
            <main>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/programs" element={<ProgramsPage />} />
                <Route path="/programs/:id" element={<ProgramDetailPage />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/jobs/:id" element={<JobDetailPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/resume" element={<ResumeBuilderPage />} />
                <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
              </Routes>
            </main>
            <Footer />
            <Toaster position="top-center" richColors closeButton />
          </BrowserRouter>
        </AudienceProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
