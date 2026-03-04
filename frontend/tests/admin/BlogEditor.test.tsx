import { screen } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import BlogEditor from "../../src/pages/admin/BlogEditor";
import { useAdminBlogPosts, useAdminDeleteBlogPost } from "../../src/hooks/useAdminApi";

vi.mock("../../src/hooks/useAdminApi", () => ({
  useAdminBlogPosts: vi.fn(),
  useAdminDeleteBlogPost: vi.fn(),
}));

const mockDeleteMutation = { mutate: vi.fn(), isPending: false };

describe("BlogEditor", () => {
  beforeEach(() => {
    vi.mocked(useAdminDeleteBlogPost).mockReturnValue(mockDeleteMutation as any);
  });

  it("shows loading state", () => {
    vi.mocked(useAdminBlogPosts).mockReturnValue({
      isLoading: true,
      data: undefined,
    } as any);

    renderWithProviders(<BlogEditor />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders blog posts table", () => {
    vi.mocked(useAdminBlogPosts).mockReturnValue({
      isLoading: false,
      data: {
        posts: [
          {
            id: "1",
            slug: "test-post",
            title: "Test Post",
            excerpt: null,
            tags: ["react"],
            published: true,
            published_at: "2024-01-01T00:00:00Z",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      },
    } as any);

    renderWithProviders(<BlogEditor />);
    expect(screen.getAllByText("Test Post").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Published").length).toBeGreaterThan(0);
    expect(screen.getAllByText("react").length).toBeGreaterThan(0);
  });

  it("shows empty state when no posts", () => {
    vi.mocked(useAdminBlogPosts).mockReturnValue({
      isLoading: false,
      data: { posts: [], total: 0, limit: 50, offset: 0 },
    } as any);

    renderWithProviders(<BlogEditor />);
    expect(screen.getByText("No blog posts yet. Create your first post!")).toBeInTheDocument();
  });

  it("renders new post button", () => {
    vi.mocked(useAdminBlogPosts).mockReturnValue({
      isLoading: false,
      data: { posts: [], total: 0, limit: 50, offset: 0 },
    } as any);

    renderWithProviders(<BlogEditor />);
    expect(screen.getByText("New Post")).toBeInTheDocument();
  });
});
