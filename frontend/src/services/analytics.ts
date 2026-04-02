const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const ANALYTICS_ENDPOINT = `${API_URL}/api/analytics/event`;
const FLUSH_INTERVAL_MS = 5000;
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

type AnalyticsEvent = {
  type: "page_view" | "event";
  data: Record<string, unknown>;
};

let queue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let visibilityHandler: (() => void) | null = null;
let lastActivity = Date.now();

function getSessionId(): string {
  let id = sessionStorage.getItem("analytics_session_id");
  const lastTs = sessionStorage.getItem("analytics_last_activity");
  if (!id || (lastTs && Date.now() - parseInt(lastTs) > INACTIVITY_TIMEOUT_MS)) {
    id = crypto.randomUUID();
    sessionStorage.setItem("analytics_session_id", id);
  }
  sessionStorage.setItem("analytics_last_activity", String(Date.now()));
  return id;
}

async function getVisitorHash(): Promise<string> {
  const cached = sessionStorage.getItem("analytics_visitor_hash");
  if (cached) return cached;

  const raw = [
    navigator.userAgent,
    screen.width,
    screen.height,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen.colorDepth,
  ].join("|");

  const data = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  sessionStorage.setItem("analytics_visitor_hash", hash);
  return hash;
}

function getDeviceType(): "desktop" | "mobile" | "tablet" {
  const w = screen.width;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function parseBrowser(ua: string): string {
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Opera/") || ua.includes("OPR/")) return "Opera";
  return "Other";
}

function parseOS(ua: string): string {
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Other";
}

function getUTMParams(): Record<string, string | undefined> {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") ?? undefined,
    utm_medium: params.get("utm_medium") ?? undefined,
    utm_campaign: params.get("utm_campaign") ?? undefined,
  };
}

function flush(): void {
  if (queue.length === 0) return;
  const batch = queue.splice(0);
  for (const event of batch) {
    const body = JSON.stringify(event);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        ANALYTICS_ENDPOINT,
        new Blob([body], { type: "application/json" }),
      );
    } else {
      fetch(ANALYTICS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }
}

function enqueue(event: AnalyticsEvent): void {
  lastActivity = Date.now();
  queue.push(event);
}

export async function trackPageView(path: string, title: string): Promise<void> {
  const visitorHash = await getVisitorHash();
  const ua = navigator.userAgent;
  enqueue({
    type: "page_view",
    data: {
      visitor_hash: visitorHash,
      session_id: getSessionId(),
      page_path: path,
      page_title: title,
      referrer: document.referrer || undefined,
      ...getUTMParams(),
      device_type: getDeviceType(),
      browser: parseBrowser(ua),
      os: parseOS(ua),
      screen_width: screen.width,
      screen_height: screen.height,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
}

export async function trackEvent(
  eventType: "click" | "scroll" | "print" | "visibility_change",
  pagePath: string,
  eventData?: Record<string, unknown>,
): Promise<void> {
  const visitorHash = await getVisitorHash();
  enqueue({
    type: "event",
    data: {
      visitor_hash: visitorHash,
      session_id: getSessionId(),
      event_type: eventType,
      event_data: eventData,
      page_path: pagePath,
    },
  });
}

export function isDoNotTrack(): boolean {
  return navigator.doNotTrack === "1";
}

export function startFlushing(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  visibilityHandler = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", visibilityHandler);
}

export function stopFlushing(): void {
  flush();
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  if (visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }
}

export { lastActivity };
