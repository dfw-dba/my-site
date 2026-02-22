import { Link } from "react-router";
import { useShowcaseItems } from "../hooks/useApi";
import ShowcaseCard from "../components/ShowcaseCard";

export default function Showcase() {
  const { data: items, isLoading, error } = useShowcaseItems();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Showcase</h1>
        <p className="text-gray-600">
          Technical projects, experiments, and things I have built.
        </p>
      </div>

      <div className="flex gap-4 mb-8">
        <Link
          to="/showcase/blog"
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Blog
        </Link>
        <Link
          to="/showcase/data"
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Data Engineering
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          Failed to load showcase items. Please try again later.
        </div>
      )}

      {!isLoading && !error && items && items.length === 0 && (
        <p className="text-gray-500 py-8 text-center">
          No showcase items yet. Check back soon!
        </p>
      )}

      {items && items.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ShowcaseCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
