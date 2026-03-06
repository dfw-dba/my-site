-- 03_functions.sql
-- All stored functions live in the api schema and return JSONB.

-- ============================================================
--  RESUME FUNCTIONS
-- ============================================================

-- api.get_resume()
-- Returns full resume: sections + professional entries grouped by type.
create or replace function api.get_resume()
returns jsonb as $$
declare
    v_sections jsonb;
    v_entries  jsonb;
begin
    -- Collect all resume sections keyed by section_type
    select coalesce(jsonb_object_agg(rs.section_type, rs.content), '{}'::jsonb)
      into v_sections
      from internal.resume_sections as rs;

    -- Collect professional entries grouped by entry_type
    select coalesce(jsonb_object_agg(sub.entry_type, sub.items), '{}'::jsonb)
      into v_entries
      from
      (
          select
            pe.entry_type,
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
                    'performance_reviews', coalesce(pr_agg.reviews, '[]'::jsonb)
                ) order by pe.sort_order, pe.start_date desc
            ) as items
          from internal.professional_entries as pe
          left join lateral
          (
              select jsonb_agg(
                  jsonb_build_object(
                      'id',             pr.id,
                      'reviewer_name',  pr.reviewer_name,
                      'reviewer_title', pr.reviewer_title,
                      'review_date',    pr.review_date,
                      'text',           pr.review_text
                  ) order by pr.sort_order, pr.review_date desc nulls last
              ) as reviews
              from internal.performance_reviews as pr
              where pr.entry_id = pe.id
          ) as pr_agg on true
          group by pe.entry_type
      ) as sub;

    return jsonb_build_object(
        'sections', v_sections,
        'entries',  v_entries
    );
end;
$$ language plpgsql stable;


-- api.get_professional_timeline()
-- Returns all entries ordered by start_date DESC.
create or replace function api.get_professional_timeline()
returns jsonb as $$
begin
    return coalesce(
    (
        select jsonb_agg(
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
            ) order by pe.start_date desc
        )
        from internal.professional_entries as pe
    ), '[]'::jsonb);
end;
$$ language plpgsql stable;


-- api.upsert_professional_entry(p_data JSONB)
-- Insert or update a professional entry. If p_data contains an "id" key that
-- matches an existing row the row is updated; otherwise a new row is inserted.
create or replace function api.upsert_professional_entry(p_data jsonb)
returns jsonb as $$
declare
    v_id int4;
begin
    if p_data ? 'id' and p_data->>'id' is not null then
        update internal.professional_entries set
            entry_type   = coalesce(p_data->>'entry_type', entry_type),
            title        = coalesce(p_data->>'title', title),
            organization = coalesce(p_data->>'organization', organization),
            location     = p_data->>'location',
            start_date   = coalesce((p_data->>'start_date')::date, start_date),
            end_date     = (p_data->>'end_date')::date,
            description  = p_data->>'description',
            highlights   = coalesce(p_data->'highlights', highlights),
            technologies = coalesce(p_data->'technologies', technologies),
            sort_order   = coalesce((p_data->>'sort_order')::int4, sort_order),
            updated_at   = now()
        where id = (p_data->>'id')::int4
        returning id into v_id;
    else
        insert into internal.professional_entries
        (
            entry_type, title, organization, location,
            start_date, end_date, description, highlights, technologies, sort_order
        )
        values
        (
            p_data->>'entry_type',
            p_data->>'title',
            p_data->>'organization',
            p_data->>'location',
            (p_data->>'start_date')::date,
            (p_data->>'end_date')::date,
            p_data->>'description',
            coalesce(p_data->'highlights', '[]'::jsonb),
            coalesce(p_data->'technologies', '[]'::jsonb),
            coalesce((p_data->>'sort_order')::int4, 0)
        )
        returning id into v_id;
    end if;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile;


-- api.upsert_resume_section(p_data JSONB)
-- Insert or update by section_type.
create or replace function api.upsert_resume_section(p_data jsonb)
returns jsonb as $$
declare
    v_id int2;
begin
    insert into internal.resume_sections (section_type, content)
    values
    (
        p_data->>'section_type',
        p_data->'content'
    )
    on conflict (section_type) do update set
        content    = excluded.content,
        updated_at = now()
    returning id into v_id;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile;


