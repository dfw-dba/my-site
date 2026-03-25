import { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router";
import { useAuthContext } from "../../contexts/AuthContext";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4", end: true },
  { to: "/admin/resume", label: "Resume", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  const location = useLocation();
  const { logout } = useAuthContext();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("admin-sidebar-collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("admin-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const sidebarContent = (
    <aside
      className={`flex flex-col bg-gray-900 text-gray-300 h-full transition-all duration-200 ${collapsed ? "w-16" : "w-56"}`}
    >
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-700">
        {!collapsed && <span className="text-sm font-semibold text-white">Admin</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white hidden md:block"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7M19 19l-7-7 7-7"} />
          </svg>
        </button>
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white md:hidden"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 mx-1 rounded transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
            </svg>
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-700 p-3 space-y-2">
        <Link
          to="/"
          className="flex items-center gap-3 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {!collapsed && <span>Back to Site</span>}
        </Link>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full text-red-400 hover:text-red-300 text-sm transition-colors"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block h-full">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-56">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
