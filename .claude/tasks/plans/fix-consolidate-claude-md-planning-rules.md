# Plan: Consolidate CLAUDE.md Planning Rules

## Problem
- Planning rules are split between two places: "Plan Mode Default" (§1) and "Planning Phase" (lines 55-60)
- Sections added after the original Workflow Orchestration don't follow the numbered `### N. Title` pattern

## Changes

### 1. Merge Planning Phase into Plan Mode Default (§1)
- Keep the existing 4 bullets in §1 as the high-level principles
- Append the 5 specific Planning Phase steps (branch first, plan file, finalize, add todos, verify) as sub-bullets or continuation
- Remove the standalone "Planning Phase" subsection from Task Management

### 2. Normalize all sections to numbered pattern
Current structure → New structure:
- `# Git Branching Rules` → `### 7. Git Branching Rules` (under Workflow Orchestration)
- `# Task Management` → `### 8. Task Management` (only Implementation Phase + Sync Rules remain, since Planning Phase merged into §1)
- `# Core Principles` → `### 9. Core Principles`
- `# Claude permissions` → `### 10. Claude Permissions`

### 3. Remove redundant top-level headings
- Everything lives under the single `# Workflow Orchestration` heading
- Each section is `### N. Title` with bullet points

## Files Changed
- `.claude/CLAUDE.md` — single file edit

## Acceptance Criteria
- No planning rules duplicated across sections
- All sections follow `### N. Title` numbered pattern
- No content lost — all rules preserved
- File reads cleanly top-to-bottom as a single orchestration reference
