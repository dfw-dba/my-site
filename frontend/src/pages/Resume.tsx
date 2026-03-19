import { useEffect } from "react";
import { useResume } from "../hooks/useApi";
import Timeline from "../components/Timeline";
import ProfileImage from "../components/ProfileImage";
import RecommendationCarousel from "../components/RecommendationCarousel";


type SectionContent = Record<string, unknown>;

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

  const titleValue =
    data?.sections?.title && typeof (data.sections.title as SectionContent).title === "string"
      ? ((data.sections.title as SectionContent).title as string)
      : null;

  useEffect(() => {
    if (titleValue) {
      document.title = titleValue;
    }
    return () => {
      document.title = "";
    };
  }, [titleValue]);

  if (isLoading) return <LoadingSpinner />;
  if (isError)
    return <ErrorMessage message={error?.message ?? "Unknown error"} />;
  if (!data) return null;

  const { sections } = data;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-10 flex items-start justify-center gap-8">
        <ProfileImage
          src={
            typeof (sections.profile_image as Record<string, unknown>)?.image_url === "string"
              ? ((sections.profile_image as Record<string, unknown>).image_url as string)
              : undefined
          }
        />
        {sections.summary && (
          <div className="max-w-md text-left">
            {typeof sections.summary.headline === "string" && (
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                {sections.summary.headline}
              </h2>
            )}
            {typeof sections.summary.text === "string" && (
              <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {sections.summary.text}
              </p>
            )}

          </div>
        )}
      </header>

      {sections.recommendations && Array.isArray((sections.recommendations as SectionContent).items) && (
        <RecommendationCarousel
          items={(sections.recommendations as SectionContent).items as { author: string; title: string; text: string; linkedin_url?: string | null }[]}
        />
      )}

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
