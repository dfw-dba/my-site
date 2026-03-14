-- 05_seed_data.sql
-- Sample seed data for local development.
-- All inserts are idempotent: they only run if the target table is empty.
-- This file uses fictional names and companies — safe to share publicly.

-- ============================================================
--  Resume Title
-- ============================================================
do $$
begin
    if not exists (select 1 from internal.resume_title limit 1) then
        insert into internal.resume_title (title) values ('Jane Doe');
    end if;
end
$$;

-- ============================================================
--  Professional Entries
-- ============================================================
do $$
begin
    if not exists (select 1 from internal.professional_entries limit 1) then
        insert into internal.professional_entries
            (entry_type, title, organization, location, start_date, end_date, description, highlights, technologies, sort_order)
        values
            (
                'work',
                'Sr Database Engineer',
                'Acme Technologies',
                null,
                '2024-03-01',
                null,
                'Architect and optimize highly scalable PostgreSQL solutions within a single-tenant cloud architecture, delivering a database-as-API layer through GraphQL endpoints backed by PL/pgSQL functions.',
                '["Designed and implemented a single-tenant database architecture on AWS, enabling isolated, enterprise-scale workloads per client",
                  "Built a database-as-API layer using GraphQL endpoints and role-based access control, reducing back-end development cycles",
                  "Drove database architecture decisions across engineering teams, establishing standards for schema design, indexing, and query performance"]'::jsonb,
                '["PostgreSQL", "GraphQL", "AWS", "Database Modeling", "PL/pgSQL"]'::jsonb,
                1
            ),
            (
                'work',
                'Database Administrator',
                'Pinnacle Health Systems',
                null,
                '2023-11-01',
                '2024-03-01',
                'Administered enterprise SQL Server environments, spearheading encryption modernization and cloud migration initiatives for healthcare data systems.',
                '["Led migration from third-party encryption to native SQL Server Transparent Data Encryption, strengthening data-at-rest security while reducing operational complexity",
                  "Executed on-premises SQL Server to Azure migration, coordinating cutover planning and validation across development and infrastructure teams",
                  "Maintained 24/7 on-call production support for mission-critical database systems serving healthcare operations"]'::jsonb,
                '["SQL Server", "Azure", "Transparent Data Encryption", "Database Migration"]'::jsonb,
                2
            ),
            (
                'work',
                'Data Engineer',
                'Summit Analytics',
                null,
                '2020-08-01',
                '2023-11-01',
                'Delivered BI solutions and database DevOps automation within the Data Services team, engineering data warehouse pipelines and CI/CD workflows for enterprise database deployments.',
                '["Implemented table partitioning across the warehouse data model, cutting post-period-close processing from 72 hours to 12 hours — an 83% reduction",
                  "Designed and implemented an automated change data capture pipeline to generate incremental delta and full historical CSV extracts for 300+ tables, orchestrated via cloud workflows and delivered securely over SSH",
                  "Engineered CI/CD pipelines enabling repeatable, automated database deployments across environments",
                  "Migrated cloud data pipelines during a platform transition, ensuring zero data loss",
                  "Developed and supported back-end ETL processes for data warehousing and automated report delivery",
                  "Mentored new hires on data engineering practices and led technical screening interviews"]'::jsonb,
                '["SQL Server", "SSIS", "SSRS", "Azure DevOps", "YAML", "PowerShell", "Data Warehousing"]'::jsonb,
                3
            ),
            (
                'work',
                'Database Engineer',
                'Meridian Financial',
                null,
                '2019-12-01',
                '2020-08-01',
                'Owned end-to-end database design and development for a fintech platform, driving performance optimization, data modeling, and CI/CD adoption across the engineering organization.',
                '["Designed normalized physical and logical database models translating complex financial business rules into scalable schemas",
                  "Mentored the development team on data modeling best practices and performant SQL, elevating overall query quality",
                  "Established CI/CD pipelines for database changes, bringing version control and automated deployment to the data layer",
                  "Delivered database solutions powering both internal operations and client-facing applications"]'::jsonb,
                '["SQL Server", "T-SQL", "Azure DevOps", "Database Design", "CI/CD"]'::jsonb,
                4
            ),
            (
                'work',
                'Lead Sr Database Administrator',
                'Nova Retail Group',
                null,
                '2012-09-01',
                '2019-12-01',
                'Primary DBA supporting an international ERP system spanning 20+ instances from megabytes to multi-terabyte scale. Implemented performance tuning solutions, replication topology, and 24/7 production operations.',
                '["Planned and executed major version migrations across multiple clustered instances with zero unplanned downtime",
                  "Reduced ETL run times by 50% by implementing change tracking and asynchronous data loading patterns",
                  "Improved data warehouse query performance by realigning partition schemes, eliminating excessive I/O",
                  "Designed and implemented enterprise data migration for regulatory compliance, encrypting customer data across international databases",
                  "Eliminated recurring transaction log growth incidents by redesigning purge routines with asynchronous processing",
                  "Overhauled index maintenance strategy using parallel workflows, reclaiming hours from nightly maintenance windows",
                  "Published technical article on a community blog"]'::jsonb,
                '["SQL Server", "T-SQL", "SSIS", "SSRS", "PowerShell", "Clustering", "Transactional Replication"]'::jsonb,
                5
            );
    end if;
