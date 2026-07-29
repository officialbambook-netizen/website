#!/usr/bin/env python3
"""
audit.py — catch the recurring web failures BEFORE the user sees them.

Deterministic guard for the problems that keep coming back:
  - inline style="" / <style> blocks      (the thing the refactor removed)
  - !important used to win a cascade fight (the spacing-mess root cause)
  - raw hex / magic numbers outside tokens (drift)
  - CASCADE SCATTER: a section styled across >1 CSS file (why edits "don't take"
    and spacing is a mess — you fix one file, another overrides it)
  - JS HYGIENE: CSS injected from a JS string, hardcoded hex, hardcoded prices,
    or discount codes living in client JS (escapes tokens.css AND every other
    guard; client JS is public — prices/codes belong server-side / in Shopify)
  - BREAKPOINT DRIFT: media queries outside the canonical set (per-section widths
    that make responsive behaviour inconsistent page to page)
  - IMAGE FIT: object-fit: cover with no object-position (a silent guess at the crop —
    how a face ends up cut off; see "Adding an image to the site" in bambook-web-developer)

Usage (from site/):
    python3 tools/audit.py                 # audit whole site
    python3 tools/audit.py hero the-offer  # audit only these sections (by SECTION_MAP name)
    python3 tools/audit.py --strict        # exit 1 on any hard violation (CI / pre-ship gate)

No dependencies. Reads tokens.css to know the legal palette/scale.
"""
import json
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
CSS = SITE / "css"
SECTIONS = CSS / "sections"
JS = SITE / "js"

# files that are acknowledged debt — reported but don't fail --strict on their own
DEBT = {"home.css", "home-sections.css", "product.css"}
# known-offender JS pending extraction (cart CSS + pricing live here). Same role as
# DEBT for CSS: reported every run so it stays visible, but doesn't fail --strict by
# itself. The SAME pattern in any OTHER js file is a hard fail — so it can't spread.
JS_DEBT = {"universal-cart.js", "floating-cart.js"}

HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")
IMPORTANT = re.compile(r"!important")
# a px/rem literal that is NOT inside var(...) and not 0/1px hairlines
MAGIC = re.compile(r"(?<![\w-])(\d+(?:\.\d+)?)(px|rem)(?![\w-])")
INLINE_STYLE = re.compile(r'\sstyle="')
STYLE_BLOCK = re.compile(r"<style[\s>]")

# --- JS hygiene: client JS ships to the browser; CSS/prices/codes don't belong in it
JS_STYLE = re.compile(r"<style[\s>]")
# hyphenated promo codes (OT1F-X9K2) or WORD+digits codes (SUBSCRIBE20), as string literals
DISCOUNT_CODE = re.compile(r"""['"](?:[A-Z0-9]{3,}-[A-Z0-9]{3,}|[A-Z]{5,}\d{2,})['"]""")
# a constant whose name implies money, assigned a number literal
PRICE_LITERAL = re.compile(r"\b([A-Z][A-Z_]*PRICE|BASE|SUB_PRICE)\b\s*[:=]\s*\d")

# --- breakpoint drift: the only widths we intend to use
#     390/768/1024/1440 = test viewports · 780 = the single stack point (.two-col in base.css)
CANON_BP = {390, 768, 780, 1024, 1440}
MEDIA_W = re.compile(r"@media[^{]*?(?:max|min)-width:\s*(\d+)px")


def tokens_palette() -> set[str]:
    t = (CSS / "tokens.css").read_text() if (CSS / "tokens.css").exists() else ""
    return {m.lower() for m in HEX.findall(t)}


def css_files() -> list[Path]:
    out = []
    for p in [CSS / "base.css", CSS / "home.css", CSS / "home-sections.css", CSS / "product.css"]:
        if p.exists():
            out.append(p)
    out += sorted(SECTIONS.glob("*.css")) if SECTIONS.exists() else []
    out += sorted((CSS / "components").glob("*.css")) if (CSS / "components").exists() else []
    return out


