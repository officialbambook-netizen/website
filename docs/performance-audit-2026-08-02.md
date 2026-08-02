# MyBambook Website Performance Audit

**Date:** 2026-08-02  
**Primary target:** `https://mybambook.com/product`  
**Secondary target:** `https://mybambook.com/`  
**Scope:** diagnosis and optimization plan only. No customer-facing code or live-store changes were made.

## Executive verdict

The live product page is fast enough on a good desktop connection but is not fast enough for cold mobile ad traffic.

Under a cold-cache mobile lab profile (390×844, DPR 3, 4× CPU slowdown, 1.6 Mbps down, 0.75 Mbps up, 150 ms latency), the live product page produced:

- **FCP:** 1.53 s
- **LCP:** 14.11 s
- **Load event:** 16.45 s
- **Initial transfer:** 3.04 MB across 33 requests
- **Initial image transfer:** 2.76 MB
- **Approximate TBT:** 596 ms
- **CLS:** 0.0002
- **Sampled click event duration:** 72 ms

The main problem is not the server. Live TTFB was 103 ms in the mobile run and 63 ms in the desktop run. The main problem is the critical image-loading strategy: the browser downloads all eight product-gallery images plus a below-fold image during the initial load. Those images compete with the real LCP hero and delay it by many seconds.

The same asset-pipeline problem affects the rest of the site. The live homepage fetched two PNGs totaling 4.33 MB and produced a 21.50 s mobile LCP in the same profile.

The sub-3-second target is technically realistic. A controlled product-page run that prevented secondary image downloads reduced LCP from 14.11 s to 5.18 s. A directional run using a temporary 142 KB responsive-sized hero reduced observed LCP to 2.12 s. The injected hero response bypassed part of the simulated transfer delay, so 2.12 s is evidence of direction, not a production guarantee. The implemented page must be retested under the same cold mobile profile.

## Test method and limitations

The audit combined:

1. Local source and asset inspection of the current working tree.
2. Live cold-cache Chromium measurements on the product page and homepage.
3. A desktop comparison at 1440×900, 10 Mbps down, 5 Mbps up, 20 ms latency, native CPU.
4. Controlled what-if browser runs that prevented secondary image downloads and substituted a temporary smaller hero response.
5. CSS coverage, request timing, cache-header inspection, DOM counts, and the repository's strict static audit.

These are lab measurements, not real-user field data. Network conditions, devices, geography, Meta's in-app browser, and CDN state will vary. INP requires real user or repeated interaction data; the 72 ms click sample is not a field INP measurement.

## Results

| Page/profile | TTFB | FCP | LCP | Load | Initial transfer | Requests | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Product, mobile cold load | 0.10 s | 1.53 s | **14.11 s** | 16.45 s | **3.04 MB** | 33 | 0.0002 |
| Product, desktop cold load | 0.06 s | 0.48 s | **2.23 s** | 2.69 s | ~3.04 MB | ~33 | 0.0004 |
| Homepage, mobile cold load | 0.11 s | 1.14 s | **21.50 s** | 23.92 s | **4.55 MB** | 17 | 0.0003 |
| Product what-if, secondary images prevented | 0.13 s | 1.59 s | **5.18 s** | 5.16 s | 0.73 MB | 34 registered* | 0.0002 |
| Product directional what-if, secondary images prevented + 142 KB hero | 0.07 s | 1.43 s | **2.12 s** | 3.14 s | 0.42 MB | 35 registered* | 0.0001 |

\* Blocked requests remain visible in the browser's resource log with zero transferred bytes. A real implementation should avoid issuing those requests, not abort them.

### Current local worktree versus production

The local product page has substantial uncommitted work that is not on the live page. The measured local page had 1,150 elements, 90 image elements, 18 scripts, and 17 stylesheets, versus 1,062 elements, 52 images, 16 scripts, and 16 stylesheets live. The added lifestyle carousel is correctly using responsive `srcset` candidates and native lazy loading, so it did not create the initial multi-megabyte problem in the test. The locally added assistant still adds render-blocking CSS and eagerly parsed JS/knowledge files before the user opens it; that should be lazy-loaded before deployment if possible.

## Findings and fix order

### P0 — The full product gallery downloads during initial load

**Evidence**

- Product thumbnails at `product.html:123–145` point to the full gallery files.
- Full gallery images at `product.html:151–158` also have real `src` values from first parse.
- The browser fetched all eight unique gallery sources during the initial load despite `loading="lazy"` on the non-active images.
- The gallery alone contains **2,544,119 bytes** of image bodies before response overhead.
- `03-consumer-results-green.png` is **872,903 bytes** and is initially rendered as a roughly 42×52 px thumbnail.
- All seven secondary gallery downloads started around 1.52 s and competed with the LCP hero until roughly 10–15 s.

**Root cause**

Native lazy loading is a distance heuristic, not a guarantee. Both the thumbnail rail and the hidden full-size gallery elements are in the above-the-fold gallery, so Chromium considers them close enough to load. Having `display:none`, opacity, or an inactive class does not reliably stop a parsed `src` from being requested.

