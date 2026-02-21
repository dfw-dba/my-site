import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import HamburgerMenu from "../../src/components/HamburgerMenu";

describe("HamburgerMenu", () => {
  it("menu closed by default", () => {
    renderWithProviders(<HamburgerMenu />);

    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("-translate-x-full");
  });

  it("opens on hamburger button click", () => {
    renderWithProviders(<HamburgerMenu />);

    fireEvent.click(screen.getByLabelText("Open menu"));

    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("translate-x-0");
  });

  it("contains correct navigation links", () => {
    renderWithProviders(<HamburgerMenu />);

    fireEvent.click(screen.getByLabelText("Open menu"));

    expect(screen.getByText("Resume")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("Blog")).toBeInTheDocument();
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("All Projects")).toBeInTheDocument();
  });
});