def section_classes(names: list[str]) -> dict[str, list[str]]:
    """For each section name, the class selectors that identify it (from SECTION_MAP if present)."""
    # default: the section name itself is the class
    return {n: [n] for n in names}


def cascade_scatter(names: list[str]) -> list[str]:
    """A section's class defined in >1 CSS file => cascade war. Headline check."""
    findings = []
    files = css_files()
    for name in names:
        cls = re.compile(rf"\.{re.escape(name)}\b")
        hits = [f.relative_to(CSS).as_posix() for f in files if cls.search(f.read_text())]
        canonical = f"sections/home-{name}.css"
        if len(hits) > 1:
            others = [h for h in hits if h != canonical]
            findings.append(
                f"  ⚠ '{name}' styled across {len(hits)} files: {', '.join(hits)}\n"
                f"      → keep it only in {canonical}; fold {', '.join(others)} in (don't !important over them)."
            )
        elif hits and hits[0] != canonical:
            findings.append(f"  ⚠ '{name}' lives in {hits[0]}, not its canonical {canonical} (never extracted).")
    return findings


def scan_css(palette: set[str]) -> tuple[list[str], list[str]]:
    hard, soft = [], []
    for f in css_files():
        rel = f.relative_to(CSS).as_posix()
        text = f.read_text()
        body = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
        imp = len(IMPORTANT.findall(body))
        if imp:
            (soft if f.name in DEBT else hard).append(
                f"  {'·' if f.name in DEBT else '✗'} {rel}: {imp} !important "
                f"({'known debt' if f.name in DEBT else 'remove — fix the source rule instead'})"
            )
        # raw hex not in the palette (tokens.css itself is the palette, skip it)
        if f.name != "tokens.css":
            stray = {h.lower() for h in HEX.findall(body)} - palette
            if stray:
                (soft if f.name in DEBT else hard).append(
                    f"  {'·' if f.name in DEBT else '✗'} {rel}: raw hex not in tokens: {', '.join(sorted(stray))}"
                )
    return hard, soft


def scan_js() -> tuple[list[str], list[str]]:
    """Client JS is public and outside the CSS token system. Flag CSS-in-JS,
    hardcoded colors, hardcoded prices, and discount codes. Known-offender files
    (JS_DEBT) report as visible debt; the same patterns anywhere else hard-fail."""
    hard, soft = [], []
    if not JS.exists():
        return hard, soft
    for f in sorted(JS.glob("*.js")):
        rel = f"js/{f.name}"
        text = f.read_text()
        debt = f.name in JS_DEBT
        mark, bucket = ("·", soft) if debt else ("✗", hard)
        tail = " (known debt — pending extraction)" if debt else ""
        issues = []
        if JS_STYLE.search(text):
            issues.append("injects a <style> block — CSS in a JS string escapes tokens.css "
                          "AND this audit; move it to css/")
        stray = {h.lower() for h in HEX.findall(text)}
        if stray:
            issues.append(f"hardcoded hex {', '.join(sorted(stray))} — colors live in CSS via var(--token), not JS literals")
        if DISCOUNT_CODE.search(text):
            codes = ", ".join(sorted(set(DISCOUNT_CODE.findall(text))))
            issues.append(f"discount code(s) in client JS (anyone can read source): {codes} — keep codes server-side / in Shopify")
        if PRICE_LITERAL.search(text):
            issues.append("hardcoded price constant — Shopify is the source of truth; never hardcode prices in client JS")
        for msg in issues:
            bucket.append(f"  {mark} {rel}: {msg}{tail}")
    return hard, soft


def scan_breakpoints() -> list[str]:
    """Advisory — media-query widths outside the canonical set. Per-section invented
    breakpoints are why responsive behaviour drifts page to page."""
    out = []
    for f in css_files():
        if f.name in DEBT:
            continue
        rel = f.relative_to(CSS).as_posix()
        body = re.sub(r"/\*.*?\*/", "", f.read_text(), flags=re.S)
        stray = sorted({int(w) for w in MEDIA_W.findall(body)} - CANON_BP)
        if stray:
            out.append(f"  ~ {rel}: non-canonical breakpoint(s) {stray}px — canonical set is "
                       f"390/768/1024/1440 + 780 stack point (base.css .two-col); reconcile, don't invent per-section widths.")
    return out


