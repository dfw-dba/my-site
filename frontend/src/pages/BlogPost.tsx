import { Link, useParams } from "react-router";
import { useBlogPost } from "../hooks/useApi";
import MarkdownRenderer from "../components/MarkdownRenderer";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = useBlogPost(slug ?? "");

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 dark:border-gray-700 border-t-blue-600" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link
          to="/showcase/blog"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition-colors"
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
          Back to Blog
        </Link>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Post Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The blog post you are looking for does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const displayDate = post.published_at ?? post.created_at;

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to="/showcase/blog"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition-colors"
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
        Back to Blog
      </Link>

      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {post.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <time dateTime={displayDate}>{formatDate(displayDate)}</time>
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
          <MarkdownRenderer content={post.content} />
        </div>
      </article>
    </div>
  );
}
