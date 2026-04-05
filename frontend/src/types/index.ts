// Types matching the JSONB shapes returned by PostgreSQL stored functions

export interface PerformanceReview {
  id: number;
  reviewer_name: string;
  reviewer_title: string | null;
  review_date: string | null;
  text: string;
}

export interface ProfessionalEntry {
  id: number;
  entry_type: string;
  title: string;
  organization: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  description: string | null;
  highlights: string[];
  technologies: string[];
  sort_order: number;
  performance_reviews: PerformanceReview[];
}

export interface ResumeTitleCreate {
  title: string;
}

export interface ResumeSummaryCreate {
  headline?: string | null;
  text: string;
}

export interface ResumeContactCreate {
  linkedin?: string | null;
  github?: string | null;
  email?: string | null;
}

export interface ResumeRecommendationItem {
  author: string;
  title: string;
  text: string;
  linkedin_url?: string | null;
}

export interface ResumeRecommendationsReplace {
  items: ResumeRecommendationItem[];
}

export interface ContactInfo {
  linkedin?: string;
  github?: string;
  email?: string;
}

export interface ResumeData {
  sections: Record<string, Record<string, unknown>>;
  entries: Record<string, ProfessionalEntry[]>;
}

export interface ResumeEntryCreate {
  id?: number | null;
  entry_type: string;
  title: string;
  organization: string;
  location?: string | null;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
  highlights?: string[];
  technologies?: string[];
  sort_order?: number;
}

export interface PerformanceReviewCreate {
  id?: number | null;
  entry_id: number;
  reviewer_name: string;
  reviewer_title?: string | null;
  review_date?: string | null;
  review_text: string;
  sort_order?: number;
}

export interface ProfileImageUploadResponse {
  success: boolean;
  image_url: string;
}

export interface ApiSuccess {
  success: boolean;
  id?: number;
  slug?: string;
}

export interface AppLog {
  id: number;
  level: string;
  message: string;
  logger: string | null;
  request_method: string | null;
  request_path: string | null;
  status_code: number | null;
  duration_ms: number | null;
  client_ip: string | null;
  error_detail: string | null;
  extra: Record<string, unknown>;
  created_at: string;
}

export interface AppLogStats {
  total_24h: number;
  errors_24h: number;
  warnings_24h: number;
  avg_duration_ms: number;
}

export interface AppLogsResponse {
  logs: AppLog[];
  total: number;
}

export interface ThreatDetail {
  id: number;
  threat_type: string;
  request_method: string | null;
  request_path: string | null;
  status_code: number | null;
  client_ip: string | null;
  created_at: string;
}

export interface ThreatHour {
  hour: number;
  total_threats: number;
  details: ThreatDetail[];
}

export interface ThreatDay {
  date: string;
  total_threats: number;
  vulnerability_scan: number;
  path_traversal: number;
  sql_injection: number;
  brute_force: number;
  unique_ips: number;
  hours: ThreatHour[];
}

export interface ThreatDetectionResponse {
  days: ThreatDay[];
  total_threats: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  user: { email: string } | null;
  error: string | null;
}

// ── DB Performance Metrics ──────────────────────────────────────────────────

export interface DbOverviewDelta {
  xact_commit: number;
  xact_rollback: number;
  deadlocks: number;
  tup_inserted: number;
  tup_updated: number;
  tup_deleted: number;
}

export interface DbOverview {
  captured_at: string;
  cache_hit_ratio: number;
  numbackends: number;
  xact_commit: number;
  xact_rollback: number;
  deadlocks: number;
  temp_files: number;
  temp_bytes: number;
  tup_returned: number;
  tup_fetched: number;
  tup_inserted: number;
  tup_updated: number;
  tup_deleted: number;
  delta: DbOverviewDelta | null;
}

export interface SlowQuery {
  queryid: number;
  query: string;
  calls: number;
  total_exec_time: number;
  mean_exec_time: number;
  min_exec_time: number;
  max_exec_time: number;
  stddev_exec_time: number;
  rows: number;
  shared_blks_hit: number;
  shared_blks_read: number;
  cache_hit_ratio: number;
}

export interface SlowQueriesResponse {
  queries: SlowQuery[];
}

