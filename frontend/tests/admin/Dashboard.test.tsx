import { screen } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import Dashboard from "../../src/pages/admin/Dashboard";
import { useAdminBlogPosts, useAdminShowcaseItems, useAdminAlbums } from "../../src/hooks/useAdminApi";

vi.mock("../../src/hooks/useAdminApi", () => ({
  useAdminBlogPosts: vi.fn(),
  useAdminShowcaseItems: vi.fn(),
  useAdminAlbums: vi.fn(),
}));

describe("Dashboard", () => {
  beforeEach(() => {
    vi.mocked(useAdminBlogPosts).mockReturnValue({
      isLoading: false,
      data: {
        posts: [
          { id: "1", slug: "a", title: "Published Post", published: true, tags: [], created_at: "", updated_at: "" },
          { id: "2", slug: "b", title: "Draft One", published: false, tags: [], created_at: "", updated_at: "" },
          { id: "3", slug: "c", title: "Draft Two", published: false, tags: [], created_at: "", updated_at: "" },
        ],
        total: 3,
        limit: 50,
        offset: 0,
      },
    } as any);
    vi.mocked(useAdminShowcaseItems).mockReturnValue({
      isLoading: false,
      data: [{ id: "1" }, { id: "2" }, { id: "3" }],
    } as any);
    vi.mocked(useAdminAlbums).mockReturnValue({
      isLoading: false,
      data: [{ id: "1" }],
    } as any);
  });

  it("renders the dashboard heading", () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("shows blog group with published and draft counts", () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Blog")).toBeInTheDocument();
    expect(screen.getByText("Posts")).toBeInTheDocument();
    expect(screen.getByText("Drafts")).toBeInTheDocument();
    // 1 published, 2 drafts
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });

  it("shows unpublished drafts section with links", () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Unpublished Drafts")).toBeInTheDocument();
    expect(screen.getByText("Draft One")).toBeInTheDocument();
    expect(screen.getByText("Draft Two")).toBeInTheDocument();
  });

  it("renders quick action links", () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("New Blog Post")).toBeInTheDocument();
    expect(screen.getByText("New Showcase Item")).toBeInTheDocument();
    expect(screen.getByText("Manage Media")).toBeInTheDocument();
  });

  it("shows loading state for stat cards", () => {
    vi.mocked(useAdminBlogPosts).mockReturnValue({
      isLoading: true,
      data: undefined,
    } as any);

    const { container } = renderWithProviders(<Dashboard />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("hides drafts section when no drafts exist", () => {
    vi.mocked(useAdminBlogPosts).mockReturnValue({
      isLoading: false,
      data: {
        posts: [
          { id: "1", slug: "a", title: "Published", published: true, tags: [], created_at: "", updated_at: "" },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      },
    } as any);

    renderWithProviders(<Dashboard />);
    expect(screen.queryByText("Unpublished Drafts")).not.toBeInTheDocument();
  });
});