end
$$;

-- ============================================================
--  Performance Reviews
-- ============================================================
do $$
begin
    if not exists (select 1 from internal.performance_reviews limit 1) then
        insert into internal.performance_reviews (entry_id, reviewer_name, reviewer_title, review_date, review_text, sort_order)
        values
            -- Acme Technologies (3 reviews)
            (
                (select id from internal.professional_entries where organization = 'Acme Technologies' limit 1),
                'Director of Engineering',
                'Engineering Leadership',
                '2024-09-15',
                'Jane has quickly become a cornerstone of our database engineering practice. Her ability to translate complex business requirements into elegant, performant database architectures is exceptional.',
                1
            ),
            (
                (select id from internal.professional_entries where organization = 'Acme Technologies' limit 1),
                'Senior Software Engineer',
                'Platform Team',
                '2024-09-15',
                'Working with Jane has elevated our entire team''s understanding of database design. She doesn''t just solve problems — she teaches us how to think about data.',
                2
            ),
            (
                (select id from internal.professional_entries where organization = 'Acme Technologies' limit 1),
                'VP of Technology',
                'Executive Leadership',
                '2025-03-01',
                'Jane consistently delivers high-impact solutions. Her single-tenant architecture design has become the foundation for our enterprise scaling strategy.',
                3
            ),
            -- Summit Analytics (4 reviews)
            (
                (select id from internal.professional_entries where organization = 'Summit Analytics' limit 1),
                'Data Services Manager',
                'Direct Manager',
                '2021-06-01',
                'Jane''s table partitioning implementation was a game-changer — cutting processing time by 83% was beyond our most optimistic projections. She approaches every problem methodically and delivers results.',
                1
            ),
            (
                (select id from internal.professional_entries where organization = 'Summit Analytics' limit 1),
                'Senior Developer',
                'Application Development',
                '2022-01-15',
                'The CI/CD pipelines Jane built transformed how we deploy database changes. What used to be a nerve-wracking manual process is now reliable and repeatable.',
                2
            ),
            (
                (select id from internal.professional_entries where organization = 'Summit Analytics' limit 1),
                'Director of Data Services',
                'Department Leadership',
                '2022-06-01',
                'Jane is the rare engineer who excels at both individual contribution and mentorship. New hires consistently cite her onboarding guidance as instrumental to their ramp-up.',
                3
            ),
            (
                (select id from internal.professional_entries where organization = 'Summit Analytics' limit 1),
                'Cloud Infrastructure Lead',
                'DevOps Team',
                '2023-06-01',
                'During our cloud platform migration, Jane''s meticulous planning ensured zero data loss. Her cross-team collaboration made a complex project feel manageable.',
                4
            ),
            -- Nova Retail Group (5 reviews)
            (
                (select id from internal.professional_entries where organization = 'Nova Retail Group' limit 1),
                'IT Director',
                'Enterprise Systems',
                '2014-03-01',
                'Jane owns the ERP database infrastructure with a level of care and expertise that gives us complete confidence in our data systems. Her proactive approach prevents issues before they become incidents.',
                1
            ),
            (
                (select id from internal.professional_entries where organization = 'Nova Retail Group' limit 1),
                'Senior DBA',
                'Database Team',
                '2015-09-01',
                'Jane''s database migration plan was flawless — zero unplanned downtime across 20+ instances. Her technical depth in clustering and replication is outstanding.',
                2
            ),
            (
                (select id from internal.professional_entries where organization = 'Nova Retail Group' limit 1),
                'ETL Development Lead',
                'Data Warehouse Team',
                '2016-06-01',
                'The 50% ETL performance improvement Jane delivered was transformative for our data warehouse operations. She has an intuitive sense for where bottlenecks hide.',
                3
            ),
            (
                (select id from internal.professional_entries where organization = 'Nova Retail Group' limit 1),
                'VP of International IT',
                'International Operations',
                '2018-03-01',
                'Jane''s compliance data migration project was critical to our international operations. She designed an elegant solution that handled encryption across multiple databases seamlessly.',
                4
            ),
            (
                (select id from internal.professional_entries where organization = 'Nova Retail Group' limit 1),
                'Manager of Database Administration',
                'Direct Manager',
                '2019-06-01',
                'Over seven years, Jane has grown from a strong individual contributor to a technical leader. Her published article reflects her commitment to the broader database community.',
                5
            );
    end if;