**Recommended implementation**

1. Keep a real `src` only on the active main image.
2. Put secondary full-size URLs in `data-src` or a JavaScript gallery-data array. Assign `src` only when a thumbnail is selected. Optionally prefetch only the next slide after `load` or during idle time.
3. Generate dedicated thumbnail files at roughly 96–160 px wide. Do not reuse the full 512–1624 px gallery files for 42–62 px thumbnail slots.
4. Use `<picture>` with AVIF/WebP plus responsive `srcset` candidates for every full gallery image.
5. Preserve `fetchpriority="high"` only on the first hero. Do not preload or prioritize the other gallery images.

**Expected impact**

The controlled no-secondary-image run reduced initial transfer from 3.04 MB to 0.73 MB and LCP from 14.11 s to 5.18 s. This is the largest single opportunity.

### P0 — The product LCP hero is still too heavy

`assets/product-gallery/01-daily-actions.jpg` is 1080×1350 and **454,249 bytes**. The tested mobile slot was approximately 353×442 CSS pixels. The source resolution is reasonable for a high-DPR phone, but its transfer size is not.

**Recommended implementation**

- Produce at least 480, 720, and 1080 px-wide AVIF/WebP variants.
- Target roughly **100–150 KB** for the mobile-selected hero while visually checking the gloves, hands, and embedded text.
- Supply accurate `width`, `height`, `srcset`, and `sizes` so mobile does not receive a desktop-sized file unnecessarily.
- Keep the existing aspect-ratio reservation and high fetch priority on the first image.

A temporary 720×900 JPEG used for direction testing was 141,950 bytes, compared with the current 454,249-byte source. Modern AVIF/WebP should provide an equal or better budget at acceptable quality.

### P0 — Multi-megabyte PNGs affect other main pages

The live homepage fetched both of these during the initial mobile load:

- `mybambook-home-hero-couple-coffee-2026-07-20.png`: **1,952,077 bytes**, eager hero (`index.html:80`).
- `mybambook-reading-book-gloves-2026-07-28.png`: **2,377,486 bytes**, native-lazy but close enough to the viewport to fetch (`index.html:129`).

The combined 4.33 MB image transfer produced a 21.50 s homepage LCP.

Other site-wide risks found statically:

- FAQ eager hero, `mybambook-mug-morning-gloves-2026-07-28.png`: **2,234,676 bytes** (`faq.html:164`).
- Mission eager hero, `mybambook-laptop-typing-gloves-2026-07-28.png`: **2,583,589 bytes** (`mission.html:85`).
- Mission near-top lazy image, `mybambook-smartphone-use-gloves-2026-07-28.png`: **2,395,141 bytes** (`mission.html:93`).

Convert these to responsive AVIF/WebP sets. Native `loading="lazy"` alone is not a safe optimization for a 2 MB image located near the top of a short page.

### P1 — A below-fold product image is eager

`product.html:557` loads `mybambook-desk-gloves-salad-2026-07-28.webp` without `loading="lazy"`, `decoding="async"`, dimensions, or responsive candidates. It is approximately 6,400 px down the tested mobile page but still transferred **213,586 bytes** during the initial load.

Add native lazy loading, async decoding, explicit dimensions, and responsive variants. This is a low-risk, high-confidence saving.

### P1 — Third-party JavaScript competes with LCP

The product mobile run transferred approximately **199 KB** of measurable Meta JavaScript before LCP and decoded about 680 KB across `fbevents.js` and its configuration script. Meta attribution is essential for paid traffic, so it should not simply be removed.

Recommended order:

1. Complete image fixes first and retest with Meta untouched.
2. If more headroom is needed, inline the tiny 443-byte local pixel bootstrap to remove its parser-blocking local request, or start it just after first paint. Any delay must be validated against Pixel and Conversion API attribution before shipping.
3. Keep `ViewContent`, `AddToCart`, and purchase-event integrity as guardrails. Speed that damages attribution is not a win for an ad landing page.

Other third parties:

- `https://cdn.shopify.com/storefront/web-components.js` is a parser-blocking head script: 26.3 KB transferred, 93.6 KB decoded. Repository code uses `universal-cart.js` and direct Storefront GraphQL; no script references to the `<shopify-store>` or `<shopify-cart>` elements were found. Verify the purchase flow, then remove the web-components script and legacy markup if redundant. If still needed, test it with `defer`.
- The Negishot accessibility widget is about 170 KB decoded in coverage and loads without `async` or `defer` at the end of the body. It delayed the load path by roughly 0.8–3.1 s across runs. Keep the accessibility function, but ask the vendor for a supported async/deferred installation and regression-test the widget before changing it.
- Cloudflare email decoding and analytics were comparatively small and are not priority work.

### P1 — Too much render-blocking CSS and legacy CSS

The product head requests 13 local stylesheets plus Google Fonts before rendering. Production compression keeps the network cost moderate, but every stylesheet remains render-blocking.

Coverage observations:

