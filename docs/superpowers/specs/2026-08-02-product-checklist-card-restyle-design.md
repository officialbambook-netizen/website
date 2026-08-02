# Product Checklist Card Restyle Design

## Goal

Restyle the standalone symptom checklist below the product hero to match the operator's second screenshot: compact white bordered cards, blue checkmarks, bold centered Hebrew text, and a light neutral section background.

## Scope

- Preserve the existing Hebrew heading, all eight checklist items, item order, markup, and DOM position.
- Change only the checklist band's section-scoped CSS and the generated stylesheet cache reference.
- Preserve unrelated in-progress changes in `product.html` and `js/universal-cart.js`.

## Approved Layout

- The section uses a near-white neutral background rather than the current cream/light-blue surface.
- The heading remains centered above the grid with tighter spacing appropriate to a recognition strip.
- Each existing `.pf-checklist li` becomes a white card with a subtle gray border, the site's established radius language, restrained depth, and a consistent minimum height.
- Each card displays its checkmark at the inline start in blue, with the Hebrew label visually centered in the remaining card width.
- Desktop and tablet widths use two equal columns.
- Mobile widths use one column, with card padding and type scaled down without horizontal overflow.

## Implementation Approach

Use the existing `<ul>` and `<li>` elements as the card grid. No wrapper elements or duplicated components are needed. Scope all changed rules through `.pf-checklist-band` so other checklist-like elements cannot inherit the new card appearance.

Use existing design tokens wherever a matching token exists. If the reference's blue check needs a product-page token already present in the page system, reuse that token rather than introducing a raw color. Use logical CSS properties for RTL correctness.

## Considered Alternatives

1. **Scoped CSS-only restyle, approved:** smallest change, preserves semantics, and avoids markup churn.
2. **Add a nested card wrapper to every item:** offers no visual capability needed here and increases HTML complexity.
3. **Copy the screenshot's fixed pixel dimensions:** closer at one viewport but brittle across the product page's supported widths.

## Verification

- Add a focused Playwright assertion for two columns on desktop, one column on mobile, white card surfaces, borders, and blue checkmarks.
- Run the product-funnel strict audit, link checker, and cache check.
- Run the relevant product-page Playwright coverage.
- Inspect the section at 390px and 1440px and confirm there is no horizontal overflow.

## Rollback

Restore the prior `.pf-checklist-band`, `.pf-checklist`, `.pf-checklist li`, and `.pf-checklist li::before` declarations and regenerate cache references.

## Operator Revision — 50% Compact Scale

After reviewing the first implementation, the operator requested a 50% reduction. Interpret this as approximately halving the section's vertical footprint while preserving readable Hebrew rather than literally halving the font size.

- Reduce card height from 80px to approximately 40–48px.
- Reduce grid gaps from 16px to 8px.
- Reduce section padding and heading-to-grid spacing by approximately half.
- Reduce label and checkmark sizes modestly so they remain legible.
- Narrow the desktop grid moderately; do not force the longest label to wrap.
- Preserve the existing copy, item order, two desktop columns, one mobile column, blue checks, and RTL alignment.
