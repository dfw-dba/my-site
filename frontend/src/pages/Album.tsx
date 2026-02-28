import { Link, useParams } from "react-router";
import { useAlbum } from "../hooks/useApi";
import PhotoGallery from "../components/PhotoGallery";

export default function Album() {
  const { slug } = useParams<{ slug: string }>();
  const { data: album, isLoading, error } = useAlbum(slug ?? "");

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back link */}
      <Link
        to="/personal"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-6"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Personal Life
      </Link>

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
          <p className="text-red-500 mb-2">Failed to load album.</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred."}
          </p>
        </div>
      )}

      {/* Album content */}
      {album && (
        <>
          {/* Album header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {album.title}
              </h1>
              <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 capitalize">
                {album.category}
              </span>
            </div>
            {album.description && (
              <p className="text-gray-600 dark:text-gray-400 text-lg max-w-3xl">
                {album.description}
              </p>
            )}
          </div>

          {/* Photo gallery */}
          <PhotoGallery items={album.media} />
        </>
      )}
    </div>
  );
}
