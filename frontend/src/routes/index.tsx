import { Route, Routes } from "react-router";
import MainLayout from "../layouts/MainLayout";
import Resume from "../pages/Resume";
import PersonalLife from "../pages/PersonalLife";
import Album from "../pages/Album";
import Showcase from "../pages/Showcase";
import Blog from "../pages/Blog";
import BlogPost from "../pages/BlogPost";
import DataShowcase from "../pages/DataShowcase";
import AdminLayout from "../pages/admin/AdminLayout";
import Dashboard from "../pages/admin/Dashboard";
import BlogEditor from "../pages/admin/BlogEditor";
import ShowcaseEditor from "../pages/admin/ShowcaseEditor";
import ResumeEditor from "../pages/admin/ResumeEditor";
import MediaManager from "../pages/admin/MediaManager";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Resume />} />
        <Route path="personal" element={<PersonalLife />} />
        <Route path="personal/album/:slug" element={<Album />} />
        <Route path="showcase" element={<Showcase />} />
        <Route path="showcase/blog" element={<Blog />} />
        <Route path="showcase/blog/:slug" element={<BlogPost />} />
        <Route path="showcase/data" element={<DataShowcase />} />
      </Route>

      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="blog" element={<BlogEditor />} />
        <Route path="showcase" element={<ShowcaseEditor />} />
        <Route path="resume" element={<ResumeEditor />} />
        <Route path="media" element={<MediaManager />} />
      </Route>
    </Routes>
  );
}
