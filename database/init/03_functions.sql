-- 03_functions.sql
-- All stored functions live in the api schema and return JSONB.

-- ============================================================
--  RESUME FUNCTIONS
-- ============================================================

-- api.get_resume()
-- Returns full resume: sections + professional entries grouped by type.
CREATE OR REPLACE FUNCTION api.get_resume()
RETURNS JSONB AS $$
DECLARE
    v_sections JSONB;
    v_entries  JSONB;
BEGIN
    -- Collect all resume sections keyed by section_type
    SELECT COALESCE(jsonb_object_agg(rs.section_type, rs.content), '{}'::jsonb)
      INTO v_sections
      FROM internal.resume_sections rs;

    -- Collect professional entries grouped by entry_type
    SELECT COALESCE(jsonb_object_agg(sub.entry_type, sub.items), '{}'::jsonb)
      INTO v_entries
      FROM (
          SELECT pe.entry_type,
                 jsonb_agg(
                     jsonb_build_object(
                         'id',           pe.id,
                         'title',        pe.title,
                         'organization', pe.organization,
                         'location',     pe.location,
                         'start_date',   pe.start_date,
                         'end_date',     pe.end_date,
                         'description',  pe.description,
                         'highlights',   pe.highlights,
                         'technologies', pe.technologies,
                         'sort_order',   pe.sort_order,
                         'performance_reviews', COALESCE(pr_agg.reviews, '[]'::jsonb)
                     ) ORDER BY pe.sort_order, pe.start_date DESC
                 ) AS items
            FROM internal.professional_entries pe
            LEFT JOIN LATERAL (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id',             pr.id,
                        'reviewer_name',  pr.reviewer_name,
                        'reviewer_title', pr.reviewer_title,
                        'review_date',    pr.review_date,
                        'text',           pr.review_text
                    ) ORDER BY pr.sort_order, pr.review_date DESC NULLS LAST
                ) AS reviews
                FROM internal.performance_reviews pr
                WHERE pr.entry_id = pe.id
            ) pr_agg ON TRUE
           GROUP BY pe.entry_type
      ) sub;

    RETURN jsonb_build_object(
        'sections', v_sections,
        'entries',  v_entries
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- api.get_professional_timeline()
-- Returns all entries ordered by start_date DESC.
CREATE OR REPLACE FUNCTION api.get_professional_timeline()
RETURNS JSONB AS $$
BEGIN
    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'id',           pe.id,
                'entry_type',   pe.entry_type,
                'title',        pe.title,
                'organization', pe.organization,
                'location',     pe.location,
                'start_date',   pe.start_date,
                'end_date',     pe.end_date,
                'description',  pe.description,
                'highlights',   pe.highlights,
                'technologies', pe.technologies,
                'sort_order',   pe.sort_order
            ) ORDER BY pe.start_date DESC
        )
        FROM internal.professional_entries pe
    ), '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;


-- api.upsert_professional_entry(p_data JSONB)
-- Insert or update a professional entry. If p_data contains an "id" key that
-- matches an existing row the row is updated; otherwise a new row is inserted.
CREATE OR REPLACE FUNCTION api.upsert_professional_entry(p_data JSONB)
RETURNS JSONB AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO internal.professional_entries (
        id, entry_type, title, organization, location,
        start_date, end_date, description, highlights, technologies, sort_order
    )
    VALUES (
        COALESCE((p_data->>'id')::UUID, uuid_generate_v4()),
        p_data->>'entry_type',
        p_data->>'title',
        p_data->>'organization',
        p_data->>'location',
        (p_data->>'start_date')::DATE,
        (p_data->>'end_date')::DATE,
        p_data->>'description',
        COALESCE(p_data->'highlights', '[]'::jsonb),
        COALESCE(p_data->'technologies', '[]'::jsonb),
        COALESCE((p_data->>'sort_order')::INTEGER, 0)
    )
    ON CONFLICT (id) DO UPDATE SET
        entry_type   = EXCLUDED.entry_type,
        title        = EXCLUDED.title,
        organization = EXCLUDED.organization,
        location     = EXCLUDED.location,
        start_date   = EXCLUDED.start_date,
        end_date     = EXCLUDED.end_date,
        description  = EXCLUDED.description,
        highlights   = EXCLUDED.highlights,
        technologies = EXCLUDED.technologies,
        sort_order   = EXCLUDED.sort_order
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id, 'success', TRUE);
END;
$$ LANGUAGE plpgsql VOLATILE;


