import re
from typing import Any

from fastapi import APIRouter, Depends, Request

from src.app.dependencies import get_db_api
from src.app.middleware.rate_limit import limiter
from src.app.schemas.analytics import AnalyticsEvent, PageViewEvent, VisitorEvent
from src.app.services.db_functions import DatabaseAPI

router = APIRouter()


def _build_analytics_filters(
    start_date: str | None,
    end_date: str | None,
    exclude_bots: bool,
    device_type: str | None,
    browser: str | None,
    os: str | None,
    country_code: str | None,
    region: str | None,
    city: str | None,
    page_path: str | None = None,
) -> dict[str, Any]:
    filters: dict[str, Any] = {"exclude_bots": exclude_bots}
    if start_date:
        filters["start_date"] = start_date
    if end_date:
        filters["end_date"] = end_date
    if page_path:
        filters["page_path"] = page_path
    for key, val in (
        ("device_type", device_type),
        ("browser", browser),
        ("os", os),
        ("country_code", country_code),
        ("region", region),
        ("city", city),
    ):
        if val:
            filters[key] = val
    return filters


_BOT_PATTERNS = re.compile(
    r"(?i)"
    r"(?:Googlebot|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot"
    r"|facebookexternalhit|Twitterbot|LinkedInBot|Applebot|Discordbot"
    r"|Slackbot|WhatsApp|TelegramBot|PinterestBot|Semrushbot|AhrefsBot"
    r"|MJ12bot|DotBot|PetalBot|Bytespider"
    r"|HeadlessChrome|PhantomJS|Puppeteer|Playwright"
    r"|bot|crawler|spider|scraper)"
)


def _is_bot(user_agent: str | None) -> bool:
    if not user_agent or not user_agent.strip():
        return True
    return bool(_BOT_PATTERNS.search(user_agent))


@router.post("/event")
@limiter.limit("30/minute")
async def record_analytics_event(
    request: Request,
    body: AnalyticsEvent,
    db: DatabaseAPI = Depends(get_db_api),
) -> Any:
    """Record a page view or visitor event. Public, rate-limited."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    is_bot_request = _is_bot(user_agent)

    if isinstance(body, PageViewEvent):
        data = body.data.model_dump()
        data["client_ip"] = client_ip
        data["is_bot"] = is_bot_request
        return await db.insert_page_view(data)

    if isinstance(body, VisitorEvent):
        data = body.data.model_dump()
        return await db.insert_visitor_event(data)


# ── Public Analytics Read Endpoints ─────────────────────────────────────────


@router.get("/summary")
@limiter.limit("30/minute")
async def get_public_analytics_summary(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    start_date: str | None = None,
    end_date: str | None = None,
    page_path: str | None = None,
    exclude_bots: bool = True,
    device_type: str | None = None,
    browser: str | None = None,
    os: str | None = None,
    country_code: str | None = None,
    region: str | None = None,
    city: str | None = None,
) -> Any:
    """Public visitor analytics summary."""
    filters = _build_analytics_filters(
        start_date,
        end_date,
        exclude_bots,
        device_type,
        browser,
        os,
        country_code,
        region,
        city,
        page_path,
    )
    return await db.get_analytics_summary(filters)


@router.get("/visitors")
@limiter.limit("30/minute")
async def get_public_analytics_visitors(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    start_date: str | None = None,
    end_date: str | None = None,
    exclude_bots: bool = True,
    device_type: str | None = None,
    browser: str | None = None,
    os: str | None = None,
    country_code: str | None = None,
    region: str | None = None,
    city: str | None = None,
) -> Any:
    """Public visitor-level analytics (aggregate metrics only)."""
    filters = _build_analytics_filters(
        start_date,
        end_date,
        exclude_bots,
        device_type,
        browser,
        os,
        country_code,
        region,
        city,
    )
    result = await db.get_analytics_visitors(filters)
    # Strip per-session/per-visitor detail from public response
    if isinstance(result, dict):
        result.pop("top_sessions", None)
        result.pop("return_visitors", None)
    return result


@router.get("/geo")
@limiter.limit("30/minute")
async def get_public_analytics_geo(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    start_date: str | None = None,
    end_date: str | None = None,
    exclude_bots: bool = True,
    device_type: str | None = None,
    browser: str | None = None,
    os: str | None = None,
    country_code: str | None = None,
    region: str | None = None,
    city: str | None = None,
) -> Any:
    """Public geographic breakdown of visitors."""
    filters = _build_analytics_filters(
        start_date,
        end_date,
        exclude_bots,
        device_type,
        browser,
        os,
        country_code,
        region,
        city,
    )
    return await db.get_analytics_geo(filters)


@router.get("/timeseries")
@limiter.limit("30/minute")
async def get_public_analytics_timeseries(
    request: Request,
    db: DatabaseAPI = Depends(get_db_api),
    start_date: str | None = None,
    end_date: str | None = None,
    exclude_bots: bool = True,
    device_type: str | None = None,
    browser: str | None = None,
    os: str | None = None,
    country_code: str | None = None,
    region: str | None = None,
    city: str | None = None,
) -> Any:
    """Public daily page view and unique visitor time series."""
    filters = _build_analytics_filters(
        start_date,
        end_date,
        exclude_bots,
        device_type,
        browser,
        os,
        country_code,
        region,
        city,
    )
    return await db.get_analytics_timeseries(filters)
