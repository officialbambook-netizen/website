# Product Checklist Compact Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the product checklist card section's vertical footprint by approximately 50% while keeping the Hebrew labels readable and the approved card style intact.

**Architecture:** Tighten only the section-scoped checklist rules in `product-funnel.css`. Change the existing computed-style Playwright guard first so it fails on the oversized implementation, then reduce card height, gaps, padding, type, check size, and maximum grid width before regenerating the cache reference.

**Tech Stack:** Static HTML, token-based CSS, Playwright, Python site verification tools

---

### Task 1: Change the Regression Guard

**Files:**
- Modify: `../visual-tests/product-checklist-order.spec.js`

- [ ] Change the card-style test to collect `fontSize`, `rowGap`, and `listWidth`, then require card height at most 48px, font size at most 17px, gap at most 8px, and desktop list width at most 920px.
- [ ] Run `npx playwright test product-checklist-order.spec.js -g "white bordered cards"` and verify it fails because the current cards are 80px tall with a 16px gap.

### Task 2: Implement the Compact Scale

**Files:**
- Modify: `css/sections/product-funnel.css`
- Modify: `product.html` through `tools/bump-cache.py`

- [ ] Set the checklist band padding to `clamp(var(--space-5), 2vw, var(--space-6))`.
- [ ] Set the checklist inner maximum width to `calc(var(--container) - (2 * var(--space-24)))` and heading bottom margin to `var(--space-4)`.
- [ ] Set the checklist gap to `var(--space-2)`.
- [ ] Set desktop cards to `min-height: var(--space-10)`, `padding: var(--space-2) var(--space-10)`, `font-size: var(--fs-footer)`, and checkmarks to `1.15em` with `inset-inline-start: var(--space-4)`.
- [ ] Set mobile cards to `min-height: var(--space-10)` and `padding-inline: var(--space-8)`.
- [ ] Run the focused test and verify all three tests pass, then run `python3 tools/bump-cache.py`.

### Task 3: Verify and Integrate

**Files:**
- Modify: `../../00_CONTROL/TASK_LOG.md`

- [ ] Run `git diff --check`, `python3 tools/bump-cache.py --check`, the focused Playwright suite, and the link checker.
- [ ] Capture the exact section at 390px and 1440px; confirm zero overflow, readable labels, one/two columns, and approximately half the prior vertical footprint.
- [ ] Merge the verified branch to `main`, preserve existing cart changes, append verification evidence to the task log, and clean up the worktree.
