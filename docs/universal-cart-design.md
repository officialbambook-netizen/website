# Universal Cart Design

## Goal

Make the Lavero cart universal across the site. Every Add to Cart control should add to the same Shopify-backed cart system, update the same cart badge, and open the same cart drawer. The floating hover Add to Cart button must no longer redirect to `product.html`.

## User-Facing Behavior

- The floating hover Add to Cart button is pink.
- A compact color selector sits beside the floating button.
- The selector offers the product-page colors: White, Pink, Beige, Black, and Gray.
- White is selected by default.
- Clicking the floating Add to Cart button adds one Lavero Beauty Shower Filter in the selected color.
- After a successful add, the cart drawer opens immediately.
- The cart opens from the left side of the viewport.
- Product-page Add to Cart still supports its full purchase panel behavior: selected colors, quantity, one-time purchase, and refill bundle choices.
- All cart buttons and badges across the site reflect the same cart state.

## Architecture

Create a shared universal cart module at `js/universal-cart.js`.

The module owns:

- Shopify Storefront API endpoint and token.
- Shower head variant IDs by color.
- Filter refill variant and selling plan IDs.
- Cart creation through Shopify Storefront API.
- Cart drawer rendering.
- Cart drawer open and close behavior.
- Cart badge updates.
- Local storage sync for read-only fallback display.
- Public cart functions used by page-specific UI.

Existing page-specific UI must call the module instead of duplicating cart logic. Product-page purchase controls keep their layout and selection state, but the final Add to Cart path uses the shared module for cart creation, drawer rendering, badge sync, and checkout link updates.

## Public Interface

The universal cart module exposes functions on `window.LaveroCart`:

- `addQuickProduct({ color })`: adds one shower filter in the selected color with the default quick-add offer.
- `addConfiguredProduct(config)`: adds the product-page configured selection, including colors, purchase choice, quantity, and refill bundle.
- `open()`: opens the universal cart drawer.
- `render(cart)`: renders the current Shopify cart in the drawer.
- `setBadge(count)`: updates all cart badges.

Internal helper names can vary, but these public functions must remain available because page scripts will depend on them.

## Floating Add To Cart

Update `js/floating-cart.js` and `css/floating-cart.css`.

The floating control becomes a compact fixed tray with:

- A pink Add to Cart button.
- A circular color selector beside it.
- Five accessible color swatches matching the product-page color names and dot colors.
- White selected by default.

Clicking Add to Cart calls `window.LaveroCart.addQuickProduct({ color: selectedColor })`.

The control must not redirect to `product.html`.

## Cart Drawer

Use the product-page cart drawer as the basis for the universal cart drawer.

Changes:

- Move drawer markup or injection into the universal module so every page can render it.
- Position it as a left-side drawer.
- Keep the existing product-page line item display, totals, remove buttons, checkout link, trust text, and empty state.
- Ensure `openLaveroCart()` and navigation cart buttons call the universal drawer.

## Error Handling

- If a selected color has no variant ID, show a short status message and do not add a cart line.
- If Shopify cart creation fails, show a short status message and do not open a fake cart.
- If cart rendering fails, show an error message inside the drawer body.
- If the cart is empty, show the existing empty state.

## Testing

Verify manually in a browser:

- Homepage floating button is pink.
- Homepage floating selector shows White, Pink, Beige, Black, and Gray.
- White is selected by default.
- Choosing another color changes the quick-add color.
- Clicking floating Add to Cart does not navigate to `product.html`.
- Successful quick add opens the left-side universal drawer.
- Drawer line item reflects the selected color.
- Checkout link is populated.
- Header cart button opens the same drawer.
- Product-page Add to Cart still supports quantity, color selections, one-time purchase, and refill bundle choices.
- Cart badge updates on homepage and product page.
- Mobile layout does not overlap or clip the floating control or drawer.
