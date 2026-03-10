import { useState, useEffect, useCallback, useRef } from "react";
import type { PerformanceReview } from "../types";

interface PerformanceReviewCarouselProps {
  items: PerformanceReview[];
  intervalMs?: number;
}

function pickRandom(items: PerformanceReview[], exclude?: PerformanceReview): PerformanceReview {
  if (items.length <= 1) return items[0]!;
  let next!: PerformanceReview;
  do {
    next = items[Math.floor(Math.random() * items.length)]!;
  } while (next === exclude);
  return next;
}

function ReviewTile({ item }: { item: PerformanceReview }) {
  return (
    <div className="px-3 py-3 text-center">
      <p className="italic text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        &ldquo;{item.text}&rdquo;
      </p>
      <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        &mdash; {item.reviewer_name}
        {item.reviewer_title && `, ${item.reviewer_title}`}
      </p>
    </div>
  );
}

export default function PerformanceReviewCarousel({
  items,
  intervalMs = 8000,
}: PerformanceReviewCarouselProps) {
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
    <div className="mt-3 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div key={animKey} className="animate-slide-in-right">
        <ReviewTile item={current} />
      </div>
    </div>
  );
}
