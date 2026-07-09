# Cart Migration Plan — `universal-cart.js` from Lavero → Bambook

## Status: PLANNED, NOT YET IMPLEMENTED

Blocked on the real Bambook Shopify product variant ID(s) from the operator. `<shopify-store>` web components across all 14 pages already point at the correct Bambook store (`w1c0ed-5s.myshopify.com` / token `f2863bebc601b26a3c6f35a9c63c560e` — see `00_CONTROL/TASK_LOG.md`, 2026-07-09 entry). This plan covers the remaining piece: `js/universal-cart.js` and its callers still run 100% Lavero shower-filter logic — hardcoded endpoint, token, variant IDs, product copy, and a "filter refill" bundle concept that doesn't exist for gloves.

---

## Decisions locked in (2026-07-09, operator)

1. **Single color/variant — no color selector.** The Bambook glove is one purchasable variant, not five. `SHOPIFY_VARIANTS` (a 5-entry color→variantId map) collapses to one constant, e.g. `PRODUCT_VARIANT_ID`. All color-selection UI/state (`product.html` `COLOR_OPTIONS`, `floating-cart.js` swatch tray, `window.LaveroCart.colors`/`.colorDots`) gets removed, not ported — there is nothing to select.
2. **Filter-refill bundle system: deleted, not ported.** No Bambook equivalent exists. Remove `FILTER_VARIANT_ID`, `FILTER_PRICE`, `BUNDLE_DISCOUNT_CODES`, `buildFilterOnlyCart`, `addFilterOnly`, `buyFilterOnlyNow`, and the `filterRefillLines` branch inside `render()`. `replacement-filters.html` (built entirely on this concept) has no content plan yet — out of scope until the operator revisits it.
3. **Checkout domain:** operator will provide later. Still blocking step 3 of execution below.
4. **Product title / fallback copy/asset:** deferred to a later date. Still blocking step 4 of execution below.

## What's still blocking execution

1. **The one Bambook product variant ID** (`gid://shopify/ProductVariant/...`) to replace the 5-entry `SHOPIFY_VARIANTS` map with a single constant.
2. **Checkout domain** to allow-list in `normalizeCheckoutUrl` (`universal-cart.js:195-207`) — currently only allows `checkout.mylavero.com` / `mylavero.myshopify.com` and silently rewrites anything else to the Lavero domain. **To find your real value once the store is live:** in the Shopify admin, go to Settings → Domains — the domain shown there (or `<your-store>.myshopify.com` / `w1c0ed-5s.myshopify.com` if no custom domain is connected yet) is what `checkoutUrl` resolves to. You can also just add a test item to cart on the live storefront and read the domain in the browser address bar at checkout. Not something I can look up myself — it isn't exposed by the Storefront API credentials already in hand.
3. **Product title / fallback image path** for local-storage/error-state fallback strings (`"Lavero Beauty Shower Filter"`, `assets/lavero-woman-shower.jpeg`) — deferred, will use a neutral placeholder in the interim rewrite if execution starts before this is answered.

---

## Files touched, by role

| File | Current state | Needed change |
|---|---|---|
| `js/universal-cart.js` | Lavero endpoint, token, 5 shower-color variant map, filter-refill bundle logic, Lavero copy/asset fallbacks, Lavero-only checkout allow-list | Full rewrite of the constants block; delete all filter-refill code paths; collapse `SHOPIFY_VARIANTS` to one `PRODUCT_VARIANT_ID`; core cart/render/GraphQL plumbing is brand-agnostic and can stay |
| `js/cart.js` | `addQuickProduct({ color: 'White' })` hardcoded default (line 18) | Drop the `color` argument entirely — `addQuickProduct()` adds the single product, no selection needed |
| `js/floating-cart.js` | Reads `window.LaveroCart.colors` / `.colorDots` (lines 20-24) to render a 5-swatch color selector tray | **Remove the color-swatch UI entirely** — single product means no selector; floating button becomes a plain Add to Cart control |
| `product.html` | Collects `state.colors` from `COLOR_OPTIONS = ['Blue Cyan', 'Charcoal', 'Bamboo']` (line 775) into local state via a color-swatch UI, but **never calls** `window.LaveroCart.addConfiguredProduct` / `buyConfiguredProductNow` anywhere | **Remove the color-selector UI and `state.colors`/`COLOR_OPTIONS` entirely** (single variant, nothing to select); wire the actual CTA button handlers to call `LaveroCart.addConfiguredProduct(state)` / `buyConfiguredProductNow(state)` with just quantity |
| `replacement-filters.html` | Entirely modeled on the Lavero filter-refill product: calls `LaveroCart.addFilterOnly` / `buyFilterOnlyNow`, references `FILTER2PACK` code, filter comparison copy (lines 464, 1016-1099) | **Out of scope for now** — filter-refill concept is deleted from `universal-cart.js`, so this page's cart calls will break; no content replacement plan yet. Do not silently leave it half-wired — either stub/hide its cart buttons or flag it for removal when this task executes, operator's call at that time |
| `docs/universal-cart-design.md`, `docs/universal-cart-implementation-plan.md` | Describe the Lavero-era design (5 shower colors, filter refills) as if current | Update after the rewrite so the docs describe the shipped Bambook behavior (single product, no filter refill), not stale Lavero design |

