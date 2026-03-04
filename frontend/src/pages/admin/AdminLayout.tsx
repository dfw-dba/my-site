import { useState } from "react";
import { Outlet } from "react-router";
import AdminSidebar from "../../components/admin/AdminSidebar";
import ToastContainer from "../../components/admin/Toast";

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-800">
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header with hamburger */}
        <div className="sticky top-0 z-30 flex items-center gap-3 bg-gray-800 border-b border-gray-700 px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white">Admin</span>
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
