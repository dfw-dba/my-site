import type {
  ContactInfo,
  ResumeData,
  ProfessionalEntry,
  ResumeEntryCreate,
  ResumeTitleCreate,
  ResumeSummaryCreate,
  ResumeContactCreate,
  ResumeRecommendationsReplace,
  PerformanceReviewCreate,
  ProfileImageUploadResponse,
  ApiSuccess,
  AppLogsResponse,
  AppLogStats,
  ThreatDetectionResponse,
  DbOverview,
  SlowQueriesResponse,
  PlanInstabilityResponse,
  TableStatsResponse,
  IndexUsageResponse,
  FunctionStatsResponse,
  AnalyticsSummary,
  AnalyticsVisitors,
  AnalyticsGeo,
  AnalyticsTimeseries,
} from "../types";
import { getIdToken, isCognitoConfigured } from "./auth";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function adminHeaders(): Promise<HeadersInit> {
  if (isCognitoConfigured) {
    const token = await getIdToken();
    if (token) {
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
    }
  }

  // Fallback: API key for local dev without Cognito
  return {
    "Content-Type": "application/json",
    "X-Admin-Key": import.meta.env.VITE_ADMIN_API_KEY ?? "",
  };
}

async function adminAuthHeaders(): Promise<HeadersInit> {
  if (isCognitoConfigured) {
    const token = await getIdToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return { "X-Admin-Key": import.meta.env.VITE_ADMIN_API_KEY ?? "" };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  resume: {
    get: () => request<ResumeData>("/api/resume/"),
    contact: () => request<ContactInfo>("/api/resume/contact"),
    timeline: () => request<ProfessionalEntry[]>("/api/resume/timeline"),
  },

  admin: {
    logs: {
      list: async (params: { level?: string; search?: string; client_ip?: string; limit?: number; offset?: number } = {}) => {
        const headers = await adminHeaders();
        const qs = new URLSearchParams();
        if (params.level) qs.set("level", params.level);
        if (params.search) qs.set("search", params.search);
        if (params.client_ip) qs.set("client_ip", params.client_ip);
        if (params.limit !== undefined) qs.set("limit", String(params.limit));
        if (params.offset !== undefined) qs.set("offset", String(params.offset));
        const query = qs.toString();
        return request<AppLogsResponse>(`/api/admin/logs${query ? `?${query}` : ""}`, { headers });
      },
      stats: async () => {
        const headers = await adminHeaders();
        return request<AppLogStats>("/api/admin/logs/stats", { headers });
      },
      purge: async (days: number) => {
        const headers = await adminHeaders();
        return request<ApiSuccess>("/api/admin/logs/purge", {
          method: "POST",
          headers,
          body: JSON.stringify({ days }),
        });
      },
      threats: async (params: { days?: number; client_ip?: string } = {}) => {
        const headers = await adminHeaders();
        const qs = new URLSearchParams();
        qs.set("days", String(params.days ?? 30));
        if (params.client_ip) qs.set("client_ip", params.client_ip);
        return request<ThreatDetectionResponse>(`/api/admin/logs/threats?${qs.toString()}`, { headers });
      },
    },
    metrics: {
      overview: async () => {
        const headers = await adminHeaders();
        return request<DbOverview>("/api/admin/metrics/overview", { headers });
      },
      queries: async (params: { sort_by?: string; limit?: number; min_calls?: number } = {}) => {
        const headers = await adminHeaders();
        const qs = new URLSearchParams();
        if (params.sort_by) qs.set("sort_by", params.sort_by);
        if (params.limit !== undefined) qs.set("limit", String(params.limit));
        if (params.min_calls !== undefined) qs.set("min_calls", String(params.min_calls));
        const query = qs.toString();
        return request<SlowQueriesResponse>(`/api/admin/metrics/queries${query ? `?${query}` : ""}`, { headers });
      },
      planInstability: async (params: { limit?: number; min_calls?: number } = {}) => {
        const headers = await adminHeaders();
        const qs = new URLSearchParams();
        if (params.limit !== undefined) qs.set("limit", String(params.limit));
        if (params.min_calls !== undefined) qs.set("min_calls", String(params.min_calls));
        const query = qs.toString();
        return request<PlanInstabilityResponse>(`/api/admin/metrics/plan-instability${query ? `?${query}` : ""}`, { headers });
      },
      tables: async () => {
        const headers = await adminHeaders();
        return request<TableStatsResponse>("/api/admin/metrics/tables", { headers });
      },
      indexes: async () => {
        const headers = await adminHeaders();
        return request<IndexUsageResponse>("/api/admin/metrics/indexes", { headers });
      },
      functions: async () => {
        const headers = await adminHeaders();
        return request<FunctionStatsResponse>("/api/admin/metrics/functions", { headers });
      },
      capture: async () => {
        const headers = await adminHeaders();
        return request<ApiSuccess>("/api/admin/metrics/capture", { method: "POST", headers });
      },
    },
    analytics: {
      summary: async (params: { start_date?: string; end_date?: string; page_path?: string; exclude_bots?: boolean } = {}) => {
        const headers = await adminHeaders();
        const qs = new URLSearchParams();
        if (params.start_date) qs.set("start_date", params.start_date);
        if (params.end_date) qs.set("end_date", params.end_date);
        if (params.page_path) qs.set("page_path", params.page_path);
        if (params.exclude_bots !== undefined) qs.set("exclude_bots", String(params.exclude_bots));
        const query = qs.toString();
        return request<AnalyticsSummary>(`/api/admin/analytics/summary${query ? `?${query}` : ""}`, { headers });
      },
      visitors: async (params: { start_date?: string; end_date?: string; exclude_bots?: boolean } = {}) => {
        const headers = await adminHeaders();
        const qs = new URLSearchParams();
        if (params.start_date) qs.set("start_date", params.start_date);
        if (params.end_date) qs.set("end_date", params.end_date);
        if (params.exclude_bots !== undefined) qs.set("exclude_bots", String(params.exclude_bots));
        const query = qs.toString();
        return request<AnalyticsVisitors>(`/api/admin/analytics/visitors${query ? `?${query}` : ""}`, { headers });
      },
      geo: async (params: { start_date?: string; end_date?: string; exclude_bots?: boolean } = {}) => {
        const headers = await adminHeaders();
        const qs = new URLSearchParams();
        if (params.start_date) qs.set("start_date", params.start_date);
        if (params.end_date) qs.set("end_date", params.end_date);
        if (params.exclude_bots !== undefined) qs.set("exclude_bots", String(params.exclude_bots));
        const query = qs.toString();
        return request<AnalyticsGeo>(`/api/admin/analytics/geo${query ? `?${query}` : ""}`, { headers });
      },
      timeseries: async (params: { start_date?: string; end_date?: string; exclude_bots?: boolean } = {}) => {
        const headers = await adminHeaders();
        const qs = new URLSearchParams();
        if (params.start_date) qs.set("start_date", params.start_date);
        if (params.end_date) qs.set("end_date", params.end_date);
        if (params.exclude_bots !== undefined) qs.set("exclude_bots", String(params.exclude_bots));
        const query = qs.toString();
        return request<AnalyticsTimeseries>(`/api/admin/analytics/timeseries${query ? `?${query}` : ""}`, { headers });
      },
    },
    resume: {
      get: () => request<ResumeData>("/api/resume/"),
      upsertEntry: async (data: ResumeEntryCreate) =>
        request<ApiSuccess>("/api/admin/resume/entry", {
          method: "POST",
          headers: await adminHeaders(),
          body: JSON.stringify(data),
        }),
      deleteEntry: async (id: number) =>
        request<ApiSuccess>(`/api/admin/resume/entry/${id}`, {
          method: "DELETE",
          headers: await adminHeaders(),
        }),
      upsertTitle: async (data: ResumeTitleCreate) =>
        request<ApiSuccess>("/api/admin/resume/title", {
          method: "POST",
          headers: await adminHeaders(),
          body: JSON.stringify(data),
        }),
      upsertSummary: async (data: ResumeSummaryCreate) =>
        request<ApiSuccess>("/api/admin/resume/summary", {
          method: "POST",
          headers: await adminHeaders(),
          body: JSON.stringify(data),
        }),
      upsertContact: async (data: ResumeContactCreate) =>
        request<ApiSuccess>("/api/admin/resume/contact", {
          method: "POST",
          headers: await adminHeaders(),
          body: JSON.stringify(data),
        }),
      replaceRecommendations: async (data: ResumeRecommendationsReplace) =>
        request<ApiSuccess>("/api/admin/resume/recommendations", {
          method: "POST",
          headers: await adminHeaders(),
          body: JSON.stringify(data),
        }),
      upsertReview: async (data: PerformanceReviewCreate) =>
        request<ApiSuccess>("/api/admin/resume/review", {
          method: "POST",
          headers: await adminHeaders(),
          body: JSON.stringify(data),
        }),
      deleteReview: async (id: number) =>
        request<ApiSuccess>(`/api/admin/resume/review/${id}`, {
          method: "DELETE",
          headers: await adminHeaders(),
        }),
      uploadProfileImage: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const headers = await adminAuthHeaders();
        const response = await fetch(`${BASE_URL}/api/admin/resume/profile-image`, {
          method: "POST",
          headers,
          body: formData,
        });
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return response.json() as Promise<ProfileImageUploadResponse>;
      },
    },
  },
};
