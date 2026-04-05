import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status

from src.app.dependencies import get_admin_auth, get_db_api, get_storage
from src.app.middleware.rate_limit import limiter
from src.app.schemas.logs import PurgeLogs
from src.app.schemas.resume import (
    PerformanceReviewCreate,
    ResumeContactCreate,
    ResumeEntryCreate,
    ResumeRecommendationsReplace,
    ResumeSummaryCreate,
    ResumeTitleCreate,
)
from src.app.services.db_functions import DatabaseAPI
from src.app.services.storage import StorageService

router = APIRouter()


# ── Resume ───────────────────────────────────────────────────────────────────


@router.post("/resume/entry", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def upsert_resume_entry(
    request: Request,
    body: ResumeEntryCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update a professional entry."""
    return await db.upsert_professional_entry(body.model_dump())


@router.delete("/resume/entry/{entry_id}", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def delete_resume_entry(
    request: Request,
    entry_id: int,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Delete a professional entry by ID."""
    return await db.delete_professional_entry(entry_id)


@router.post("/resume/review", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def upsert_performance_review(
    request: Request,
    body: PerformanceReviewCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update a performance review."""
    return await db.upsert_performance_review(body.model_dump())


@router.delete("/resume/review/{review_id}", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def delete_performance_review(
    request: Request,
    review_id: int,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Delete a performance review by ID."""
    return await db.delete_performance_review(review_id)


@router.post("/resume/title", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def upsert_resume_title(
    request: Request,
    body: ResumeTitleCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update the resume title."""
    return await db.upsert_resume_title(body.model_dump())


@router.post("/resume/summary", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def upsert_resume_summary(
    request: Request,
    body: ResumeSummaryCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update the resume summary."""
    return await db.upsert_resume_summary(body.model_dump())


@router.post("/resume/contact", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def upsert_resume_contact(
    request: Request,
    body: ResumeContactCreate,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Create or update the resume contact info."""
    return await db.upsert_resume_contact(body.model_dump())


@router.post("/resume/recommendations", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def replace_resume_recommendations(
    request: Request,
    body: ResumeRecommendationsReplace,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Replace all resume recommendations."""
    return await db.replace_resume_recommendations([item.model_dump() for item in body.items])


# ── Logs ───────────────────────────────────────────────────────────────────


@router.get("/logs", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_logs(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    level: str | None = None,
    search: str | None = None,
    client_ip: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> Any:
    """Fetch paginated application logs with optional filters."""
    filters: dict[str, Any] = {"limit": limit, "offset": offset}
    if level:
        filters["level"] = level
    if search:
        filters["search"] = search
    if client_ip:
        filters["client_ip"] = client_ip
    return await db.get_app_logs(filters)


@router.get("/logs/stats", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_log_stats(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Fetch application log stats for the last 24 hours."""
    return await db.get_app_log_stats()


@router.get("/logs/threats", dependencies=[Depends(get_admin_auth)])
@limiter.limit("30/minute")
async def get_threat_detections(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    days: int = Query(default=30, ge=1, le=90),
    client_ip: str | None = None,
) -> Any:
    """Fetch detected threat patterns from application logs."""
    filters: dict[str, Any] = {"days": days}
    if client_ip:
        filters["client_ip"] = client_ip
    return await db.get_threat_detections(filters)


@router.post("/logs/purge", dependencies=[Depends(get_admin_auth)])
@limiter.limit("5/minute")
async def purge_logs(
    request: Request,
    body: PurgeLogs,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Delete application logs older than the specified number of days."""
    return await db.purge_app_logs(body.days)


# ── Database Metrics ─────────────────────────────────────────────────────


@router.get("/metrics/overview", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_metrics_overview(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Fetch database-level overview stats from latest snapshot."""
    return await db.get_db_overview()


@router.get("/metrics/queries", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_slow_queries(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    sort_by: str = Query(
        default="total_exec_time",
        pattern="^(total_exec_time|mean_exec_time|calls)$",
    ),
    limit: int = Query(default=20, ge=1, le=100),
    min_calls: int = Query(default=1, ge=1),
) -> Any:
    """Fetch top queries by execution time from latest snapshot."""
    return await db.get_slow_queries({"sort_by": sort_by, "limit": limit, "min_calls": min_calls})


@router.get("/metrics/plan-instability", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_plan_instability(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    limit: int = Query(default=20, ge=1, le=100),
    min_calls: int = Query(default=5, ge=1),
) -> Any:
    """Fetch queries with high execution time variance (plan instability)."""
    return await db.get_plan_instability({"limit": limit, "min_calls": min_calls})


@router.get("/metrics/tables", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_table_stats(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Fetch table access patterns from latest snapshot."""
    return await db.get_table_stats()


@router.get("/metrics/indexes", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_index_usage(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Fetch index usage stats from latest snapshot."""
    return await db.get_index_usage()


@router.get("/metrics/functions", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_function_stats(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Fetch function performance stats from latest snapshot."""
    return await db.get_function_stats()


@router.post("/metrics/capture", dependencies=[Depends(get_admin_auth)])
@limiter.limit("5/minute")
async def capture_metrics(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Manually trigger a database metrics snapshot."""
    return await db.capture_db_metrics("manual")


# ── Analytics ───────────────────────────────────────────────────────────────


@router.get("/analytics/summary", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_analytics_summary(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    start_date: str | None = None,
    end_date: str | None = None,
    page_path: str | None = None,
    exclude_bots: bool = True,
) -> Any:
    """Fetch visitor analytics summary dashboard data."""
    filters: dict[str, Any] = {"exclude_bots": exclude_bots}
    if start_date:
        filters["start_date"] = start_date
    if end_date:
        filters["end_date"] = end_date
    if page_path:
        filters["page_path"] = page_path
    return await db.get_analytics_summary(filters)


@router.get("/analytics/visitors", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_analytics_visitors(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    start_date: str | None = None,
    end_date: str | None = None,
    exclude_bots: bool = True,
) -> Any:
    """Fetch visitor-level analytics: sessions, return visitors."""
    filters: dict[str, Any] = {"exclude_bots": exclude_bots}
    if start_date:
        filters["start_date"] = start_date
    if end_date:
        filters["end_date"] = end_date
    return await db.get_analytics_visitors(filters)


@router.get("/analytics/geo", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_analytics_geo(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    start_date: str | None = None,
    end_date: str | None = None,
    exclude_bots: bool = True,
) -> Any:
    """Fetch geographic breakdown of visitors."""
    filters: dict[str, Any] = {"exclude_bots": exclude_bots}
    if start_date:
        filters["start_date"] = start_date
    if end_date:
        filters["end_date"] = end_date
    return await db.get_analytics_geo(filters)


@router.get("/analytics/timeseries", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_analytics_timeseries(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    start_date: str | None = None,
    end_date: str | None = None,
    exclude_bots: bool = True,
) -> Any:
    """Fetch daily page view and unique visitor time series."""
    filters: dict[str, Any] = {"exclude_bots": exclude_bots}
    if start_date:
        filters["start_date"] = start_date
    if end_date:
        filters["end_date"] = end_date
    return await db.get_analytics_timeseries(filters)


_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
_EXT_MAP = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

_MAGIC_BYTES: dict[str, list[bytes]] = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],
}


@router.post("/resume/profile-image", dependencies=[Depends(get_admin_auth)])
@limiter.limit("5/minute")
async def upload_profile_image(
    request: Request,
    file: UploadFile,
    db: DatabaseAPI = Depends(get_db_api),
    storage: StorageService = Depends(get_storage),
) -> Any:
    """Upload a profile image to S3 and save the URL to the database."""
    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type: {file.content_type}. Allowed: jpeg, png, webp",
        )

    file_data = await file.read()

    signatures = _MAGIC_BYTES.get(file.content_type, [])
    if not any(file_data.startswith(sig) for sig in signatures):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match declared type.",
        )
    if file.content_type == "image/webp" and file_data[8:12] != b"WEBP":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match declared type.",
        )

    if len(file_data) > _MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 5 MB.",
        )

    ext = _EXT_MAP[file.content_type]
    key = f"media/profile/profile-image.{ext}"
    url = storage.upload_file(file_data, key, file.content_type)

    cache_buster = f"?v={int(time.time())}"
    url_with_version = f"{url}{cache_buster}"
    await db.upsert_resume_profile_image({"image_url": url_with_version})

    return {"success": True, "image_url": url_with_version}


# ── GeoIP ─────────────────────────────────────────────────────────────────


@router.get("/geoip/logs", dependencies=[Depends(get_admin_auth)])
@limiter.limit("60/minute")
async def get_geoip_update_logs(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> Any:
    """Fetch paginated GeoIP update log history."""
    return await db.get_geoip_update_logs({"limit": limit, "offset": offset})


@router.get("/geoip/task-status", dependencies=[Depends(get_admin_auth)])
@limiter.limit("120/minute")
async def get_geoip_task_status(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Fetch the latest GeoIP task run status.

    When a task is still pending (no DB progress yet), checks S3 for a
    status file written by the trigger Lambda. This surfaces Lambda/ECS
    failures immediately instead of waiting for the 30-min timeout.
    """
    from src.app.services.geoip_trigger import check_geoip_trigger_status

    result = await db.get_geoip_task_status()
    if not result:
        return result

    # If the DB still shows pending, check S3 for Lambda-level feedback
    if result.get("status") == "pending":
        run_id = result.get("id")
        if run_id:
            trigger_status = check_geoip_trigger_status(run_id)
            if trigger_status:
                if trigger_status.get("status") == "failed":
                    # Lambda or ECS RunTask failed — update DB and return
                    await db.update_geoip_task_run(
                        {
                            "run_id": run_id,
                            "status": "failed",
                            "error_message": trigger_status.get("error", "Trigger Lambda failed"),
                        }
                    )
                    result["status"] = "failed"
                    result["error_message"] = trigger_status.get("error", "Trigger Lambda failed")
                elif trigger_status.get("task_arn"):
                    # ECS task was started — update task_arn in DB
                    await db.update_geoip_task_run(
                        {
                            "run_id": run_id,
                            "task_arn": trigger_status["task_arn"],
                        }
                    )
                    result["task_arn"] = trigger_status["task_arn"]

    return result


@router.post("/geoip/trigger", dependencies=[Depends(get_admin_auth)])
@limiter.limit("2/minute")
async def trigger_geoip_update(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Trigger a manual GeoIP data update via ECS Fargate."""
    from src.app.services.geoip_trigger import trigger_geoip_update as do_trigger

    # Check if a task is already running
    current = await db.get_geoip_task_status()
    if current and current.get("status") in ("pending", "running"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A GeoIP update task is already running",
        )

    # Create pending run record
    run_result = await db.create_geoip_task_run({"triggered_by": "manual"})
    run_id = run_result["id"]

    # Write S3 trigger file (invokes the non-VPC trigger Lambda)
    do_trigger(run_id)

    return {"success": True, "run_id": run_id}


@router.get("/geoip/task-progress", dependencies=[Depends(get_admin_auth)])
@limiter.limit("120/minute")
async def get_geoip_task_progress(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    run_id: int = Query(ge=1),
    after_id: int = Query(default=0, ge=0),
) -> Any:
    """Fetch progress lines for a GeoIP task run."""
    return await db.get_geoip_task_progress({"run_id": run_id, "after_id": after_id})
