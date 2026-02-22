import { Link } from "react-router";
import type { BlogPostListItem } from "../types";

interface BlogCardProps {
  post: BlogPostListItem;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogCard({ post }: BlogCardProps) {
  const displayDate = post.published_at ?? post.created_at;

  return (
    <Link
      to={`/showcase/blog/${post.slug}`}
      className="block group"
    >
      <article className="rounded-lg border border-gray-200 bg-white p-6 transition-all duration-200 hover:shadow-lg hover:border-gray-300">
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
          <time dateTime={displayDate}>{formatDate(displayDate)}</time>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </Link>
  );
}
