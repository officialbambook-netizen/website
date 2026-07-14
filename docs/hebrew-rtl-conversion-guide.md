# English → Hebrew (RTL) Web Conversion Guide — v2, audited

Origin: operator-supplied guide (2026-07-14), audited and corrected the same day against
W3C i18n docs, MDN, rtlstyling.com, W3C Hebrew Layout Requirements, Typotheque Hebrew
typography research, and live `Intl` output. Corrections and additions are marked **[v2]**.
This is the working reference for converting MyBambook pages to Hebrew.

---

## 1. Core principle

Translating a page is **not** word replacement. A proper Hebrew version needs:

1. Translated copy everywhere — including alt text, ARIA labels, placeholders, validation
   errors, meta/SEO, cookie banners, toasts.
2. `<html lang="he" dir="rtl">` as the source of truth for direction (not CSS `direction`).
3. Mirrored layout where direction carries meaning; unmirrored where it doesn't.
4. CSS logical properties instead of physical left/right.
5. Bidi isolation for mixed Hebrew/English/number content.
6. `he-IL` locale formatting for prices and dates.
7. **[v2] A font stack that actually contains Hebrew glyphs** — most English brand fonts
   (Inter, Manrope, Playfair Display, Avenir, Montserrat, Cormorant, Nunito) have **zero
   Hebrew coverage**; without replacement the browser silently falls back to system fonts
   and the page looks broken-by-default.
8. **[v2] Hebrew typography rules** — no italics, no uppercase, no letter-spacing. These are
   Latin-only tools; §8 explains what to do instead.
9. QA on real Hebrew text at real viewports.

---

## 2. Implementation strategy

Pick deliberately; both are valid:

- **Parallel pages** (`index-he.html` or `/he/` tree) — when English must stay live for
  customers. Costs double maintenance.
- **In-place conversion on a git branch** — when the Hebrew site *replaces* the English one
  (our case: IL is the only market; English pages are a learning artifact, and git history
  keeps them recoverable). **[v2] For MyBambook: convert in place; git is the backup.**

For static multi-page sites, hardcoded Hebrew in the HTML is fine. Reach for JSON locale
files + an i18n runtime only when two languages must be served from one set of templates.
(The v1 guide's `i18n.js`/React/Tailwind sections were dropped — this codebase is static
HTML/CSS/JS with no framework, per `site/CLAUDE.md`.)

---

## 3. Document setup

```html
<html lang="he" dir="rtl">
```

- `dir` on `<html>` is the direction source of truth (W3C: direction is content, not style;
  it must survive CSS being disabled). Never rely on `body { direction: rtl }` alone.
- `lang="he"` switches screen-reader voices, spellcheck, and font selection.
- **[v2]** Expect the **desktop scrollbar to move to the left edge** — that is correct RTL
  browser behavior, not a bug.
- **[v2]** If a block of English intentionally remains (e.g. a legal snippet), wrap it in
  `<div lang="en" dir="ltr">` so screen readers switch voice and alignment is right.

---

## 4. What to translate (checklist)

Visible: title, nav, headings, body, buttons, badges, prices' labels, forms, empty states,
footer. Hidden: `meta description`, `og:*`/`twitter:*`, `alt`, `aria-label`,
`aria-describedby`, `placeholder`, validation messages, JS-generated strings (cart drawer,
toasts, "Added to cart"), `<noscript>` text, cookie banner, 404 text.
**[v2]** Also grep `js/` for string literals — cart/menu scripts often hold copy.
**[v2]** `og:locale` becomes `he_IL`.

---

## 5. CSS: logical properties

| Physical | Logical |
|---|---|
| `margin-left / -right` | `margin-inline-start / -end` |
| `padding-left / -right` | `padding-inline-start / -end` |
| `border-left / -right` | `border-inline-start / -end` |
| `left: / right:` | `inset-inline-start: / -end:` |
| `text-align: left/right` | `text-align: start/end` |
| `border-top-left-radius` … | `border-start-start-radius` … **[v2]** (start-start = top-inline-start corner; well supported since 2021) |
| `float: left` | `float: inline-start` **[v2]** (supported in all modern browsers; no hedging needed) |
| `background-position: left …` | `background-position: inline-start …` is **not a thing** — see §6 |