RULE_BLOCK = re.compile(r"([^{}]+)\{([^{}]*)\}")
OBJECT_FIT_COVER = re.compile(r"object-fit:\s*cover")
OBJECT_POSITION = re.compile(r"object-position:")

# --- custom-property hygiene: a var(--x) referencing an undeclared property is
# silently dropped by the browser (CODER_BUGLOG 2026-07-23: undefined --space-18/-14/-22)
VAR_DECL = re.compile(r"(--[\w-]+)\s*:")
VAR_USE = re.compile(r"var\(\s*(--[\w-]+)\s*[,)]")
# custom properties set at runtime via el.style.setProperty('--x', ...) — never declared in
# CSS, so they'd otherwise false-positive (e.g. --vv-gap, --bamboo-loop-distance).
JS_SET_PROPERTY = re.compile(r"setProperty\(\s*['\"](--[\w-]+)")


def runtime_declared_properties() -> set[str]:
    out = set()
    for f in sorted(SITE.glob("*.html")):
        out |= set(JS_SET_PROPERTY.findall(f.read_text()))
    if JS.exists():
        for f in sorted(JS.glob("*.js")):
            out |= set(JS_SET_PROPERTY.findall(f.read_text()))
    return out


def scan_custom_properties() -> tuple[list[str], list[str]]:
    """Hard — var(--x) referencing a custom property never declared anywhere silently
    drops the whole CSS declaration (invisible until someone notices missing spacing/color)."""
    hard, soft = [], []
    # tokens.css is the palette file itself (excluded from css_files()) — it must still
    # count toward what's "declared", or every legit --space-*/--radius/etc. use false-fails.
    files = css_files()
    tokens_file = CSS / "tokens.css"
    if tokens_file.exists() and tokens_file not in files:
        files = [tokens_file] + files
    bodies = {}
    declared = set()
    for f in files:
        body = re.sub(r"/\*.*?\*/", "", f.read_text(), flags=re.S)
        bodies[f] = body
        declared |= set(VAR_DECL.findall(body))
    declared |= runtime_declared_properties()
    for f, body in bodies.items():
        rel = f.relative_to(CSS).as_posix()
        missing = sorted(set(VAR_USE.findall(body)) - declared)
        if missing:
            noun = "property" if len(missing) == 1 else "properties"
            msg = (f"  {{}} {rel}: references undefined custom {noun} {', '.join(missing)} "
                   f"— the browser silently drops the whole declaration using it.")
            (soft if f.name in DEBT else hard).append(msg.format("·" if f.name in DEBT else "✗"))
    return hard, soft


