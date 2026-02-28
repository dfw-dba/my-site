import { useState, useEffect, useCallback } from "react";
import type { MediaItem } from "../types";

interface PhotoGalleryProps {
  items: MediaItem[];
}

function isVideo(contentType: string): boolean {
  return contentType.startsWith("video/");
}

export default function PhotoGallery({ items }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goToPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + items.length) % items.length : null
    );
  }, [items.length]);

  const goToNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % items.length : null
    );
  }, [items.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape":
          closeLightbox();
          break;
        case "ArrowLeft":
          goToPrev();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, closeLightbox, goToPrev, goToNext]);

  if (items.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-center py-12">
        No media items in this album yet.
      </p>
    );
  }

  const currentItem = lightboxIndex !== null ? items[lightboxIndex] : null;

  return (
    <>
      {/* Masonry-style grid */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className="block w-full break-inside-avoid rounded-lg overflow-hidden cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div
              className="relative bg-gray-200 dark:bg-gray-700"
              style={{
                aspectRatio:
                  item.width && item.height
                    ? `${item.width} / ${item.height}`
                    : "4 / 3",
              }}
            >
              {/* Placeholder background */}
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 transition-colors">
                {isVideo(item.content_type) ? (
                  <svg
                    className="w-10 h-10 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-10 h-10 text-gray-400 dark:text-gray-500"
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
                )}
              </div>

              {/* Text overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-white text-sm truncate">{item.filename}</p>
                {item.caption && (
                  <p className="text-white/80 text-xs truncate mt-0.5">
                    {item.caption}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox overlay */}
      {currentItem && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 text-white/80 hover:text-white transition-colors p-2 cursor-pointer"
            aria-label="Close lightbox"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Previous arrow */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="absolute left-4 z-10 text-white/80 hover:text-white transition-colors p-2 cursor-pointer"
              aria-label="Previous image"
            >
              <svg
                className="w-10 h-10"
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
            </button>
          )}

          {/* Next arrow */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 z-10 text-white/80 hover:text-white transition-colors p-2 cursor-pointer"
              aria-label="Next image"
            >
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Lightbox content */}
          <div
            className="max-w-4xl max-h-[85vh] mx-auto px-16 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative bg-gray-800 rounded-lg overflow-hidden w-full flex items-center justify-center"
              style={{
                aspectRatio:
                  currentItem.width && currentItem.height
                    ? `${currentItem.width} / ${currentItem.height}`
                    : "4 / 3",
                maxHeight: "70vh",
              }}
            >
              {isVideo(currentItem.content_type) ? (
                <svg
                  className="w-20 h-20 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-20 h-20 text-gray-500"
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
              )}
              <p className="absolute bottom-4 left-4 text-white/70 text-sm">
                {currentItem.filename}
              </p>
            </div>

            {/* Caption and counter */}
            <div className="mt-4 text-center">
              {currentItem.caption && (
                <p className="text-white text-base mb-2">
                  {currentItem.caption}
                </p>
              )}
              <p className="text-white/50 text-sm">
                {lightboxIndex + 1} / {items.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