-- api.delete_professional_entry(p_id int4)
create or replace function api.delete_professional_entry(p_id int4)
returns jsonb as $$
declare
    v_count int4;
begin
    delete from internal.professional_entries where id = p_id;
    get diagnostics v_count = row_count;

    return jsonb_build_object(
        'success', (v_count > 0)::boolean,
        'id',      p_id
    );
end;
$$ language plpgsql volatile;


-- api.upsert_performance_review(p_data JSONB)
-- Insert or update a performance review. If p_data contains an "id" key that
-- matches an existing row the row is updated; otherwise a new row is inserted.
create or replace function api.upsert_performance_review(p_data jsonb)
returns jsonb as $$
declare
    v_id int4;
begin
    if p_data ? 'id' and p_data->>'id' is not null then
        update internal.performance_reviews set
            entry_id       = coalesce((p_data->>'entry_id')::int4, entry_id),
            reviewer_name  = coalesce(p_data->>'reviewer_name', reviewer_name),
            reviewer_title = p_data->>'reviewer_title',
            review_date    = (p_data->>'review_date')::date,
            review_text    = coalesce(p_data->>'review_text', review_text),
            sort_order     = coalesce((p_data->>'sort_order')::int4, sort_order),
            updated_at     = now()
        where id = (p_data->>'id')::int4
        returning id into v_id;
    else
        insert into internal.performance_reviews
        (
            entry_id, reviewer_name, reviewer_title, review_date, review_text, sort_order
        )
        values
        (
            (p_data->>'entry_id')::int4,
            p_data->>'reviewer_name',
            p_data->>'reviewer_title',
            (p_data->>'review_date')::date,
            p_data->>'review_text',
            coalesce((p_data->>'sort_order')::int4, 0)
        )
        returning id into v_id;
    end if;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile;


-- api.delete_performance_review(p_id int4)
create or replace function api.delete_performance_review(p_id int4)
returns jsonb as $$
declare
    v_count int4;
begin
    delete from internal.performance_reviews where id = p_id;
    get diagnostics v_count = row_count;

    return jsonb_build_object(
        'success', (v_count > 0)::boolean,
        'id',      p_id
    );
end;
$$ language plpgsql volatile;


-- ============================================================
--  BLOG FUNCTIONS
-- ============================================================

-- api.get_blog_posts(p_tag, p_limit, p_offset)
-- Paginated listing of published posts, optionally filtered by tag.
create or replace function api.get_blog_posts(
    p_tag    text default null,
    p_limit  int4 default 20,
    p_offset int4 default 0
)
returns jsonb as $$
declare
    v_total int4;
    v_posts jsonb;
begin
    select count(*)
      into v_total
      from internal.blog_posts as bp
     where bp.published = true
       and (p_tag is null or bp.tags ? p_tag);

    select coalesce(jsonb_agg(row_obj order by published_at desc), '[]'::jsonb)
      into v_posts
      from
      (
          select
            jsonb_build_object(
                'id',           bp.id,
                'slug',         bp.slug,
                'title',        bp.title,
                'excerpt',      bp.excerpt,
                'tags',         bp.tags,
                'published_at', bp.published_at,
                'created_at',   bp.created_at
            ) as row_obj,
            bp.published_at
          from internal.blog_posts as bp
          where bp.published = true
            and (p_tag is null or bp.tags ? p_tag)
          order by bp.published_at desc
          limit p_limit
          offset p_offset
      ) as sub;

    return jsonb_build_object(
        'posts',  v_posts,
        'total',  v_total,
        'limit',  p_limit,
        'offset', p_offset
    );
end;
$$ language plpgsql stable;


-- api.get_blog_post(p_slug)
-- Returns a single blog post by slug (published only).
create or replace function api.get_blog_post(p_slug text)
returns jsonb as $$
declare
    v_post jsonb;