# --- pixel ID hygiene: an fbq('track', ...) call whose surrounding code references the
# raw Shopify GID getter (or a literal gid://) instead of the numeric-ID normalizer will
# ship content_ids Meta can't match to the catalog (CODER_BUGLOG 2026-07-19).
INLINE_SCRIPT = re.compile(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", re.S)
FBQ_TRACK = re.compile(r"fbq\(\s*['\"]track['\"]")
RAW_GID_LITERAL = re.compile(r"gid://")
RAW_VARIANT_GETTER = re.compile(r"\bgetVariantId\(")


def scan_pixel_ids() -> list[str]:
    """Scoped to inline <script> blocks in HTML — the actual call sites that build tracking
    payloads in this codebase. universal-cart.js legitimately contains both a generic
    fbq('track', eventName, params) wrapper AND the raw 'gid://' string inside the
    normalizer function that strips it — a whole-file scan there is a guaranteed false
    positive, not a real defect, so this check does not scan js/*.js bodies."""
    hard = []
    for f in sorted(SITE.glob("*.html")):
        for block in INLINE_SCRIPT.findall(f.read_text()):
            if FBQ_TRACK.search(block) and (RAW_VARIANT_GETTER.search(block) or RAW_GID_LITERAL.search(block)):
                hard.append(f"  ✗ {f.name}: fbq('track', ...) call site reads a raw variant ID "
                            f"(getVariantId(/gid://) — content_ids must come from "
                            f"getVariantNumericId()/variantNumericId() so Meta can match the catalog.")
    return hard


# --- template hygiene: a tag with the same attribute declared twice (usually a template
# string that appended a second `class="..."` instead of merging it — CODER_BUGLOG 2026-07-06)
TAG_WITH_ATTRS = re.compile(r"<([a-zA-Z][\w-]*)((?:\s+[a-zA-Z][\w-]*=(?:\"[^\"]*\"|'[^']*'))+)\s*/?>")
ATTR_NAME = re.compile(r"([a-zA-Z][\w-]*)=(?:\"[^\"]*\"|'[^']*')")


def scan_duplicate_attrs() -> list[str]:
    hard = []
    targets = sorted(SITE.glob("*.html"))
    if JS.exists():
        targets += sorted(JS.glob("*.js"))
    for f in targets:
        rel = f.name if f.parent == SITE else f"js/{f.name}"
        for tag, attrs_str in TAG_WITH_ATTRS.findall(f.read_text()):
            names = ATTR_NAME.findall(attrs_str)
            dupes = sorted({n for n in names if names.count(n) > 1})
            if dupes:
                hard.append(f"  ✗ {rel}: <{tag}> has duplicate attribute(s) {', '.join(dupes)} "
                            f"— likely a template string that appended a second attribute instead of merging it.")
    return hard


# --- tooling portability: a hardcoded absolute /Users/ path only works on the machine
# that wrote it — dead on any clone/checkout (CODER_BUGLOG 2026-07-20, link-checker.py)
ABS_USERS_PATH = re.compile(r"['\"/]/Users/[^'\"\s]+")


def scan_absolute_paths() -> list[str]:
    hard = []
    targets = sorted((SITE / "tools").glob("*.py")) if (SITE / "tools").exists() else []
    if JS.exists():
        targets += sorted(JS.glob("*.js"))
    for f in targets:
        rel = f"tools/{f.name}" if f.parent.name == "tools" else f"js/{f.name}"
        hits = sorted(set(ABS_USERS_PATH.findall(f.read_text())))
        if hits:
            hard.append(f"  ✗ {rel}: hardcoded absolute path(s) {', '.join(hits)} "
                        f"— resolve relative to __file__/the script's own location instead.")
    return hard


# --- dead assets: an unloaded js/css file is still a brand-leak/debt surface (CODER_BUGLOG
# 2026-07-20 floating-cart.js entry) — generalized so it catches every orphan, not one file.
LINK_OR_SCRIPT_REF = re.compile(r'(?:href|src)="([^"?]+\.(?:css|js))')
IMPORT_REF = re.compile(r'@import\s+(?:url\()?[\'"]?([^\'")]+\.css)')


def scan_dead_assets() -> list[str]:
    referenced = set()
    for f in sorted(SITE.glob("*.html")):
        referenced |= set(LINK_OR_SCRIPT_REF.findall(f.read_text()))
    for f in css_files():
        referenced |= set(IMPORT_REF.findall(f.read_text()))
    resolved = set()
    for r in referenced:
        p = (SITE / r).resolve()
        if SITE in p.parents or p == SITE:
            try:
                resolved.add(p.relative_to(SITE).as_posix())
            except ValueError:
                pass

    check_list = [CSS / "tokens.css"] + css_files()
    if JS.exists():
        check_list += sorted(JS.glob("*.js"))
    out = []
    for f in check_list:
        if not f.exists():
            continue
        rel = f.relative_to(SITE).as_posix()
        if rel not in resolved:
            out.append(f"  ~ {rel}: not referenced by any <link>/<script src>/@import in the site "
                       f"— dead code (a brand-leak/debt surface; queue for deletion or wire it in).")
    return out


def scan_image_fit() -> list[str]:
    """Advisory — object-fit: cover with no object-position is a guess, not a decision;
    on an image containing a person it's how faces get silently cropped (CODER_BUGLOG
    2026-07-20/21 hero entries, 2026-07-22 gallery entry)."""
    out = []
    for f in css_files():
        rel = f.relative_to(CSS).as_posix()
        body = re.sub(r"/\*.*?\*/", "", f.read_text(), flags=re.S)
        for selector, block in RULE_BLOCK.findall(body):
            if OBJECT_FIT_COVER.search(block) and not OBJECT_POSITION.search(block):
                sel = selector.strip().splitlines()[-1].strip()
                out.append(f"  ~ {rel}: '{sel}' uses object-fit: cover with no object-position — "
                           f"state the real focal point (e.g. center 20% to keep a face in frame) "
                           f"or confirm the source aspect ratio already matches the slot.")
    return out


GRADIENT_TEXT = re.compile(r"background-clip:\s*text|-webkit-text-fill-color")
RAW_RADIUS = re.compile(r"border-radius:\s*(\d+)(px|rem)")
RAW_SHADOW = re.compile(r"box-shadow:\s*[^;]*\d+px[^;]*rgba?\(")  # literal shadow, not var()
RAW_FONTSIZE = re.compile(r"font-size:\s*(\d+(?:\.\d+)?)(px|rem)")  # not via var(--fs-*)
EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF←-⇿⬀-⯿]"
)


