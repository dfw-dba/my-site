# Sprint 10 — Fix content scrolling under fixed header controls + Update CLAUDE.md planning workflow

## Part A: Update CLAUDE.md §1 Planning Workflow

### Problem
The planning steps in §1 are loosely worded, causing steps to be skipped (entered plan mode before creating branch, wrote to ephemeral plan file instead of `.claude/tasks/plans/`, didn't add todos or sync to GitHub Project before prompting for implementation).

### Proposed new wording for §1

Replace the current §1 bullets with a strict numbered procedure:

```
### 1. Plan Mode Default
When the user initiates any non-trivial task (3+ steps, architectural decisions, ambiguous features, UI/UX, tradeoffs):

1. **Create branch FIRST**: Create and switch to `feature/<name>` or `fix/<name>` before any exploration, planning, or file edits. No exceptions.
2. **Enter plan mode**: Explore the codebase, ask clarifying questions, and design the approach.
3. **Write plan to `.claude/tasks/plans/<branch-name>.md`**: This is the source of truth — NOT the system-provided ephemeral plan file. Update it as plans evolve during discussion.
4. **Finalize plan before implementation**: Ensure the plan file has all details a fresh session needs: files to change, what each change does, acceptance criteria, and technical decisions.
5. **Add todo items to `.claude/tasks/todo.md`**: Only after the plan is approved. Use compact but detailed descriptions.
6. **Sync todo items to the `my-site` GitHub Project**: Immediately after updating todo.md. Items must include meaningful detail, not just titles.
7. **Prompt user to clear context**: Before starting implementation, suggest the user clear context and enable auto-accept edits for a clean implementation session.

If something goes sideways during implementation, STOP and re-plan immediately.
```

### Files to modify
- `.claude/CLAUDE.md` — rewrite §1
- `.claude/tasks/lessons.md` — add lesson about following the numbered planning checklist

---

## Part B: Fix content scrolling under fixed header controls

### Problem
On small screens, when scrolling down, page content slides behind the fixed hamburger menu button (top-left) and theme toggle (top-right). There's no scroll clipping boundary.

### Root Cause
In `MainLayout.tsx`, the hamburger button and theme toggle use `fixed` positioning, and `<main>` has `pt-16` to push initial content down. But as the page scrolls, content passes behind the fixed elements with no visual boundary.

### Solution
Convert from fixed-positioned controls + document scroll to a flex-column layout with a static header and scrollable content area:

1. Root becomes `flex flex-col h-screen` — fills viewport exactly
2. `<header>` contains both controls in normal flow (not fixed) — stays at top naturally
3. `<main>` gets `flex-1 overflow-y-auto` — takes remaining height, scrolls independently
4. Content clips at the top edge of `<main>`, never sliding under the header

### Changes to `MainLayout.tsx`
From:
```tsx
<div className="min-h-screen bg-white dark:bg-gray-900">
  <HamburgerMenu />
  <div className="fixed top-4 right-4 z-50">
    <ThemeToggle />
  </div>
  <main className="p-6 pt-16">
    <Outlet />
  </main>
</div>
```
To:
```tsx
<div className="flex h-screen flex-col bg-white dark:bg-gray-900">
  <header className="flex shrink-0 items-center justify-between px-4 py-4">
    <HamburgerMenu />
    <ThemeToggle />
  </header>
  <main className="flex-1 overflow-y-auto p-6">
    <Outlet />
  </main>
</div>
```

### Changes to `HamburgerMenu.tsx`
- Change toggle button from `fixed top-4 left-4 z-50` to normal flow positioning (just the button — drawer and backdrop remain `fixed`)

### Changes to `ThemeToggle.tsx`
- No changes needed (wrapper in MainLayout handles positioning)

### Verification
- Narrow browser: scroll down, confirm content clips below hamburger/theme controls
- Hamburger drawer still works correctly
- Theme toggle still works
- Desktop layout still looks correct
- Run frontend tests: `cd frontend && npx vitest run`
