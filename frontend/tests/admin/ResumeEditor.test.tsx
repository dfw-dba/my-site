import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../setup";
import ResumeEditor from "../../src/pages/admin/ResumeEditor";
import {
  useAdminResume,
  useAdminUpsertResumeEntry,
  useAdminDeleteResumeEntry,
  useAdminUpsertResumeSection,
  useAdminUpsertPerformanceReview,
  useAdminDeletePerformanceReview,
} from "../../src/hooks/useAdminApi";

vi.mock("../../src/hooks/useAdminApi", () => ({
  useAdminResume: vi.fn(),
  useAdminUpsertResumeEntry: vi.fn(),
  useAdminDeleteResumeEntry: vi.fn(),
  useAdminUpsertResumeSection: vi.fn(),
  useAdminUpsertPerformanceReview: vi.fn(),
  useAdminDeletePerformanceReview: vi.fn(),
}));

const mockMutation = { mutate: vi.fn(), isPending: false };

describe("ResumeEditor", () => {
  beforeEach(() => {
    vi.mocked(useAdminUpsertResumeEntry).mockReturnValue(mockMutation as any);
    vi.mocked(useAdminDeleteResumeEntry).mockReturnValue(mockMutation as any);
    vi.mocked(useAdminUpsertResumeSection).mockReturnValue(mockMutation as any);
    vi.mocked(useAdminUpsertPerformanceReview).mockReturnValue(mockMutation as any);
    vi.mocked(useAdminDeletePerformanceReview).mockReturnValue(mockMutation as any);
  });

  it("shows loading state", () => {
    vi.mocked(useAdminResume).mockReturnValue({
      isLoading: true,
      data: undefined,
    } as any);

    renderWithProviders(<ResumeEditor />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders entries tab with professional entries", () => {
    vi.mocked(useAdminResume).mockReturnValue({
      isLoading: false,
      data: {
        sections: {},
        entries: {
          work: [
            {
              id: "1",
              entry_type: "work",
              title: "Senior Engineer",
              organization: "Acme Corp",
              location: "Remote",
              start_date: "2024-01-01",
              end_date: null,
              description: "Building things",
              highlights: [],
              technologies: [],
              sort_order: 0,
              performance_reviews: [],
            },
          ],
        },
      },
    } as any);

    renderWithProviders(<ResumeEditor />);
    expect(screen.getAllByText("Senior Engineer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Acme Corp").length).toBeGreaterThan(0);
  });

  it("switches to sections tab", async () => {
    vi.mocked(useAdminResume).mockReturnValue({
      isLoading: false,
      data: {
        sections: { summary: { text: "Hello world" } },
        entries: {},
      },
    } as any);

    renderWithProviders(<ResumeEditor />);
    await userEvent.click(screen.getByText("Sections"));
    expect(screen.getByText("summary")).toBeInTheDocument();
  });

  it("shows empty state for entries", () => {
    vi.mocked(useAdminResume).mockReturnValue({
      isLoading: false,
      data: { sections: {}, entries: {} },
    } as any);

    renderWithProviders(<ResumeEditor />);
    expect(screen.getByText("No professional entries yet.")).toBeInTheDocument();
  });
});