-- api.upsert_resume_section(p_data JSONB)
-- Insert or update by section_type.
CREATE OR REPLACE FUNCTION api.upsert_resume_section(p_data JSONB)
RETURNS JSONB AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO internal.resume_sections (id, section_type, content)
    VALUES (
        COALESCE((p_data->>'id')::UUID, uuid_generate_v4()),
        p_data->>'section_type',
        p_data->'content'
    )
    ON CONFLICT (section_type) DO UPDATE SET
        content = EXCLUDED.content
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id, 'success', TRUE);
END;
$$ LANGUAGE plpgsql VOLATILE;


-- api.delete_professional_entry(p_id UUID)
CREATE OR REPLACE FUNCTION api.delete_professional_entry(p_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_count INT;
BEGIN
    DELETE FROM internal.professional_entries WHERE id = p_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', (v_count > 0)::BOOLEAN,
        'id',      p_id
    );
END;
$$ LANGUAGE plpgsql VOLATILE;


-- api.upsert_performance_review(p_data JSONB)
-- Insert or update a performance review. If p_data contains an "id" key that
-- matches an existing row the row is updated; otherwise a new row is inserted.
CREATE OR REPLACE FUNCTION api.upsert_performance_review(p_data JSONB)
RETURNS JSONB AS $$
DECLARE
    v_id INT;
BEGIN
    IF p_data ? 'id' AND p_data->>'id' IS NOT NULL THEN
        UPDATE internal.performance_reviews SET
            entry_id      = COALESCE((p_data->>'entry_id')::UUID, entry_id),
            reviewer_name = COALESCE(p_data->>'reviewer_name', reviewer_name),
            reviewer_title = p_data->>'reviewer_title',
            review_date   = (p_data->>'review_date')::DATE,
            review_text   = COALESCE(p_data->>'review_text', review_text),
            sort_order    = COALESCE((p_data->>'sort_order')::INT, sort_order)
        WHERE id = (p_data->>'id')::INT
        RETURNING id INTO v_id;
    ELSE
        INSERT INTO internal.performance_reviews (
            entry_id, reviewer_name, reviewer_title, review_date, review_text, sort_order
        )
        VALUES (
            (p_data->>'entry_id')::UUID,
            p_data->>'reviewer_name',
            p_data->>'reviewer_title',
            (p_data->>'review_date')::DATE,
            p_data->>'review_text',
            COALESCE((p_data->>'sort_order')::INT, 0)
        )
        RETURNING id INTO v_id;
    END IF;

    RETURN jsonb_build_object('id', v_id, 'success', TRUE);
END;
$$ LANGUAGE plpgsql VOLATILE;


-- api.delete_performance_review(p_id INT)
CREATE OR REPLACE FUNCTION api.delete_performance_review(p_id INT)
RETURNS JSONB AS $$
DECLARE
    v_count INT;
BEGIN
    DELETE FROM internal.performance_reviews WHERE id = p_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', (v_count > 0)::BOOLEAN,
        'id',      p_id
    );
END;
$$ LANGUAGE plpgsql VOLATILE;


-- ============================================================
--  BLOG FUNCTIONS
-- ============================================================

