# Bambook Website — Edit Rules

Auto-loads when working inside `site/`. One template, one rule set. If anything here ever conflicts with `bambook-web-developer/SKILL.md`, this file wins (it lives with the code).

---

## 0. Before you edit — frame the change (mandatory)

**Step 1 — Read the page context first.**
Before touching anything, open the CSS files of the 1–2 sections immediately above and below the target. Note their:
- Section padding (is it `var(--section-py)` / `var(--section-py-b)` or something tighter?)
- Column layout and grid gap values
- Card/component pattern in use (token names, border, shadow, radius)

Your edit must continue that rhythm. If the neighbors use a tighter gap, match it. If they use a wider image column, match it. The page's own established flow is the reference — not this file, not `Brand-webdesign.md`.

**Step 2 — Fall back to [`docs/visual-locked.md`](docs/visual-locked.md)** only when:
- You're adding the first section to a new page (no neighbors to read)
- The user names a specific section to model ("match the community section")
- You need to look up which token to use for a specific purpose

**Step 3 — Frame the change.**
Never touch markup until you've said back, in one line each, and the user has confirmed:
- **Section:** which section (by name from `SECTION_MAP.md`).
- **Neighbors read:** which surrounding section CSS files you read to understand the page rhythm.
- **Now:** what it currently does / looks like.
- **Target:** what "good" looks like — and what job this section does in the funnel.

No "frame the change" → no edit. This is the fix for "the agent changed something I didn't mean."

---

## 1. Architecture (the only system — don't reinvent)

Custom static HTML/CSS/JS, hosted from GitHub. Shopify = backend only (Storefront Web Components). **No** Liquid, React, Tailwind, shadcn.

```
css/
  tokens.css          ← SINGLE source of truth. Every value lives here, by name.
  base.css            ← primitives: .container .section .two-col .eyebrow .reveal-page
  sections/home-*.css ← ONE file per homepage section. Section styles live here, nowhere else.
  components/         ← main-menu.css footer.css floating-cart.css
  product.css         ← product page (separate Cormorant/Nunito system — see §6)
preview/index.html    ← section-isolation harness
```

