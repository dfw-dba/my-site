-- 05_seed_data.sql
-- Realistic seed data for local development.

-- ============================================================
--  Professional Entries
-- ============================================================
INSERT INTO internal.professional_entries
    (entry_type, title, organization, location, start_date, end_date, description, highlights, technologies, sort_order)
VALUES
    (
        'work',
        'Senior Data Engineer',
        'Cascade Analytics',
        'Seattle, WA',
        '2022-03-01',
        NULL,
        'Lead architect for the company''s real-time data platform serving 50M+ events per day.',
        '["Designed and deployed a streaming pipeline reducing end-to-end latency from 15 minutes to under 30 seconds",
          "Mentored a team of 4 junior engineers through quarterly architecture reviews",
          "Drove adoption of infrastructure-as-code, eliminating manual provisioning entirely"]'::jsonb,
        '["Apache Kafka", "Apache Spark", "Python", "Terraform", "AWS", "PostgreSQL", "dbt"]'::jsonb,
        1
    ),
    (
        'work',
        'Data Engineer',
        'Nimbus Health',
        'Portland, OR',
        '2019-06-15',
        '2022-02-28',
        'Built ETL pipelines and analytics infrastructure for a healthcare SaaS platform.',
        '["Migrated legacy SSIS packages to Airflow, cutting pipeline failures by 70%",
          "Implemented HIPAA-compliant data warehouse on Snowflake",
          "Created self-service BI dashboards used daily by 200+ clinical staff"]'::jsonb,
        '["Python", "Apache Airflow", "Snowflake", "Docker", "AWS", "Tableau"]'::jsonb,
        2
    ),
    (
        'work',
        'Junior Software Developer',
        'BrightPath Software',
        'Portland, OR',
        '2017-08-01',
        '2019-06-01',
        'Full-stack development on internal tools and client-facing web applications.',
        '["Developed a React-based admin dashboard that consolidated 5 legacy tools into one",
          "Wrote comprehensive integration tests improving release confidence"]'::jsonb,
        '["JavaScript", "React", "Node.js", "PostgreSQL", "Docker"]'::jsonb,
        3
    ),
    (
        'education',
        'B.S. Computer Science',
        'Oregon State University',
        'Corvallis, OR',
        '2013-09-01',
        '2017-06-15',
        'Focus on distributed systems and database theory. Graduated cum laude.',
        '["Dean''s List — 6 semesters", "Capstone: distributed log aggregation system"]'::jsonb,
        '[]'::jsonb,
        4
    );

-- ============================================================
--  Resume Sections
-- ============================================================
INSERT INTO internal.resume_sections (section_type, content)
VALUES
    (
        'summary',
        '{
            "text": "Data engineer with 7+ years of experience building scalable pipelines, real-time streaming platforms, and analytics infrastructure. Passionate about clean architecture, developer experience, and turning messy data into reliable products."
        }'::jsonb
    ),
    (
        'skills',
        '{
            "languages": ["Python", "SQL", "JavaScript", "TypeScript", "Bash"],
            "data": ["Apache Kafka", "Apache Spark", "Airflow", "dbt", "Snowflake", "PostgreSQL"],
            "cloud": ["AWS (S3, Lambda, ECS, Glue, Redshift)", "Terraform", "Docker", "GitHub Actions"],
            "web": ["React", "Next.js", "Node.js", "Tailwind CSS"]
        }'::jsonb
    ),
    (
        'contact',
        '{
            "email": "jason@example.com",
            "location": "Seattle, WA",
            "github": "https://github.com/jason",
            "linkedin": "https://linkedin.com/in/jason"
        }'::jsonb
    );

-- ============================================================
--  Blog Posts
-- ============================================================
INSERT INTO internal.blog_posts
    (slug, title, excerpt, content, tags, published, published_at)
