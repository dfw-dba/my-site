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
        'Architect and optimize highly scalable PostgreSQL solutions within a single-tenant AWS architecture, delivering a database-as-API layer through Hasura REST endpoints backed by PL/pgSQL functions.',
        '["Designed and implemented a single-tenant database architecture on AWS, enabling isolated, enterprise-scale workloads per client",
          "Built a database-as-API layer using Hasura REST endpoints and role-based access control, reducing back-end development cycles",
          "Drove database architecture decisions across engineering teams, establishing standards for schema design, indexing, and query performance"]'::jsonb,
        '["PostgreSQL", "Hasura", "AWS", "Hasura REST APIs", "Hasura RBAC", "Database Modeling", "PL/pgSQL"]'::jsonb,
        1
    ),
    (
        'work',
        'Database Administrator',
        'American Specialty Health',
        NULL,
        '2023-11-01',
        '2024-03-01',
        'Administered enterprise SQL Server environments, spearheading encryption modernization and cloud migration initiatives for healthcare data systems.',
        '["Assisted migration from Vormetric DSM to native SQL Server Transparent Data Encryption, strengthening data-at-rest security while reducing operational complexity",
          "Executed on-premises SQL Server to Azure migration, coordinating cutover planning and validation across development and infrastructure teams",
          "Maintained 24/7 on-call production support for mission-critical database systems serving healthcare operations"]'::jsonb,
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
        'Delivered BI solutions and database DevOps automation within the Data Services team, engineering data warehouse pipelines and CI/CD workflows for enterprise database deployments.',
        '["Implemented table partitioning across the warehouse data model, cutting post-period-close processing from 72 hours to 12 hours — an 83% reduction",
          "Designed and implemented an automated change data capture pipeline in Azure SQL Database using Change Tracking and trigger-based auditing to generate incremental delta and full historical CSV extracts for 300+ tables, orchestrated via Azure Data Factory and delivered securely over SSH; enhanced Azure DevOps deployment pipelines to selectively enable the feature for a single tenant in a multi-tenant environment and built monitoring procedures to track end-to-end processing status.",
          "Engineered CI/CD pipelines using SQL Server Data Tools, SQLPackage.exe, YAML, and PowerShell in Azure DevOps, enabling repeatable, automated database deployments",
          "Migrated Azure Data Factory pipelines to SSIS packages during a cloud-to-cloud transition from Azure to AWS, ensuring zero data loss",
          "Developed and supported back-end ETL processes for data warehousing, OLAP cube processing, and automated SSRS report delivery",
          "Mentored new hires on data engineering practices and led technical screening interviews for the Data Services team"]'::jsonb,
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
        'Owned end-to-end database design and development for a fintech platform, driving performance optimization, data modeling, and CI/CD adoption across the engineering organization.',
        '["Designed normalized physical and logical database models translating complex mortgage-lending business rules into scalable schemas",
          "Mentored the development team on data modeling best practices and performant T-SQL, elevating overall query quality",
          "Established CI/CD pipelines using Visual Studio, SQL Server Data Tools, and Azure DevOps, bringing version control and automated deployment to database changes",
          "Delivered database solutions powering both internal operations and client-facing loan-processing applications"]'::jsonb,
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
        'Primary DBA supporting an international ERP system spanning 20+ instances from megabytes to multi-terabyte scale. Implemented performance tuning solutions, replication topology, and 24/7 production operations.',
        '["Planned and executed SQL Server 2008 R2 to 2016 migrations across multiple clustered instances with zero unplanned downtime",
          "Reduced ETL run times by 50% by implementing change tracking and asynchronous data loading patterns",
          "Improved data warehouse query performance by realigning fact table and OLAP cube partition schemes, eliminating excessive I/O",
          "Designed and implemented enterprise data migration for GDPR compliance, migrating and encrypting customer data across international Navision databases using PowerShell, BCP, and parallel execution",
          "Eliminated recurring transaction log growth incidents by redesigning purge routines with Service Broker for asynchronous processing",
          "Overhauled index maintenance strategy using T-SQL and PowerShell parallel workflows, reclaiming hours from nightly maintenance windows",
          "Published technical article on SQLServerCentral.com"]'::jsonb,
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
            "text": "Database engineer with 12+ years of experience architecting, optimizing, and operating SQL Server and PostgreSQL environments at enterprise scale. Proven track record delivering high-impact database migrations, performance tuning, CI/CD automation, and data warehouse solutions. Published author on SQLServerCentral.com."
        }'::jsonb
    ),
    (
        'skills',
        '{
            "databases": ["MSSQL", "PostgreSQL", "SQL Server", "Analysis Services (SSAS)"],
            "development": ["T-SQL", "Python", "PowerShell", "YAML", "SSIS", "SSRS", "SSDT"],
            "devops": ["Azure DevOps", "CI/CD Pipelines", "Docker", "Git"],
            "architecture": ["Database Design", "Performance Tuning", "Data Warehousing", "Transactional Replication", "Clustering", "Partitioning", "Hasura", "Database-as-API"],
            "cloud": ["Azure Data Factory", "AWS Aurora Serverless"],
            "tools": ["Red-Gate", "SQL Server Data Tools", "SQLPackage.exe", "BCP"]
        }'::jsonb
    ),
    (
        'contact',
        '{
            "linkedin": "https://www.linkedin.com/in/jason-rowland-6712097",
            "github": "https://github.com/dfw-dba"
        }'::jsonb
    ),
    (
        'recommendations',
        '{
            "items": [
                {
                    "author": "Eduardo Camacho",
                    "title": "Senior Database Developer/Administrator at TeamHealth",
                    "text": "Jason is that database professional any company wants and wishes they could clone. Always stays abreast of the latest trends in the database world, exemplary troubleshooting ability and easy to get along with."
                },
                {
                    "author": "Stephen Swienton",
                    "title": "VP Product Development and Strategy",
                    "text": "Jason has a tremendous amount of personal integrity, a strong work ethic and goes above and beyond when it comes to tackling his assignments. Partnered with his superior SQL/DBA skills, Jason possesses a robust mix of experience that makes him an attractive hire to any perspective employer."
                },
                {
                    "author": "Ben Gatzke",
                    "title": "CEO at BorrowWorks",
                    "text": "Jason is a talented DBA and very committed to the systems he administers. A constant learner, Jason digs into the systems and technologies he is responsible for to understand why and how they work and does not accept that, when they work well, they cannot work better. Jason''s creativity is bounded only by his prudence. Two thumbs up for Jason!"
                },
                {
                    "author": "Prodip K. Saha, MBA",
                    "title": "Information Security Architect Principal at Fannie Mae",
                    "text": "Jason is an excellent Database Administrator. As a Team Lead, I frequented Jason to get his opinion when designing database schema for my applications. I think he would be an wonderful asset to any company."
                }
            ]
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
