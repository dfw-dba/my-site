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
