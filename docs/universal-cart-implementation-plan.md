# Universal Cart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one Shopify-backed Lavero cart shared by the homepage, product page, blog, mission, and article pages.

**Architecture:** Add `js/universal-cart.js` as the single cart owner. Page scripts call `window.BambookCart` for quick add, configured product add, drawer opening, badge updates, removal, and checkout. The floating CTA keeps only quick-add color UI and delegates cart work to the universal module.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Shopify Storefront API.

---

### Task 1: Shared Universal Cart Module

**Files:**
- Create: `js/universal-cart.js`
- Modify: `js/cart.js`
- Modify: `js/main-menu.js`

- [ ] Create `window.BambookCart` with Shopify constants, cart creation, drawer injection, drawer rendering, line removal, badge sync, fallback localStorage rendering, `addQuickProduct`, `addConfiguredProduct`, `buyConfiguredProductNow`, `open`, `render`, `setBadge`, and `showStatus`.
- [ ] Make `openBambookCart()` and `openProductCart()` call `window.BambookCart.open()`.
- [ ] Reduce legacy `js/cart.js` to compatibility wrappers so old mock cart code does not inject `#custom-cart`.

### Task 2: Floating Quick Add

**Files:**
- Modify: `js/floating-cart.js`
- Modify: `css/floating-cart.css`

- [ ] Replace the redirecting floating button with a fixed tray.
- [ ] Add accessible color swatches for White, Pink, Beige, Black, and Gray.
- [ ] Default selected color to White.
- [ ] Make the Add to Cart button pink.
- [ ] On click, call `window.BambookCart.addQuickProduct({ color })`.

### Task 3: Product Page Integration

**Files:**
- Modify: `product.html`

- [ ] Remove the page-owned cart drawer markup and CSS.
- [ ] Remove the page-owned Shopify cart creation/rendering/removal functions.
- [ ] Keep product-page state, color selection, plan selection, quantity, refill bundle, and price rendering.
- [ ] Make `addSelectedProductsToShopifyCart(event)` call `BambookCart.addConfiguredProduct(...)`.
- [ ] Make `buySelectedProductsNow(event)` call `BambookCart.buyConfiguredProductNow(...)`.
- [ ] Ensure Escape closes the universal drawer.

### Task 4: Site-Wide Script Loading

**Files:**
- Modify: `index.html`
- Modify: `blog.html`
- Modify: `mission.html`
- Modify: `article-color-care.html`
- Modify: `article-routine-reset.html`
- Modify: `article-water-quality.html`
- Modify: `product.html`

- [ ] Load `js/universal-cart.js` before `js/cart.js` and `js/floating-cart.js`.
- [ ] Remove old static `#custom-cart` dialogs and backdrop styles from non-product pages.
- [ ] Keep existing header cart buttons, now backed by `openBambookCart()`.

### Task 5: Verification

**Files:**
- Verify in browser and with text searches.

- [ ] Confirm no page redirects floating Add to Cart to `product.html`.
- [ ] Confirm `#custom-cart` is gone.
- [ ] Confirm quick add opens `#bambook-cart-dialog`.
- [ ] Confirm product Add to Cart still uses selected colors, plan, quantity, and refill bundle.
- [ ] Confirm mobile layout keeps the floating tray usable.
