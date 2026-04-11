import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { AnalyticsFilters } from "../types";

export function usePublicAnalyticsSummary(params: AnalyticsFilters = {}) {
  return useQuery({
    queryKey: ["analytics-summary", params],
    queryFn: () => api.analytics.summary(params),
  });
}

export function usePublicAnalyticsVisitors(params: AnalyticsFilters = {}) {
  return useQuery({
    queryKey: ["analytics-visitors", params],
    queryFn: () => api.analytics.visitors(params),
  });
}

export function usePublicAnalyticsGeo(params: AnalyticsFilters = {}) {
  return useQuery({
    queryKey: ["analytics-geo", params],
    queryFn: () => api.analytics.geo(params),
  });
}

export function usePublicAnalyticsTimeseries(params: AnalyticsFilters = {}) {
  return useQuery({
    queryKey: ["analytics-timeseries", params],
    queryFn: () => api.analytics.timeseries(params),
  });
}