---

## Step-by-step execution order (once the variant ID is supplied)

1. **Rewrite the constants block** in `universal-cart.js` (lines 1-16): `STOREFRONT_ENDPOINT` → `https://w1c0ed-5s.myshopify.com/api/2024-10/graphql.json`, `STOREFRONT_TOKEN` → `f2863bebc601b26a3c6f35a9c63c560e` (matches the token already live in the `<shopify-store>` tags), `SHOPIFY_VARIANTS` (5-color map) → single `PRODUCT_VARIANT_ID` constant, delete `FILTER_VARIANT_ID`/`FILTER_PRICE`/`BUNDLE_DISCOUNT_CODES` entirely.
2. **Delete the filter-refill code paths**: `buildFilterOnlyCart`, `addFilterOnly`, `buyFilterOnlyNow`, the `filterRefillLines` branch inside `render()`, and their exports off `window.LaveroCart`.
3. **Collapse the color-selection logic**: `selectedLines()`/`normalizeConfig()` no longer branch on a `colors` array — one variant, one line item, just `quantity`. Remove `window.LaveroCart.colors` / `.colorDots` / `getVariantId(color)`.
4. **Remove the color-swatch UI** in `js/floating-cart.js` (lines ~20-24 and the swatch markup/handlers) and in `product.html` (`COLOR_OPTIONS`, `state.colors`, the swatch mount/handlers around lines 775-845) — floating button and product-page CTA become plain quantity + Add to Cart/Buy Now.
5. **Update `normalizeCheckoutUrl`** allow-list (line 199) to the real Bambook checkout host(s) — **blocked, operator to supply.**
6. **Replace Lavero-specific copy/asset fallbacks**: `"Lavero Beauty Shower Filter"` (lines 277, 324), `"shower head"` error string (line 189), `assets/lavero-woman-shower.jpeg` fallback (lines 282, 322) — **blocked, operator deferred to a later date; use a neutral placeholder if this step is reached before the real values arrive.**
7. **Wire `product.html`'s Add to Cart / Buy Now buttons** to actually call `LaveroCart.addConfiguredProduct({ quantity })` / `buyConfiguredProductNow({ quantity })` — currently a no-op gap independent of the variant-ID problem.
8. **Update `js/cart.js` line 18** — drop the `color` argument from the default quick-add call.
9. **Handle `replacement-filters.html`** — its cart calls (`addFilterOnly`/`buyFilterOnlyNow`) will throw once step 2 deletes those functions. Stub or hide its Add to Cart / Buy Now controls so it fails safely rather than throwing a console error, until the operator decides the page's fate.
10. **`STORAGE_KEY` / `window.LaveroCart` naming** (`laveroCart`, `LaveroCart`, `openLaveroCart`, `#lavero-cart-dialog`, CSS class prefixes `cdlg-`, `lavero-cart-badge`) is cosmetic Lavero branding baked into internal identifiers, not user-facing — low priority, optional rename pass, not required for the cart to function correctly on the Bambook domain.
11. **Verify** per `05_WEBSITE/site/CLAUDE.md` §5: bump cache strings on every changed JS/CSS file via `tools/bump-cache.py`, manual browser test of add-to-cart → drawer → checkout link against the real Bambook store, `npx playwright test` from `05_WEBSITE/visual-tests/`.
12. **Log the change** in `00_CONTROL/TASK_LOG.md` and update `docs/universal-cart-design.md` / `docs/universal-cart-implementation-plan.md` to match shipped behavior (single product, no filter refill, no color selector).

---

## Known constraint carried over (not this task's job to fix)

`universal-cart.js` builds a `<style>` block and hardcodes copy directly in JS strings (`ensureStyles()`, lines 72-116) — flagged as `JS_DEBT` in `05_WEBSITE/site/CLAUDE.md` §1.8 already. Don't extend this pattern while doing the variant-ID swap; extracting it to `css/` is a separate hardening task.
