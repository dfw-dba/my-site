// Types matching the JSONB shapes returned by PostgreSQL stored functions

export interface ProfessionalEntry {
  id: string;
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
}

export interface ResumeSection {
  section_type: string;
  content: Record<string, unknown>;
}

export interface ResumeData {
  sections: ResumeSection[];
  entries: Record<string, ProfessionalEntry[]>;
}

export interface BlogPostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  tags: string[];
  created_at: string;
  published_at: string | null;
}

export interface BlogPostsResponse {
  posts: BlogPostListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  tags: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  showcase_item_id: string | null;
}

export interface ShowcaseItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content?: string | null;
  category: string;
  technologies: string[];
  demo_url: string | null;
  repo_url: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface MediaItem {
  id: string;
  s3_key: string;
  filename: string;
  content_type: string;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface Album {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  cover_image: MediaItem | null;
  media_count: number;
  sort_order: number;
}

export interface AlbumDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  media: MediaItem[];
  created_at: string;
  updated_at: string;
  sort_order: number;
}
