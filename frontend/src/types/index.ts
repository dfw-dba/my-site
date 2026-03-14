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

export interface ResumeSection {
  section_type: string;
  content: Record<string, unknown>;
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

export interface ResumeSectionCreate {
  section_type: string;
  content: Record<string, unknown>;
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

export interface ApiSuccess {
  success: boolean;
  id?: number;
  slug?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  user: { email: string } | null;
  error: string | null;
}
