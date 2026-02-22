import { Outlet } from "react-router";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4">
        <h1 className="text-xl font-semibold">Admin Panel</h1>
      </header>
      <div className="p-6">
        <Outlet />
      </div>
    </div>
  );
}
