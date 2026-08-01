# Consumer Results Infographic V3 Design

## Goal

Refine the third product-gallery image so its Hebrew typography and vertical rhythm feel calmer, narrower, and more aesthetic at both mobile and desktop gallery sizes.

## Scope

- Edit target: `assets/product-gallery/03-consumer-results-green.png`
- Responsive derivatives: `03-consumer-results-green-720w.webp` and `03-consumer-results-green-1254w.webp`
- Consuming surface: product hero gallery, image 3
- Canvas: preserve the existing 1:1 square composition and white background

## Approved Visual Direction

Use the balanced middle-ground treatment:

- Reduce the headline by approximately 8%.
- Reduce the three statistic sentences by approximately 12% and give their text blocks a slightly narrower measure.
- Reduce the three green percentage circles and their numerals by approximately 10%.
- Tighten the vertical distance between statistic rows by approximately 18%.
- Keep a small, deliberate gap between the final `91%` element and the bottom footnote.
- Preserve the thin gray dividers and keep the composition visually centered rather than leaving a large empty lower area.

## Content Invariants

The edit must preserve every visible character exactly:

- Headline: `החיים קצרים מדי כדי לחיות עם כאב`
- First statistic: `87%` and `מהמשתמשים חוו הפחתה בכאבי הידיים`
- Second statistic: `84%` and `מהמשתמשים דיווחו על שיפור בכוח היד לאורך זמן`
- Third statistic: `91%` and `מהמשתמשים הרגישו נוחות ממושכת לאורך כל היום`
- Footnote: `*התוצאות מבוססות על מחקרי צרכנים ועדויות. התוצאות עשויות להשתנות.`

No new copy, claims, icons, logos, borders, shadows, gradients, photographs, watermarks, or decorative elements may be introduced.

## Considered Approaches

1. **Balanced compact, approved:** moderate type and circle reduction with visibly tighter rows. Best match for the requested middle ground.
2. **Gentle polish:** 5–8% reductions with only a small spacing change. Rejected because it may remain oversized in the product gallery.
3. **Editorial compact:** 15–20% reductions and substantially compressed rows. Rejected because the square could feel under-filled and the Hebrew could become too small on mobile.

## Implementation

Use the current 1254×1254 PNG as the edit target with high preservation priority. Save the model output non-destructively in the existing dated creative run as a V3 generation, validate it, then replace the website target and regenerate the two WebP derivatives. Product markup and gallery CSS remain unchanged unless verification reveals an unrelated fit problem.

## Validation

- Output is exactly square and at least 1254×1254 before responsive derivative generation.
- All Hebrew text and the values `87%`, `84%`, and `91%` match the invariants.
- Circles remain on the right and statistic sentences remain to their left.
- The three rows read as a compact group with no oversized dead gaps.
- The footnote remains clearly separate but not stranded at the bottom.
- Rendered product gallery is visually inspected at 390px and 1440px.
- Focused gallery regression check, strict site audit, link check, and no-horizontal-scroll assertions pass.

## Rollback

Restore the current V2 selected final from `MyBambook/04_CREATIVE/2026-08-01-consumer-results-infographic/selected-finals/03-consumer-results-green-square-v2-balanced.png`, then regenerate the responsive WebP derivatives.
