import { Outlet } from "react-router";
import { useAuthContext } from "../../contexts/AuthContext";
import Login from "../../pages/admin/Login";

export default function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuthContext();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Outlet />;
}
