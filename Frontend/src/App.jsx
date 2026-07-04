import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import RoomPage from "./pages/RoomPage";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Room page — also protected */}
        <Route
          path="/room/:shareLink"
          element={
            <ProtectedRoute>
              <RoomPage />
            </ProtectedRoute>
          }
        />
      </Routes>

      <Toaster
        position="top-right"
        offset={16}
        gap={8}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "w-[340px] bg-zinc-900/95 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 shadow-lg shadow-black/20",
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
