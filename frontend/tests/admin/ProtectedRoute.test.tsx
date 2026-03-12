import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../../src/contexts/AuthContext";
import ProtectedRoute from "../../src/components/admin/ProtectedRoute";

function renderWithAuth(initialEntries: string[] = ["/admin"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="admin" element={<ProtectedRoute />}>
              <Route index element={<div>Admin Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("ProtectedRoute", () => {
  // When Cognito is not configured (no env vars), useAuth sets isAuthenticated=true
  // so ProtectedRoute renders the outlet directly
  test("renders child route when authenticated (no Cognito configured)", () => {
    renderWithAuth();
    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
  });

  test("does not show login form when authenticated", () => {
    renderWithAuth();
    expect(screen.queryByText("Admin Login")).not.toBeInTheDocument();
  });
});
