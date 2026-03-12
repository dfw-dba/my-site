import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../setup";
import Login from "../../src/pages/admin/Login";
import { AuthProvider } from "../../src/contexts/AuthContext";

function renderLogin() {
  return renderWithProviders(
    <AuthProvider>
      <Login />
    </AuthProvider>
  );
}

describe("Login", () => {
  test("renders email and password fields", () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test("renders sign in button", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  test("renders admin login heading", () => {
    renderLogin();
    expect(screen.getByText("Admin Login")).toBeInTheDocument();
  });

  test("email field accepts input", async () => {
    const user = userEvent.setup();
    renderLogin();
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, "admin@example.com");
    expect(emailInput).toHaveValue("admin@example.com");
  });
});
