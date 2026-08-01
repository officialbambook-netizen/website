# Product Checklist Relocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the existing symptom checklist into a standalone strip directly below the product hero and above the first narrative section without changing its Hebrew content or responsive layout.

**Architecture:** Keep the checklist component in `product.html`, but move its single instance into a dedicated `pf-checklist-band` section between the fixed sticky-bar markup and `pf-agitation`. Reuse the existing checklist selectors and add only section-scoped logical padding plus a header-margin reset in `product-funnel.css`.

**Tech Stack:** Static HTML, token-based CSS, Playwright, Node.js

---

## File Map

- Create: `../visual-tests/product-checklist-order.spec.js` — protects DOM order, unique checklist content, and responsive columns.
- Modify: `product.html` — moves the existing header/list block into a standalone section.
- Modify: `css/sections/product-funnel.css` — adds section-scoped vertical spacing only.
- Modify: `../../00_CONTROL/TASK_LOG.md` — records route, files, and verification evidence.

### Task 1: Add the Post-Hero Checklist Regression Test

**Files:**
- Create: `../visual-tests/product-checklist-order.spec.js`

- [ ] **Step 1: Write the failing DOM-order and responsive-layout test**

```js
const { test, expect } = require('@playwright/test');
const path = require('path');

const SITE_DIR = path.join(__dirname, '..', 'site');

test('PDP symptom checklist sits between the hero and agitation section', async ({ page }) => {
  await page.goto('file://' + path.join(SITE_DIR, 'product.html'));
  await page.evaluate(() => document.fonts.ready);

  const checklistBand = page.locator('.pf-checklist-band');
  await expect(checklistBand).toHaveCount(1);
  await expect(checklistBand.locator('.pf-checklist')).toHaveCount(1);
  await expect(checklistBand.locator('.pf-checklist li')).toHaveCount(8);
  await expect(page.locator('.pf-agitation .pf-checklist')).toHaveCount(0);

  const order = await page.evaluate(() => {
    const hero = document.querySelector('.pdp-hero');
    const checklist = document.querySelector('.pf-checklist-band');
    const agitation = document.querySelector('.pf-agitation');
    return {
      heroBeforeChecklist: Boolean(hero.compareDocumentPosition(checklist) & Node.DOCUMENT_POSITION_FOLLOWING),
      checklistBeforeAgitation: Boolean(checklist.compareDocumentPosition(agitation) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });

  expect(order.heroBeforeChecklist).toBe(true);
  expect(order.checklistBeforeAgitation).toBe(true);
});

test('PDP symptom checklist keeps two desktop columns and one mobile column', async ({ page }) => {
  for (const [width, columns] of [[390, 1], [1440, 2]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('file://' + path.join(SITE_DIR, 'product.html'));
    await page.evaluate(() => document.fonts.ready);

    const trackCount = await page.locator('.pf-checklist-band .pf-checklist').evaluate((list) => (
      window.getComputedStyle(list).gridTemplateColumns.split(' ').length
    ));
    expect(trackCount, `checklist columns at ${width}px`).toBe(columns);
  }
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run:

```bash
cd ../visual-tests && npx playwright test product-checklist-order.spec.js
```

Expected: FAIL because `.pf-checklist-band` does not exist yet.

### Task 2: Move the Checklist and Add Scoped Spacing

**Files:**
- Modify: `product.html:427-449`
- Modify: `css/sections/product-funnel.css:8-15,68-98`

- [ ] **Step 1: Move the existing checklist markup into a standalone section**

Insert immediately after the closing `</div>` for `#pdp-sticky-bar` and before the `A. CALLOUT + AGITATION` comment:

```html
  <section class="section--cream reveal-page pf pf-checklist-band" aria-labelledby="pf-checklist-heading">
    <div class="pf__inner">
      <p class="pf-checklist__header" id="pf-checklist-heading">לחיצה ממוקדת מקלה על ההתמודדות היומיומית עם:</p>
      <ul class="pf-checklist">
        <li>דלקת פרקים (ארתריטיס)</li>
        <li>אצבע הדק</li>
        <li>גידים מודלקים</li>
        <li>נוקשות בוקר</li>
        <li>כאבי מפרקים</li>
        <li>נפיחות</li>
        <li>כאב עמום בכף היד</li>
        <li>ידיים עייפות מעבודה או יצירה</li>
      </ul>
    </div>
  </section>
```

Remove the original `pf-checklist__header` and `pf-checklist` block from the end of `.pf-agitation`. Do not change any text or list order.

- [ ] **Step 2: Add section-scoped logical spacing**

Add after the base `.pf` rule:

```css
.pf-checklist-band {
  padding-block: clamp(var(--space-8), 4vw, var(--space-12));
}
```

Add after `.pf-checklist__header`:

```css
.pf-checklist-band .pf-checklist__header {
  margin-top: 0;
}
```

- [ ] **Step 3: Bump the product-funnel stylesheet cache marker**

Run from `site/`:

```bash
python3 tools/bump-cache.py
```

Expected: the `product-funnel.css?v=` value in `product.html` changes to the current content hash.

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
cd ../visual-tests && npx playwright test product-checklist-order.spec.js
```

Expected: 2 passed.

### Task 3: Verify the Product Page and Record the Change

**Files:**
- Modify: `../../00_CONTROL/TASK_LOG.md`

- [ ] **Step 1: Run strict static checks**

Run from `site/`:

```bash
python3 tools/audit.py --strict product-funnel
python3 tools/link-checker.py
python3 tools/bump-cache.py --check
```

Expected: commands exit 0 with no new hard issues, no broken links, and no stale cache markers.

- [ ] **Step 2: Run the full Playwright suite**

Run:

```bash
cd ../visual-tests && npx playwright test
```

Expected: all tests pass, including mobile overflow assertions at 390px and product-page checks.

- [ ] **Step 3: Capture and inspect the changed transition**

Start the local server from `site/`:

```bash
python3 tools/dev-server.py 8000
```

Capture product-page screenshots at 390px and 1440px after scrolling to the hero/checklist boundary. Confirm:

- hero precedes the checklist;
- checklist precedes `pf-agitation`;
- no blank band or doubled section gap appears;
- two columns render at 1440px and one column at 390px;
- Hebrew text remains Heebo, RTL, unclipped, and unchanged.

- [ ] **Step 4: Append the task-log entry**

Record the route (`bambook-web-developer` + `hebrew_converter`), the three changed implementation/test files, commands and results, visual breakpoints, risk (`Low`), and rollback (move the block back and remove the scoped selector).

## Dirty-Worktree Safety

`product.html` and related site files already contain operator-owned uncommitted work. Do not commit or stage those files as a whole. Preserve all unrelated hunks and report this relocation as an uncommitted workspace change unless the operator explicitly requests a scoped commit.