begin
    select jsonb_build_object(
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
      into v_post
      from internal.blog_posts as bp
     where bp.slug = p_slug
       and bp.published = true;

    if v_post is null then
        return jsonb_build_object('error', 'not_found');
    end if;

    return v_post;
end;
$$ language plpgsql stable;


-- api.admin_get_blog_post(p_slug)
-- Returns a single blog post by slug (any status, for admin use).
create or replace function api.admin_get_blog_post(p_slug text)
returns jsonb as $$
declare
    v_post jsonb;
begin
    select jsonb_build_object(
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
      into v_post
      from internal.blog_posts as bp
     where bp.slug = p_slug;

    if v_post is null then
        return jsonb_build_object('error', 'not_found');
    end if;

    return v_post;
end;
$$ language plpgsql stable;


-- api.admin_get_blog_posts(p_limit, p_offset)
-- Paginated listing of ALL posts (including drafts) for admin use.
create or replace function api.admin_get_blog_posts(
    p_limit  int4 default 50,
    p_offset int4 default 0
)
returns jsonb as $$
declare
    v_total int4;
    v_posts jsonb;
begin
    select count(*) into v_total from internal.blog_posts;

    select coalesce(jsonb_agg(row_obj order by updated_at desc), '[]'::jsonb)
      into v_posts
      from
      (
          select
            jsonb_build_object(
                'id',           bp.id,
                'slug',         bp.slug,
                'title',        bp.title,
                'excerpt',      bp.excerpt,
                'tags',         bp.tags,
                'published',    bp.published,
                'published_at', bp.published_at,
                'created_at',   bp.created_at,
                'updated_at',   bp.updated_at
            ) as row_obj,
            bp.updated_at
          from internal.blog_posts as bp
          order by bp.updated_at desc
          limit p_limit
          offset p_offset
      ) as sub;

    return jsonb_build_object(
        'posts',  v_posts,
        'total',  v_total,
        'limit',  p_limit,
        'offset', p_offset
    );
end;
$$ language plpgsql stable;


-- api.upsert_blog_post(p_data JSONB)
create or replace function api.upsert_blog_post(p_data jsonb)
returns jsonb as $$
declare
    v_id   int4;
    v_slug text;
    v_now  timestamptz := now();
    v_published_at timestamptz;
begin
    -- If publishing for the first time, set published_at
    v_published_at := case
        when (p_data->>'published')::boolean = true then coalesce((p_data->>'published_at')::timestamptz, v_now)
        else (p_data->>'published_at')::timestamptz
    end;

    insert into internal.blog_posts
    (
        slug, title, excerpt, content, tags, published, showcase_item_id, published_at
    )
    values
    (
        p_data->>'slug',
        p_data->>'title',
        p_data->>'excerpt',
        p_data->>'content',
        coalesce(p_data->'tags', '[]'::jsonb),
        coalesce((p_data->>'published')::boolean, false),
        (p_data->>'showcase_item_id')::int4,
        v_published_at
    )
    on conflict (slug) do update set
        title            = excluded.title,
        excerpt          = excluded.excerpt,
        content          = excluded.content,
        tags             = excluded.tags,
        published        = excluded.published,
        showcase_item_id = excluded.showcase_item_id,
        published_at     = coalesce(excluded.published_at, internal.blog_posts.published_at),
        updated_at       = now()
    returning id, slug into v_id, v_slug;

    return jsonb_build_object('id', v_id, 'slug', v_slug, 'success', true);
end;
$$ language plpgsql volatile;


-- api.delete_blog_post(p_slug TEXT)
create or replace function api.delete_blog_post(p_slug text)
returns jsonb as $$
declare
    v_count int4;
begin
    delete from internal.blog_posts where slug = p_slug;
    get diagnostics v_count = row_count;

    return jsonb_build_object(
        'success', (v_count > 0)::boolean,
        'slug',    p_slug
    );
end;
$$ language plpgsql volatile;


-- ============================================================
--  SHOWCASE FUNCTIONS
-- ============================================================

-- api.get_showcase_items(p_category)
create or replace function api.get_showcase_items(p_category text default null)
returns jsonb as $$
begin
    return coalesce(
    (
        select jsonb_agg(
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
            ) order by si.sort_order, si.created_at desc
        )
        from internal.showcase_items as si
        where (p_category is null or si.category = p_category)
    ), '[]'::jsonb);
end;
$$ language plpgsql stable;


-- api.get_showcase_item(p_slug)
create or replace function api.get_showcase_item(p_slug text)
returns jsonb as $$
declare
    v_item jsonb;
begin
    select jsonb_build_object(
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
      into v_item
      from internal.showcase_items as si
     where si.slug = p_slug;

    if v_item is null then
        return jsonb_build_object('error', 'not_found');
    end if;

    return v_item;
end;
$$ language plpgsql stable;


-- api.upsert_showcase_item(p_data JSONB)
create or replace function api.upsert_showcase_item(p_data jsonb)
returns jsonb as $$
declare
    v_id   int4;
    v_slug text;
begin
    insert into internal.showcase_items
    (
        slug, title, description, content, category,
        technologies, demo_url, repo_url, sort_order
    )
    values
    (
        p_data->>'slug',
        p_data->>'title',
        p_data->>'description',
        p_data->>'content',
        p_data->>'category',
        coalesce(p_data->'technologies', '[]'::jsonb),
        p_data->>'demo_url',
        p_data->>'repo_url',
        coalesce((p_data->>'sort_order')::int4, 0)
    )
    on conflict (slug) do update set
        title        = excluded.title,
        description  = excluded.description,
        content      = excluded.content,
        category     = excluded.category,
        technologies = excluded.technologies,
        demo_url     = excluded.demo_url,
        repo_url     = excluded.repo_url,
        sort_order   = excluded.sort_order,
        updated_at   = now()
    returning id, slug into v_id, v_slug;

    return jsonb_build_object('id', v_id, 'slug', v_slug, 'success', true);
end;
$$ language plpgsql volatile;


-- api.delete_showcase_item(p_slug TEXT)
create or replace function api.delete_showcase_item(p_slug text)
returns jsonb as $$
declare
    v_count int4;
begin
    delete from internal.showcase_items where slug = p_slug;
    get diagnostics v_count = row_count;

    return jsonb_build_object(
        'success', (v_count > 0)::boolean,
        'slug',    p_slug
    );
end;
$$ language plpgsql volatile;


-- ============================================================
--  MEDIA / ALBUM FUNCTIONS
-- ============================================================

-- api.get_albums(p_category)
-- Album listing with cover image info when available.
create or replace function api.get_albums(p_category text default null)
returns jsonb as $$
begin
    return coalesce(
    (
        select jsonb_agg(
            jsonb_build_object(
                'id',          a.id,
                'slug',        a.slug,
                'title',       a.title,
                'description', a.description,
                'category',    a.category,
                'sort_order',  a.sort_order,
                'cover_image', case
                    when mi.id is not null then jsonb_build_object(
                        'id',           mi.id,
                        's3_key',       mi.s3_key,
                        'filename',     mi.filename,
                        'content_type', mi.content_type,
                        'width',        mi.width,
                        'height',       mi.height
                    )
                    else null
                end,
                'media_count',
                (
                    select count(*) from internal.media_items as m2 where m2.album_id = a.id
                )
            ) order by a.sort_order, a.created_at desc
        )
        from internal.albums as a
        left join internal.media_items as mi
          on mi.id = a.cover_image_id
        where (p_category is null or a.category = p_category)
    ), '[]'::jsonb);
end;
$$ language plpgsql stable;


-- api.get_album_with_media(p_slug)
create or replace function api.get_album_with_media(p_slug text)
returns jsonb as $$
declare
    v_album    jsonb;
    v_album_id int4;
    v_media    jsonb;
begin
    select
      a.id,
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
      into v_album_id, v_album
      from internal.albums as a
     where a.slug = p_slug;

    if v_album is null then
        return jsonb_build_object('error', 'not_found');
    end if;

    select coalesce(jsonb_agg(
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
        ) order by mi.sort_order, mi.created_at
    ), '[]'::jsonb)
      into v_media
      from internal.media_items as mi
     where mi.album_id = v_album_id;

    return v_album || jsonb_build_object('media', v_media);
end;
$$ language plpgsql stable;


-- api.get_media_by_category(p_category, p_limit, p_offset)
-- Direct media listing for a given album category.
create or replace function api.get_media_by_category(
    p_category text,
    p_limit    int4 default 50,
    p_offset   int4 default 0
)
returns jsonb as $$
declare
    v_total int4;
    v_items jsonb;
begin
    select count(*)
      into v_total
      from internal.media_items as mi
      inner join internal.albums as a
        on a.id = mi.album_id
     where a.category = p_category;

    select coalesce(jsonb_agg(row_obj order by sort_order, created_at), '[]'::jsonb)
      into v_items
      from
      (
          select
            jsonb_build_object(
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
            ) as row_obj,
            mi.sort_order,
            mi.created_at
          from internal.media_items as mi
          inner join internal.albums as a
            on a.id = mi.album_id
          where a.category = p_category
          order by mi.sort_order, mi.created_at
          limit p_limit
          offset p_offset
      ) as sub;

    return jsonb_build_object(
        'items',  v_items,
        'total',  v_total,
        'limit',  p_limit,
        'offset', p_offset
    );
end;
$$ language plpgsql stable;


-- api.admin_get_all_media(p_limit, p_offset)
-- Paginated listing of ALL media items for admin use (no category filter).
create or replace function api.admin_get_all_media(
    p_limit  int4 default 50,
    p_offset int4 default 0
)
returns jsonb as $$
declare
    v_total int4;
    v_items jsonb;
begin
    select count(*) into v_total from internal.media_items;

    select coalesce(jsonb_agg(row_obj order by created_at desc), '[]'::jsonb)
      into v_items
      from
      (
          select
            jsonb_build_object(
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
            ) as row_obj,
            mi.created_at
          from internal.media_items as mi
          left join internal.albums as a
            on a.id = mi.album_id
          order by mi.created_at desc
          limit p_limit
          offset p_offset
      ) as sub;

    return jsonb_build_object(
        'items',  v_items,
        'total',  v_total,
        'limit',  p_limit,
        'offset', p_offset
    );
end;
$$ language plpgsql stable;


-- api.register_media(p_data JSONB)
-- Register a media item that has already been uploaded to S3.
create or replace function api.register_media(p_data jsonb)
returns jsonb as $$
declare
    v_id int4;
begin
    insert into internal.media_items
    (
        album_id, s3_key, filename, content_type,
        size_bytes, width, height, caption, sort_order
    )
    values
    (
        (p_data->>'album_id')::int4,
        p_data->>'s3_key',
        p_data->>'filename',
        p_data->>'content_type',
        (p_data->>'size_bytes')::int8,
        (p_data->>'width')::int4,
        (p_data->>'height')::int4,
        p_data->>'caption',
        coalesce((p_data->>'sort_order')::int4, 0)
    )
    on conflict (s3_key) do update set
        album_id     = excluded.album_id,
        filename     = excluded.filename,
        content_type = excluded.content_type,
        size_bytes   = excluded.size_bytes,
        width        = excluded.width,
        height       = excluded.height,
        caption      = excluded.caption,
        sort_order   = excluded.sort_order,
        updated_at   = now()
    returning id into v_id;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile;


-- api.upsert_album(p_data JSONB)
create or replace function api.upsert_album(p_data jsonb)
returns jsonb as $$
declare
    v_id   int4;
    v_slug text;
begin
    insert into internal.albums
    (
        slug, title, description, category, cover_image_id, sort_order
    )
    values
    (
        p_data->>'slug',
        p_data->>'title',
        p_data->>'description',
        p_data->>'category',
        (p_data->>'cover_image_id')::int4,
        coalesce((p_data->>'sort_order')::int4, 0)
    )
    on conflict (slug) do update set
        title          = excluded.title,
        description    = excluded.description,
        category       = excluded.category,
        cover_image_id = excluded.cover_image_id,
        sort_order     = excluded.sort_order,
        updated_at     = now()
    returning id, slug into v_id, v_slug;

    return jsonb_build_object('id', v_id, 'slug', v_slug, 'success', true);
end;
$$ language plpgsql volatile;


-- api.delete_album(p_slug TEXT)
-- Deletes album; media_items.album_id is set to NULL via ON DELETE SET NULL.
create or replace function api.delete_album(p_slug text)
returns jsonb as $$
declare
    v_count int4;
begin
    -- Remove cover_image_id first to avoid FK cycle issues
    update internal.albums set
        cover_image_id = null
    where slug = p_slug;

    delete from internal.albums where slug = p_slug;
    get diagnostics v_count = row_count;

    return jsonb_build_object(
        'success', (v_count > 0)::boolean,
        'slug',    p_slug
    );
end;
$$ language plpgsql volatile;
