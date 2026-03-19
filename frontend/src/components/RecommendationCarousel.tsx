import { useState, useEffect, useCallback, useRef } from "react";

interface Recommendation {
  author: string;
  title: string;
  text: string;
  linkedin_url?: string | null;
}

interface RecommendationCarouselProps {
  items: Recommendation[];
  intervalMs?: number;
}

function pickRandom(items: Recommendation[], exclude?: Recommendation): Recommendation {
  if (items.length <= 1) return items[0]!;
  let next!: Recommendation;
  do {
    next = items[Math.floor(Math.random() * items.length)]!;
  } while (next === exclude);
  return next;
}

function RecommendationTile({ item }: { item: Recommendation }) {
  return (
    <div className="px-2 py-4 text-center">
      <p className="italic text-gray-600 dark:text-gray-300 leading-relaxed">
        &ldquo;{item.text}&rdquo;
      </p>
      <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
        &mdash;{" "}
        {item.linkedin_url ? (
          <a
            href={item.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-gray-400/50 dark:decoration-gray-500/50 hover:decoration-gray-700 dark:hover:decoration-gray-200 underline-offset-2 transition-colors"
          >
            {item.author}
          </a>
        ) : (
          item.author
        )}
        , {item.title}
      </p>
    </div>
  );
}

export default function RecommendationCarousel({
  items,
  intervalMs = 8000,
}: RecommendationCarouselProps) {
  const [current, setCurrent] = useState(() => pickRandom(items));
  const [animKey, setAnimKey] = useState(0);
  const currentRef = useRef(current);
  currentRef.current = current;

  const rotate = useCallback(() => {
    const incoming = pickRandom(items, currentRef.current);
    setCurrent(incoming);
    setAnimKey((k) => k + 1);
  }, [items]);

  useEffect(() => {
    if (items.length <= 1) return;
    let intervalId: ReturnType<typeof setInterval>;
    const delayId = setTimeout(() => {
      rotate();
      intervalId = setInterval(rotate, intervalMs);
    }, Math.random() * (intervalMs / 2));
    return () => {
      clearTimeout(delayId);
      clearInterval(intervalId);
    };
  }, [rotate, intervalMs, items.length]);

  if (!items || items.length === 0) return null;

  return (
    <section className="mx-auto mb-10 max-w-2xl overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div
        key={animKey}
        className="animate-slide-in-right"
      >
        <RecommendationTile item={current} />
      </div>
    </section>
  );
}
