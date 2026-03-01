import { useState } from "react";
import { useResume } from "../hooks/useApi";
import Timeline from "../components/Timeline";
import ProfileImage from "../components/ProfileImage";

type SectionContent = Record<string, unknown>;

function LinkedInIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4l-10 8L2 4" />
    </svg>
  );
}

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
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Skills</h2>
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

function ContactSection({ content }: { content: SectionContent }) {

  const entries = Object.entries(content).filter(
    ([, val]) => typeof val === "string" && val.length > 0
  );

  if (entries.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Contact</h2>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {entries.map(([key, val]) => (
          <div key={key} className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium capitalize text-gray-500 dark:text-gray-400">
              {key.replace(/_/g, " ")}:
            </span>{" "}
            {String(val).startsWith("http") ? (
              <a
                href={String(val)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 underline decoration-blue-300 dark:decoration-blue-700 hover:text-blue-800 dark:hover:text-blue-300"
              >
                {String(val)}
              </a>
            ) : String(val).includes("@") ? (
              <a
                href={`mailto:${String(val)}`}
                className="text-blue-600 dark:text-blue-400 underline decoration-blue-300 dark:decoration-blue-700 hover:text-blue-800 dark:hover:text-blue-300"
              >
                {String(val)}
              </a>
            ) : (
              <span>{String(val)}</span>
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
        <div className="mt-4 flex items-center gap-5">
          <a
            href="https://www.linkedin.com/in/jason-rowland-6712097"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            aria-label="LinkedIn"
          >
            <LinkedInIcon />
          </a>
          <a
            href="https://github.com/dfw-dba"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            aria-label="GitHub"
          >
            <GitHubIcon />
          </a>
          <a
            href="mailto:email@jasonrowland.me"
            className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            aria-label="Email"
          >
            <MailIcon />
          </a>
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Resume
        </h1>
        <div className="mt-1 h-1 w-16 rounded bg-blue-600" />
      </header>

      {sections.summary && <SummarySection content={sections.summary} />}
      {sections.skills && <SkillsSection content={sections.skills} />}

      {data.entries && Object.keys(data.entries).length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Professional Timeline
          </h2>
          <Timeline entries={data.entries} />
        </section>
      )}
    </div>
  );
}
