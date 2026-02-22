import { screen } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import PersonalLife from "../../src/pages/PersonalLife";
import { useAlbums } from "../../src/hooks/useApi";

vi.mock("../../src/hooks/useApi", () => ({
  useAlbums: vi.fn(),
}));

describe("PersonalLife", () => {
  it("shows loading spinner", () => {
    vi.mocked(useAlbums).mockReturnValue({
      isLoading: true,
      data: undefined,
      error: null,
    } as any);

    const { container } = renderWithProviders(<PersonalLife />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders album cards with media counts", () => {
    vi.mocked(useAlbums).mockReturnValue({
      isLoading: false,
      data: [
        {
          id: "1",
          slug: "vacation",
          title: "Vacation Photos",
          description: "Summer trip",
          category: "travel",
          cover_image: null,
          media_count: 5,
          sort_order: 0,
        },
        {
          id: "2",
          slug: "family",
          title: "Family Album",
          description: null,
          category: "family",
          cover_image: null,
          media_count: 12,
          sort_order: 1,
        },
      ],
      error: null,
    } as any);

    renderWithProviders(<PersonalLife />);

    expect(screen.getByText("Vacation Photos")).toBeInTheDocument();
    expect(screen.getByText("Family Album")).toBeInTheDocument();
    expect(screen.getByText("5 items")).toBeInTheDocument();
    expect(screen.getByText("12 items")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    vi.mocked(useAlbums).mockReturnValue({
      isLoading: false,
      data: [],
      error: null,
    } as any);

    renderWithProviders(<PersonalLife />);

    expect(screen.getByText("No albums yet.")).toBeInTheDocument();
  });
});
