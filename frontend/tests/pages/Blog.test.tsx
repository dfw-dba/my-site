import { screen } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import Blog from "../../src/pages/Blog";
import { useBlogPosts } from "../../src/hooks/useApi";

vi.mock("../../src/hooks/useApi", () => ({
  useBlogPosts: vi.fn(),
}));

describe("Blog", () => {
  it("shows loading spinner", () => {
    vi.mocked(useBlogPosts).mockReturnValue({
      isLoading: true,
      data: undefined,
      error: null,
    } as any);

    const { container } = renderWithProviders(<Blog />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders blog cards when posts load", () => {
    vi.mocked(useBlogPosts).mockReturnValue({
      isLoading: false,
      data: {
        posts: [
          {
            id: "1",
            slug: "first-post",
            title: "First Post",
            excerpt: "Excerpt 1",
            tags: [],
            created_at: "2024-01-01T00:00:00Z",
            published_at: null,
          },
          {
            id: "2",
            slug: "second-post",
            title: "Second Post",
            excerpt: "Excerpt 2",
            tags: [],
            created_at: "2024-02-01T00:00:00Z",
            published_at: null,
          },
        ],
        total: 2,
        limit: 10,
        offset: 0,
      },
      error: null,
    } as any);

    renderWithProviders(<Blog />);

    expect(screen.getByText("First Post")).toBeInTheDocument();
    expect(screen.getByText("Second Post")).toBeInTheDocument();
  });

  it("shows empty state when no posts", () => {
    vi.mocked(useBlogPosts).mockReturnValue({
      isLoading: false,
      data: { posts: [], total: 0, limit: 10, offset: 0 },
      error: null,
    } as any);

    renderWithProviders(<Blog />);

    expect(screen.getByText("No posts yet. Check back soon!")).toBeInTheDocument();
  });
});
