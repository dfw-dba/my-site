import { screen } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import BlogCard from "../../src/components/BlogCard";
import type { BlogPostListItem } from "../../src/types";

function makePost(overrides: Partial<BlogPostListItem> = {}): BlogPostListItem {
  return {
    id: "1",
    slug: "test-post",
    title: "Test Blog Post",
    excerpt: "This is a test excerpt",
    tags: ["react", "testing"],
    created_at: "2024-01-15T00:00:00Z",
    published_at: "2024-01-20T00:00:00Z",
    ...overrides,
  };
}

describe("BlogCard", () => {
  it("renders title, excerpt, date, tags", () => {
    renderWithProviders(<BlogCard post={makePost()} />);

    expect(screen.getByText("Test Blog Post")).toBeInTheDocument();
    expect(screen.getByText("This is a test excerpt")).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("testing")).toBeInTheDocument();
    // Verify the date renders via the <time> element (exact text depends on timezone)
    const timeEl = screen.getByRole("link").querySelector("time");
    expect(timeEl).toHaveAttribute("datetime", "2024-01-20T00:00:00Z");
    expect(timeEl).toHaveTextContent(/January/);
    expect(timeEl).toHaveTextContent(/2024/);
  });

  it("links to correct blog post URL", () => {
    renderWithProviders(<BlogCard post={makePost({ slug: "my-slug" })} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/showcase/blog/my-slug");
  });

  it("handles missing excerpt gracefully", () => {
    renderWithProviders(<BlogCard post={makePost({ excerpt: null })} />);

    expect(screen.getByText("Test Blog Post")).toBeInTheDocument();
    expect(screen.queryByText("This is a test excerpt")).not.toBeInTheDocument();
  });
});
