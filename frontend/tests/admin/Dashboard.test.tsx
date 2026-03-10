import { screen } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import Dashboard from "../../src/pages/admin/Dashboard";

describe("Dashboard", () => {
  it("renders the dashboard heading", () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("shows under construction message", () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Under Construction")).toBeInTheDocument();
  });
});