-- api.get_blog_posts(p_tag, p_limit, p_offset)
-- Paginated listing of published posts, optionally filtered by tag.
CREATE OR REPLACE FUNCTION api.get_blog_posts(
    p_tag    TEXT    DEFAULT NULL,
    p_limit  INT     DEFAULT 20,
    p_offset INT     DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_total INT;
    v_posts JSONB;
BEGIN
    SELECT COUNT(*)
      INTO v_total
      FROM internal.blog_posts bp
     WHERE bp.published = TRUE
       AND (p_tag IS NULL OR bp.tags ? p_tag);

    SELECT COALESCE(jsonb_agg(row_obj ORDER BY published_at DESC), '[]'::jsonb)
      INTO v_posts
      FROM (
          SELECT jsonb_build_object(
                     'id',           bp.id,
                     'slug',         bp.slug,
                     'title',        bp.title,
                     'excerpt',      bp.excerpt,
                     'tags',         bp.tags,
                     'published_at', bp.published_at,
                     'created_at',   bp.created_at
                 ) AS row_obj,
                 bp.published_at
            FROM internal.blog_posts bp
           WHERE bp.published = TRUE
             AND (p_tag IS NULL OR bp.tags ? p_tag)
           ORDER BY bp.published_at DESC
           LIMIT p_limit
          OFFSET p_offset
      ) sub;

    RETURN jsonb_build_object(
        'posts',  v_posts,
        'total',  v_total,
        'limit',  p_limit,
        'offset', p_offset
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- api.get_blog_post(p_slug)
-- Returns a single blog post by slug (published only).
CREATE OR REPLACE FUNCTION api.get_blog_post(p_slug TEXT)
RETURNS JSONB AS $$
DECLARE
    v_post JSONB;
BEGIN
    SELECT jsonb_build_object(
               'id',              bp.id,
               'slug',            bp.slug,
               'title',           bp.title,
               'excerpt',         bp.excerpt,
               'content',         bp.content,
               'tags',            bp.tags,
               'published',       bp.published,
               'showcase_item_id', bp.showcase_item_id,
               'published_at',    bp.published_at,
               'created_at',      bp.created_at,
               'updated_at',      bp.updated_at
           )
      INTO v_post
      FROM internal.blog_posts bp
     WHERE bp.slug = p_slug
       AND bp.published = TRUE;

    IF v_post IS NULL THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    RETURN v_post;
END;
$$ LANGUAGE plpgsql STABLE;


-- api.admin_get_blog_post(p_slug)
-- Returns a single blog post by slug (any status, for admin use).
CREATE OR REPLACE FUNCTION api.admin_get_blog_post(p_slug TEXT)
RETURNS JSONB AS $$
DECLARE
    v_post JSONB;
BEGIN
    SELECT jsonb_build_object(
               'id',              bp.id,
               'slug',            bp.slug,
               'title',           bp.title,
               'excerpt',         bp.excerpt,
               'content',         bp.content,
               'tags',            bp.tags,
               'published',       bp.published,
               'showcase_item_id', bp.showcase_item_id,
               'published_at',    bp.published_at,
               'created_at',      bp.created_at,
               'updated_at',      bp.updated_at
           )
      INTO v_post
      FROM internal.blog_posts bp
     WHERE bp.slug = p_slug;

    IF v_post IS NULL THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    RETURN v_post;
END;
$$ LANGUAGE plpgsql STABLE;


-- api.admin_get_blog_posts(p_limit, p_offset)
-- Paginated listing of ALL posts (including drafts) for admin use.
CREATE OR REPLACE FUNCTION api.admin_get_blog_posts(
    p_limit  INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_total INT;
    v_posts JSONB;
BEGIN
    SELECT COUNT(*) INTO v_total FROM internal.blog_posts;

    SELECT COALESCE(jsonb_agg(row_obj ORDER BY updated_at DESC), '[]'::jsonb)
      INTO v_posts
      FROM (
          SELECT jsonb_build_object(
                     'id',           bp.id,
                     'slug',         bp.slug,
                     'title',        bp.title,
                     'excerpt',      bp.excerpt,
                     'tags',         bp.tags,
                     'published',    bp.published,
                     'published_at', bp.published_at,
                     'created_at',   bp.created_at,
                     'updated_at',   bp.updated_at
                 ) AS row_obj,
                 bp.updated_at
            FROM internal.blog_posts bp
           ORDER BY bp.updated_at DESC
           LIMIT p_limit
          OFFSET p_offset
      ) sub;

    RETURN jsonb_build_object(
        'posts',  v_posts,
        'total',  v_total,
        'limit',  p_limit,
        'offset', p_offset
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- api.upsert_blog_post(p_data JSONB)
CREATE OR REPLACE FUNCTION api.upsert_blog_post(p_data JSONB)
RETURNS JSONB AS $$
DECLARE
    v_id   UUID;
    v_slug TEXT;
    v_now  TIMESTAMPTZ := NOW();
    v_published_at TIMESTAMPTZ;
BEGIN
    -- If publishing for the first time, set published_at
    v_published_at := CASE
        WHEN (p_data->>'published')::BOOLEAN = TRUE THEN COALESCE((p_data->>'published_at')::TIMESTAMPTZ, v_now)
        ELSE (p_data->>'published_at')::TIMESTAMPTZ
    END;

    INSERT INTO internal.blog_posts (
        id, slug, title, excerpt, content, tags, published, showcase_item_id, published_at
    )
    VALUES (
        COALESCE((p_data->>'id')::UUID, uuid_generate_v4()),
        p_data->>'slug',
        p_data->>'title',
        p_data->>'excerpt',
        p_data->>'content',
        COALESCE(p_data->'tags', '[]'::jsonb),
        COALESCE((p_data->>'published')::BOOLEAN, FALSE),
        (p_data->>'showcase_item_id')::UUID,
        v_published_at
    )
    ON CONFLICT (slug) DO UPDATE SET
        title           = EXCLUDED.title,
        excerpt         = EXCLUDED.excerpt,
        content         = EXCLUDED.content,
        tags            = EXCLUDED.tags,
        published       = EXCLUDED.published,
        showcase_item_id = EXCLUDED.showcase_item_id,
        published_at    = COALESCE(EXCLUDED.published_at, internal.blog_posts.published_at)
    RETURNING id, slug INTO v_id, v_slug;

    RETURN jsonb_build_object('id', v_id, 'slug', v_slug, 'success', TRUE);
END;
$$ LANGUAGE plpgsql VOLATILE;


-- api.delete_blog_post(p_slug TEXT)
CREATE OR REPLACE FUNCTION api.delete_blog_post(p_slug TEXT)
RETURNS JSONB AS $$
DECLARE
    v_count INT;
BEGIN
    DELETE FROM internal.blog_posts WHERE slug = p_slug;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', (v_count > 0)::BOOLEAN,
        'slug',    p_slug
    );
END;
$$ LANGUAGE plpgsql VOLATILE;


-- ============================================================
--  SHOWCASE FUNCTIONS
-- ============================================================

-- api.get_showcase_items(p_category)
CREATE OR REPLACE FUNCTION api.get_showcase_items(p_category TEXT DEFAULT NULL)
RETURNS JSONB AS $$
BEGIN
    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'id',           si.id,
                'slug',         si.slug,
                'title',        si.title,
                'description',  si.description,
                'category',     si.category,
                'technologies', si.technologies,
                'demo_url',     si.demo_url,
                'repo_url',     si.repo_url,
                'sort_order',   si.sort_order
            ) ORDER BY si.sort_order, si.created_at DESC
        )
        FROM internal.showcase_items si
        WHERE (p_category IS NULL OR si.category = p_category)
    ), '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;


