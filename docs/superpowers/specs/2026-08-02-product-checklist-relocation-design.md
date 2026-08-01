# Product Checklist Relocation Design

## Goal

Move the symptom checklist out of the bottom of the first post-hero section and place it in a dedicated full-width block immediately below the product hero.

## Current Order

1. Product hero
2. “הרגעים הקטנים” agitation section, including the checklist at its bottom
3. “יש מה לעשות” hope section

## Approved Order

1. Product hero
2. Standalone symptom checklist
3. “הרגעים הקטנים” agitation section without the checklist
4. “יש מה לעשות” hope section

The fixed sticky purchase bar remains unchanged. Its DOM placement between the hero and post-hero content does not affect the visible document flow.

## Content Invariants

Preserve the checklist text exactly:

- Header: `לחיצה ממוקדת מקלה על ההתמודדות היומיומית עם:`
- `דלקת פרקים (ארתריטיס)`
- `אצבע הדק`
- `גידים מודלקים`
- `נוקשות בוקר`
- `כאבי מפרקים`
- `נפיחות`
- `כאב עמום בכף היד`
- `ידיים עייפות מעבודה או יצירה`

No copy, claim, list order, color, checkmark, typography, or desktop/mobile column behavior changes are in scope.

## Layout

- Wrap the existing checklist header and list in a standalone `pf` section directly after the sticky-bar markup and before `pf-agitation`.
- Continue the current cream/light-blue surface so the block looks intentional beneath the hero.
- Reuse `pf__inner`, `pf-checklist__header`, and `pf-checklist`; do not duplicate the component.
- Add a section-specific class for vertical spacing only.
- Use tighter, balanced top and bottom padding than a full narrative section so the checklist reads as a concise recognition strip and does not create a double gap before `pf-agitation`.
- Keep the existing two-column desktop grid and one-column mobile stack.

## Considered Approaches

1. **Standalone post-hero block, approved:** clearly separates rapid self-recognition from the following agitation narrative and exactly matches the requested order.
2. **Checklist at the top of `pf-agitation`:** simpler markup, but the checklist would still belong visually to the section it was requested to precede.
3. **Checklist inside the hero:** strongest proximity to the offer, but would lengthen and overload the hero.

## Verification

- Add a focused DOM-order assertion that the checklist section follows the hero and precedes `pf-agitation`.
- Confirm the checklist appears exactly once and contains all eight items.
- Run the strict site audit and link checker.
- Run the product-page Playwright suite, including no-horizontal-scroll checks.
- Inspect the hero-to-checklist-to-agitation transition at 390px and 1440px.
- Confirm the checklist is two columns on desktop and one column on mobile.

## Rollback

Move the unchanged checklist header and list back to the end of `pf-agitation`, remove the standalone wrapper, and remove its spacing selector.
