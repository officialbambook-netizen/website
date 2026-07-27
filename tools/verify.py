#!/usr/bin/env python3
"""
verify.py — the pre-deploy gate: every guard, one command, fail on the first red.

Chains bump-cache.py --check (stale ?v= cache refs), audit.py --strict (hygiene hard
issues), link-checker.py (broken local links/assets), and the Playwright suite. Wires
bump-cache.py's existing --check dry-run into an actual gate instead of leaving it as
a command someone has to remember to run (CODER_BUGLOG 2026-07-22: a routine 2-file
edit's cache bump silently touched 21 refs across 12 pages because earlier edits had
skipped it).

Usage (from site/):
    python3 tools/verify.py            # run every gate
    python3 tools/verify.py --no-visual  # skip the Playwright suite (fast local loop)
"""
import subprocess
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
VISUAL_TESTS = SITE.parent / "visual-tests"


def run(label: str, cmd: list[str], cwd: Path) -> bool:
    print(f"\n=== {label} ===")
    result = subprocess.run(cmd, cwd=cwd)
    if result.returncode != 0:
        print(f"\n✗ FAILED: {label}")
        return False
    return True


def main() -> int:
    skip_visual = "--no-visual" in sys.argv

    steps = [
        ("bump-cache --check (stale ?v= refs)", [sys.executable, "tools/bump-cache.py", "--check"], SITE),
        ("audit.py --strict (hygiene gates)", [sys.executable, "tools/audit.py", "--strict"], SITE),
        ("link-checker.py (broken links/assets)", [sys.executable, "tools/link-checker.py"], SITE),
    ]
    if not skip_visual:
        steps.append(("Playwright suite (visual + behavioral)", ["npx", "playwright", "test"], VISUAL_TESTS))

    for label, cmd, cwd in steps:
        if not run(label, cmd, cwd):
            print("\nRun without --no-visual, or fix the failing gate above, before shipping.")
            return 1

    print("\n✓ All gates passed — safe to ship.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
