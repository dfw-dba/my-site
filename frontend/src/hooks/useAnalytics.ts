import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

import {
  isDoNotTrack,
  startFlushing,
  stopFlushing,
  trackEvent,
  trackPageView,
} from "../services/analytics";

export function useAnalytics(): void {
  const location = useLocation();
  const scrollObserverRef = useRef<IntersectionObserver | null>(null);
  const scrollFiredRef = useRef<Set<string>>(new Set());

  // Respect Do Not Track
  if (isDoNotTrack()) return;

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname, document.title);

    // Reset scroll tracking for new page
    scrollFiredRef.current.clear();
  }, [location.pathname]);

  // Set up event listeners
  useEffect(() => {
    // Flush timer
    startFlushing();

    // Outbound link click tracking
    function handleClick(e: MouseEvent): void {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;
      const isExternal =
        target.getAttribute("target") === "_blank" ||
        (href.startsWith("http") && !href.startsWith(window.location.origin));
      if (isExternal) {
        trackEvent("click", location.pathname, {
          url: href,
          text: target.textContent?.slice(0, 200),
        });
      }
    }

    // Scroll depth tracking via Intersection Observer
    function setupScrollObserver(): void {
      const sentinels = document.querySelectorAll("[data-scroll-depth]");
      if (sentinels.length === 0) {
        // Create sentinels at 25/50/75/100% of main content
        const main = document.querySelector("main");
        if (!main) return;
        for (const pct of [25, 50, 75, 100]) {
          const el = document.createElement("div");
          el.setAttribute("data-scroll-depth", String(pct));
          el.style.position = "absolute";
          el.style.top = `${pct}%`;
          el.style.height = "1px";
          el.style.width = "1px";
          el.style.pointerEvents = "none";
          main.style.position = "relative";
          main.appendChild(el);
        }
      }

      scrollObserverRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const depth = entry.target.getAttribute("data-scroll-depth");
            if (depth && !scrollFiredRef.current.has(depth)) {
              scrollFiredRef.current.add(depth);
              trackEvent("scroll", location.pathname, {
                depth: parseInt(depth),
              });
            }
          }
        },
        { threshold: 0 },
      );

      document
        .querySelectorAll("[data-scroll-depth]")
        .forEach((el) => scrollObserverRef.current?.observe(el));
    }

    // Print tracking
    function handlePrint(): void {
      trackEvent("print", location.pathname);
    }

    // Visibility change tracking
    function handleVisibility(): void {
      trackEvent("visibility_change", location.pathname, {
        state: document.visibilityState,
      });
    }

    document.addEventListener("click", handleClick);
    window.addEventListener("beforeprint", handlePrint);
    document.addEventListener("visibilitychange", handleVisibility);

    // Delay scroll observer setup to allow page render
    const scrollTimer = setTimeout(setupScrollObserver, 500);

    return () => {
      stopFlushing();
      document.removeEventListener("click", handleClick);
      window.removeEventListener("beforeprint", handlePrint);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimeout(scrollTimer);
      scrollObserverRef.current?.disconnect();
      // Clean up sentinel elements
      document
        .querySelectorAll("[data-scroll-depth]")
        .forEach((el) => el.remove());
    };
  }, [location.pathname]);
}
