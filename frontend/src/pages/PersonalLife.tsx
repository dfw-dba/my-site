import { Link } from "react-router";
import { useAlbums } from "../hooks/useApi";
import type { Album } from "../types";

function AlbumCard({ album }: { album: Album }) {
  return (
    <Link
      to={`/personal/album/${album.slug}`}
      className="group block rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all"
    >
      {/* Cover image placeholder */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {album.cover_image ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 group-hover:bg-gray-250">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
              />
            </svg>
            <span className="absolute bottom-2 left-3 text-xs text-gray-500 truncate max-w-[80%]">
              {album.cover_image.filename}
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            {/* Camera icon */}
            <svg
              className="w-16 h-16 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              />
            </svg>
          </div>
        )}

        {/* Badges overlaid on image */}
        <div className="absolute top-3 right-3 flex gap-2">
          <span className="inline-flex items-center rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {album.media_count} {album.media_count === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {album.title}
          </h3>
          <span className="shrink-0 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 capitalize">
            {album.category}
          </span>
        </div>
        {album.description && (
          <p className="text-gray-600 text-sm line-clamp-2">
            {album.description}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function PersonalLife() {
  const { data: albums, isLoading, error } = useAlbums();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Personal Life
        </h1>
        <p className="text-gray-600 text-lg">
          A collection of moments, adventures, and the things that matter most.
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <svg
            className="animate-spin h-8 w-8 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-20">
          <p className="text-red-500 mb-2">Failed to load albums.</p>
          <p className="text-gray-500 text-sm">
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </p>
        </div>
      )}

      {/* Albums grid */}
      {albums && albums.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {albums && albums.length === 0 && (
        <div className="text-center py-20">
          <svg
            className="mx-auto h-16 w-16 text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
          <p className="text-gray-500 text-lg">No albums yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Albums will appear here once they are created.
          </p>
        </div>
      )}
    </div>
  );
}
