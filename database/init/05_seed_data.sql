-- 05_seed_data.sql
-- Realistic seed data for local development.
-- All inserts are idempotent: they only run if the target table is empty.

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
                'Verra Mobility',
                null,
                '2024-03-01',
                null,
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
                null,
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
                null,
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
                null,
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
                null,
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
            -- Verra Mobility (3 reviews)
            (
                (select id from internal.professional_entries where organization = 'Verra Mobility' limit 1),
                'Director of Engineering',
                'Engineering Leadership',
                '2024-09-15',
                'Jason has quickly become a cornerstone of our database engineering practice. His ability to translate complex business requirements into elegant, performant database architectures is exceptional.',
                1
            ),
            (
                (select id from internal.professional_entries where organization = 'Verra Mobility' limit 1),
                'Senior Software Engineer',
                'Platform Team',
                '2024-09-15',
                'Working with Jason has elevated our entire team''s understanding of database design. He doesn''t just solve problems — he teaches us how to think about data.',
                2
            ),
            (
                (select id from internal.professional_entries where organization = 'Verra Mobility' limit 1),
                'VP of Technology',
                'Executive Leadership',
                '2025-03-01',
                'Jason consistently delivers high-impact solutions. His single-tenant architecture design has become the foundation for our enterprise scaling strategy.',
                3
            ),
            -- StoneEagle (4 reviews)
            (
                (select id from internal.professional_entries where organization = 'StoneEagle' limit 1),
                'Data Services Manager',
                'Direct Manager',
                '2021-06-01',
                'Jason''s table partitioning implementation was a game-changer — cutting processing time by 83% was beyond our most optimistic projections. He approaches every problem methodically and delivers results.',
                1
            ),
            (
                (select id from internal.professional_entries where organization = 'StoneEagle' limit 1),
                'Senior Developer',
                'Application Development',
                '2022-01-15',
                'The CI/CD pipelines Jason built transformed how we deploy database changes. What used to be a nerve-wracking manual process is now reliable and repeatable.',
                2
            ),
            (
                (select id from internal.professional_entries where organization = 'StoneEagle' limit 1),
                'Director of Data Services',
                'Department Leadership',
                '2022-06-01',
                'Jason is the rare engineer who excels at both individual contribution and mentorship. New hires consistently cite his onboarding guidance as instrumental to their ramp-up.',
                3
            ),
            (
                (select id from internal.professional_entries where organization = 'StoneEagle' limit 1),
                'Cloud Infrastructure Lead',
                'DevOps Team',
                '2023-06-01',
                'During our cloud-to-cloud migration, Jason''s meticulous planning ensured zero data loss. His cross-team collaboration made a complex project feel manageable.',
                4
            ),
            -- GameStop (5 reviews)
            (
                (select id from internal.professional_entries where organization = 'GameStop' limit 1),
                'IT Director',
                'Enterprise Systems',
                '2014-03-01',
                'Jason owns the ERP database infrastructure with a level of care and expertise that gives us complete confidence in our data systems. His proactive approach prevents issues before they become incidents.',
                1
            ),
            (
                (select id from internal.professional_entries where organization = 'GameStop' limit 1),
                'Senior DBA',
                'Database Team',
                '2015-09-01',
                'Jason''s SQL Server migration plan was flawless — zero unplanned downtime across 20+ instances. His technical depth in clustering and replication is outstanding.',
                2
            ),
            (
                (select id from internal.professional_entries where organization = 'GameStop' limit 1),
                'ETL Development Lead',
                'Data Warehouse Team',
                '2016-06-01',
                'The 50% ETL performance improvement Jason delivered was transformative for our data warehouse operations. He has an intuitive sense for where bottlenecks hide.',
                3
            ),
            (
                (select id from internal.professional_entries where organization = 'GameStop' limit 1),
                'VP of International IT',
                'International Operations',
                '2018-03-01',
                'Jason''s GDPR data migration project was critical to our international compliance. He designed an elegant solution that handled encryption across multiple Navision databases seamlessly.',
                4
            ),
            (
                (select id from internal.professional_entries where organization = 'GameStop' limit 1),
                'Manager of Database Administration',
                'Direct Manager',
                '2019-06-01',
                'Over seven years, Jason has grown from a strong individual contributor to a technical leader. His published article on SQLServerCentral reflects his commitment to the broader DBA community.',
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
            'Database engineer with 12+ years of experience architecting, optimizing, and operating SQL Server and PostgreSQL environments at enterprise scale. Proven track record delivering high-impact database migrations, performance tuning, CI/CD automation, and data warehouse solutions. Published author on SQLServerCentral.com.'
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
            'https://www.linkedin.com/in/jason-rowland-6712097',
            'https://github.com/dfw-dba',
            'email@jasonrowland.me'
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
                'Eduardo Camacho',
                'Senior Database Developer/Administrator at TeamHealth',
                'Jason is that database professional any company wants and wishes they could clone. Always stays abreast of the latest trends in the database world, exemplary troubleshooting ability and easy to get along with.',
                1
            ),
            (
                'Stephen Swienton',
                'VP Product Development and Strategy',
                'Jason has a tremendous amount of personal integrity, a strong work ethic and goes above and beyond when it comes to tackling his assignments. Partnered with his superior SQL/DBA skills, Jason possesses a robust mix of experience that makes him an attractive hire to any perspective employer.',
                2
            ),
            (
                'Ben Gatzke',
                'CEO at BorrowWorks',
                'Jason is a talented DBA and very committed to the systems he administers. A constant learner, Jason digs into the systems and technologies he is responsible for to understand why and how they work and does not accept that, when they work well, they cannot work better. Jason''s creativity is bounded only by his prudence. Two thumbs up for Jason!',
                3
            ),
            (
                'Prodip K. Saha, MBA',
                'Information Security Architect Principal at Fannie Mae',
                'Jason is an excellent Database Administrator. As a Team Lead, I frequented Jason to get his opinion when designing database schema for my applications. I think he would be an wonderful asset to any company.',
                4
            );
    end if;
end
$$;
