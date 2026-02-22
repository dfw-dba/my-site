import { Link } from "react-router";
import { useShowcaseItems } from "../hooks/useApi";
import ShowcaseCard from "../components/ShowcaseCard";

export default function DataShowcase() {
  const { data: items, isLoading, error } = useShowcaseItems("data-engineering");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          to="/showcase"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <svg
            className="h-4 w-4"
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
          Showcase
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Data Engineering
        </h1>
        <p className="text-gray-600">
          Data pipelines, analytics projects, and engineering showcases.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          Failed to load data engineering projects. Please try again later.
        </div>
      )}

      {!isLoading && !error && items && items.length === 0 && (
        <p className="text-gray-500 py-8 text-center">
          No data engineering projects yet. Check back soon!
        </p>
      )}

      {items && items.length > 0 && (
        <div className="flex flex-col gap-6">
          {items.map((item) => (
            <ShowcaseCard key={item.id} item={item} showContent />
          ))}
        </div>
      )}
    </div>
  );
}