**Rules — no exceptions:**
1. **Tokens only.** No raw hex, no magic spacing numbers, no font names inline. Pull from `tokens.css` by name.
2. **Zero inline `style=`. Zero inline `<style>` blocks.** A new rule goes in that section's file in `css/sections/`.
3. **Reuse primitives first.** `.container .section .two-col .eyebrow` from `base.css` before writing any new layout.
4. **One file per section.** A homepage section's CSS lives only in `css/sections/home-<name>.css`. Never add section rules to `tokens.css`, `base.css`, or `home.css`.
5. **No `!important` to win a fight.** If you need it to override, the real rule is in the wrong place — fix the source instead. (Legacy `!important` in `home.css`/`home-sections.css` is debt being removed, not a pattern to copy.)
6. **Mobile-first.** Never fix desktop by breaking mobile.
7. Products & pricing are served by Shopify — never hardcoded. **Copy is never invented.** Render existing approved copy as-is — unless the task is to change the words, in which case write them in **combined web-dev + copywriting mode**: on-voice, `CLAIMS_RULES`-safe, and with offer facts taken from `01_BRAIN/OFFER_STRUCTURE.md` (the live site is the source of truth). Route risky/novel claims and angle rewrites out; never fabricate specs, stats, or offer details.
8. **No CSS in JavaScript.** Styles live in `css/` and reference tokens. Never build a `<style>` block or hardcode hex inside a JS string — it escapes `tokens.css` *and* `audit.py`, so it can never be themed or caught. (`universal-cart.js` / `floating-cart.js` do this today — known debt, audit-tracked under `JS_DEBT`, pending extraction. Don't copy the pattern.)
9. **Client JS is public — no secrets, no business data in it.** No discount codes, no price constants, no private keys in `js/`. Prices and codes come from Shopify at runtime. (The Storefront *public* access token is the one exception — it's designed to ship to the browser.) `audit.py` now greps `js/` for hex, `<style>`, price literals, and code patterns.

---

## 2. Section template (the only one)

```html
<section class="section section--cream reveal-page <name>">
  <div class="container two-col <name>__grid">
    <figure class="two-col__img <name>__img">
      <img src="assets/..." alt="describe the image">
    </figure>
    <div class="two-col__text <name>__text">
      <p class="eyebrow">Section Name</p>
      <h2>Heading</h2>
      <p>Body copy.</p>
    </div>
  </div>
</section>
```
No inline `style=`. No trailing `<style>`. Per-section tweaks go in `css/sections/home-<name>.css`.

Tokens (canonical — defined in `tokens.css`):
```
--cream #f7efe3  --ivory #fff9f0  --sand #efe2d0  --blush #c9897e
--gold #c99a5d   --ink #403632    --taupe #6f6861
--serif Didot…   --sans Avenir…   --space-* scale  --section-py  --container
```

---

## 3. Spacing & sizing

- Vertical rhythm: `--section-py` (defined once in tokens). Don't re-type section padding per section.
- All spacing from the `--space-*` scale. No random `clamp()` per section.
- Grids/wrappers: `min-width:0` on container + every direct child (prevents grid blowout).
- No fixed pixel widths on wrappers — use `min()`, `clamp()`, `%`.
- Image figures: `min-height` via `clamp()`, never a fixed px height.
- `section, footer` already have `overflow-x: clip` — don't add scroll wrappers inside.
- Body text ≥ 16px on mobile (stops iOS zoom). Touch targets ≥ 44×44px.
- Small bottom notes under CTAs or paragraphs need visible breathing room: start at `clamp(var(--space-8), 3vw, var(--space-10))`, not `var(--space-4)`. They should read as a separate support line, not cramped metadata. If a page-level paragraph reset exists, make the note selector page-scoped so the margin is not silently zeroed.
- **Operator-locked layout defaults** (apply on every edit — see [`docs/visual-locked.md`](docs/visual-locked.md) §8): section `h2`s read as one line on desktop (no forced `<br>`, but **never** `white-space:nowrap` — it must still wrap on mobile); the gold underline under a heading is full content width (`width:100%`); body text reads at a comfortable (not cramped) size; vertical rhythm leans to the **larger** `--space-*` steps **between** paragraphs while the heading→first-paragraph gap stays **tight** — content is top-aligned under its heading, never vertically centered (no dead gap under the title).

---

## 4. Breakpoints — two different things, don't confuse them

- **Test viewports** (Playwright screenshots): `390 / 768 / 1024 / 1440`. These are the sizes we verify at.
- **CSS stack point** (where two-col collapses to image-on-top): `780px`, handled once by `.two-col` in `base.css`. Don't re-declare per section.

The legacy `980 / 640` blocks inside `home.css` are debt — fold them into the section file or `base.css`; don't add new ones.

---

## 5. Verify before you call it done (closes the broken-phone loop)

1. **Bump the cache string** for every CSS/JS file you changed — run `python3 tools/bump-cache.py` from `site/`, or hand-bump the `?v=N` on that file's `<link>`. The browser serves stale CSS otherwise — this is why "I changed it but don't see it."
2. **Preview the edited section in isolation:** `python3 -m http.server 8000`, open `http://127.0.0.1:8000/preview/`.
3. **Playwright before AND after:** `cd ../visual-tests && npx playwright test`. Screenshots are layout-sensitive but tint-tolerant — they catch overflow/spacing/stack breaks, not subtle recolors. Re-baseline (`--update-snapshots`) only when the diff is intentional and approved.
4. No horizontal scroll at 390/768/1024/1440 (the no-scroll assertion catches `body.scrollWidth > innerWidth`).

---

## 6. Product page

`product.html` runs its own Cormorant/Nunito system in `product.css` with its own `:root`. It is intentionally separate from the home system. **Editing home tokens must not reach it, and vice-versa** — if a change spans both, namespace it, don't share. This is the fix for "edit desktop, product breaks." (Unifying these two systems is a deliberate future pass, not an ad-hoc edit.)

---

## 7. Never

- Add inline `style=` or `<style>` blocks.
- Hardcode hex or magic spacing — tokens only.
- Use `!important` to win a cascade fight — fix the source rule.
- Freelance copy as a coder — if the task changes the words, do it in combined web-dev + copywriting mode (on-voice, `CLAIMS_RULES`-compliant, offer facts from `OFFER_STRUCTURE.md`/the live site). Never invent specs, stats, testimonials, guarantees, claims, or offer details; route risky claims and angle rewrites out.
- Create `*_backup.html` — git is the backup.
- Ship a section without `npx playwright test` from `05_WEBSITE/visual-tests/`.
- Put CSS (a `<style>` string or hex literal) inside a `.js` file.
- Hardcode a price or discount code in client JS.
- Close out a problem without recording it (see §8).

---

## 8. Record every problem (the prevention loop — mandatory)

Every time you hit a problem — a bug, a "change didn't show," a layout that fought you, anything that cost you a retry — it is **not fixed until you've closed the loop.** A fix that leaves no trace will be repaid as the same problem next month. This is the single rule that compounds.

The loop is **two stages** so capture stays cheap. **You only owe stage 1.**

**Stage 1 — capture (you, during the fix):** append a structured entry to [`00_CONTROL/CODER_BUGLOG.md`](../../00_CONTROL/CODER_BUGLOG.md) (code bugs live there — `LESSONS_INBOX.md` is for prose marketing/copy lessons). Use its template:

- **Symptom** — in the operator's words.
- **Root cause** — the *root*, not the symptom. "Spacing was off" is a symptom; "the section's CSS lived in two blocks and the later one won" is a cause.
- **Fix** — what you actually changed (files).
- **Generalizable law** — the reusable principle this proves.
- **Guard candidate** — what *would* catch it: a `tools/audit.py` check, a Playwright assertion, or a skill row. Be specific; don't build it now unless it's a cheap one-liner.

Leave the entry `OPEN`. **Stage 2 — harden (separate, operator-triggered):** [`bambook-agent-factory`](../../.agents/skills/bambook-agent-factory/SKILL.md)'s **System Hardening pass** reads `OPEN` entries, clusters them, builds the cheapest durable guard (a check in `tools/audit.py` / a Playwright assertion beats a sentence), adds the row to the web-dev **failure→guard table**, and flips the entry `HARDENED`. Always also log the task in [`00_CONTROL/TASK_LOG.md`](../../00_CONTROL/TASK_LOG.md).

**Definition of "done" for a problem = a `CODER_BUGLOG.md` entry with root cause + generalizable law + guard candidate (and the guard itself if it was a cheap one-liner).** No entry → the task isn't finished.
