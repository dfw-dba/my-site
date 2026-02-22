import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../setup";
import PhotoGallery from "../../src/components/PhotoGallery";
import type { MediaItem } from "../../src/types";

function makeMediaItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "1",
    s3_key: "photos/test.jpg",
    filename: "test-photo.jpg",
    content_type: "image/jpeg",
    size_bytes: 1024,
    width: 800,
    height: 600,
    caption: null,
    sort_order: 0,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("PhotoGallery", () => {
  it("renders media items in grid", () => {
    const items = [
      makeMediaItem({ id: "1", filename: "photo1.jpg" }),
      makeMediaItem({ id: "2", filename: "photo2.jpg" }),
      makeMediaItem({ id: "3", filename: "photo3.jpg" }),
    ];

    renderWithProviders(<PhotoGallery items={items} />);

    expect(screen.getByText("photo1.jpg")).toBeInTheDocument();
    expect(screen.getByText("photo2.jpg")).toBeInTheDocument();
    expect(screen.getByText("photo3.jpg")).toBeInTheDocument();
  });

  it("shows empty message when no items", () => {
    renderWithProviders(<PhotoGallery items={[]} />);

    expect(screen.getByText("No media items in this album yet.")).toBeInTheDocument();
  });

  it("opens lightbox on click", () => {
    const items = [
      makeMediaItem({ id: "1", filename: "photo1.jpg" }),
      makeMediaItem({ id: "2", filename: "photo2.jpg" }),
    ];

    renderWithProviders(<PhotoGallery items={items} />);

    // Click the first item button
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    // Lightbox should appear with role="dialog"
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Close lightbox")).toBeInTheDocument();
  });
});