-- api.get_showcase_item(p_slug)
CREATE OR REPLACE FUNCTION api.get_showcase_item(p_slug TEXT)
RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
BEGIN
    SELECT jsonb_build_object(
               'id',           si.id,
               'slug',         si.slug,
               'title',        si.title,
               'description',  si.description,
               'content',      si.content,
               'category',     si.category,
               'technologies', si.technologies,
               'demo_url',     si.demo_url,
               'repo_url',     si.repo_url,
               'sort_order',   si.sort_order,
               'created_at',   si.created_at,
               'updated_at',   si.updated_at
           )
      INTO v_item
      FROM internal.showcase_items si
     WHERE si.slug = p_slug;

    IF v_item IS NULL THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    RETURN v_item;
END;
$$ LANGUAGE plpgsql STABLE;


-- api.upsert_showcase_item(p_data JSONB)
CREATE OR REPLACE FUNCTION api.upsert_showcase_item(p_data JSONB)
RETURNS JSONB AS $$
DECLARE
    v_id   UUID;
    v_slug TEXT;
BEGIN
    INSERT INTO internal.showcase_items (
        id, slug, title, description, content, category,
        technologies, demo_url, repo_url, sort_order
    )
    VALUES (
        COALESCE((p_data->>'id')::UUID, uuid_generate_v4()),
        p_data->>'slug',
        p_data->>'title',
        p_data->>'description',
        p_data->>'content',
        p_data->>'category',
        COALESCE(p_data->'technologies', '[]'::jsonb),
        p_data->>'demo_url',
        p_data->>'repo_url',
        COALESCE((p_data->>'sort_order')::INTEGER, 0)
    )
    ON CONFLICT (slug) DO UPDATE SET
        title        = EXCLUDED.title,
        description  = EXCLUDED.description,
        content      = EXCLUDED.content,
        category     = EXCLUDED.category,
        technologies = EXCLUDED.technologies,
        demo_url     = EXCLUDED.demo_url,
        repo_url     = EXCLUDED.repo_url,
        sort_order   = EXCLUDED.sort_order
    RETURNING id, slug INTO v_id, v_slug;

    RETURN jsonb_build_object('id', v_id, 'slug', v_slug, 'success', TRUE);
END;
$$ LANGUAGE plpgsql VOLATILE;


-- api.delete_showcase_item(p_slug TEXT)
CREATE OR REPLACE FUNCTION api.delete_showcase_item(p_slug TEXT)
RETURNS JSONB AS $$
DECLARE
    v_count INT;
BEGIN
    DELETE FROM internal.showcase_items WHERE slug = p_slug;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', (v_count > 0)::BOOLEAN,
        'slug',    p_slug
    );
