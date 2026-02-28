import { Link } from "react-router";
import { useBlogPosts } from "../hooks/useApi";
import BlogCard from "../components/BlogCard";

export default function Blog() {
  const { data, isLoading, error } = useBlogPosts();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          to="/showcase"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Blog</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Thoughts, tutorials, and technical write-ups.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 dark:border-gray-700 border-t-blue-600" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/30 p-4 text-red-700 dark:text-red-300">
          Failed to load blog posts. Please try again later.
        </div>
      )}

      {!isLoading && !error && data && data.posts.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400 py-8 text-center">
          No posts yet. Check back soon!
        </p>
      )}

      {data && data.posts.length > 0 && (
        <div className="flex flex-col gap-4">
          {data.posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
