import { screen } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import BlogPost from "../../src/pages/BlogPost";
import { useBlogPost } from "../../src/hooks/useApi";

vi.mock("../../src/hooks/useApi", () => ({
  useBlogPost: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useParams: vi.fn(() => ({ slug: "test-post" })),
  };
});

describe("BlogPost", () => {
  it("shows loading spinner", () => {
    vi.mocked(useBlogPost).mockReturnValue({
      isLoading: true,
      data: undefined,
      error: null,
    } as any);

    const { container } = renderWithProviders(<BlogPost />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders post content via MarkdownRenderer", () => {
    vi.mocked(useBlogPost).mockReturnValue({
      isLoading: false,
      data: {
        id: "1",
        slug: "test-post",
        title: "My Test Post",
        excerpt: "An excerpt",
        content: "# Hello World\n\nThis is the **content**.",
        tags: ["testing"],
        published: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        published_at: "2024-01-15T00:00:00Z",
        showcase_item_id: null,
      },
      error: null,
    } as any);

    renderWithProviders(<BlogPost />);

    expect(screen.getByText("My Test Post")).toBeInTheDocument();
    expect(screen.getByText("testing")).toBeInTheDocument();
  });

  it("shows error on invalid slug", () => {
    vi.mocked(useBlogPost).mockReturnValue({
      isLoading: false,
      data: undefined,
      error: { message: "Not found" },
    } as any);

    renderWithProviders(<BlogPost />);

    expect(screen.getByText("Post Not Found")).toBeInTheDocument();
  });
});