**[v2] Support status:** all inline/block logical properties, logical border-radius, and
`:dir()` are baseline in every browser an IL 2026 audience uses. Write logical-only; skip
physical fallbacks.

**[v2] Symmetric values need no change:** `padding: 0 16px`, centered text, centered flex —
leave them. Only *asymmetric* left/right rules need conversion. Audit with:
`grep -rnE "(margin|padding|border)-(left|right)|text-align:\s*(left|right)|\b(left|right):" css/`

---

## 6. **[v2] What logical properties do NOT fix** (the missed class of bugs)

These stay physical and need explicit `html[dir="rtl"]` (or `:dir(rtl)`) overrides:

1. **`box-shadow` with an x-offset** — `box-shadow: 4px 4px 0 #000` keeps pointing right in
   RTL. Flip the sign: `html[dir="rtl"] .card { box-shadow: -4px 4px 0 #000; }`
   (Symmetric shadows — `0 2px 8px rgba(...)` — need nothing; that's most of them.)
2. **`transform: translateX(...)`** — transforms have no logical variants. Any slide-in
   animation, off-canvas drawer, or nudge that uses a signed X value needs an RTL override
   or a duplicated `@keyframes` targeted via `html[dir="rtl"]`.
3. **`background-position` with a side keyword or x-offset** — `background-position: right
   8px center` must be manually flipped. Same for directional background *images* (arrows,
   fades): swap or `scaleX(-1)` them.
4. **Absolutely-positioned pixel math in JS** — `el.style.left = x + 'px'`,
   `getBoundingClientRect().left` assumptions.
5. **`scrollLeft` in JS** — standardized RTL behavior: `scrollLeft` is **0 at the start
   position (right edge) and goes negative** scrolling left. Pixel-math carousels break
   silently. Prefer `scrollIntoView`, `scrollBy`, or CSS scroll-snap (snap is
   logical-direction-aware and just works). Third-party sliders need their RTL flag
   (e.g. Swiper `dir="rtl"` support).
6. **Keyboard arrows in custom widgets** — in RTL, ArrowLeft should move "forward".
   Native inputs/tabs handle it; custom JS must.
7. **`row-reverse` / `order` used to fake RTL** — don't. Flex and grid already follow
   `dir` automatically; `row-reverse` on top of `dir="rtl"` double-flips back to LTR.
   Also keep DOM order = reading order (screen readers follow DOM, not visual order).

---

## 7. Layout mirroring — what flips, what doesn't

**Flips:** reading flow, nav order (auto with flex once `dir` is set), image/text side in
two-column sections (auto with grid/flex — verify each section visually), drawer side,
badge corners, breadcrumb/progress direction, directional arrows/chevrons
(`html[dir="rtl"] .icon-directional { transform: scaleX(-1); }`), carousel advance
direction, form label/error alignment.

**Never auto-flip:** logos, brand marks, product photos, human faces, checkmarks ✓,
play icons, clocks, maps, charts with meaningful axes, phone icons.

**[v2]** Because flex/grid mirror automatically, the usual job is *un-flipping* the few
things that shouldn't move — not adding mirroring. Audit visually per section rather than
writing `order:` rules preemptively.

---

## 8. **[v2] Hebrew typography (was the v1 guide's biggest gap)**

Hebrew is unicameral (no upper/lowercase) and has no italic tradition. Three Latin
conventions must be *removed*, not translated (Typotheque / Hebrew type research):

1. **`letter-spacing`** — English luxury/eyebrow tracking (`letter-spacing: .1em` +
   uppercase) degrades Hebrew badly. Reset to `normal`/`0` for Hebrew text:
   `html[dir="rtl"] * { letter-spacing: normal; }` is a legitimate blanket fix, with
   per-element re-enabling only for Latin snippets (SKUs, brand name).
2. **`text-transform: uppercase`** — a no-op on Hebrew glyphs, but the *design pattern*
   (small caps label) collapses. Rebuild eyebrows/labels with size, weight, and color
   instead of caps + tracking.
3. **`font-style: italic`** — Hebrew fonts have no true italics; browsers fake an ugly
   slant. Emphasize with weight or color. (Same for `<em>` defaults — restyle.)

Also:
- **Bold**: Hebrew bold clogs at heavy weights; if the Latin design uses 800–900, try
  700 for Hebrew headings and compare.
- **Line-height**: Hebrew reads better slightly looser; body 1.5–1.7. Most letters have no
  ascenders/descenders, so Hebrew *can* sit a touch tighter vertically — but descenders
  (ק ף ץ ן) plus `text-decoration: underline` collide: set `text-decoration-skip-ink: auto`
  or thickness/offset on underlined links.
- **No `text-align: justify`** for Hebrew web text; no hyphenation. Avoid
  `word-break: break-all`.
- **Punctuation**: use gershayim ״ (U+05F4) inside Hebrew abbreviations (מע״מ, ד״ר) and
  geresh ׳ (U+05F3) — not ASCII quotes. Maqaf ־ is optional/editorial.

### Fonts — the stack must contain Hebrew

Google Fonts with real Hebrew coverage:
- **Sans (UI/body):** Heebo (Hebrew-first companion to Roboto; weights 100–900 — closest
  drop-in for an Inter-based design), Assistant (200–800), Rubik, Noto Sans Hebrew.
- **Serif (display):** Frank Ruhl Libre (the classic Israeli print face), Noto Serif
  Hebrew, David Libre.

Pattern:
```html
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
```
```css
:root { --sans: "Heebo", "Inter", Arial, sans-serif; }
```
Hebrew family **first**; the Latin face stays as fallback for embedded English. Verify no
`font-family` elsewhere bypasses the token (grep for `font-family` outside `tokens.css`).

---

## 9. Mixed Hebrew/English/numbers (bidi)

- Plain numbers inside Hebrew flow correctly by themselves — **don't wrap every number**;
  over-wrapping is its own bug class. Isolate only when punctuation/units/Latin mix:
  `<span dir="ltr">S / M / L</span>`, `<span dir="ltr">support@mybambook.com</span>`.
- Unknown/dynamic strings: `<bdi>` or `dir="auto"` on the wrapper.
- Ranges read right-to-left in Hebrew: write 15–18 ס״מ as plain Hebrew text and it renders
  correctly; only force LTR when a range mixes Latin units.
- Stray punctuation at a direction boundary (e.g. trailing `!` after a Latin word) —
  fix with RLM `&rlm;` (U+200F) after the punctuation, or restructure the sentence.

---

## 10. Forms

- Labels, placeholders, error strings, `<option>` text — Hebrew.
- `dir="ltr"` on inputs for **email, phone, URLs, coupon codes** (add
  `text-align: left` so typed text doesn't jump); `dir="auto"` for name/free text.
  Hebrew placeholder inside a `dir="ltr"` field will left-align — acceptable; don't hack it.
- `type="tel"` + `autocomplete` unchanged. Israeli phone display format: `050-1234567`,
  kept LTR.
- Native `<select>` repositions its chevron automatically; **custom** selects with a
  background-image arrow need the §6 background-position flip.
- Validation icons/error text anchored with physical `right:` must move to
  `inset-inline-end`.

---

## 11. Prices, dates, numbers — he-IL ground truth **[v2 corrected]**

Live `Intl` output (verified, Node 2026):

| API | Output |
|---|---|
| `NumberFormat('he-IL',{currency:'ILS'})` on 219 | `‏219 ₪` — **symbol AFTER the number**, non-breaking space, RLM marks |
| `DateTimeFormat('he-IL')` | `14.7.2026` (dots, not slashes) |
| `DateTimeFormat('he-IL',{dateStyle:'long'})` | `14 ביולי 2026` |

- The v1 guide's `₪199` example had the symbol on the wrong side for locale output. In
  static HTML write `219 ₪` with `&nbsp;` between number and symbol: `219&nbsp;₪`.
- `ש״ח` (with gershayim) is a valid text alternative; ₪ is standard for price tags.
- Israeli sites customarily state VAT inclusion: `המחיר כולל מע״מ`.
- **Business days:** the Israeli work week is Sunday–Thursday. Shipping copy should say
  `ימי עסקים` and mean Sun–Thu — don't translate "business days" with a Mon–Fri mental
  model.
- Units: Israel is metric — lead with cm (the glove size chart is already cm-first; inches
  may be dropped or kept in parentheses).

---

## 12. Hebrew copy tone (not word-for-word) **[v2 — v1's table was garbled]**

- No title case in Hebrew; only sentence-initial capitals don't exist at all.
- Address form: Israeli DTC copy addresses the reader in second person. Choose ONE register
  site-wide and hold it: masculine singular (default-neutral in Israeli advertising),
  feminine singular (warmer for a female-core audience), or plural (רבים — polite,
  distance-safe). For MyBambook (women 55–64 core, warm-friend voice): **plural for
  CTAs/buttons, warm neutral body copy** is the safe launch register; revisit after
  Hebrew voice data arrives from ad comments.
- Standard ecommerce CTA equivalents:

| English | Natural Hebrew (plural register) |
|---|---|
| Shop Now | לרכישה / קנו עכשיו |
| Add to Cart | הוסיפו לסל |
| Buy Now | לקנייה מיידית |
| Learn More | למידע נוסף / קראו עוד |
| Get Started | מתחילים כאן |
| Free Shipping | משלוח חינם |
| 60-Day Money-Back Guarantee | 60 יום החזר כספי מלא |
| Size Guide | מדריך מידות |
| Reviews | ביקורות / חוות דעת |
| FAQ | שאלות נפוצות |

- Claims discipline still applies in Hebrew — banned registers stay banned in translation
  (see `01_BRAIN/CLAIMS_RULES.md`; "מרפא / מטפל ב… / מונע" are explicitly listed).
- **[v2] Israeli consumer-protection note:** IL law gives consumers a 14-day remote-sale
  cancellation right (תקנות הגנת הצרכן — ביטול עסקה). A 60-day brand guarantee exceeds it —
  present the guarantee as the brand promise; never present the legal minimum as a perk.

---

## 13. Images, SVGs, media

- Rebuild images containing baked-in English text with Hebrew versions (hero overlays,
  badges, comparison graphics, size-chart images).
- Inline SVG arrows: flip via CSS (`scaleX(-1)`) under `html[dir="rtl"]`.
- Photos of the product being *worn/used* don't flip. §7 list governs.

---

## 14. SEO / metadata

- Translate `<title>`, `meta description`, OG/Twitter tags; `og:locale` = `he_IL`.
- `hreflang` pairs **only if both languages stay publicly served**. A Hebrew-only site
  needs no hreflang — just correct `lang`/`dir` (MyBambook: Hebrew-only, skip it).
- Keep URLs/paths as-is unless there's a real routing need; Hebrew-slug URLs are optional
  and bring encoding noise.
- Structured data (`schema.org`) text fields translated; `inLanguage: "he"`.

---

## 15. Accessibility

- `lang="he"` (screen-reader voice), translated `aria-label`s, `alt`s.
- DOM order stays the reading order — no CSS-only reordering (`order`, `row-reverse`) that
  diverges from DOM.
- Focus rings: verify visibility after mirroring (esp. custom `outline-offset` + shadows).
- `lang="en" dir="ltr"` on intentionally-English islands.
- Touch targets ≥ 44px and body ≥ 16px hold as-is (site rule).

---

## 16. QA checklist (run per page, 390/768/1024/1440)

**Direction & layout**
- [ ] `<html lang="he" dir="rtl">`; scrollbar on left (desktop) = expected
- [ ] No horizontal scroll at any test viewport
- [ ] Two-col sections mirrored (image/text swapped); nav flows RTL; drawer opens from the correct side
- [ ] No double-flip (`row-reverse` + rtl); no leftover `left:`/`right:` breaking pinned elements
- [ ] Directional icons flipped; logos/product photos NOT flipped
- [ ] Shadows with x-offsets flipped; slide-in animations move the right way

**Text & typography**
- [ ] Hebrew renders in the intended Hebrew font (spot-check a heading and body — not a
      fallback font; DevTools → rendered fonts)
- [ ] letter-spacing neutralized on Hebrew; no fake italics; eyebrow pattern rebuilt
- [ ] No clipped/overflowing buttons (Hebrew strings differ in length)
- [ ] Mixed-direction lines render correctly (prices, emails, sizes, brand name)
- [ ] Punctuation sits on the correct side at direction boundaries

**Content**
- [ ] All copy Hebrew incl. alt/aria/placeholder/meta/JS strings; no stray English
- [ ] Prices `X ₪` format; dates `14.7.2026`; shipping says ימי עסקים
- [ ] Copy passes CLAIMS_RULES (no treatment verbs, no invented stats/social proof)
- [ ] Offer facts match `OFFER_STRUCTURE.md` (₪179 single / ₪219 2-pair default / 60-day
      guarantee / 7–14 day shipping / no knee-sleeve upsell)

**Forms & interactive**
- [ ] Email/phone/coupon inputs `dir="ltr"`; labels/errors Hebrew & aligned start
- [ ] Cart drawer, floating cart, menus: correct side, Hebrew strings, working add-to-cart
- [ ] Keyboard navigation sane; focus visible

---

## 17. Common mistakes (v1 list, tightened + additions)

1. Translating text but leaving `dir` unset — or setting it only in CSS.
2. Leaving `letter-spacing`/uppercase/italic Latin styling on Hebrew text. **[v2]**
3. Shipping with a no-Hebrew font stack (silent system-font fallback). **[v2]**
4. Faking RTL with `row-reverse`/`order` instead of `dir`. **[v2]**
5. Missing box-shadow/translateX/background-position physical leftovers. **[v2]**
6. Making email/phone/coupon inputs RTL.
7. Mirroring logos or product photos.
8. Word-for-word CTA translation ("Get Started" → "התחל" reads robotic).
9. Forgetting JS-held strings and alt/aria/meta text.
10. Writing `₪219` because English puts the symbol first. **[v2]**
11. Skipping mobile QA — Hebrew string lengths break buttons at 390px first.
12. scrollLeft pixel math in carousels breaking silently in RTL. **[v2]**

---

## 18. Sources

- W3C i18n: [HTML dir](https://www.w3.org/International/questions/qa-html-dir) ·
  [CSS vs markup for bidi](https://www.w3.org/International/questions/qa-bidi-css-markup) ·
  [Inline bidi markup](https://www.w3.org/International/articles/inline-bidi-markup/) ·
  [Hebrew Layout Requirements](https://www.w3.org/International/hlreq/)
- MDN: [dir attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/dir) ·
  [CSS logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values) ·
  [:dir()](https://developer.mozilla.org/en-US/docs/Web/CSS/:dir) ·
  [bdi](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/bdi) ·
  [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [RTL Styling 101 (Ahmad Shadeed)](https://rtlstyling.com/posts/rtl-styling/) — box-shadow/transform/background pitfalls
- [Tiger Oakes: RTL tricks](https://tigeroakes.com/posts/rtl-tricks/)
- [Typotheque: Secondary style in Hebrew typography](https://www.typotheque.com/articles/secondary-style-in-hebrew-typography) ·
  [Meir Sadan: Intro to Hebrew type](https://medium.com/@meirsadan/an-introduction-to-hebrew-type-98933e2fcb17)
- Google Fonts Hebrew: [Heebo](https://fonts.google.com/specimen/Heebo) ·
  [Assistant](https://fonts.google.com/specimen/Assistant) ·
  [Frank Ruhl Libre](https://fonts.google.com/specimen/Frank+Ruhl+Libre) ·
  [Noto Serif Hebrew](https://fonts.google.com/noto/specimen/Noto+Serif+Hebrew)
- `Intl` outputs verified locally (Node, he-IL), 2026-07-14.

## Changelog
- **2026-07-14 v2:** Audited operator's v1. Fixed: ₪ symbol side + he-IL date formats
  (verified against live Intl); garbled Hebrew examples and CTA table rewritten; added the
  missing classes of bugs — box-shadow/transform/background-position/scrollLeft/keyboard
  (§6), Hebrew typography rules incl. letter-spacing/italic/uppercase removal (§8), Hebrew
  serif options, business-days = Sun–Thu, VAT line, consumer-protection note, bidi
  over-wrapping warning, hreflang-only-if-bilingual, `lang="en"` islands. Dropped
  i18n.js/React/Tailwind sections (banned/irrelevant in this codebase). Scoped strategy
  section to in-place conversion for MyBambook.
