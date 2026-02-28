import type { ShowcaseItem } from "../types";

interface ShowcaseCardProps {
  item: ShowcaseItem;
  showContent?: boolean;
}

const DEFAULT_COLOR = "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";

const categoryColors: Record<string, string> = {
  "data-engineering": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "web-development": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "machine-learning": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  devops: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

function getCategoryColor(category: string): string {
  return categoryColors[category] ?? DEFAULT_COLOR;
}

function formatCategoryLabel(category: string): string {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function ShowcaseCard({ item, showContent = false }: ShowcaseCardProps) {
  return (
    <article className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 transition-all duration-200 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
        <span
          className={`inline-block shrink-0 rounded-full px-3 py-0.5 text-xs font-medium ${getCategoryColor(item.category)}`}
        >
          {formatCategoryLabel(item.category)}
        </span>
      </div>

      {item.description && (
        <p className="text-gray-600 dark:text-gray-400 mb-4">{item.description}</p>
      )}

      {showContent && item.content && (
        <div className="text-gray-700 dark:text-gray-300 text-sm mb-4 border-t border-gray-100 dark:border-gray-700 pt-4 leading-relaxed whitespace-pre-line">
          {item.content}
        </div>
      )}

      {item.technologies.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {item.technologies.map((tech) => (
            <span
              key={tech}
              className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              {tech}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex gap-3 pt-2">
        {item.demo_url && (
          <a
            href={item.demo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
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
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Demo
          </a>
        )}
        {item.repo_url && (
          <a
            href={item.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Source
          </a>
        )}
      </div>
    </article>
  );
}
