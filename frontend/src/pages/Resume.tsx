import { useState } from "react";
import { useResume } from "../hooks/useApi";
import Timeline from "../components/Timeline";
import ProfileImage from "../components/ProfileImage";
import RecommendationCarousel from "../components/RecommendationCarousel";

type SectionContent = Record<string, unknown>;

function SummarySection({ content }: { content: SectionContent }) {
  const text =
    typeof content.text === "string" ? content.text : null;
  const headline =
    typeof content.headline === "string"
      ? content.headline
      : null;

  if (!text && !headline) return null;

  return (
    <section className="mb-10">
      {headline && (
        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          {headline}
        </h2>
      )}
      {text && (
        <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">{text}</p>
      )}
    </section>
  );
}

function SkillsSection({ content }: { content: SectionContent }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const groups: Record<string, string[]> = {};

  if (content.groups && typeof content.groups === "object") {
    Object.entries(content.groups as Record<string, unknown>).forEach(
      ([key, val]) => {
        if (Array.isArray(val)) groups[key] = val as string[];
      }
    );
  } else if (Array.isArray(content.items)) {
    groups["Skills"] = content.items as string[];
  } else {
    Object.entries(content).forEach(([key, val]) => {
      if (Array.isArray(val)) groups[key] = val as string[];
    });
  }

  if (Object.keys(groups).length === 0) return null;

  const toggleGroup = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const formatGroupName = (name: string) => name.replace(/_/g, " ");

  return (
    <section className="mb-10">
      <div className="space-y-2">
        {Object.entries(groups).map(([groupName, skills]) => (
          <div key={groupName}>
            <button
              onClick={() => toggleGroup(groupName)}
              className="flex w-full items-center gap-2 py-1 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <svg
                className={`h-3 w-3 transition-transform ${expanded[groupName] ? "rotate-90" : ""}`}
                viewBox="0 0 12 12"
                fill="currentColor"
              >
                <path d="M4 1l5 5-5 5V1z" />
              </svg>
              {formatGroupName(groupName)}
            </button>
            {expanded[groupName] && (
              <div className="ml-5 mt-2 mb-2 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-block rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-blue-600" />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-4xl py-12 text-center">
      <p className="text-lg text-red-600">Failed to load resume data.</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

export default function Resume() {
  const { data, isLoading, isError, error } = useResume();

  if (isLoading) return <LoadingSpinner />;
  if (isError)
    return <ErrorMessage message={error?.message ?? "Unknown error"} />;
  if (!data) return null;

  const { sections } = data;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-10 flex flex-col items-center text-center">
        <ProfileImage src="/profile.jpg" />
      </header>

      {sections.recommendations && Array.isArray((sections.recommendations as SectionContent).items) && (
        <RecommendationCarousel
          items={(sections.recommendations as SectionContent).items as { author: string; title: string; text: string }[]}
        />
      )}

      {sections.summary && <SummarySection content={sections.summary} />}
      {sections.skills && <SkillsSection content={sections.skills} />}

      {data.entries && Object.keys(data.entries).length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold text-center text-gray-900 dark:text-gray-100">
            Professional Timeline
          </h2>
          <Timeline entries={data.entries} />
        </section>
      )}
    </div>
  );
}
