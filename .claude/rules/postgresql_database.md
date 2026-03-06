# Postgresql SQL guide

## Core philosophy
From PEP8: 
- Consistency with this style guide is important
- Consistency within a project is more important
- Consistency within one module or function is the most important
- However, know when to be inconsistent -- sometimes style guide recommendations just aren't applicable

## Core rules
- **Use lowercase SQL keywords** (not uppercase)
- Use `snake_case` for all identifiers (no CamelCase)
- Names must begin with a letter and may not end in underscore
- Only use letters, numbers, and underscores in names
- Be explicit: always use `AS` for aliases, specify JOIN types
- Root keywords on their own line (except with single argument)
- Multi-line arguments must be indented relative to root keyword
- Use **ISO 8601 date format**: `yyyy-mm-ddThh:mm:ss.sssss`
- Foreign key naming: `user_id` to reference `users` table (singular + _id)
- Use meaningful aliases that reflect the data (not just single letters)

## Formatting

### Keywords and alignment
```sql
-- Root keywords left-aligned
-- Arguments indented relative to root keyword
select
  client_id,
  submission_date
from main_summary
where
  sample_id = 42
  and submission_date > '20180101'
limit 10;
```

### Comments
```sql
/* Block comments for multi-line descriptions */
-- Line comments for single line notes
select
  client_id,  -- user identifier
  submission_date
from main_summary;
```

### Parentheses
```sql
-- Opening paren starts on new line and ends the line
-- Closing paren aligns with starting line
-- Contents indented
with sample as 
(
  select
    client_id,
    submission_date
  from main_summary
  where sample_id = '42'
)
```

### Boolean operators
```sql
-- AND/OR at beginning of line
-- columns, operators, and filter values aligned with left justification
where
      submission_date > '20180101'
  and sample_id       = '42'
```

## Table design rules
- Always add `id` column of type `identity generated always`
- Always add table comments using `comment on table...`
- Include schema in queries for clarity
- Use singular table names with `_id` suffix for foreign keys

## Best practices
- Use CTEs instead of nested queries
- Explicit column names in GROUP BY (except for expressions - see below)
- Functions treated as identifiers: `date_trunc()` not `DATE_TRUNC()`
- One argument per line for multi-argument clauses
- Use meaningful aliases that reflect the data being selected

### GROUP BY exception
```sql
-- Acceptable: use numbers to avoid repeating complex expressions
select
  date_trunc('minute', xact_start) as xact_start_minute,
  count(*)
from pg_stat_activity
group by 1
order by 1;
```

## Examples

### Good
```sql
select
  t.client_id as client_id,
  date(t.created_at) as day
from telemetry as t
inner join users as u
  on t.user_id = u.id
where
  t.submission_date > '2019-07-01'
  and t.sample_id = '10'
group by t.client_id, day;
```

### Bad
```sql
SELECT t.client_id, DATE(t.created_at) day
FROM telemetry t, users u
WHERE t.user_id = u.id AND t.submission_date > '2019-07-01'
GROUP BY 1, 2;
``` 
## Triggers Policy
- Never use table triggers unless there are no viable alternatives
- Always prefer functions and/or stored procedures over table triggers
- If a trigger is genuinely the only option, add a comment explaining why alternatives were ruled out

## General Conventions
- Use PostgreSQL functions for business logic
- Prefer stored procedures for multi-step transactional operations

# DB schema design guide

- For PKs of non-lookup tables, prefer `int4 ... generated always as identity`. Prompt user to find out if this table is likely to exceed the max value of int4 and if they are unsure or think it is likely then used int8 instead of int4.
- For PKs on lookup tables, prompt user to get an idea of the total number of rows they expect to be in this table and guide them on data type based on their answer. For example, a lookup table for eye color can easily have a smallint as the data type for the PK. Also, prompt the user to find out if this lookup table's values will be the same across any target deployment environment. If yes, then hard code the id values. Otherwise use identity.
- Prefer `timestamptz` over `timestamp`
- Prefer `text` over `varchar`
- Use **UUIDv7** when applicable (function `uuidv7()`, PG18+)
- Never use `money` data type - store as cents/smallest unit instead
- Avoid SQL reserved words in names
- Ensure names are unique and under 63 characters
- Use snake_case for all identifiers
- Prefer plurals for table names: `users`, `blog_posts`
- Prefer singular names for columns: `email`, `status`
- Use `comment` to add comments to columns, tables, and other database objects
- DB object comments must be short and precise, maximum 1024 characters
- Explain purpose in comments, not implementation
- Include valid values for enums or constrained fields
- If needed, add inline comments using `/* ... */` (C style); these comments may be detailed
- Use **lowercase SQL keywords** (not uppercase)
- Add spaces and line breaks for readability in complex statements 

# Database Standards





