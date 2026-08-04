# Lifestyle Carousel Loading and Image Removal Design

## Goal

Remove the two operator-identified lifestyle photos from the product-page carousel and prevent unloaded white cards from appearing when visitors reach the strip on a slower connection, without restoring the carousel's former page-load cost.

## Target Section and Context

- **Section:** `.review-photo-strip` in `product.html`, immediately below the 60-day guarantee certificate and above `.install-ease`.
- **Neighbors read:** the guarantee certificate and carousel rules in `css/product.css`, plus the following section in `css/sections/home-install-ease.css`.
- **Funnel job:** show varied everyday use after the guarantee has reduced purchase risk.
- **Layout scope:** preserve the existing card size, spacing, motion, colors, RTL behavior, reduced-motion fallback, and surrounding section rhythm.

## Image Removal

Remove every carousel reference to:

- `assets/ugc-lifestyle/ugc-22-entryway-groceries.webp`
- `assets/ugc-lifestyle/ugc-20-kitchen-cereal.webp`

The seamless marquee contains one accessible sequence followed by an `aria-hidden` duplicate. Remove both assets from both sequences, leaving 17 unique images and 34 `<img>` elements. Preserve the order, attributes, and Hebrew alternative text of every remaining image. The source files stay in `assets/`; only carousel membership changes.

## Root Cause

The 2026-08-02 performance change correctly stopped all UGC requests during the initial page load, but it introduced two timing risks:

1. The vertical observer starts carousel loading only 700px before the strip. A visitor can cover that distance faster than the responsive images download.
2. Every promoted image, including the first visible cards, is assigned `fetchPriority = "low"`, so the images the visitor is already looking at can remain behind unrelated requests.

The existing Playwright test waits for `.is-carousel-ready` before checking visible cards, so it proves the eventual state but cannot detect the blank interval before readiness. A diagnostic run with 2.5-second UGC response delay reproduced the failure: zero UGC requests before approach, two visible cards and two blanks 500ms after arrival, and 3.1 seconds before readiness.

## Approved Loading Design

Keep native `loading="lazy"` in the HTML so the strip remains absent from initial-page network work. Strengthen the JavaScript-controlled promotion:

1. Start promotion when the strip is 2,400px from the viewport instead of 700px. The strip begins roughly 5,100-6,400px below the document top at the tested desktop/mobile viewports, so this remains well outside the initial screen.
2. Promote the full remaining carousel to `loading="eager"` once that boundary is crossed. Promote all 34 elements so the repeated DOM copy is render-ready; the browser cache deduplicates their 17 unique responsive URLs.
3. Give the initially visible cards normal automatic fetch priority and keep offscreen cards at low priority.
4. Keep the CSS animation paused until the initially visible cards have loaded and decoded. Then add `.is-carousel-ready` exactly as today.
5. Remove the horizontal four-card observer because the whole compact strip is already requested near the section; retaining two competing promotion systems would add complexity without reducing the network payload.

At DPR 1, the 17 remaining `-260w.webp` sources total roughly 276KB. Higher-density screens may choose the `-520w.webp` sources, but those requests still begin several screens below the initial viewport and use low priority outside the first visible set.

## Failure Handling

- A failed image request must not permanently block the carousel animation. Load or decode failures resolve the readiness wait, preserving the current fail-open behavior.
- The no-`IntersectionObserver` fallback promotes the carousel immediately, matching the existing compatibility behavior.
- Reduced-motion mode remains a horizontal scroll-snap strip with no animation.
- JavaScript-disabled behavior remains unchanged and accepted by the existing storefront architecture.

## Regression Tests

Update `lifestyle-carousel-performance.spec.js` before production code:

1. Assert 34 carousel images and 17 accessible images after the two removals.
2. Assert neither removed filename exists and the accessible/`aria-hidden` sequences are identical.
3. Preserve the initial-load assertion that no UGC image is requested before the expanded approach boundary is crossed.
4. Simulate delayed UGC responses and assert requests begin while the strip is still offscreen, visible cards receive non-low priority, and animation stays paused until visible cards decode.
5. Sample the complete loop and assert every visible card is loaded.
6. Keep the reduced-motion scroll-snap test.

The delayed-response test must fail against the current 700px/low-priority implementation before production code changes.

## Verification

- Run the focused carousel regression suite through the red-green cycle.
- Run `python3 tools/bump-cache.py` after changing `js/lifestyle-carousel.js`.
- Run `python3 tools/audit.py --strict review-photo-strip` and compare against the existing five unrelated hard-issue baseline.
- Run `python3 tools/link-checker.py`.
- Run the full Playwright suite.
- Inspect the carousel at 390px and 1440px, including a slow-response run, and confirm no horizontal overflow.
- Update `00_CONTROL/TASK_LOG.md` and add the diagnosed loading race to `00_CONTROL/CODER_BUGLOG.md`.

## Rollback

Restore the prior JavaScript loader and its cache reference, then reinsert the two unchanged image tags into both carousel sequences at their original positions. No asset restoration is required because the files are not deleted.
