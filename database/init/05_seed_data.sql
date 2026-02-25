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
        'Sr Database Engineer',
        'Verra Mobility',
        NULL,
        '2024-03-01',
        NULL,
        'Architecting and optimizing highly scalable database solutions for enterprise systems, providing technical leadership for a single-tenant architecture on AWS. Building a database-as-API layer using Hasura REST endpoints on top of PostgreSQL functions.',
        '["Designed and implemented single-tenant database architecture on AWS supporting enterprise-scale workloads",
          "Built database-as-API layer using Hasura REST endpoints backed by PostgreSQL functions",
          "Providing technical leadership on database architecture decisions across engineering teams"]'::jsonb,
        '["PostgreSQL", "Hasura", "AWS", "REST APIs", "Database Architecture"]'::jsonb,
        1
    ),
    (
        'work',
        'Database Administrator',
        'American Specialty Health',
        NULL,
        '2023-11-01',
        '2024-03-01',
        'Database administration for enterprise SQL Server environments, leading encryption migration efforts and cloud migration initiatives.',
        '["Led migration from Vormetric DSM to native SQL Server Transparent Data Encryption",
          "Assisted in migrating on-premises SQL Server databases to Azure",
          "Provided 24/7 on-call production support for critical database systems"]'::jsonb,
        '["SQL Server", "Azure", "Transparent Data Encryption", "Database Migration"]'::jsonb,
        2
    ),
    (
        'work',
        'Data Engineer',
        'StoneEagle',
        NULL,
        '2020-08-01',
        '2023-11-01',
        'BI application development and DevOps pipeline engineering within the database services team, delivering data warehouse solutions and CI/CD automation for database deployments.',
        '["Added partitioning to the warehouse data model, reducing post-period close processing from 72 hours to 12 hours",
          "Built CI/CD pipelines using SQL Server Data Tools, SQLPackage.exe, YAML, and PowerShell in Azure DevOps",
          "Converted Azure Data Factory pipelines to SSIS packages as part of a cloud migration from Azure to AWS",
          "Developed back-end processes for data warehousing, cube processing, and SSRS report delivery",
          "Mentored new hires and participated in technical screening for the Data Services team"]'::jsonb,
        '["SQL Server", "SSIS", "SSRS", "Azure DevOps", "YAML", "PowerShell", "Azure Data Factory", "Data Warehousing", "SSAS"]'::jsonb,
        3
    ),
    (
        'work',
        'SQL Server Database Engineer',
        'LoanBeam',
        NULL,
        '2019-12-01',
        '2020-08-01',
        'Led design and development of database systems, with responsibility for performance optimization, data modeling, and CI/CD process development.',
        '["Designed physical and logical database models aligned with business requirements",
          "Mentored development team on data modeling best practices and performant T-SQL",
          "Built CI/CD pipelines using Visual Studio, SQL Server Data Tools, and Azure DevOps",
          "Delivered database solutions for both internal and client-facing applications"]'::jsonb,
        '["SQL Server", "T-SQL", "SSDT", "Azure DevOps", "Database Design", "CI/CD"]'::jsonb,
        4
    ),
    (
        'work',
        'Lead Sr SQL Server Database Administrator',
        'GameStop',
        NULL,
        '2012-09-01',
        '2019-12-01',
        'Led the SQL Server database team supporting an international ERP system across 20+ instances ranging from megabytes to terabytes. Managed performance tuning, replication, backups, recovery procedures, and 24/7 on-call support.',
        '["Migrated and upgraded SQL Server 2008 R2 to 2016 across multiple clustered instances",
          "Reduced ETL job run times by 50% through change tracking and asynchronous data loading",
          "Improved data warehouse performance by realigning fact table and cube partition schemes to eliminate excessive I/O",
          "Led GDPR project to migrate and encrypt customer data across international Navision databases using PowerShell, BCP, and parallelism",
          "Redesigned purge routines with Service Broker, eliminating transaction log growth issues",
          "Overhauled index maintenance using T-SQL and PowerShell parallel workflows to shorten maintenance windows",
          "Published article on SQLServerCentral.com"]'::jsonb,
        '["SQL Server", "T-SQL", "SSIS", "SSRS", "SSAS", "PowerShell", "Clustering", "Transactional Replication", "BCP", "SSDT", "Azure DevOps"]'::jsonb,
        5
    );

-- ============================================================
--  Resume Sections
-- ============================================================
INSERT INTO internal.resume_sections (section_type, content)
VALUES
    (
        'summary',
        '{
            "text": "Seasoned database engineer with over a decade of hands-on experience architecting, optimizing, and managing SQL Server and PostgreSQL environments across enterprise systems. Track record of delivering high-impact database migrations, performance tuning, CI/CD automation, and data warehouse solutions. Published author on SQLServerCentral.com."
        }'::jsonb
    ),
    (
        'skills',
        '{
            "databases": ["MSSQL", "PostgreSQL", "SQL Server (2008 R2 through 2016+)", "Analysis Services (SSAS)", "Snowflake"],
            "development": ["T-SQL", "Python", "PowerShell", "YAML", "SSIS", "SSRS", "SSDT"],
            "devops_cloud": ["Azure DevOps", "AWS", "Azure", "CI/CD Pipelines", "Docker", "Git", "Terraform"],
            "architecture": ["Database Design", "Performance Tuning", "Data Warehousing", "Transactional Replication", "Clustering", "Partitioning", "Hasura", "Database-as-API"],
            "tools": ["Red-Gate", "SQL Server Data Tools", "SQLPackage.exe", "Azure Data Factory", "BCP"]
        }'::jsonb
    ),
    (
        'contact',
        '{
            "linkedin": "https://www.linkedin.com/in/jason-rowland-6712097",
            "github": "https://github.com/dfw-dba"
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
