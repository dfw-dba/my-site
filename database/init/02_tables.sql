-- 02_tables.sql
-- All tables live in the internal schema.

-- ============================================================
-- professional_entries
-- ============================================================
CREATE TABLE internal.professional_entries (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_type  VARCHAR(50) NOT NULL CHECK (entry_type IN ('work', 'education', 'certification', 'award')),
    title       VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    location    VARCHAR(255),
    start_date  DATE        NOT NULL,
    end_date    DATE,
    description TEXT,
    highlights  JSONB       DEFAULT '[]',
    technologies JSONB      DEFAULT '[]',
    sort_order  INTEGER     DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- resume_sections
-- ============================================================
CREATE TABLE internal.resume_sections (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_type VARCHAR(50) UNIQUE NOT NULL CHECK (section_type IN ('summary', 'contact', 'recommendations')),
    content      JSONB       NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- performance_reviews
-- ============================================================
create table internal.performance_reviews
(
  id              int4 generated always as identity primary key,
  entry_id        uuid not null references internal.professional_entries(id) on delete cascade,
  reviewer_name   text not null,
  reviewer_title  text,
  review_date     date,
  review_text     text not null,
  sort_order      int4 default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

comment on table internal.performance_reviews is 'Performance evaluation excerpts linked to professional entries';
comment on column internal.performance_reviews.entry_id is 'FK to professional_entries.id';
comment on column internal.performance_reviews.reviewer_name is 'Name of the reviewer (e.g. manager, peer)';
comment on column internal.performance_reviews.reviewer_title is 'Job title or role of the reviewer';
comment on column internal.performance_reviews.review_text is 'The performance review excerpt text';

-- ============================================================
-- showcase_items  (created before blog_posts so the FK works)
-- ============================================================
CREATE TABLE internal.showcase_items (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug         VARCHAR(255) UNIQUE NOT NULL,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    content      TEXT,
    category     VARCHAR(100) NOT NULL,
    technologies JSONB        DEFAULT '[]',
    demo_url     VARCHAR(500),
    repo_url     VARCHAR(500),
    sort_order   INTEGER      DEFAULT 0,
    created_at   TIMESTAMPTZ  DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- blog_posts
-- ============================================================
CREATE TABLE internal.blog_posts (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug            VARCHAR(255) UNIQUE NOT NULL,
    title           VARCHAR(255) NOT NULL,
    excerpt         TEXT,
    content         TEXT         NOT NULL,
    tags            JSONB        DEFAULT '[]',
    published       BOOLEAN      DEFAULT FALSE,
    showcase_item_id UUID        REFERENCES internal.showcase_items(id),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW(),
    published_at    TIMESTAMPTZ
);

-- ============================================================
-- albums
-- ============================================================
CREATE TABLE internal.albums (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug           VARCHAR(255) UNIQUE NOT NULL,
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    category       VARCHAR(100) NOT NULL CHECK (category IN ('family', 'vacation', 'professional', 'showcase')),
    cover_image_id UUID,
    sort_order     INTEGER      DEFAULT 0,
    created_at     TIMESTAMPTZ  DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- media_items
-- ============================================================
CREATE TABLE internal.media_items (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    album_id     UUID         REFERENCES internal.albums(id) ON DELETE SET NULL,
    s3_key       VARCHAR(500) UNIQUE NOT NULL,
    filename     VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes   BIGINT,
    width        INTEGER,
    height       INTEGER,
    caption      TEXT,
    sort_order   INTEGER      DEFAULT 0,
    created_at   TIMESTAMPTZ  DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- Now that media_items exists, add the FK from albums.cover_image_id.
ALTER TABLE internal.albums
    ADD CONSTRAINT fk_cover_image
    FOREIGN KEY (cover_image_id) REFERENCES internal.media_items(id) ON DELETE SET NULL;

-- ============================================================
-- Automatic updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION internal.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_professional_entries_updated_at
    BEFORE UPDATE ON internal.professional_entries
    FOR EACH ROW EXECUTE FUNCTION internal.set_updated_at();

CREATE TRIGGER trg_resume_sections_updated_at
    BEFORE UPDATE ON internal.resume_sections
    FOR EACH ROW EXECUTE FUNCTION internal.set_updated_at();

CREATE TRIGGER trg_performance_reviews_updated_at
    BEFORE UPDATE ON internal.performance_reviews
    FOR EACH ROW EXECUTE FUNCTION internal.set_updated_at();

CREATE TRIGGER trg_showcase_items_updated_at
    BEFORE UPDATE ON internal.showcase_items
    FOR EACH ROW EXECUTE FUNCTION internal.set_updated_at();

CREATE TRIGGER trg_blog_posts_updated_at
    BEFORE UPDATE ON internal.blog_posts
    FOR EACH ROW EXECUTE FUNCTION internal.set_updated_at();

CREATE TRIGGER trg_albums_updated_at
    BEFORE UPDATE ON internal.albums
    FOR EACH ROW EXECUTE FUNCTION internal.set_updated_at();

CREATE TRIGGER trg_media_items_updated_at
    BEFORE UPDATE ON internal.media_items
    FOR EACH ROW EXECUTE FUNCTION internal.set_updated_at();
