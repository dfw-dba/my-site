import { screen } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import Resume from "../../src/pages/Resume";
import { useResume } from "../../src/hooks/useApi";

vi.mock("../../src/hooks/useApi", () => ({
  useResume: vi.fn(),
}));

describe("Resume", () => {
  it("shows loading spinner initially", () => {
    vi.mocked(useResume).mockReturnValue({
      isLoading: true,
      data: undefined,
      isError: false,
      error: null,
    } as any);

    const { container } = renderWithProviders(<Resume />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders resume sections when data loads", () => {
    vi.mocked(useResume).mockReturnValue({
      isLoading: false,
      data: {
        sections: [
          { section_type: "summary", content: { text: "A summary", headline: "My Headline" } },
        ],
        entries: {
          work: [
            {
              id: "1",
              entry_type: "work",
              title: "Software Engineer",
              organization: "Acme",
              location: null,
              start_date: "2023-01-01",
              end_date: null,
              description: null,
              highlights: [],
              technologies: [],
              sort_order: 0,
            },
          ],
        },
      },
      isError: false,
      error: null,
    } as any);

    renderWithProviders(<Resume />);

    expect(screen.getByText("Resume")).toBeInTheDocument();
    expect(screen.getByText("Professional Timeline")).toBeInTheDocument();
  });

  it("shows error message on fetch failure", () => {
    vi.mocked(useResume).mockReturnValue({
      isLoading: false,
      data: undefined,
      isError: true,
      error: { message: "Network error" },
    } as any);

    renderWithProviders(<Resume />);

    expect(screen.getByText("Failed to load resume data.")).toBeInTheDocument();
  });
});
