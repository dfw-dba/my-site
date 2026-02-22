import { screen } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import Showcase from "../../src/pages/Showcase";
import { useShowcaseItems } from "../../src/hooks/useApi";

vi.mock("../../src/hooks/useApi", () => ({
  useShowcaseItems: vi.fn(),
}));

describe("Showcase", () => {
  it("shows loading spinner", () => {
    vi.mocked(useShowcaseItems).mockReturnValue({
      isLoading: true,
      data: undefined,
      error: null,
    } as any);

    const { container } = renderWithProviders(<Showcase />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders showcase cards", () => {
    vi.mocked(useShowcaseItems).mockReturnValue({
      isLoading: false,
      data: [
        {
          id: "1",
          slug: "project-one",
          title: "Project One",
          description: "Description 1",
          category: "web-development",
          technologies: ["React"],
          demo_url: null,
          repo_url: null,
          sort_order: 0,
        },
        {
          id: "2",
          slug: "project-two",
          title: "Project Two",
          description: "Description 2",
          category: "data-engineering",
          technologies: ["Python"],
          demo_url: null,
          repo_url: null,
          sort_order: 1,
        },
      ],
      error: null,
    } as any);

    renderWithProviders(<Showcase />);

    expect(screen.getByText("Project One")).toBeInTheDocument();
    expect(screen.getByText("Project Two")).toBeInTheDocument();
  });

  it("has navigation links to Blog and Data Engineering", () => {
    vi.mocked(useShowcaseItems).mockReturnValue({
      isLoading: false,
      data: [],
      error: null,
    } as any);

    renderWithProviders(<Showcase />);

    const blogLink = screen.getByRole("link", { name: "Blog" });
    const dataLink = screen.getByRole("link", { name: "Data Engineering" });

    expect(blogLink).toHaveAttribute("href", "/showcase/blog");
    expect(dataLink).toHaveAttribute("href", "/showcase/data");
  });
});
