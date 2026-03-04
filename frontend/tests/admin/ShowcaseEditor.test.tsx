import { screen } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import ShowcaseEditor from "../../src/pages/admin/ShowcaseEditor";
import { useAdminShowcaseItems, useAdminDeleteShowcaseItem } from "../../src/hooks/useAdminApi";

vi.mock("../../src/hooks/useAdminApi", () => ({
  useAdminShowcaseItems: vi.fn(),
  useAdminDeleteShowcaseItem: vi.fn(),
}));

const mockDeleteMutation = { mutate: vi.fn(), isPending: false };

describe("ShowcaseEditor", () => {
  beforeEach(() => {
    vi.mocked(useAdminDeleteShowcaseItem).mockReturnValue(mockDeleteMutation as any);
  });

  it("shows loading state", () => {
    vi.mocked(useAdminShowcaseItems).mockReturnValue({
      isLoading: true,
      data: undefined,
    } as any);

    renderWithProviders(<ShowcaseEditor />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders showcase items table", () => {
    vi.mocked(useAdminShowcaseItems).mockReturnValue({
      isLoading: false,
      data: [
        {
          id: "1",
          slug: "my-project",
          title: "My Project",
          description: "A project",
          category: "web",
          technologies: ["react", "typescript"],
          demo_url: null,
          repo_url: null,
          sort_order: 0,
        },
      ],
    } as any);

    renderWithProviders(<ShowcaseEditor />);
    expect(screen.getAllByText("My Project").length).toBeGreaterThan(0);
    expect(screen.getAllByText("web").length).toBeGreaterThan(0);
    expect(screen.getAllByText("react").length).toBeGreaterThan(0);
  });

  it("shows empty state when no items", () => {
    vi.mocked(useAdminShowcaseItems).mockReturnValue({
      isLoading: false,
      data: [],
    } as any);

    renderWithProviders(<ShowcaseEditor />);
    expect(screen.getByText("No showcase items yet.")).toBeInTheDocument();
  });
});
