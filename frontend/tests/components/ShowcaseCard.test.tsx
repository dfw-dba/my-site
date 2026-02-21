import { screen } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import ShowcaseCard from "../../src/components/ShowcaseCard";
import type { ShowcaseItem } from "../../src/types";

function makeItem(overrides: Partial<ShowcaseItem> = {}): ShowcaseItem {
  return {
    id: "1",
    slug: "test-project",
    title: "Test Project",
    description: "A test project description",
    category: "web-development",
    technologies: ["React", "TypeScript"],
    demo_url: "https://demo.example.com",
    repo_url: "https://github.com/test/repo",
    sort_order: 0,
    ...overrides,
  };
}

describe("ShowcaseCard", () => {
  it("renders title, category badge, technologies", () => {
    renderWithProviders(<ShowcaseCard item={makeItem()} />);

    expect(screen.getByText("Test Project")).toBeInTheDocument();
    expect(screen.getByText("Web Development")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("shows demo and source buttons when URLs present", () => {
    renderWithProviders(<ShowcaseCard item={makeItem()} />);

    const demoLink = screen.getByText("Demo").closest("a");
    const sourceLink = screen.getByText("Source").closest("a");

    expect(demoLink).toHaveAttribute("href", "https://demo.example.com");
    expect(demoLink).toHaveAttribute("target", "_blank");
    expect(sourceLink).toHaveAttribute("href", "https://github.com/test/repo");
    expect(sourceLink).toHaveAttribute("target", "_blank");
  });

  it("hides buttons when URLs null", () => {
    renderWithProviders(
      <ShowcaseCard item={makeItem({ demo_url: null, repo_url: null })} />
    );

    expect(screen.queryByText("Demo")).not.toBeInTheDocument();
    expect(screen.queryByText("Source")).not.toBeInTheDocument();
  });
});
