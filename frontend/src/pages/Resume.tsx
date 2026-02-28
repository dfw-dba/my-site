import { useResume } from "../hooks/useApi";
import Timeline from "../components/Timeline";
import ProfileImage from "../components/ProfileImage";

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

  // The skills content can be either:
  // - { groups: Record<string, string[]> } with named groups
  // - { items: string[] } flat list
  // - Record<string, string[]> where keys are group names
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
    // Treat each key as a group name
    Object.entries(content).forEach(([key, val]) => {
      if (Array.isArray(val)) groups[key] = val as string[];
    });
  }

  if (Object.keys(groups).length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Skills</h2>
      <div className="space-y-4">
        {Object.entries(groups).map(([groupName, skills]) => (
          <div key={groupName}>
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {groupName}
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-block rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-300"
                >
                  {skill}
                </span>
              ))}
            </div>
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
      <header className="relative mb-10">
        <div className="absolute -left-44 top-0 hidden lg:block">
          <ProfileImage src="/profile.jpg" />
        </div>
        <div className="mb-6 lg:hidden">
          <ProfileImage src="/profile.jpg" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Resume
        </h1>
        <div className="mt-1 h-1 w-16 rounded bg-blue-600" />
      </header>

      {sections.summary && <SummarySection content={sections.summary} />}
      {sections.skills && <SkillsSection content={sections.skills} />}
      {sections.contact && <ContactSection content={sections.contact} />}

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