export interface UnstableQuery {
  queryid: number;
  query: string;
  calls: number;
  mean_exec_time: number;
  stddev_exec_time: number;
  min_exec_time: number;
  max_exec_time: number;
  instability_ratio: number;
  max_mean_ratio: number;
  captured_at: string;
}

export interface PlanInstabilityResponse {
  unstable_queries: UnstableQuery[];
}

export interface TableStat {
  schemaname: string;
  relname: string;
  seq_scan: number;
  seq_tup_read: number;
  idx_scan: number;
  idx_tup_fetch: number;
  seq_scan_ratio: number;
  n_tup_ins: number;
  n_tup_upd: number;
  n_tup_del: number;
  n_dead_tup: number;
  last_vacuum: string | null;
  last_autovacuum: string | null;
  last_analyze: string | null;
  last_autoanalyze: string | null;
}

export interface TableStatsResponse {
  tables: TableStat[];
}

export interface IndexStat {
  schemaname: string;
  relname: string;
  indexrelname: string;
  idx_scan: number;
  idx_tup_read: number;
  idx_tup_fetch: number;
  is_unused: boolean;
}

export interface IndexUsageResponse {
  indexes: IndexStat[];
}

export interface FunctionStat {
  schemaname: string;
  funcname: string;
  calls: number;
  total_time: number;
  self_time: number;
  avg_time: number;
}

export interface FunctionStatsResponse {
  functions: FunctionStat[];
}

// ── Visitor Analytics ───────────────────────────────────────────────────────

export interface AnalyticsTopPage {
  page_path: string;
  views: number;
  unique_visitors: number;
}

export interface AnalyticsReferrer {
  referrer: string;
  views: number;
}

export interface AnalyticsDevice {
  device_type: string;
  count: number;
}

export interface AnalyticsBrowser {
  browser: string;
  count: number;
}

export interface AnalyticsOS {
  os: string;
  count: number;
}

export interface AnalyticsDateRange {
  start: string;
  end: string;
}

export interface AnalyticsSummary {
  total_page_views: number;
  unique_visitors: number;
  unique_sessions: number;
  top_pages: AnalyticsTopPage[];
  top_referrers: AnalyticsReferrer[];
  devices: AnalyticsDevice[];
  browsers: AnalyticsBrowser[];
  os_breakdown: AnalyticsOS[];
  date_range: AnalyticsDateRange;
}

export interface AnalyticsReturnVisitor {
  visitor_hash: string;
  days_visited: number;
  total_views: number;
  first_seen: string;
  last_seen: string;
}

export interface AnalyticsTopSession {
  session_id: string;
  visitor_hash: string;
  page_count: number;
  first_seen: string;
  last_seen: string;
}

export interface AnalyticsVisitors {
  avg_pages_per_session: number;
  total_sessions: number;
  top_sessions: AnalyticsTopSession[];
  return_visitors: AnalyticsReturnVisitor[];
  date_range: AnalyticsDateRange;
}

export interface AnalyticsCountry {
  country_code: string;
  country_name: string;
  views: number;
  unique_visitors: number;
}

export interface AnalyticsRegion {
  country_code: string;
  region: string;
  views: number;
  unique_visitors: number;
}

export interface AnalyticsCity {
  country_code: string;
  region: string;
  city: string;
  views: number;
  unique_visitors: number;
}

export interface AnalyticsGeo {
  countries: AnalyticsCountry[];
  regions: AnalyticsRegion[];
  cities: AnalyticsCity[];
  date_range: AnalyticsDateRange;
}

export interface AnalyticsTimeseriesDay {
  date: string;
  views: number;
  unique_visitors: number;
}

export interface AnalyticsTimeseries {
  daily: AnalyticsTimeseriesDay[];
}

// ── GeoIP ─────────────────────────────────────────────────────────────────

export interface GeoipUpdateLog {
  id: number;
  updated_at: string;
  network_rows: number;
  location_rows: number;
  duration_ms: number;
  last_modified: string;
  status: string;
  run_id: number | null;
  last_message: string | null;
}

export interface GeoipUpdateLogsResponse {
  logs: GeoipUpdateLog[];
  total: number;
}

export interface GeoipTaskStatus {
  id: number;
  task_arn: string | null;
  status: string;
  triggered_by: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface GeoipTaskProgress {
  id: number;
  logged_at: string;
  message: string;
  level: string;
}

export interface GeoipTriggerResponse {
  success: boolean;
  run_id: number;
}