- `css/product.css`: 84.1 KB decoded, about **19.7%** used in the measured page state.
- `css/sections/product-hero.css`: 49.3 KB decoded, about **46.7%** used.
- `css/sections/home-comparison.css`: 7.2 KB decoded, about **1.5%** used.
- The strict repository audit also reports comparison, fair-question, FAQ, final-CTA, and product rules scattered across multiple files.

Recommended implementation:

1. Remove legacy selectors that no longer match product-page markup.
2. Separate the product hero/nav critical CSS from below-fold section CSS while keeping the site's no-inline-style rule.
3. Consolidate section ownership so the browser parses one current rule set instead of old plus overriding rules.
4. Retest visual snapshots at 390/768/1024/1440 after each extraction.

This should improve FCP and main-thread work, but it is second to the image work because live FCP is already 1.53 s while LCP is 14.11 s.

### P2 — Fonts request more families and weights than the critical view needs

The page requests Heebo weights 400/500/600/700/800/900 and Inter 400/700 through a render-blocking Google Fonts stylesheet. The product CSS uses Heebo first and Inter only as fallback, with additional synthesized weights such as 650/750/850.

Audit which weights actually render, then keep the minimum practical set, likely regular, semibold, bold, and extra-bold. Consider self-hosted subsetted WOFF2 files only after the image and script fixes. The measured Google Fonts CSS request cost about 0.34 s, but no font-file request became one of the dominant transfers in this run.

### P2 — Cache policy is short for versioned static assets

Live static assets returned `cache-control: public, max-age=14400, must-revalidate`, and the checked images/CSS were `cf-cache-status: REVALIDATED`. HTML returned `max-age=0` and `cf-cache-status: DYNAMIC`.

Because CSS/JS references already carry version hashes, serve versioned static assets with a long immutable browser cache, typically one year. Give content-addressed image filenames the same treatment. This helps returning visitors and repeat page views, but it does not solve cold ad traffic.

HTML caching is not the urgent issue: measured TTFB was already about 0.1 s. A short edge TTL can be considered later if deployment freshness rules permit it.

### P2 — Large HTML/DOM and locally pending widgets

The live product page contains 1,062 elements, 52 image elements, 16 scripts, and 16 stylesheets. Its HTML is 104.7 KB decoded but only about 25 KB transferred. This is not the primary network bottleneck, although it contributes to approximately 596 ms of lab blocking time.

Low-risk cleanup candidates:

- Remove the inert `.pdp-stage-node` script at `product.html:362–377`.
- Externalize and defer cacheable inline behavior where it does not need to execute during parse.
- Lazy-load the locally pending Bambook assistant's CSS, knowledge file, and runtime on first intent or during idle time after LCP.
- Render one lifestyle-carousel group and clone/activate it after intersection instead of shipping 38 image elements in initial HTML, if DOM cost becomes measurable.

The sampled product click event was 72 ms and CLS was excellent, so a wholesale page rewrite is not justified by the current evidence.

## Files that look heavy but do not currently slow the product page

The repository contains a 25.9 MB UI/UX PDF, multi-megabyte unused PNGs, visual artifacts, and a large local `.git` directory. None was requested by the product-page browser run, so deleting them would not improve customer LCP. Moving unused artifacts and the PDF outside the deploy root can reduce repository/deployment weight, but that is a build hygiene task, not an ad-landing speed fix.

## Recommended performance budget and automated guard

Add a cold-mobile Playwright performance guard for the live or production-like product page with these starting budgets:

- LCP: **≤ 2.5 s target**, fail above 3.0 s.
- FCP: **≤ 1.8 s**.
- CLS: **≤ 0.10**.
- Approximate TBT: **≤ 200 ms**.
- Initial total transfer: **≤ 700 KB**.
- Initial image transfer: **≤ 250 KB**.
- Initial full-size gallery images: **1**.
- Any thumbnail: **≤ 25 KB**.
- Any below-fold image requested before scroll: fail unless explicitly allowlisted.

Also record field Core Web Vitals through Cloudflare Web Analytics, GA4 web-vitals events, or another RUM channel. Segment mobile Meta in-app browser traffic separately because that is the highest-value and highest-risk audience for this page.

## Implementation sequence

1. **Product gallery request strategy:** real `src` only for active image; dedicated thumbnails; load full secondary image on selection.
2. **Responsive hero formats:** 480/720/1080 AVIF/WebP; mobile hero budget 100–150 KB.
3. **Below-fold product image:** add proper deferral and responsive candidates.
4. **Site-wide PNG pass:** homepage, FAQ, and mission multi-megabyte assets.
5. **Retest product cold mobile with Meta unchanged.** Do not optimize attribution blindly.
6. **Shopify and Negishot script pass:** remove redundant Shopify components or defer; use vendor-supported async accessibility loading.
7. **CSS ownership/critical-path pass:** trim legacy selectors and reduce blocking files.
8. **Long-lived immutable caching and a permanent performance-budget test.**

The first four steps should produce most of the conversion-relevant gain. Do not spend the first iteration cleaning unreferenced repository files or micro-optimizing tiny scripts while the browser is still downloading 2–4 MB of first-view images.
