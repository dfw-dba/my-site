"""
CDK Custom Resource handler for RDS database migration.
Executes SQL init scripts (00–05) to set up schemas, tables, functions,
permissions, and seed data. Connects using master credentials passed via
environment variables.
"""

import glob
import os
import ssl

import pg8000.native


def split_sql_statements(sql_text):
    """Split SQL text into individual statements, respecting dollar-quoted blocks.

    A simple state machine that tracks whether we're inside a $$-quoted block
    so that semicolons within function bodies / DO blocks are not treated as
    statement separators.
    """
    statements = []
    current = []
    in_dollar_quote = False
    i = 0

    while i < len(sql_text):
        char = sql_text[i]

        if char == "$" and i + 1 < len(sql_text) and sql_text[i + 1] == "$":
            current.append("$$")
            in_dollar_quote = not in_dollar_quote
            i += 2
            continue

        if char == ";" and not in_dollar_quote:
            stmt = "".join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []
        else:
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
        sql_dir = os.path.join(os.path.dirname(__file__), "sql")
        sql_files = sorted(glob.glob(os.path.join(sql_dir, "*.sql")))

        print(f"Found {len(sql_files)} SQL files in {sql_dir}")

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

        print("All SQL files executed successfully")

    finally:
        conn.close()

    return {"Status": "SUCCESS", "PhysicalResourceId": "db-migration"}
