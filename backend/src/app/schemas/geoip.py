import re

from pydantic import BaseModel, field_validator

# EventBridge cron: cron(minutes hours day-of-month month day-of-week year)
# We only support: cron(0 H ? * DAYS *) where H is 0-23 and DAYS is comma-separated
_CRON_RE = re.compile(
    r"^cron\(0 (?:[0-9]|1[0-9]|2[0-3]) \? \* "
    r"(?:(?:MON|TUE|WED|THU|FRI|SAT|SUN)(?:,(?:MON|TUE|WED|THU|FRI|SAT|SUN))*)"
    r" \*\)$"
)


class GeoipScheduleUpdate(BaseModel):
    """Schema for updating the GeoIP refresh schedule."""

    cron_expression: str
    description: str

    @field_validator("cron_expression")
    @classmethod
    def validate_cron(cls, v: str) -> str:
        if not _CRON_RE.match(v):
            msg = (
                "Invalid cron expression. "
                "Expected format: cron(0 HOUR ? * DAY1,DAY2 *) "
                "where HOUR is 0-23 and DAYs are MON-SUN."
            )
            raise ValueError(msg)
        return v
