---
globs:
  - "database/**"
  - "**/*.sql"
---

# PostgreSQL SQL Style

> **MANDATORY**: Use lowercase SQL keywords everywhere — `select`, `from`, `where`, not `SELECT`.

## Core Rules

- Use `snake_case` for all identifiers (no CamelCase)
- Names must begin with a letter and may not end in underscore
- Only use letters, numbers, and underscores in names
- Be explicit: always use `AS` for aliases, specify JOIN types
- Root keywords on their own line (except with single argument)
- Multi-line arguments must be indented relative to root keyword
- Use **ISO 8601 date format**: `yyyy-mm-ddThh:mm:ss.sssss`
- Foreign key naming: `user_id` to reference `users` table (singular + _id)
- Use meaningful aliases that reflect the data (not just single letters)
- CTEs over nested queries
- Explicit column names in GROUP BY (except complex expressions — use ordinals)
- Functions treated as identifiers: `date_trunc()` not `DATE_TRUNC()`
- One argument per line for multi-argument clauses
- When splitting SQL on semicolons, account for `--` line comments, `/* */` block comments, single-quoted strings, and `$$` dollar-quoting — semicolons inside these are not statement separators

## Style

### Keywords and alignment
```sql
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
where
      submission_date > '20180101'
  and sample_id       = '42'
```

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

## Verification

- Review SQL files for uppercase keywords: `grep -rn 'SELECT\|FROM\|WHERE' database/`
