# Review photos

One file per customer photo referenced from the `REVIEWS` array in `product.html`.

Rules:
- **Only the reviewer's own photo.** Never a stock image, never another brand's
  review image, never an AI render presented as a customer photo.
- Written consent to publish, kept on file, before anything lands here.
- Name files `firstname-initial-YYYY-MM-DD.webp` (e.g. `ruth-a-2026-08-09.webp`).
- The card slot renders at 132x172 CSS px with `object-fit: cover`. Export at
  roughly 3:4 portrait so nothing important gets cropped.
- Every entry needs a real `alt` describing the photo, not the product.

Full process: `03_COPY/review_seeding_kit_he_2026-07-29.md`.
