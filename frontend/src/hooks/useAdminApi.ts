import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { showToast } from "../components/admin/Toast";
import type {
  ResumeEntryCreate,
  ResumeTitleCreate,
  ResumeSummaryCreate,
  ResumeContactCreate,
  ResumeRecommendationsReplace,
  PerformanceReviewCreate,
} from "../types";

function onMutationError(error: Error) {
  showToast(error.message || "An error occurred", "error");
}

// ── Logs ─────────────────────────────────────────────────────────────────────

export function useAdminLogs(filters: {
  level?: string;
  search?: string;
  client_ip?: string;
  limit?: number;
  offset?: number;
} = {}) {
  return useQuery({
    queryKey: ["admin-logs", filters],
    queryFn: () => api.admin.logs.list(filters),
    refetchInterval: 15_000,
  });
}

export function useAdminLogStats() {
  return useQuery({
    queryKey: ["admin-log-stats"],
    queryFn: () => api.admin.logs.stats(),
    refetchInterval: 30_000,
  });
}

export function useAdminThreatDetections(params: { days?: number; client_ip?: string } = {}) {
  return useQuery({
    queryKey: ["admin-threats", params],
    queryFn: () => api.admin.logs.threats(params),
    refetchInterval: 60_000,
  });
}

export function useAdminPurgeLogs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (days: number) => api.admin.logs.purge(days),
    onSuccess: () => {
      showToast("Logs purged successfully", "success");
      qc.invalidateQueries({ queryKey: ["admin-logs"] });
      qc.invalidateQueries({ queryKey: ["admin-log-stats"] });
    },
    onError: onMutationError,
  });
}

// ── DB Performance Metrics ───────────────────────────────────────────────────

export function useDbOverview() {
  return useQuery({
    queryKey: ["admin-db-overview"],
    queryFn: () => api.admin.metrics.overview(),
    refetchInterval: 60_000,
  });
}

export function useSlowQueries(params: { sort_by?: string; limit?: number; min_calls?: number } = {}) {
  return useQuery({
    queryKey: ["admin-slow-queries", params],
    queryFn: () => api.admin.metrics.queries(params),
    refetchInterval: 60_000,
  });
}

export function usePlanInstability(params: { limit?: number; min_calls?: number } = {}) {
  return useQuery({
    queryKey: ["admin-plan-instability", params],
    queryFn: () => api.admin.metrics.planInstability(params),
  });
}

export function useTableStats() {
  return useQuery({
    queryKey: ["admin-table-stats"],
    queryFn: () => api.admin.metrics.tables(),
  });
}

export function useIndexUsage() {
  return useQuery({
    queryKey: ["admin-index-usage"],
    queryFn: () => api.admin.metrics.indexes(),
  });
}

export function useFunctionStats() {
  return useQuery({
    queryKey: ["admin-function-stats"],
    queryFn: () => api.admin.metrics.functions(),
  });
}

export function useCaptureMetrics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.admin.metrics.capture(),
    onSuccess: () => {
      showToast("Metrics captured", "success");
      qc.invalidateQueries({ queryKey: ["admin-db-overview"] });
      qc.invalidateQueries({ queryKey: ["admin-slow-queries"] });
      qc.invalidateQueries({ queryKey: ["admin-plan-instability"] });
      qc.invalidateQueries({ queryKey: ["admin-table-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-index-usage"] });
      qc.invalidateQueries({ queryKey: ["admin-function-stats"] });
    },
    onError: onMutationError,
  });
}

// ── Visitor Analytics ───────────────────────────────────────────────────────

export function useAnalyticsSummary(params: { start_date?: string; end_date?: string; page_path?: string; exclude_bots?: boolean } = {}) {
  return useQuery({
    queryKey: ["admin-analytics-summary", params],
    queryFn: () => api.admin.analytics.summary(params),
  });
}

export function useAnalyticsVisitors(params: { start_date?: string; end_date?: string; exclude_bots?: boolean } = {}) {
  return useQuery({
    queryKey: ["admin-analytics-visitors", params],
    queryFn: () => api.admin.analytics.visitors(params),
  });
}

export function useAnalyticsGeo(params: { start_date?: string; end_date?: string; exclude_bots?: boolean } = {}) {
  return useQuery({
    queryKey: ["admin-analytics-geo", params],
    queryFn: () => api.admin.analytics.geo(params),
  });
}

export function useAnalyticsTimeseries(params: { start_date?: string; end_date?: string; exclude_bots?: boolean } = {}) {
  return useQuery({
    queryKey: ["admin-analytics-timeseries", params],
    queryFn: () => api.admin.analytics.timeseries(params),
  });
}

// ── GeoIP ───────────────────────────────────────────────────────────────────

export function useGeoipUpdateLogs(params: { limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ["admin-geoip-logs", params],
    queryFn: () => api.admin.geoip.logs(params),
  });
}

export function useGeoipTaskStatus() {
  return useQuery({
    queryKey: ["admin-geoip-task-status"],
    queryFn: () => api.admin.geoip.taskStatus(),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "pending" || status === "running") return 3000;
      return false;
    },
  });
}

export function useGeoipTrigger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.admin.geoip.trigger(),
    onSuccess: () => {
      showToast("GeoIP update triggered", "success");
      qc.invalidateQueries({ queryKey: ["admin-geoip-task-status"] });
    },
    onError: onMutationError,
  });
}

export function useGeoipTaskProgress(runId: number | null, afterId?: number) {
  return useQuery({
    queryKey: ["admin-geoip-progress", runId, afterId],
    queryFn: () => api.admin.geoip.taskProgress({ run_id: runId!, after_id: afterId }),
    enabled: runId !== null,
    refetchInterval: 2000,
  });
}

// ── Resume ───────────────────────────────────────────────────────────────────

export function useAdminResume() {
  return useQuery({
    queryKey: ["admin-resume"],
    queryFn: () => api.admin.resume.get(),
  });
}

export function useAdminUpsertResumeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ResumeEntryCreate) => api.admin.resume.upsertEntry(data),
    onSuccess: () => {
      showToast("Entry saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

export function useAdminDeleteResumeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.admin.resume.deleteEntry(id),
    onSuccess: () => {
      showToast("Entry deleted", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

export function useAdminUpsertResumeTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ResumeTitleCreate) => api.admin.resume.upsertTitle(data),
    onSuccess: () => {
      showToast("Title saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

export function useAdminUpsertResumeSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ResumeSummaryCreate) => api.admin.resume.upsertSummary(data),
    onSuccess: () => {
      showToast("Summary saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

export function useAdminUpsertResumeContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ResumeContactCreate) => api.admin.resume.upsertContact(data),
    onSuccess: () => {
      showToast("Contact saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

export function useAdminReplaceRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ResumeRecommendationsReplace) => api.admin.resume.replaceRecommendations(data),
    onSuccess: () => {
      showToast("Recommendations saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

export function useAdminUpsertPerformanceReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PerformanceReviewCreate) => api.admin.resume.upsertReview(data),
    onSuccess: () => {
      showToast("Review saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

export function useAdminDeletePerformanceReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.admin.resume.deleteReview(id),
    onSuccess: () => {
      showToast("Review deleted", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}

export function useAdminUploadProfileImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.admin.resume.uploadProfileImage(file),
    onSuccess: () => {
      showToast("Profile image uploaded", "success");
      qc.invalidateQueries({ queryKey: ["admin-resume"] });
      qc.invalidateQueries({ queryKey: ["resume"] });
    },
    onError: onMutationError,
  });
}
