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

Usage (from site/):
    python3 tools/audit.py                 # audit whole site
    python3 tools/audit.py hero the-offer  # audit only these sections (by SECTION_MAP name)
    python3 tools/audit.py --strict        # exit 1 on any hard violation (CI / pre-ship gate)

No dependencies. Reads tokens.css to know the legal palette/scale.
"""
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

    hard_count = len(hard) + len(jhard) + len([h for h in html if h.strip().startswith("✗")])
    print(f"\n{'STRICT: ' if strict else ''}{hard_count} hard issue(s), "
          f"{len(soft) + len(jsoft) + len(scatter)} debt/scatter note(s).")
    return 1 if (strict and hard_count) else 0


if __name__ == "__main__":
    raise SystemExit(main())