END;
$$ LANGUAGE plpgsql VOLATILE;


-- ============================================================
--  MEDIA / ALBUM FUNCTIONS
-- ============================================================

-- api.get_albums(p_category)
-- Album listing with cover image info when available.
CREATE OR REPLACE FUNCTION api.get_albums(p_category TEXT DEFAULT NULL)
RETURNS JSONB AS $$
BEGIN
    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'id',          a.id,
                'slug',        a.slug,
                'title',       a.title,
                'description', a.description,
                'category',    a.category,
                'sort_order',  a.sort_order,
                'cover_image', CASE
                    WHEN mi.id IS NOT NULL THEN jsonb_build_object(
                        'id',           mi.id,
                        's3_key',       mi.s3_key,
                        'filename',     mi.filename,
                        'content_type', mi.content_type,
                        'width',        mi.width,
                        'height',       mi.height
                    )
                    ELSE NULL
                END,
                'media_count', (
                    SELECT COUNT(*) FROM internal.media_items m2 WHERE m2.album_id = a.id
                )
            ) ORDER BY a.sort_order, a.created_at DESC
        )
        FROM internal.albums a
        LEFT JOIN internal.media_items mi ON mi.id = a.cover_image_id
        WHERE (p_category IS NULL OR a.category = p_category)
    ), '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;


-- api.get_album_with_media(p_slug)
CREATE OR REPLACE FUNCTION api.get_album_with_media(p_slug TEXT)
RETURNS JSONB AS $$
DECLARE
    v_album JSONB;
    v_album_id UUID;
    v_media JSONB;
BEGIN
    SELECT a.id,
           jsonb_build_object(
               'id',          a.id,
               'slug',        a.slug,
               'title',       a.title,
               'description', a.description,
               'category',    a.category,
               'sort_order',  a.sort_order,
               'created_at',  a.created_at,
               'updated_at',  a.updated_at
           )
      INTO v_album_id, v_album
      FROM internal.albums a
     WHERE a.slug = p_slug;

    IF v_album IS NULL THEN
        RETURN jsonb_build_object('error', 'not_found');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',           mi.id,
            's3_key',       mi.s3_key,
            'filename',     mi.filename,
            'content_type', mi.content_type,
            'size_bytes',   mi.size_bytes,
            'width',        mi.width,
            'height',       mi.height,
            'caption',      mi.caption,
            'sort_order',   mi.sort_order,
            'created_at',   mi.created_at
        ) ORDER BY mi.sort_order, mi.created_at
    ), '[]'::jsonb)
      INTO v_media
      FROM internal.media_items mi
     WHERE mi.album_id = v_album_id;

    RETURN v_album || jsonb_build_object('media', v_media);
END;
$$ LANGUAGE plpgsql STABLE;