def scan_slop() -> list[str]:
    """Advisory — the mechanical tells of generic/AI-looking design. Judgment, not hard fails."""
    out = []
    for f in css_files():
        if f.name in DEBT:
            continue  # debt files are being dissolved; don't nag on them
        rel = f.relative_to(CSS).as_posix()
        body = re.sub(r"/\*.*?\*/", "", f.read_text(), flags=re.S)
        if GRADIENT_TEXT.search(body):
            out.append(f"  ~ {rel}: gradient text — reads AI-generated; use solid --ink/--blush.")
        rad = {f"{m[0]}{m[1]}" for m in RAW_RADIUS.findall(body)}
        if rad:
            out.append(f"  ~ {rel}: raw border-radius {sorted(rad)} — use --radius / --radius-sm (one radius language).")
        if RAW_SHADOW.search(body):
            out.append(f"  ~ {rel}: literal box-shadow — use a --shadow* token; a shadow should earn its place, not decorate.")
        fs = {f"{m[0]}{m[1]}" for m in RAW_FONTSIZE.findall(body)}
        if fs:
            out.append(f"  ~ {rel}: off-scale font-size {sorted(fs)} — use --fs-* scale (typographic discipline = premium).")
    for f in sorted(SITE.glob("*.html")):
        if EMOJI.search(f.read_text()):
            out.append(f"  ~ {f.name}: emoji in markup — swap for a thin --gold line-icon or drop it.")
    return out


def scan_schema_price_drift() -> list[str]:
    """Product JSON-LD hardcodes a price range while site rule 7 says pricing is
    served by Shopify. That trade was accepted (operator, 2026-07-29) on the
    condition that drift becomes a loud failure instead of a silent one: schema
    saying 179 while the page renders 199 is a Google policy problem, not a typo.
    Fails when lowPrice/highPrice stop matching the prices visible in the page.
    """
    hard = []
    page = SITE / "product.html"
    if not page.exists():
        return hard
    text = page.read_text()

    block = re.search(r'<script type="application/ld\+json" id="product-schema">(.*?)</script>',
                      text, re.S)
    if not block:
        return hard
    try:
        schema = json.loads(block.group(1))
    except json.JSONDecodeError as err:
        hard.append(f"  ✗ product.html: #product-schema is not valid JSON ({err}) "
                    f"— Google silently discards a malformed block, so this is a total loss of the markup.")
        return hard

    offers = schema.get("offers") or {}
    low, high = offers.get("lowPrice"), offers.get("highPrice")
    if low is None or high is None:
        return hard

    # Compare against prices RENDERED to the customer only. Strip <script> bodies
    # and HTML comments first: a superseded pricing scheme mentioned in a code
    # comment is not a price anyone sees, and scanning it produced a false fail.
    body = text[:block.start()] + text[block.end():]
    body = re.sub(r"<script\b.*?</script>", " ", body, flags=re.S | re.I)
    body = re.sub(r"<!--.*?-->", " ", body, flags=re.S)

    rendered = {m for m in re.findall(r"(\d{2,5})(?:&nbsp;|&rlm;|\s)*₪", body)}
    if not rendered:
        return hard

    numeric = sorted(int(p) for p in rendered)
    if str(numeric[0]) != str(low) or str(numeric[-1]) != str(high):
        hard.append(
            f"  ✗ product.html: Product schema advertises {low}–{high} ILS but the page renders "
            f"{numeric[0]}–{numeric[-1]} ILS — update the #product-schema block to match the visible "
            f"prices (schema must never claim a price the customer is not shown).")
    return hard


