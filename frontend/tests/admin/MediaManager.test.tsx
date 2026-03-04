import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../setup";
import MediaManager from "../../src/pages/admin/MediaManager";
import {
  useAdminMediaList,
  useAdminUploadUrl,
  useAdminRegisterMedia,
  useAdminAlbums,
  useAdminUpsertAlbum,
  useAdminDeleteAlbum,
} from "../../src/hooks/useAdminApi";

vi.mock("../../src/hooks/useAdminApi", () => ({
  useAdminMediaList: vi.fn(),
  useAdminUploadUrl: vi.fn(),
  useAdminRegisterMedia: vi.fn(),
  useAdminAlbums: vi.fn(),
  useAdminUpsertAlbum: vi.fn(),
  useAdminDeleteAlbum: vi.fn(),
}));

const mockMutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };

describe("MediaManager", () => {
  beforeEach(() => {
    vi.mocked(useAdminUploadUrl).mockReturnValue(mockMutation as any);
    vi.mocked(useAdminRegisterMedia).mockReturnValue(mockMutation as any);
    vi.mocked(useAdminUpsertAlbum).mockReturnValue(mockMutation as any);
    vi.mocked(useAdminDeleteAlbum).mockReturnValue(mockMutation as any);
  });

  it("shows loading state for media tab", () => {
    vi.mocked(useAdminMediaList).mockReturnValue({
      isLoading: true,
      data: undefined,
    } as any);
    vi.mocked(useAdminAlbums).mockReturnValue({
      isLoading: false,
      data: [],
    } as any);

    renderWithProviders(<MediaManager />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders media items", () => {
    vi.mocked(useAdminMediaList).mockReturnValue({
      isLoading: false,
      data: {
        items: [
          {
            id: "1",
            album_id: null,
            album_title: null,
            s3_key: "uploads/abc/photo.jpg",
            filename: "photo.jpg",
            content_type: "image/jpeg",
            size_bytes: 102400,
            width: 800,
            height: 600,
            caption: null,
            sort_order: 0,
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      },
    } as any);
    vi.mocked(useAdminAlbums).mockReturnValue({
      isLoading: false,
      data: [],
    } as any);

    renderWithProviders(<MediaManager />);
    expect(screen.getAllByText("photo.jpg").length).toBeGreaterThan(0);
    expect(screen.getAllByText("100 KB").length).toBeGreaterThan(0);
    expect(screen.getAllByText("800x600").length).toBeGreaterThan(0);
  });

  it("shows upload zone", () => {
    vi.mocked(useAdminMediaList).mockReturnValue({
      isLoading: false,
      data: { items: [], total: 0, limit: 50, offset: 0 },
    } as any);
    vi.mocked(useAdminAlbums).mockReturnValue({
      isLoading: false,
      data: [],
    } as any);

    renderWithProviders(<MediaManager />);
    expect(screen.getByText("Choose Files")).toBeInTheDocument();
  });

  it("switches to albums tab", async () => {
    vi.mocked(useAdminMediaList).mockReturnValue({
      isLoading: false,
      data: { items: [], total: 0, limit: 50, offset: 0 },
    } as any);
    vi.mocked(useAdminAlbums).mockReturnValue({
      isLoading: false,
      data: [
        {
          id: "1",
          slug: "summer",
          title: "Summer 2024",
          description: null,
          category: "vacation",
          cover_image: null,
          media_count: 5,
          sort_order: 0,
        },
      ],
    } as any);

    renderWithProviders(<MediaManager />);
    await userEvent.click(screen.getByText("Albums"));
    expect(screen.getAllByText("Summer 2024").length).toBeGreaterThan(0);
    expect(screen.getByText("New Album")).toBeInTheDocument();
  });
});
