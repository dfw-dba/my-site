import { Route, Routes } from "react-router";
import MainLayout from "../layouts/MainLayout";
import Resume from "../pages/Resume";
import ProtectedRoute from "../components/admin/ProtectedRoute";
import AdminLayout from "../pages/admin/AdminLayout";
import Dashboard from "../pages/admin/Dashboard";
import ResumeEditor from "../pages/admin/ResumeEditor";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Resume />} />
      </Route>

      <Route path="admin" element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="resume" element={<ResumeEditor />} />
        </Route>
      </Route>
    </Routes>
  );
}