def scan_canonicals() -> list[str]:
    """Every indexable page needs exactly one self-referencing canonical.
    Zero lets duplicate URLs (query strings, www) compete; two makes Google
    ignore both, which is worse than none.
    """
    hard = []
    for f in sorted(SITE.glob("*.html")):
        if f.name == "404.html":          # error page: intentionally has none
            continue
        n = len(re.findall(r'<link\s+rel="canonical"', f.read_text()))
        if n == 0:
            hard.append(f"  ✗ {f.name}: no canonical tag — duplicate URLs of this page can compete with it.")
        elif n > 1:
            hard.append(f"  ✗ {f.name}: {n} canonical tags — Google ignores all of them when they conflict.")
    return hard


def scan_404_absolute_paths() -> list[str]:
    """404.html is served for ANY unmatched URL, at any path depth. A relative
    href there resolves against the bogus URL: from /a/b/c/nonsense, "faq.html"
    points at /a/b/c/faq.html, which 404s again. The visitor lands on the error
    page and cannot navigate out. Regressed once already when an unrelated edit
    rewrote the links back to relative (CODER_BUGLOG 2026-07-29), and it is
    invisible in review because the CSS paths stayed absolute so the page still
    renders correctly.
    """
    hard = []
    page = SITE / "404.html"
    if not page.exists():
        return hard
    rel = [m for m in re.findall(r'(?:href|src)="([^"]*)"', page.read_text())
           if m and not m.startswith(("/", "http://", "https://", "mailto:", "#", "data:"))]
    if rel:
        hard.append(f"  ✗ 404.html: {len(rel)} relative path(s) ({', '.join(sorted(set(rel))[:4])}"
                    f"{'…' if len(set(rel)) > 4 else ''}) — 404 is served at arbitrary depth, so these "
                    f"resolve against the bogus URL and break. Use root-absolute paths.")
    return hard


def scan_draft_pages() -> list[str]:
    """Static hosting publishes every file in the repo: there is no
    drafts-do-not-ship step. product.copydraft.html went live with a title tag
    identical to product.html and competed with it (CODER_BUGLOG 2026-07-29).
    """
    hard = []
    for f in sorted(SITE.glob("*.html")):
        if re.search(r"(copydraft|\.draft|_draft|_backup|\.bak|-old|_old)", f.name, re.I):
            hard.append(f"  ✗ {f.name}: draft/backup page in the deployable tree — static hosting "
                        f"publishes it. Delete it (git is the backup) or it competes with the real page.")
    return hard


