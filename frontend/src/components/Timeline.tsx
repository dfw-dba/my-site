import type { ProfessionalEntry } from "../types";
import PerformanceReviewCarousel from "./PerformanceReviewCarousel";

interface TimelineProps {
  entries: Record<string, ProfessionalEntry[]>;
}

const ENTRY_TYPE_COLORS: Record<string, { dot: string; badge: string }> = {
  work: {
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  education: {
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  certification: {
    dot: "bg-purple-500",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  },
  award: {
    dot: "bg-orange-500",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  },
  hobby: {
    dot: "bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500",
    badge:
      "bg-gradient-to-r from-red-100 via-yellow-100 to-blue-100 text-fuchsia-800 dark:from-red-900/40 dark:via-yellow-900/40 dark:to-blue-900/40 dark:text-fuchsia-300",
  },
};

function getColors(entryType: string) {
  return (
    ENTRY_TYPE_COLORS[entryType] ?? {
      dot: "bg-gray-500",
      badge: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    }
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = formatDate(startDate);
  const end = endDate ? formatDate(endDate) : "Present";
  return `${start} — ${end}`;
}

function flattenAndSort(
  entries: Record<string, ProfessionalEntry[]>
): ProfessionalEntry[] {
  const all: ProfessionalEntry[] = [];
  for (const entryType of Object.keys(entries)) {
    for (const entry of entries[entryType] ?? []) {
      all.push({ ...entry, entry_type: entry.entry_type || entryType });
    }
  }
  return all.sort((a, b) => a.sort_order - b.sort_order);
}

function TimelineCard({ entry }: { entry: ProfessionalEntry }) {
  const colors = getColors(entry.entry_type);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colors.badge}`}
        >
          {entry.entry_type}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDateRange(entry.start_date, entry.end_date)}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{entry.title}</h3>
      <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
        {entry.organization}
        {entry.location && (
          <span className="text-gray-400 dark:text-gray-500"> &middot; {entry.location}</span>
        )}
      </p>

      {entry.description && (
        <p className="mb-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {entry.description}
        </p>
      )}

      {entry.highlights.length > 0 && (
        <ul className="mb-3 space-y-1">
          {entry.highlights.map((highlight, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
              {highlight}
            </li>
          ))}
        </ul>
      )}

      {entry.technologies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.technologies.map((tech) => (
            <span
              key={tech}
              className="rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400"
            >
              {tech}
            </span>
          ))}
        </div>
      )}

      {entry.performance_reviews && entry.performance_reviews.length > 0 && (
        <PerformanceReviewCarousel items={entry.performance_reviews} />
      )}
    </div>
  );
}

export default function Timeline({ entries }: TimelineProps) {
  const sorted = flattenAndSort(entries);

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-gray-500 dark:text-gray-400">
        No timeline entries to display.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Desktop: center line */}
      <div className="absolute top-0 left-1/2 hidden h-full w-0.5 -translate-x-1/2 bg-gray-200 dark:bg-gray-700 lg:block" />

      {/* Mobile: left line */}
      <div className="absolute top-0 left-3 h-full w-0.5 bg-gray-200 dark:bg-gray-700 lg:hidden" />

      <div className="space-y-10">
        {sorted.map((entry, index) => {
          const colors = getColors(entry.entry_type);
          const isLeft = index % 2 === 0;

          return (
            <div key={entry.id} className="relative">
              {/* ── Mobile layout ── */}
              <div className="lg:hidden">
                {/* Dot */}
                <div
                  className={`absolute top-1 left-3 z-10 h-3 w-3 -translate-x-1/2 rounded-full ring-4 ring-white dark:ring-gray-900 ${colors.dot}`}
                />
                {/* Card */}
                <div className="ml-8">
                  <TimelineCard entry={entry} />
                </div>
              </div>

              {/* ── Desktop layout ── */}
              <div className="hidden lg:block">
                {/* Center dot */}
                <div
                  className={`absolute top-6 left-1/2 z-10 h-4 w-4 -translate-x-1/2 rounded-full ring-4 ring-white dark:ring-gray-900 ${colors.dot}`}
                />

                <div className="flex items-start">
                  {/* Left column */}
                  <div className="w-1/2 pr-10">
                    {isLeft && <TimelineCard entry={entry} />}
                  </div>

                  {/* Right column */}
                  <div className="w-1/2 pl-10">
                    {!isLeft && <TimelineCard entry={entry} />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
