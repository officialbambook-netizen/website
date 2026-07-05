# Lavero Frontend Architecture

> ## ⚠️ MIGRATION STATUS — read this first (updated 2026-06-06)
>
> This refactor is **partially done — currently ~Phase 3.5 / 4.** It is NOT a finished or aspirational design; parts are live, parts are still debt. **Before assessing the web skill or proposing any "better structure," read this block.** The honest state:
>
> | Phase | What | Status |
> |---|---|---|
> | 1 — `tokens.css` | single `:root` for the home system | ✅ done |
> | 2 — `base.css` primitives | `.container .section .two-col .eyebrow` | ✅ done |
> | 3 — index.html de-inline | classes + `css/sections/*.css` | ✅ done (0 inline styles) — **but `home.css` is still a 1,735-line monolith** with legacy `980/640` blocks that override `sections/` via `!important`. `water-reality` + `install-ease` were never extracted (still home.css-only). |
> | 4 — product.html | same pattern | 🟡 **partial** — style blocks → `product.css`, but ~20 inline styles remain and `product.css` keeps its own `:root` (Cormorant/Nunito), un-unified. |
> | 5 — dedupe | remove dead CSS, fold dupes | 🟡 orphans `products.css`/`product-page.css` **deleted 2026-06-06**; `home-sections.css` (30 `!important` override layer) still live. |
> | 6 — skill/rules rewrite | enforce new rules | ✅ SKILL.md + `site/CLAUDE.md` de-conflicted 2026-06-06; added `bump-cache.py`, `SECTION_MAP.md`, frame-the-change + verify-after steps. |
>
> **Implication:** the "messy spacing / change-doesn't-show" pain is the **half-finished cascade** (a section's CSS lives in 2–3 fighting files), not bad design. The fix is **finish Phases 3.5→5**, not invent a new architecture. The next concrete job is the **`home.css` → `sections/` dissolve** (Playwright-gated, one section at a time) + extracting `water-reality`/`install-ease` + unifying `product.css` tokens.
>
> **JS-layer debt (added 2026-06-06, now audit-tracked under `JS_DEBT`):**
> - **`universal-cart.js` / `floating-cart.js` build their CSS as a `<style>` string with hardcoded hex** — outside `tokens.css` and (until now) outside every guard. Extract to `css/components/cart.css` referencing tokens. `audit.py` JS HYGIENE flags it; the cart cannot be re-themed until this moves.
> - **Pricing + promo codes are hardcoded in `universal-cart.js`** (`BASE=139`, `FILTER_PRICE=35`; codes `OT1F-X9K2`/`OT2F-M4P7`). Stale when Shopify changes; codes are publicly readable. Move pricing to Shopify-served values and codes server-side. **There is no active subscription path. This is a live-store-adjacent change → route via `safe-shopify-task.md` + operator approval, not an ad-hoc edit.**
>
> Keep this table current after every web change.

**Stack (confirmed):** Custom static frontend — plain HTML / CSS / JS — hosted from GitHub on a separate server. Shopify is the **backend only** (products, cart, checkout, orders) via Storefront Web Components (`<shopify-store>`, `<shopify-cart>`, `cdn.shopify.com/storefront/web-components.js`).

**Not** a Shopify Liquid theme. **Not** React/Next/Remix. Therefore: **no Tailwind, no shadcn/ui.** Those would force a stack migration with no brand payoff. The fix is a clean CSS architecture inside the stack we have.

---

## The problem we're solving

Audit of the current code (2026-06-04):

| Signal | Finding |
|---|---|
| `index.html` | 3,133 lines — **2,075 inside 10 inline `<style>` blocks** + **290 inline `style=` attributes** |
| `product.html` | 2,332 lines — own `:root`, 4 `<style>` blocks, 20 inline styles |
| Tokens | Defined in **4 disagreeing `:root` blocks** across **2 naming systems** (`--cream/--gold/--ink` vs `--lavero-nav-*/--color-charcoal`); `--sand` defined 3×, spacing scale half-finished |
| Layout | Two-col→stacked grid + section padding **re-typed inline per section** → no single source of truth → spacing drift + "fixed desktop, broke mobile" |
| External CSS | `footer/main-menu/floating-cart/hero-glitch/product-page/products.css` are clean & small — **not** the problem |

Root cause: **no token layer and no layout primitives.** Every section is its own universe.

---

## Target architecture

```
05_WEBSITE/site/
├── css/
│   ├── tokens.css            # SINGLE :root — the only place values are defined
│   ├── base.css              # reset, body, .container, .section, .eyebrow, .two-col, type, reveal-page
│   ├── components/           # reusable cross-page UI
│   │   ├── buttons.css
│   │   ├── cards.css
│   │   ├── comparison-table.css
│   │   ├── reviews.css
│   │   ├── faq.css
│   │   ├── menu.css          # (was main-menu.css)
│   │   ├── footer.css        # (moved)
│   │   └── floating-cart.css # (moved)
│   └── sections/             # one file per page-section (extracted from inline <style>)
│       ├── home-hero.css            # (was hero-glitch.css)
│       ├── home-water-reality.css
│       ├── home-feel.css
│       ├── home-product.css
│       ├── home-replace-90.css
│       ├── home-routine-proof.css
│       ├── home-install-ease.css
│       ├── home-comparison.css
│       ├── home-fair-question.css
│       ├── home-community.css
│       ├── home-press.css
│       ├── home-faq.css
│       └── home-final-cta.css
│       └── product-*.css            # the 10 product.html sections
├── js/                        # unchanged
├── assets/                    # unchanged
├── preview/                   # section-isolation harness (Storybook-style, no tooling)
└── tests/visual/              # Playwright breakpoint screenshots
```

### tokens.css — the single source of truth
One `:root`. One naming system. Everything else references these by name; **no raw hex, no magic numbers anywhere else.**
- **Color:** brand names kept (`--cream --sand --ivory --ink --taupe --gold --green --blush`) + semantic aliases (`--bg --surface --text --text-muted --accent --line`).
- **Spacing scale:** `--space-1 … --space-24` (rem-based). Kills random clamps.
- **Section rhythm:** `--section-py` (the fluid `clamp()` vertical pad, defined ONCE), `--section-px`.
- **Type:** `--font-display --font-sans` + `--fs-*` scale.
- **Other:** `--radius`, `--shadow`, `--container` (max content width).

### base.css — layout primitives (replaces the 290 inline styles)
- `.container` — one max-width, centered.
- `.section` — vertical rhythm via `--section-py`; bg modifiers `.section--cream / --sand / --ivory`.
- `.two-col` — the repeated 2-column grid → **stacks on mobile with image-on-top** as ONE class (no per-section re-typing).
- `.eyebrow` — the section label, defined once.
- Typography defaults, `.reveal-page` animation hook.

### sections/ — Storybook thinking, no Storybook
Each section's styling lives in its own small file, scoped by the section's class. Small enough to reason about in isolation, previewable on its own via `preview/`.

### Loading
Dev: multiple `<link>` tags (clean, no build step). If request count hurts production later, add an opt-in concat (`cat css/tokens.css css/base.css css/components/*.css css/sections/*.css > css/bundle.css`) — **not** a framework, just a one-liner. Decide later.

---

## Migration plan (bottom-up, screenshot-verified)

Refactor must be **visually near-identical** to today — the Playwright baseline is the guardrail.

- **Phase 0 — Safety net.** Install Playwright. Capture baseline screenshots of `index.html` + `product.html` at **390 / 768 / 1024 / 1440px**. Every later phase diffs against these.
- **Phase 1 — `tokens.css`.** Merge the 4 `:root` blocks into one; replace all var refs to the unified names. Visual no-op.
- **Phase 2 — `base.css`.** Build `.container .section .two-col .eyebrow` + type. Don't apply broadly yet.
- **Phase 3 — index.html, section by section.** Per section: swap inline styles → classes, move its `<style>` block → `css/sections/<name>.css`. Screenshot-diff after **each** section. 13 sections.
- **Phase 4 — product.html + blog/mission/articles.** Same pattern. 10 product sections.
- **Phase 5 — Dedupe.** Remove dead CSS, fold duplicate component styles, move `footer/menu/floating-cart` into `components/`.
- **Phase 6 — Guardrails.** Build `preview/` isolation page; rewrite `lavero-web-developer/SKILL.md` to enforce: tokens-only, zero inline styles, reuse primitives, Playwright before/after.

### Core rules going forward
- Mobile-first. Never fix desktop by breaking mobile (Playwright catches it).
- No raw hex / no magic spacing — tokens only.
- No new inline `style=`. No unnecessary `position:absolute`.
- One `.container` max-width everywhere. Reusable component per: hero, benefit row, product card, reviews, comparison, FAQ, CTA, before/after.
- Split a section file when it gets hard to reason about.

---

## Breakpoints (canonical)
`390` (mobile) · `768` (tablet) · `1024` (small desktop) · `1440` (desktop). Existing CSS uses 980/780/640 — these will be reconciled into the canonical set during migration.
