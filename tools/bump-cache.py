#!/usr/bin/env python3
"""
bump-cache.py — stop the browser serving stale CSS/JS after an edit ("broken phone").

Rewrites every `?v=N` query string on <link>/<script> tags in the site's HTML files
to a fresh content hash of the file it points to. A file only gets a new string when
its bytes actually changed, so unchanged assets keep their cached version.

Usage (from site/):
    python3 tools/bump-cache.py            # bump all .html in site/
    python3 tools/bump-cache.py index.html # bump one page
    python3 tools/bump-cache.py --check    # report stale refs, change nothing (CI/dry-run)

No dependencies. Safe to run repeatedly.
"""
import hashlib
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
REF = re.compile(r'(href|src)="(?P<path>[^"?]+\.(?:css|js))(?:\?v=[^"]*)?"')


def short_hash(p: Path) -> str:
    return hashlib.sha1(p.read_bytes()).hexdigest()[:8]


def process(html: Path, check: bool) -> int:
    text = html.read_text()
    changed = 0

    def repl(m: re.Match) -> str:
        nonlocal changed
        asset = (SITE / m.group("path")).resolve()
        if not asset.exists():
            return m.group(0)  # external URL or missing file — leave it
        want = f'{m.group(1)}="{m.group("path")}?v={short_hash(asset)}"'
        if want != m.group(0):
            changed += 1
        return want

    new = REF.sub(repl, text)
    if changed and not check:
        html.write_text(new)
    return changed


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--check"]
    check = "--check" in sys.argv
    pages = [SITE / a for a in args] if args else sorted(SITE.glob("*.html"))

    total = 0
    for page in pages:
        if not page.exists():
            print(f"  skip (missing): {page.name}")
            continue
        n = process(page, check)
        total += n
        if n:
            print(f"  {'stale' if check else 'bumped'}: {page.name} ({n} ref{'s' if n != 1 else ''})")

    if check and total:
        print(f"\n{total} stale ref(s) — run without --check to fix.")
        return 1
    print(f"\n{'Would bump' if check else 'Bumped'} {total} ref(s) across {len(pages)} page(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