-- api.get_media_by_category(p_category, p_limit, p_offset)
-- Direct media listing for a given album category.
CREATE OR REPLACE FUNCTION api.get_media_by_category(
    p_category TEXT,
    p_limit    INT DEFAULT 50,
    p_offset   INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_total INT;
    v_items JSONB;
BEGIN
    SELECT COUNT(*)
      INTO v_total
      FROM internal.media_items mi
      JOIN internal.albums a ON a.id = mi.album_id
     WHERE a.category = p_category;

    SELECT COALESCE(jsonb_agg(row_obj ORDER BY sort_order, created_at), '[]'::jsonb)
      INTO v_items
      FROM (
          SELECT jsonb_build_object(
                     'id',           mi.id,
                     'album_id',     mi.album_id,
                     'album_title',  a.title,
                     's3_key',       mi.s3_key,
                     'filename',     mi.filename,
                     'content_type', mi.content_type,
                     'size_bytes',   mi.size_bytes,
                     'width',        mi.width,
                     'height',       mi.height,
                     'caption',      mi.caption,
                     'sort_order',   mi.sort_order,
                     'created_at',   mi.created_at
                 ) AS row_obj,
                 mi.sort_order,
                 mi.created_at
            FROM internal.media_items mi
            JOIN internal.albums a ON a.id = mi.album_id
           WHERE a.category = p_category
           ORDER BY mi.sort_order, mi.created_at
           LIMIT p_limit
          OFFSET p_offset
      ) sub;

    RETURN jsonb_build_object(
        'items',  v_items,
        'total',  v_total,
        'limit',  p_limit,
        'offset', p_offset
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- api.admin_get_all_media(p_limit, p_offset)
-- Paginated listing of ALL media items for admin use (no category filter).
CREATE OR REPLACE FUNCTION api.admin_get_all_media(
    p_limit  INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_total INT;
    v_items JSONB;
BEGIN
    SELECT COUNT(*) INTO v_total FROM internal.media_items;

    SELECT COALESCE(jsonb_agg(row_obj ORDER BY created_at DESC), '[]'::jsonb)
      INTO v_items
      FROM (
          SELECT jsonb_build_object(
                     'id',           mi.id,
                     'album_id',     mi.album_id,
                     'album_title',  a.title,
                     's3_key',       mi.s3_key,
                     'filename',     mi.filename,
                     'content_type', mi.content_type,
                     'size_bytes',   mi.size_bytes,
                     'width',        mi.width,
                     'height',       mi.height,
                     'caption',      mi.caption,
                     'sort_order',   mi.sort_order,
                     'created_at',   mi.created_at
                 ) AS row_obj,
                 mi.created_at
            FROM internal.media_items mi
            LEFT JOIN internal.albums a ON a.id = mi.album_id
           ORDER BY mi.created_at DESC
           LIMIT p_limit
          OFFSET p_offset
      ) sub;

    RETURN jsonb_build_object(
        'items',  v_items,
        'total',  v_total,
        'limit',  p_limit,
        'offset', p_offset
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- api.register_media(p_data JSONB)
-- Register a media item that has already been uploaded to S3.
CREATE OR REPLACE FUNCTION api.register_media(p_data JSONB)
RETURNS JSONB AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO internal.media_items (
        id, album_id, s3_key, filename, content_type,
        size_bytes, width, height, caption, sort_order
    )
    VALUES (
        COALESCE((p_data->>'id')::UUID, uuid_generate_v4()),
        (p_data->>'album_id')::UUID,
        p_data->>'s3_key',
        p_data->>'filename',
        p_data->>'content_type',
        (p_data->>'size_bytes')::BIGINT,
        (p_data->>'width')::INTEGER,
        (p_data->>'height')::INTEGER,
        p_data->>'caption',
        COALESCE((p_data->>'sort_order')::INTEGER, 0)
    )
    ON CONFLICT (s3_key) DO UPDATE SET
        album_id     = EXCLUDED.album_id,
        filename     = EXCLUDED.filename,
        content_type = EXCLUDED.content_type,
        size_bytes   = EXCLUDED.size_bytes,
        width        = EXCLUDED.width,
        height       = EXCLUDED.height,
        caption      = EXCLUDED.caption,
        sort_order   = EXCLUDED.sort_order
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id, 'success', TRUE);
END;
$$ LANGUAGE plpgsql VOLATILE;


-- api.upsert_album(p_data JSONB)
CREATE OR REPLACE FUNCTION api.upsert_album(p_data JSONB)
RETURNS JSONB AS $$
DECLARE
    v_id   UUID;
    v_slug TEXT;
BEGIN
    INSERT INTO internal.albums (
        id, slug, title, description, category, cover_image_id, sort_order
    )
    VALUES (
        COALESCE((p_data->>'id')::UUID, uuid_generate_v4()),
        p_data->>'slug',
        p_data->>'title',
        p_data->>'description',
        p_data->>'category',
        (p_data->>'cover_image_id')::UUID,
        COALESCE((p_data->>'sort_order')::INTEGER, 0)
    )
    ON CONFLICT (slug) DO UPDATE SET
        title          = EXCLUDED.title,
        description    = EXCLUDED.description,
        category       = EXCLUDED.category,
        cover_image_id = EXCLUDED.cover_image_id,
        sort_order     = EXCLUDED.sort_order
    RETURNING id, slug INTO v_id, v_slug;

    RETURN jsonb_build_object('id', v_id, 'slug', v_slug, 'success', TRUE);
END;
$$ LANGUAGE plpgsql VOLATILE;


-- api.delete_album(p_slug TEXT)
-- Deletes album; media_items.album_id is set to NULL via ON DELETE SET NULL.
CREATE OR REPLACE FUNCTION api.delete_album(p_slug TEXT)
RETURNS JSONB AS $$
DECLARE
    v_count INT;
BEGIN
    -- Remove cover_image_id first to avoid FK cycle issues
    UPDATE internal.albums SET cover_image_id = NULL WHERE slug = p_slug;

    DELETE FROM internal.albums WHERE slug = p_slug;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', (v_count > 0)::BOOLEAN,
        'slug',    p_slug
    );
END;
$$ LANGUAGE plpgsql VOLATILE;
