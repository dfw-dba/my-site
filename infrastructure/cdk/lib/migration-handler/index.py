"""
CDK Custom Resource handler for RDS database migration.
Phase 1: Executes idempotent init scripts (00–04) to set up schemas, tables,
functions, and permissions.
Phase 2: Runs migration files exactly once, tracked in internal.schema_migrations.
Connects using master credentials passed via environment variables.
"""

import glob
import os
import ssl

import pg8000.native


def split_sql_statements(sql_text):
    """Split SQL text into individual statements.

    A state machine that respects:
    - $$ dollar-quoted blocks (function bodies, DO blocks)
    - -- line comments (semicolons inside are not separators)
    - /* */ block comments
    - Single-quoted string literals
    """
    statements = []
    current = []
    i = 0
    in_dollar_quote = False
    in_line_comment = False
    in_block_comment = False
    in_string = False

    while i < len(sql_text):
        char = sql_text[i]

        # Line comment: skip until newline
        if in_line_comment:
            current.append(char)
            if char == "\n":
                in_line_comment = False
            i += 1
            continue

        # Block comment: skip until */
        if in_block_comment:
            current.append(char)
            if char == "*" and i + 1 < len(sql_text) and sql_text[i + 1] == "/":
                current.append("/")
                in_block_comment = False
                i += 2
            else:
                i += 1
            continue

        # String literal: skip until closing quote ('' is escaped quote)
        if in_string:
            current.append(char)
            if char == "'":
                if i + 1 < len(sql_text) and sql_text[i + 1] == "'":
                    current.append("'")
                    i += 2
                else:
                    in_string = False
                    i += 1
            else:
                i += 1
            continue

        # Dollar quoting toggle
        if char == "$" and i + 1 < len(sql_text) and sql_text[i + 1] == "$":
            current.append("$$")
            in_dollar_quote = not in_dollar_quote
            i += 2
            continue

        # Inside dollar quote: pass everything through
        if in_dollar_quote:
            current.append(char)
            i += 1
            continue

        # Start of line comment
        if char == "-" and i + 1 < len(sql_text) and sql_text[i + 1] == "-":
            current.append("--")
            in_line_comment = True
            i += 2
            continue

        # Start of block comment
        if char == "/" and i + 1 < len(sql_text) and sql_text[i + 1] == "*":
            current.append("/*")
            in_block_comment = True
            i += 2
            continue

        # Start of string literal
        if char == "'":
            current.append(char)
            in_string = True
            i += 1
            continue

        # Statement separator
        if char == ";":
            stmt = "".join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []
            i += 1
            continue

        current.append(char)
        i += 1

    # Capture any trailing statement without a semicolon
    stmt = "".join(current).strip()
    if stmt:
        statements.append(stmt)

    return statements


def handler(event, context):
    request_type = event.get("RequestType", "")

    # No-op on delete — don't drop anything when tearing down the stack
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
        # Phase 1: Init scripts (idempotent, run every deploy)
        sql_dir = os.path.join(os.path.dirname(__file__), "sql")
        sql_files = sorted(glob.glob(os.path.join(sql_dir, "*.sql")))

        print(f"Found {len(sql_files)} SQL init files in {sql_dir}")

        for sql_file in sql_files:
            filename = os.path.basename(sql_file)
            print(f"Executing {filename}...")

            with open(sql_file) as f:
                sql_text = f.read()

            statements = split_sql_statements(sql_text)
            print(f"  {len(statements)} statement(s)")

            for idx, stmt in enumerate(statements, 1):
                print(f"  [{idx}/{len(statements)}] {stmt[:80]}...")
                conn.run(stmt)

            print(f"  {filename} complete")

        print("All init files executed successfully")

        # Phase 2: Migrations (run exactly once, tracked in schema_migrations)
        migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
        migration_files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))

        print(f"Found {len(migration_files)} migration files in {migrations_dir}")

        for migration_file in migration_files:
            filename = os.path.basename(migration_file)

            already_applied = conn.run(
                "select 1 from internal.schema_migrations where filename = :fn",
                fn=filename,
            )

            if already_applied:
                print(f"Skipping {filename} (already applied)")
                continue

            print(f"Applying migration {filename}...")

            with open(migration_file) as f:
                sql_text = f.read()

            statements = split_sql_statements(sql_text)
            print(f"  {len(statements)} statement(s)")

            # Wrap each migration in a transaction so partial failures
            # roll back cleanly instead of leaving the DB inconsistent.
            conn.run("BEGIN")
            try:
                for idx, stmt in enumerate(statements, 1):
                    print(f"  [{idx}/{len(statements)}] {stmt[:80]}...")
                    conn.run(stmt)

                conn.run(
                    "insert into internal.schema_migrations (filename) values (:fn)",
                    fn=filename,
                )
                conn.run("COMMIT")
            except Exception:
                conn.run("ROLLBACK")
                raise

            print(f"  {filename} applied and recorded")

        print("All migrations processed successfully")

    finally:
        conn.close()

    return {"Status": "SUCCESS", "PhysicalResourceId": "db-migration"}
