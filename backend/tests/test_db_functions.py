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


# ===========================================================================
# Blog
# ===========================================================================


async def test_get_blog_posts_default(db_api: DatabaseAPI) -> None:
    """get_blog_posts() with defaults returns a dict with pagination keys."""
    result = _parse(await db_api.get_blog_posts())
    assert isinstance(result, dict)
    assert "posts" in result
    assert "total" in result
    assert "limit" in result
    assert "offset" in result


async def test_get_blog_posts_with_tag(db_api: DatabaseAPI) -> None:
    """get_blog_posts(tag=...) accepts a tag parameter without error."""
    result = _parse(await db_api.get_blog_posts(tag="nonexistent-tag"))
    assert isinstance(result, dict)
    assert "posts" in result


async def test_get_blog_posts_pagination(db_api: DatabaseAPI) -> None:
    """get_blog_posts() respects limit and offset parameters."""
    result = _parse(await db_api.get_blog_posts(limit=5, offset=0))
    assert isinstance(result, dict)
    assert result["limit"] == 5
    assert result["offset"] == 0


async def test_get_blog_post_by_slug(db_api: DatabaseAPI) -> None:
    """Creating a blog post then fetching it by slug returns the post."""
    slug = _unique("blog")
    post_data = {
        "slug": slug,
        "title": f"Test Post {slug}",
        "excerpt": "A test excerpt.",
        "content": "# Hello\n\nThis is test content.",
        "tags": ["testing", "integration"],
        "published": True,
    }

    await db_api.upsert_blog_post(post_data)
    await db_api.session.flush()

    fetched = _parse(await db_api.get_blog_post(slug))
    assert isinstance(fetched, dict)
    assert fetched["slug"] == slug
    assert fetched["title"] == post_data["title"]


async def test_get_blog_post_not_found(db_api: DatabaseAPI) -> None:
    """Fetching a non-existent blog post slug returns None or an error dict."""
    result = await db_api.get_blog_post("absolutely-does-not-exist-" + _unique())
    parsed = _parse(result) if result is not None else None

    # The stored function may return null, an empty dict, or an error object.
    # Any of these is acceptable — we just confirm it does not raise.
    assert parsed is None or isinstance(parsed, dict)


async def test_upsert_and_delete_blog_post(db_api: DatabaseAPI) -> None:
    """Full lifecycle: create -> read -> update -> delete a blog post."""
    slug = _unique("lifecycle")

    # Create (published=True so get_blog_post can find it)
    create_data = {
        "slug": slug,
        "title": "Original Title",
        "content": "Original content.",
        "tags": ["test"],
        "published": True,
    }
    created = _parse(await db_api.upsert_blog_post(create_data))
    assert created is not None
    await db_api.session.flush()

    # Read
    fetched = _parse(await db_api.get_blog_post(slug))
    assert isinstance(fetched, dict)
    assert fetched["title"] == "Original Title"

    # Update
    update_data = {
        "slug": slug,
        "title": "Updated Title",
        "content": "Updated content.",
        "tags": ["test", "updated"],
        "published": True,
    }
    updated = _parse(await db_api.upsert_blog_post(update_data))
    assert updated is not None
    await db_api.session.flush()

    fetched_again = _parse(await db_api.get_blog_post(slug))
    assert isinstance(fetched_again, dict)
    assert fetched_again["title"] == "Updated Title"

    # Delete
    delete_result = _parse(await db_api.delete_blog_post(slug))
    assert delete_result is not None


# ===========================================================================
# Showcase
# ===========================================================================


async def test_get_showcase_items(db_api: DatabaseAPI) -> None:
    """get_showcase_items() returns a list."""
    result = _parse(await db_api.get_showcase_items())
    assert isinstance(result, list)


async def test_get_showcase_items_by_category(db_api: DatabaseAPI) -> None:
    """get_showcase_items(category=...) accepts a category filter."""
    result = _parse(await db_api.get_showcase_items(category="web"))
    assert isinstance(result, list)


