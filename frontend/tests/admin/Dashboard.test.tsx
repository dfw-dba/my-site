import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import Dashboard from "../../src/pages/admin/Dashboard";

describe("Dashboard", () => {
  it("renders the dashboard heading", () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders filter controls", () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("All Levels")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search messages or paths...")).toBeInTheDocument();
  });

  it("renders log table headers", () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText("Level")).toBeInTheDocument();
    expect(screen.getByText("Method")).toBeInTheDocument();
    expect(screen.getByText("Path")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("Message")).toBeInTheDocument();
  });

  it("renders purge button", () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Purge Old Logs")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
