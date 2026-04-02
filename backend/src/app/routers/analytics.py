import re
from typing import Any

from fastapi import APIRouter, Depends, Request

from src.app.dependencies import get_db_api
from src.app.middleware.rate_limit import limiter
from src.app.schemas.analytics import AnalyticsEvent, PageViewEvent, VisitorEvent
from src.app.services.db_functions import DatabaseAPI

router = APIRouter()

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
