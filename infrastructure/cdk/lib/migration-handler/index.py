"""
CDK Custom Resource handler for RDS database migration.
Creates the lambda_iam user and grants required roles.
Connects using master credentials passed via environment variables.
"""

import os
import ssl

import pg8000.native


def handler(event, context):
    request_type = event.get("RequestType", "")

    # No-op on delete — don't drop users when tearing down the stack
    if request_type == "Delete":
        return {"Status": "SUCCESS", "PhysicalResourceId": "db-migration"}

    host = os.environ["DB_HOST"]
    port = int(os.environ["DB_PORT"])
    user = os.environ["DB_USER"]
    password = os.environ["DB_PASSWORD"]
    database = os.environ["DB_NAME"]

    ssl_context = ssl.create_default_context()

    conn = pg8000.native.Connection(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        ssl_context=ssl_context,
    )

    try:
        # Create lambda_iam user if it doesn't exist
        conn.run("""
            do $$
            begin
                if not exists (select 1 from pg_roles where rolname = 'lambda_iam') then
                    create user lambda_iam with login;
                end if;
            end
            $$;
        """)

        # Grant rds_iam to lambda_iam (only on RDS where rds_iam exists)
        conn.run("""
            do $$
            begin
                if exists (select 1 from pg_roles where rolname = 'rds_iam') then
                    execute 'grant rds_iam to lambda_iam';
                end if;
            end
            $$;
        """)

        # Create app_user role if it doesn't exist, then grant to lambda_iam
        conn.run("""
            do $$
            begin
                if not exists (select 1 from pg_roles where rolname = 'app_user') then
                    create role app_user nologin;
                end if;
            end
            $$;
        """)
        conn.run("grant app_user to lambda_iam")

    finally:
        conn.close()

    return {"Status": "SUCCESS", "PhysicalResourceId": "db-migration"}
