# Fix: Release-Please Label Guard & Plan Naming Convention

**Branch**: `fix/release-please-and-plan-naming`
**Status**: Planning

## Context

Two issues to fix in one PR:

1. **Plan naming convention** uses `hhmm` (no separator) making times harder to read. User wants `hh-mm` with hyphen separator for clarity (e.g., `2026-03-21-15-00-` instead of `2026-03-21-1500-`).

2. **Release-please workflow** (`release-please.yml`) fails when `releases_created == 'true'` but `steps.release.outputs.pr` is empty. The `fromJSON()` call on line 34 crashes with a JSON parse error. PR #89 (v0.3.0) is already merged successfully — the error is cosmetic but will recur on every subsequent push to `main`.

## Changes

### 1. Guard the "Label tagged release" step
**File:** `.github/workflows/release-please.yml`

Line 32: Add `&& steps.release.outputs.pr` to the `if` condition, matching the guard already used on line 23.

```yaml
# Before:
if: steps.release.outputs.releases_created == 'true'

# After:
if: steps.release.outputs.releases_created == 'true' && steps.release.outputs.pr
```

### 2. Update plan naming convention
**File:** `.claude/templates/plan.md` (lines 2-3)

```
# Before:
File naming: yyyy-mm-dd-hhmm-branch-name.md
Example: 2026-03-16-1400-feature-auth-flow.md

# After:
File naming: yyyy-mm-dd-hh-mm-branch-name.md
Example: 2026-03-16-14-00-feature-auth-flow.md
```

### 3. Update CLAUDE.md reference
**File:** `.claude/CLAUDE.md` (line 58)

```
# Before:
name as `yyyy-mm-dd-hhmm-branch-name.md`

# After:
name as `yyyy-mm-dd-hh-mm-branch-name.md`
```

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/release-please.yml` | Edit | Add `pr` output guard to line 32 |
| `.claude/templates/plan.md` | Edit | Change `hhmm` → `hh-mm` in naming convention |
| `.claude/CLAUDE.md` | Edit | Change `hhmm` → `hh-mm` in naming reference |

## Verification

1. Visually confirm all 3 edits are correct
2. PR CI (`lint-pr.yml`) passes with conventional commit title
3. After merge, next `release-please.yml` run should skip the label step gracefully when `pr` is empty