def scan_html() -> list[str]:
    out = []
    for f in sorted(SITE.glob("*.html")):
        text = f.read_text()
        inline = len(INLINE_STYLE.findall(text))
        blocks = len(STYLE_BLOCK.findall(text))
        # product.html is the un-migrated page (Phase 4) — report as debt, not hard fail
        debt = f.name == "product.html"
        if inline or blocks:
            mark = "·" if debt else "✗"
            note = " (Phase-4 debt)" if debt else " — move to css/sections/"
            out.append(f"  {mark} {f.name}: {inline} inline style=, {blocks} <style> block(s){note}")
    return out


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    strict = "--strict" in sys.argv
    palette = tokens_palette()

    names = args or [p.stem.replace("home-", "") for p in sorted(SECTIONS.glob("home-*.css"))]

    print("── CASCADE SCATTER (the spacing-mess / edit-doesn't-take root cause) ──")
    scatter = cascade_scatter(names)
    print("\n".join(scatter) if scatter else "  ✓ every audited section lives in exactly one canonical file")

    print("\n── INLINE STYLES (HTML) ──")
    html = scan_html()
    print("\n".join(html) if html else "  ✓ no inline styles or <style> blocks")

    print("\n── CSS HYGIENE (!important / raw hex) ──")
    hard, soft = scan_css(palette)
    print("\n".join(hard + soft) if (hard or soft) else "  ✓ clean")

    print("\n── JS HYGIENE (client JS is public: no CSS, no hardcoded prices, no codes) ──")
    jhard, jsoft = scan_js()
    print("\n".join(jhard + jsoft) if (jhard or jsoft) else "  ✓ no CSS / prices / codes in client JS")

    print("\n── SLOP TELLS (advisory — craft, not pass/fail) ──")
    slop = scan_slop()
    print("\n".join(slop) if slop else "  ✓ no mechanical slop tells")

    print("\n── BREAKPOINT DRIFT (advisory — one canonical set) ──")
    bp = scan_breakpoints()
    print("\n".join(bp) if bp else "  ✓ media queries on the canonical breakpoints")

    print("\n── IMAGE FIT (advisory — object-fit: cover needs a stated focal point) ──")
    imgfit = scan_image_fit()
    print("\n".join(imgfit) if imgfit else "  ✓ every object-fit: cover declares an object-position")

    print("\n── CSS TOKENS (undefined custom properties silently drop) ──")
    thard, tsoft = scan_custom_properties()
    print("\n".join(thard + tsoft) if (thard or tsoft) else "  ✓ every var(--x) reference is declared somewhere")

    print("\n── PIXEL ID HYGIENE (fbq track calls must use the numeric-ID normalizer) ──")
    pixel = scan_pixel_ids()
    print("\n".join(pixel) if pixel else "  ✓ no fbq('track', ...) call site reads a raw GID")

    print("\n── TEMPLATE HTML HYGIENE (duplicate attributes on one tag) ──")
    dupes = scan_duplicate_attrs()
    print("\n".join(dupes) if dupes else "  ✓ no duplicate attributes found on any tag")

    print("\n── TOOLING PORTABILITY (hardcoded absolute paths) ──")
    abspaths = scan_absolute_paths()
    print("\n".join(abspaths) if abspaths else "  ✓ no hardcoded /Users/ paths in tools/ or js/")

    print("\n── SEO INTEGRITY (canonicals, draft pages, schema/price drift) ──")
    canon = scan_canonicals()
    drafts = scan_draft_pages()
    pricedrift = scan_schema_price_drift()
    abs404 = scan_404_absolute_paths()
    seo = canon + drafts + pricedrift + abs404
    print("\n".join(seo) if seo else "  ✓ canonicals, no draft pages, schema price matches, 404 paths absolute")

    print("\n── DEAD ASSETS (advisory — unreferenced css/js files) ──")
    dead = scan_dead_assets()
    print("\n".join(dead) if dead else "  ✓ every css/js file is referenced somewhere")

    hard_count = (len(hard) + len(jhard) + len([h for h in html if h.strip().startswith("✗")])
                  + len(thard) + len(pixel) + len(dupes) + len(abspaths) + len(seo))
    print(f"\n{'STRICT: ' if strict else ''}{hard_count} hard issue(s), "
          f"{len(soft) + len(jsoft) + len(scatter) + len(tsoft)} debt/scatter note(s).")
    return 1 if (strict and hard_count) else 0


if __name__ == "__main__":
    raise SystemExit(main())