async def test_get_showcase_item_by_slug(db_api: DatabaseAPI) -> None:
    """Creating a showcase item then fetching it by slug returns the item."""
    slug = _unique("showcase")
    item_data = {
        "slug": slug,
        "title": f"Test Project {slug}",
        "description": "A test showcase project.",
        "content": "# Project\n\nDetailed description.",
        "category": "web",
        "technologies": ["Python", "FastAPI"],
        "demo_url": "https://example.com",
        "repo_url": "https://github.com/test/test",
        "sort_order": 0,
    }

    await db_api.upsert_showcase_item(item_data)
    await db_api.session.flush()

    fetched = _parse(await db_api.get_showcase_item(slug))
    assert isinstance(fetched, dict)
    assert fetched["slug"] == slug
    assert fetched["title"] == item_data["title"]


async def test_upsert_and_delete_showcase_item(db_api: DatabaseAPI) -> None:
    """Full lifecycle: create -> read -> update -> delete a showcase item."""
    slug = _unique("sc-life")

    # Create
    create_data = {
        "slug": slug,
        "title": "Original Project",
        "category": "data-engineering",
        "technologies": ["Spark"],
        "sort_order": 1,
    }
    created = _parse(await db_api.upsert_showcase_item(create_data))
    assert created is not None
    await db_api.session.flush()

    # Read
    fetched = _parse(await db_api.get_showcase_item(slug))
    assert isinstance(fetched, dict)
    assert fetched["title"] == "Original Project"

    # Update
    update_data = {
        "slug": slug,
        "title": "Updated Project",
        "category": "data-engineering",
        "technologies": ["Spark", "Airflow"],
        "sort_order": 2,
    }
    updated = _parse(await db_api.upsert_showcase_item(update_data))
    assert updated is not None
    await db_api.session.flush()

    fetched_again = _parse(await db_api.get_showcase_item(slug))
    assert isinstance(fetched_again, dict)
    assert fetched_again["title"] == "Updated Project"

    # Delete
    delete_result = _parse(await db_api.delete_showcase_item(slug))
    assert delete_result is not None


# ===========================================================================
# Albums / Media
# ===========================================================================


async def test_get_albums(db_api: DatabaseAPI) -> None:
    """get_albums() returns a list."""
    result = _parse(await db_api.get_albums())
    assert isinstance(result, list)


async def test_get_albums_by_category(db_api: DatabaseAPI) -> None:
    """get_albums(category=...) accepts a category filter."""
    result = _parse(await db_api.get_albums(category="family"))
    assert isinstance(result, list)


async def test_get_album_with_media(db_api: DatabaseAPI) -> None:
    """Creating an album then fetching it with media returns the album."""
    slug = _unique("album")
    album_data = {
        "slug": slug,
        "title": f"Test Album {slug}",
        "description": "A test album.",
        "category": "vacation",
        "sort_order": 0,
    }

    await db_api.upsert_album(album_data)
    await db_api.session.flush()

    fetched = _parse(await db_api.get_album_with_media(slug))
    assert isinstance(fetched, dict)
    assert fetched["slug"] == slug
    assert "media" in fetched


async def test_get_album_not_found(db_api: DatabaseAPI) -> None:
    """Fetching a non-existent album slug returns None or an error dict."""
    result = await db_api.get_album_with_media("no-such-album-" + _unique())
    parsed = _parse(result) if result is not None else None

    assert parsed is None or isinstance(parsed, dict)