VALUES
    (
        'building-real-time-pipelines-with-kafka',
        'Building Real-Time Pipelines with Kafka',
        'A practical walkthrough of designing a Kafka-based streaming pipeline that handles 50 million events per day with sub-second latency.',
        E'# Building Real-Time Pipelines with Kafka\n\nWhen we set out to replace our batch ETL with a streaming architecture, the goal was simple: get data from source to dashboard in under 30 seconds.\n\n## The Problem\n\nOur nightly batch jobs meant analysts were always looking at yesterday''s numbers. In a fast-moving market, that''s an eternity.\n\n## Architecture Overview\n\nWe settled on a three-layer design:\n\n1. **Producers** — lightweight services that publish domain events to Kafka topics\n2. **Stream processors** — Kafka Streams applications that enrich, aggregate, and route data\n3. **Sinks** — connectors that land processed data in PostgreSQL and S3\n\n## Lessons Learned\n\n- **Schema evolution matters.** We adopted Avro with a schema registry from day one and it saved us countless headaches.\n- **Back-pressure is your friend.** We tuned consumer lag alerts to catch slowdowns before they cascaded.\n- **Exactly-once is hard.** We designed for at-least-once delivery with idempotent writes.\n\n## Results\n\nEnd-to-end latency dropped from 15 minutes (best case with the old batch) to under 30 seconds. Pipeline failures dropped by 90% because streaming naturally isolates failures to individual partitions.\n\nMore importantly, the team now trusts the data — and that trust changed how the business makes decisions.',
        '["kafka", "data-engineering", "streaming", "architecture"]'::jsonb,
        TRUE,
        NOW() - INTERVAL '12 days'
    ),
    (
        'why-i-chose-nextjs-for-my-personal-site',
        'Why I Chose Next.js for My Personal Site',
        'Exploring the trade-offs between static site generators and full-stack frameworks for a portfolio site that does more than just serve markdown.',
        E'# Why I Chose Next.js for My Personal Site\n\nI''ve rebuilt my personal site more times than I care to admit. This time I wanted to get it right.\n\n## Requirements\n\n- Blog with markdown authoring\n- Photo gallery backed by S3\n- Resume / portfolio section\n- Admin interface for content management\n- Fast, accessible, SEO-friendly\n\n## Contenders\n\nI evaluated Hugo, Astro, Remix, and Next.js. Each is excellent, but my requirements pushed me toward a full-stack framework.\n\n## Why Next.js Won\n\n- **App Router** gives me layouts, loading states, and server components out of the box\n- **API routes** let me build a lightweight admin without a separate backend\n- **Image optimization** is critical for a photo-heavy site\n- **Incremental Static Regeneration** means I get static-site speed with dynamic content\n\n## What I''d Do Differently\n\nI underestimated how much time I''d spend on the image pipeline. If I started over, I''d design the media management system first.\n\n*Draft — still polishing the image pipeline section.*',
        '["nextjs", "web-development", "architecture"]'::jsonb,
        FALSE,
        NULL
    );

-- ============================================================
--  Showcase Items
-- ============================================================
INSERT INTO internal.showcase_items
    (slug, title, description, content, category, technologies, demo_url, repo_url, sort_order)
VALUES
    (
        'real-time-event-platform',
        'Real-Time Event Platform',
        'A production streaming pipeline processing 50M+ events/day with sub-second latency, built on Kafka and Spark.',
        E'# Real-Time Event Platform\n\n## Overview\n\nThis project replaced a fragile nightly batch ETL with a robust streaming architecture.\n\n## Architecture\n\n- **Apache Kafka** for event ingestion and routing\n- **Kafka Streams** for real-time enrichment and aggregation\n- **PostgreSQL** as the serving layer for dashboards\n- **S3 + Parquet** for long-term analytical storage\n- **Terraform** for all infrastructure provisioning\n\n## Key Metrics\n\n| Metric | Before | After |\n|--------|--------|-------|\n| Latency | 15 min | < 30s |\n| Daily failures | ~12 | < 1 |\n| Recovery time | 2-4 hrs | < 5 min |',
        'data-engineering',
        '["Apache Kafka", "Kafka Streams", "Python", "PostgreSQL", "Terraform", "AWS"]'::jsonb,
        NULL,
        'https://github.com/jason/event-platform',
        1
    ),
    (
        'personal-site',
        'Personal Site & Portfolio',
        'This very site — a full-stack Next.js application with a PostgreSQL backend, S3 media management, and a custom admin interface.',
        E'# Personal Site & Portfolio\n\n## Overview\n\nA from-scratch personal website designed to showcase professional work, host a blog, and manage a photo gallery.\n\n## Stack\n\n- **Next.js 14** with App Router and Server Components\n- **PostgreSQL** with a stored-function API layer\n- **S3** for media storage with on-the-fly image optimization\n- **Tailwind CSS** for styling\n- **Docker Compose** for local development\n\n## Design Decisions\n\n- All database access goes through `api` schema functions — no direct table queries from the application\n- Media pipeline handles upload, thumbnail generation, and EXIF extraction\n- Admin interface is server-rendered with progressive enhancement',
        'web',
        '["Next.js", "React", "PostgreSQL", "S3", "Tailwind CSS", "Docker"]'::jsonb,
        NULL,
        'https://github.com/jason/my-site',
        2
    );

-- ============================================================
--  Albums (no media items — those require actual S3 uploads)
-- ============================================================
INSERT INTO internal.albums (slug, title, description, category, sort_order)
VALUES
    (
        'family-2024',
        'Family 2024',
        'Highlights from a year of family adventures.',
        'family',
        1
    ),
    (
        'olympic-peninsula-trip',
        'Olympic Peninsula Road Trip',
        'A week exploring the rainforests, beaches, and mountains of Washington''s Olympic Peninsula.',
        'vacation',
        2
    );