end
$$;

-- ============================================================
--  Resume Summary
-- ============================================================
do $$
begin
    if not exists (select 1 from internal.resume_summary limit 1) then
        insert into internal.resume_summary (headline, text)
        values
        (
            null,
            'Database engineer with 12+ years of experience architecting, optimizing, and operating database environments at enterprise scale. Proven track record delivering high-impact migrations, performance tuning, CI/CD automation, and data warehouse solutions.'
        );
    end if;
end
$$;

-- ============================================================
--  Resume Contact
-- ============================================================
do $$
begin
    if not exists (select 1 from internal.resume_contact limit 1) then
        insert into internal.resume_contact (linkedin, github, email)
        values
        (
            'https://www.linkedin.com/in/jane-doe',
            'https://github.com/jane-doe',
            'jane.doe@example.com'
        );
    end if;
end
$$;

-- ============================================================
--  Resume Recommendations
-- ============================================================
do $$
begin
    if not exists (select 1 from internal.resume_recommendations limit 1) then
        insert into internal.resume_recommendations (author, title, text, sort_order)
        values
            (
                'Maria Chen',
                'Senior Database Developer at CloudFirst',
                'Jane is that database professional any company wants and wishes they could clone. Always stays abreast of the latest trends in the database world, with exemplary troubleshooting ability and easy to work with.',
                1
            ),
            (
                'David Park',
                'VP Product Development and Strategy',
                'Jane has a tremendous amount of personal integrity, a strong work ethic, and goes above and beyond when it comes to tackling her assignments. Paired with her superior database skills, Jane possesses a robust mix of experience that makes her an asset to any team.',
                2
            ),
            (
                'Sarah Mitchell',
                'CTO at Greenfield Software',
                'Jane is a talented database engineer and very committed to the systems she administers. A constant learner, Jane digs into the systems and technologies she is responsible for to understand why and how they work and does not accept that, when they work well, they cannot work better.',
                3
            ),
            (
                'Robert Nguyen',
                'Principal Security Architect at Sentinel Corp',
                'Jane is an excellent database professional. As a team lead, I frequently sought Jane''s opinion when designing database schemas for our applications. She would be a wonderful asset to any company.',
                4
            );
    end if;
end
$$;