async def test_upsert_and_delete_album(db_api: DatabaseAPI) -> None:
    """Full lifecycle: create -> read -> update -> delete an album."""
    slug = _unique("alb-life")

    # Create
    create_data = {
        "slug": slug,
        "title": "Original Album",
        "category": "professional",
        "sort_order": 0,
    }
    created = _parse(await db_api.upsert_album(create_data))
    assert created is not None
    await db_api.session.flush()

    # Read
    fetched = _parse(await db_api.get_album_with_media(slug))
    assert isinstance(fetched, dict)
    assert fetched["title"] == "Original Album"

    # Update
    update_data = {
        "slug": slug,
        "title": "Updated Album",
        "category": "professional",
        "description": "Now with a description.",
        "sort_order": 1,
    }
    updated = _parse(await db_api.upsert_album(update_data))
    assert updated is not None
    await db_api.session.flush()

    fetched_again = _parse(await db_api.get_album_with_media(slug))
    assert isinstance(fetched_again, dict)
    assert fetched_again["title"] == "Updated Album"

    # Delete
    delete_result = _parse(await db_api.delete_album(slug))
    assert delete_result is not None


# ===========================================================================
# Edge Cases
# ===========================================================================


async def test_blog_post_published_at_set_on_publish(db_api: DatabaseAPI) -> None:
    """When a blog post is published, published_at should be set."""
    slug = _unique("pub-at")

    # Create as unpublished
    post_data = {
        "slug": slug,
        "title": "Publish Timestamp Test",
        "content": "Testing published_at field.",
        "tags": [],
        "published": False,
    }
    create_result = _parse(await db_api.upsert_blog_post(post_data))
    assert create_result is not None
    await db_api.session.flush()

    # Now publish
    post_data["published"] = True
    publish_result = _parse(await db_api.upsert_blog_post(post_data))
    assert publish_result is not None
    await db_api.session.flush()

    fetched = _parse(await db_api.get_blog_post(slug))
    assert isinstance(fetched, dict)
    assert fetched.get("published") is True
    assert fetched.get("published_at") is not None, (
        "published_at should be set when a post is published"
    )


async def test_register_media(db_api: DatabaseAPI) -> None:
    """Registering a media item returns a record with an id."""
    media_data = {
        "s3_key": f"uploads/{uuid.uuid4()}/test-image.jpg",
        "filename": "test-image.jpg",
        "content_type": "image/jpeg",
        "size_bytes": 123456,
        "width": 1920,
        "height": 1080,
        "caption": "A test image",
        "sort_order": 0,
    }

    result = _parse(await db_api.register_media(media_data))
    assert result is not None
    assert isinstance(result, dict)
    assert "id" in result


async def test_delete_album_nullifies_media(db_api: DatabaseAPI) -> None:
    """Deleting an album should leave media intact but set album_id to null."""
    album_slug = _unique("alb-null")

    # Create album
    album_data = {
        "slug": album_slug,
        "title": "Album to Delete",
        "category": "family",
        "sort_order": 0,
    }
    album_result = _parse(await db_api.upsert_album(album_data))
    assert isinstance(album_result, dict)
    album_id = album_result.get("id")
    assert album_id is not None, f"Expected 'id' in album result, got: {album_result}"
    await db_api.session.flush()

    # Register media linked to this album
    media_data = {
        "s3_key": f"uploads/{uuid.uuid4()}/album-test.png",
        "filename": "album-test.png",
        "content_type": "image/png",
        "size_bytes": 54321,
        "album_id": album_id,
        "sort_order": 0,
    }
    media_result = _parse(await db_api.register_media(media_data))
    assert isinstance(media_result, dict)
    media_id = media_result.get("id")
    assert media_id is not None
    await db_api.session.flush()

    # Delete the album
    delete_result = _parse(await db_api.delete_album(album_slug))
    assert delete_result is not None
    await db_api.session.flush()

    # Verify media still exists by querying the category that the album was in.
    # The media should still be in the database, but its album_id should be null.
    # We use a raw query to check the media record directly.
    from sqlalchemy import text

    row = await db_api.session.execute(
        text("SELECT id, album_id FROM internal.media_items WHERE id = CAST(:id AS uuid)"),
        {"id": media_id},
    )
    media_row = row.first()
    assert media_row is not None, "Media should still exist after album deletion"
    assert media_row.album_id is None, (
        f"Media album_id should be null after album deletion, got: {media_row.album_id}"
    )
