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
