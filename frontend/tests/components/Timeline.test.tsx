import { screen } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import Timeline from "../../src/components/Timeline";
import type { ProfessionalEntry } from "../../src/types";

function makeEntry(overrides: Partial<ProfessionalEntry> = {}): ProfessionalEntry {
  return {
    id: "1",
    entry_type: "work",
    title: "Software Engineer",
    organization: "Acme Corp",
    location: "Remote",
    start_date: "2023-01-01",
    end_date: "2024-01-01",
    description: null,
    highlights: [],
    technologies: [],
    sort_order: 0,
    performance_reviews: [],
    ...overrides,
  };
}

describe("Timeline", () => {
  it("renders entries sorted by sort_order ascending", () => {
    const entries = {
      work: [
        makeEntry({ id: "1", title: "Second Job", sort_order: 2, start_date: "2024-01-01" }),
        makeEntry({ id: "2", title: "First Job", sort_order: 1, start_date: "2020-01-01" }),
      ],
    };

    renderWithProviders(<Timeline entries={entries} />);

    // Each card renders twice (mobile + desktop), so get all h3s and check order
    const titles = screen.getAllByRole("heading", { level: 3 });
    // First pair should be First Job (lower sort_order), second pair Second Job
    expect(titles[0]).toHaveTextContent("First Job");
    expect(titles[2]).toHaveTextContent("Second Job");
  });

  it("shows correct color-coded badges per entry type", () => {
    const entries = {
      work: [makeEntry({ id: "1", entry_type: "work", title: "Work Entry" })],
      education: [
        makeEntry({ id: "2", entry_type: "education", title: "Education Entry", organization: "University" }),
      ],
    };

    renderWithProviders(<Timeline entries={entries} />);

    // Each badge renders twice (mobile + desktop), so use getAllByText
    expect(screen.getAllByText("work").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("education").length).toBeGreaterThanOrEqual(1);
  });

  it("displays empty message when no entries", () => {
    renderWithProviders(<Timeline entries={{}} />);

    expect(screen.getByText("No timeline entries to display.")).toBeInTheDocument();
  });

  it("formats date ranges correctly with Present for null end_date", () => {
    const entries = {
      work: [
        makeEntry({ id: "1", end_date: null, start_date: "2023-06-01" }),
      ],
    };

    renderWithProviders(<Timeline entries={entries} />);

    // Each date range renders twice (mobile + desktop)
    expect(screen.getAllByText(/Present/).length).toBeGreaterThanOrEqual(1);
  });
});
