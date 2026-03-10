"""Tests for the DatabaseAPI service layer against the real PostgreSQL database.

These tests call actual stored functions in the `api` schema and verify their
behavior.  Each test runs inside a transaction that is rolled back at teardown,
so the database is never permanently modified.

Requirements:
    - Docker PostgreSQL running on localhost:5433
    - Database "mysite" with all migrations applied
"""

import json
import uuid

from src.app.services.db_functions import DatabaseAPI

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _unique(prefix: str = "test") -> str:
    """Return a slug-safe unique string to avoid cross-test collisions."""
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def _parse(result):
    """Ensure a stored-function result is a Python dict/list, not a JSON string."""
    if isinstance(result, str):
        return json.loads(result)
    return result


# ===========================================================================
# Resume
# ===========================================================================


async def test_get_resume(db_api: DatabaseAPI) -> None:
    """get_resume() returns a dict with 'sections' and 'entries' keys."""
    result = _parse(await db_api.get_resume())
    assert isinstance(result, dict)
    assert "sections" in result
    assert "entries" in result


async def test_get_professional_timeline(db_api: DatabaseAPI) -> None:
    """get_professional_timeline() returns a list."""
    result = _parse(await db_api.get_professional_timeline())
    assert isinstance(result, list)


async def test_upsert_professional_entry(db_api: DatabaseAPI) -> None:
    """Inserting a professional entry makes it appear in the timeline."""
    entry_data = {
        "entry_type": "work",
        "title": f"Test Engineer {_unique()}",
        "organization": "Acme Corp",
        "location": "Remote",
        "start_date": "2023-01-01",
        "end_date": None,
        "description": "Integration test entry.",
        "highlights": ["Built things", "Fixed things"],
        "technologies": ["Python", "PostgreSQL"],
        "sort_order": 0,
    }

    upsert_result = _parse(await db_api.upsert_professional_entry(entry_data))
    assert upsert_result is not None

    await db_api.session.flush()

    timeline = _parse(await db_api.get_professional_timeline())
    assert isinstance(timeline, list)
    # At least one entry should now exist with our title
    titles = [e.get("title") for e in timeline if isinstance(e, dict)]
    assert entry_data["title"] in titles


async def test_upsert_resume_section(db_api: DatabaseAPI) -> None:
    """Upserting a resume section returns a success result."""
    section_data = {
        "section_type": "summary",
        "content": {"text": f"Test summary {_unique()}"},
    }

    upsert_result = _parse(await db_api.upsert_resume_section(section_data))
    assert upsert_result is not None
    assert isinstance(upsert_result, dict)


async def test_delete_professional_entry(db_api: DatabaseAPI) -> None:
    """Inserting then deleting a professional entry succeeds."""
    entry_data = {
        "entry_type": "education",
        "title": f"Test Degree {_unique()}",
        "organization": "Test University",
        "start_date": "2018-09-01",
        "end_date": "2022-05-15",
        "highlights": [],
        "technologies": [],
        "sort_order": 0,
    }

    created = _parse(await db_api.upsert_professional_entry(entry_data))
    assert created is not None

    # Extract the ID from the upsert result
    entry_id = created.get("id") if isinstance(created, dict) else None
    assert entry_id is not None, f"Expected 'id' in upsert result, got: {created}"

    await db_api.session.flush()

    delete_result = _parse(await db_api.delete_professional_entry(entry_id))
    assert delete_result is not None
