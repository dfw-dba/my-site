import { useResume } from "../hooks/useApi";
import Timeline from "../components/Timeline";
import type { ResumeSection } from "../types";

function findSection(
  sections: ResumeSection[],
  type: string
): ResumeSection | undefined {
  return sections.find((s) => s.section_type === type);
}

function SummarySection({ section }: { section: ResumeSection }) {
  const text =
    typeof section.content.text === "string" ? section.content.text : null;
  const headline =
    typeof section.content.headline === "string"
      ? section.content.headline
      : null;

  if (!text && !headline) return null;

  return (
    <section className="mb-10">
      {headline && (
        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          {headline}
        </h2>
      )}
      {text && (
        <p className="text-base leading-relaxed text-gray-700">{text}</p>
      )}
    </section>
  );
}

function SkillsSection({ section }: { section: ResumeSection }) {
  const content = section.content as Record<string, unknown>;

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
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Skills</h2>
      <div className="space-y-4">
        {Object.entries(groups).map(([groupName, skills]) => (
          <div key={groupName}>
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">
              {groupName}
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-block rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
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

function ContactSection({ section }: { section: ResumeSection }) {
  const content = section.content as Record<string, unknown>;

  const entries = Object.entries(content).filter(
    ([, val]) => typeof val === "string" && val.length > 0
  );

  if (entries.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Contact</h2>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {entries.map(([key, val]) => (
          <div key={key} className="text-sm text-gray-700">
            <span className="font-medium capitalize text-gray-500">
              {key.replace(/_/g, " ")}:
            </span>{" "}
            {String(val).startsWith("http") ? (
              <a
                href={String(val)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline decoration-blue-300 hover:text-blue-800"
              >
                {String(val)}
              </a>
            ) : String(val).includes("@") ? (
              <a
                href={`mailto:${String(val)}`}
                className="text-blue-600 underline decoration-blue-300 hover:text-blue-800"
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
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-4xl py-12 text-center">
      <p className="text-lg text-red-600">Failed to load resume data.</p>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
    </div>
  );
}

export default function Resume() {
  const { data, isLoading, isError, error } = useResume();

  if (isLoading) return <LoadingSpinner />;
  if (isError)
    return <ErrorMessage message={error?.message ?? "Unknown error"} />;
  if (!data) return null;

  const summarySection = findSection(data.sections, "summary");
  const skillsSection = findSection(data.sections, "skills");
  const contactSection = findSection(data.sections, "contact");

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Resume
        </h1>
        <div className="mt-1 h-1 w-16 rounded bg-blue-600" />
      </header>

      {summarySection && <SummarySection section={summarySection} />}
      {skillsSection && <SkillsSection section={skillsSection} />}
      {contactSection && <ContactSection section={contactSection} />}

      {data.entries && Object.keys(data.entries).length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold text-gray-900">
            Professional Timeline
          </h2>
          <Timeline entries={data.entries} />
        </section>
      )}
    </div>
  );
}
