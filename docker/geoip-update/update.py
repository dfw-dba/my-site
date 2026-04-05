"""GeoLite2 City data refresh: download, bulk-load, atomic swap."""

import base64
import io
import json
import os
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

import boto3
import psycopg
from psycopg import sql


class _NoAuthRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Strip Authorization header on redirect.

    MaxMind returns a 302 to a presigned S3 URL. If the Authorization
    header is forwarded, S3 rejects it with HTTP 400.
    """

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        new_req = super().redirect_request(req, fp, code, msg, headers, newurl)
        if new_req is not None:
            new_req.remove_header("Authorization")
        return new_req


def _maxmind_auth_header(account_id: str, license_key: str) -> str:
    """Return the Basic auth header value for MaxMind downloads."""
    credentials = base64.b64encode(f"{account_id}:{license_key}".encode()).decode()
    return f"Basic {credentials}"


_opener = urllib.request.build_opener(_NoAuthRedirectHandler)

MAXMIND_URL = (
    "https://download.maxmind.com/geoip/databases/GeoLite2-City-CSV/download?suffix=zip"
)

# CSV file patterns inside the ZIP
LOCATIONS_FILE = "GeoLite2-City-Locations-en.csv"
NETWORKS_IPV4_FILE = "GeoLite2-City-Blocks-IPv4.csv"
NETWORKS_IPV6_FILE = "GeoLite2-City-Blocks-IPv6.csv"

# Staging table columns matching MaxMind CSV headers
NETWORKS_COLUMNS = [
    "network",
    "geoname_id",
    "registered_country_geoname_id",
    "represented_country_geoname_id",
    "is_anonymous_proxy",
    "is_satellite_provider",
    "postal_code",
    "latitude",
    "longitude",
    "accuracy_radius",
    "is_anycast",
]

LOCATIONS_COLUMNS = [
    "geoname_id",
    "locale_code",
    "continent_code",
    "continent_name",
    "country_iso_code",
    "country_name",
    "subdivision_1_iso_code",
    "subdivision_1_name",
    "subdivision_2_iso_code",
    "subdivision_2_name",
    "city_name",
    "metro_code",
    "time_zone",
    "is_in_european_union",
]


class ProgressLogger:
    """Log progress to stdout and optionally to the database.

    When GEOIP_RUN_ID is set (manual triggers), progress lines are inserted
    into internal.geoip_task_progress using a separate autocommit connection
    so they're visible even if the main transaction rolls back.
    """

    def __init__(self, conninfo: str | None = None) -> None:
        self.run_id = os.environ.get("GEOIP_RUN_ID")
        self.last_message = None
        self._conn = None
        if self.run_id and conninfo:
            self._conn = psycopg.connect(conninfo, autocommit=True)

    def log(self, message: str, level: str = "info") -> None:
        """Print to stdout and insert into DB if tracking a run."""
        self.last_message = message
        output = sys.stderr if level == "error" else sys.stdout
        print(message, file=output)
        if self._conn and self.run_id:
            self._conn.execute(
                "select api.insert_geoip_task_progress("
                "jsonb_build_object('run_id', %s::text, 'message', %s::text, 'level', %s::text))",
                (self.run_id, message, level),
            )

    def set_status(self, status: str, error_message: str | None = None) -> None:
        """Update the task run status in the database."""
        if not self._conn or not self.run_id:
            return
        params = {"run_id": self.run_id, "status": status}
        if error_message:
            params["error_message"] = error_message
        self._conn.execute(
            "select api.update_geoip_task_run(%s::jsonb)",
            (json.dumps(params),),
        )

    def close(self) -> None:
        if self._conn:
            self._conn.close()


def get_secret(secret_arn: str) -> dict:
    """Fetch a JSON secret from AWS Secrets Manager."""
    client = boto3.client("secretsmanager")
    resp = client.get_secret_value(SecretId=secret_arn)
    return json.loads(resp["SecretString"])


def get_db_connection_string() -> str:
    """Build a PostgreSQL connection string from env vars and Secrets Manager."""
    db_secret = get_secret(os.environ["DB_SECRET_ARN"])
    password = db_secret["password"]
    host = os.environ["DB_HOST"]
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ.get("DB_USER", "mysite")
    dbname = os.environ.get("DB_NAME", "mysite")
    return f"postgresql://{user}:{password}@{host}:{port}/{dbname}?sslmode=require"


def get_maxmind_credentials() -> tuple[str, str]:
    """Fetch MaxMind account_id and license_key from Secrets Manager."""
    secret = get_secret(os.environ["MAXMIND_SECRET_ARN"])
    return secret["account_id"], secret["license_key"]


def check_last_modified(account_id: str, license_key: str) -> str | None:
    """HEAD request to check Last-Modified header. Returns the header value."""
    req = urllib.request.Request(MAXMIND_URL, method="HEAD")
    req.add_header("Authorization", _maxmind_auth_header(account_id, license_key))

    try:
        with _opener.open(req) as resp:
            return resp.headers.get("Last-Modified")
    except urllib.error.HTTPError as e:
        print(f"HEAD request failed: {e.code} {e.reason}", file=sys.stderr)
        raise


def should_skip(conn: psycopg.Connection, last_modified: str | None) -> bool:
    """Check if we already loaded this version of the data."""
    if not last_modified:
        return False

    row = conn.execute(
        "select last_modified from internal.geoip_update_log "
        "where status = 'success' order by updated_at desc limit 1"
    ).fetchone()

    if row and row[0] == last_modified:
        return True
    return False


def download_and_extract(
    account_id: str, license_key: str, progress: ProgressLogger | None = None
) -> Path:
    """Download the GeoLite2 City CSV ZIP and extract to /tmp."""
    _log = progress.log if progress else print
    _log("Downloading GeoLite2 City CSV...")
    req = urllib.request.Request(MAXMIND_URL)
    req.add_header("Authorization", _maxmind_auth_header(account_id, license_key))

    with _opener.open(req) as resp:
        zip_data = resp.read()

    _log(f"Downloaded {len(zip_data) / 1024 / 1024:.1f} MB")

    extract_dir = Path("/tmp/geoip")
    if extract_dir.exists():
        import shutil

        shutil.rmtree(extract_dir)

    with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
        zf.extractall(extract_dir)

    return extract_dir


def find_csv(extract_dir: Path, filename: str) -> Path:
    """Find a CSV file inside the extracted ZIP (may be in a subdirectory)."""
    matches = list(extract_dir.rglob(filename))
    if not matches:
        raise FileNotFoundError(f"{filename} not found in {extract_dir}")
    return matches[0]


def copy_csv_to_staging(
    conn: psycopg.Connection,
    csv_path: Path,
    schema: str,
    table: str,
    columns: list[str],
) -> int:
    """Bulk-load a CSV into a staging table using COPY FROM STDIN."""
    qualified_table = sql.Identifier(schema, table)
    col_list = sql.SQL(", ").join(sql.Identifier(c) for c in columns)
    copy_query = sql.SQL("copy {} ({}) from stdin with (format csv)").format(
        qualified_table, col_list
    )
    count_query = sql.SQL("select count(*) from {}").format(qualified_table)

    with open(csv_path, "r") as f:
        # Skip the CSV header line
        header = f.readline()
        print(f"  CSV header: {header.strip()}")

        with conn.cursor().copy(copy_query) as copy:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                copy.write(chunk.encode())

    row_count = conn.execute(count_query).fetchone()[0]
    return row_count


def main() -> int:
    start_time = time.time()

    # Connect to DB first so progress/errors are visible in the admin UI.
    # MaxMind credentials are fetched later — if they fail, the error
    # is logged to the DB instead of silently timing out.
    conninfo = get_db_connection_string()

    # Initialize progress logger (writes to DB if GEOIP_RUN_ID is set)
    progress = ProgressLogger(conninfo)
    progress.set_status("running")

    try:
        account_id, license_key = get_maxmind_credentials()
        return _run_update(
            start_time, account_id, license_key, conninfo, progress
        )
    except Exception as e:
        progress.log(f"FATAL: {e}", level="error")
        progress.set_status("failed", error_message=str(e))
        raise
    finally:
        progress.close()


def _run_update(
    start_time: float,
    account_id: str,
    license_key: str,
    conninfo: str,
    progress: ProgressLogger,
) -> int:
    # Check Last-Modified
    last_modified = check_last_modified(account_id, license_key)
    progress.log(f"MaxMind Last-Modified: {last_modified}")

    with psycopg.connect(conninfo) as conn:
        if should_skip(conn, last_modified):
            progress.log("Data unchanged (Last-Modified matches). Skipping update.")
            progress.set_status("completed")
            return 0

    # Download and extract
    extract_dir = download_and_extract(account_id, license_key, progress)

    locations_csv = find_csv(extract_dir, LOCATIONS_FILE)
    networks_ipv4_csv = find_csv(extract_dir, NETWORKS_IPV4_FILE)
    networks_ipv6_csv = find_csv(extract_dir, NETWORKS_IPV6_FILE)

    with psycopg.connect(conninfo, autocommit=False) as conn:
        # Reset staging tables (drop + recreate to remove leftover indexes/constraints
        # from any previous failed run — TRUNCATE only removes rows)
        progress.log("Resetting staging tables...")
        conn.execute("drop table if exists staging.geoip2_networks")
        conn.execute("drop table if exists staging.geoip2_locations")
        conn.execute(
            "create table staging.geoip2_networks ("
            "  network cidr not null,"
            "  geoname_id int4,"
            "  registered_country_geoname_id int4,"
            "  represented_country_geoname_id int4,"
            "  is_anonymous_proxy bool,"
            "  is_satellite_provider bool,"
            "  postal_code text,"
            "  latitude numeric,"
            "  longitude numeric,"
            "  accuracy_radius int4,"
            "  is_anycast bool)"
        )
        conn.execute(
            "create table staging.geoip2_locations ("
            "  geoname_id int4 not null,"
            "  locale_code text not null,"
            "  continent_code text,"
            "  continent_name text,"
            "  country_iso_code text,"
            "  country_name text,"
            "  subdivision_1_iso_code text,"
            "  subdivision_1_name text,"
            "  subdivision_2_iso_code text,"
            "  subdivision_2_name text,"
            "  city_name text,"
            "  metro_code int4,"
            "  time_zone text,"
            "  is_in_european_union bool not null)"
        )
        conn.commit()

        # Load locations
        progress.log(f"Loading locations from {locations_csv.name}...")
        loc_count = copy_csv_to_staging(
            conn, locations_csv, "staging", "geoip2_locations", LOCATIONS_COLUMNS
        )
        conn.commit()
        progress.log(f"  Loaded {loc_count:,} location rows")

        # Load networks (IPv4 + IPv6)
        progress.log(f"Loading networks from {networks_ipv4_csv.name}...")
        net_count = copy_csv_to_staging(
            conn, networks_ipv4_csv, "staging", "geoip2_networks", NETWORKS_COLUMNS
        )
        conn.commit()
        progress.log(f"  Loaded {net_count:,} IPv4 network rows")

        progress.log(f"Loading networks from {networks_ipv6_csv.name}...")
        ipv6_count = copy_csv_to_staging(
            conn, networks_ipv6_csv, "staging", "geoip2_networks", NETWORKS_COLUMNS
        )
        conn.commit()
        net_count += ipv6_count
        progress.log(f"  Loaded {ipv6_count:,} IPv6 network rows ({net_count:,} total)")

        # Build indexes on staging tables before swap
        progress.log("Building GiST index on staging.geoip2_networks...")
        conn.execute(
            "create index idx_staging_geoip2_networks_network "
            "on staging.geoip2_networks using gist (network inet_ops)"
        )
        conn.commit()

        progress.log("Building PK on staging.geoip2_locations...")
        conn.execute(
            "alter table staging.geoip2_locations "
            "add primary key (geoname_id, locale_code)"
        )
        conn.commit()

        # Atomic swap
        progress.log("Performing atomic table swap...")
        conn.execute("select internal.geoip_swap_staging()")
        conn.commit()

        # Analyze new production tables
        progress.log("Analyzing new tables...")
        conn.execute("analyze internal.geoip2_networks")
        conn.execute("analyze internal.geoip2_locations")
        conn.commit()

        # Log success
        duration_ms = int((time.time() - start_time) * 1000)
        conn.execute(
            "insert into internal.geoip_update_log "
            "(network_rows, location_rows, duration_ms, last_modified, status, run_id, last_message) "
            "values (%s, %s, %s, %s, 'success', %s, %s)",
            (net_count, loc_count, duration_ms, last_modified,
             int(progress.run_id) if progress.run_id else None,
             progress.last_message),
        )
        conn.commit()

        progress.log(
            f"GeoIP update complete: {net_count:,} networks, {loc_count:,} locations "
            f"in {duration_ms / 1000:.1f}s"
        )
        progress.set_status("completed")

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"FATAL: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)
