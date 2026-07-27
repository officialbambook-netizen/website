#!/usr/bin/env python3
"""
scheduled-qa.py — weekly automated QA run, meant to be launched by a local
launchd job (see ~/Library/LaunchAgents/com.bambook.scheduled-qa.plist).

Runs the full pre-deploy gate (tools/verify.py: bump-cache --check, audit.py
--strict, link-checker.py, Playwright) and only touches TASK_LOG.md when the
result changed since the last scheduled run — pass -> fail, fail -> pass, or
the same pass/fail state with different output (new debt, new failing test,
etc.). An unchanged clean run stays quiet so the log doesn't fill with
"still fine" entries every week.

Every run writes a full log to tools/.qa-state/logs/<date>.log regardless,
so there's always a trail to check even when TASK_LOG isn't touched.

Usage: python3 tools/scheduled-qa.py
"""
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
STATE_DIR = SITE / "tools" / ".qa-state"
STATE_FILE = STATE_DIR / "last-run-output.txt"
LOG_DIR = STATE_DIR / "logs"
TASK_LOG = SITE.parent.parent / "00_CONTROL" / "TASK_LOG.md"


def run_verify() -> tuple[bool, str]:
    result = subprocess.run(
        [sys.executable, "tools/verify.py"],
        cwd=SITE, capture_output=True, text=True,
    )
    return result.returncode == 0, result.stdout + result.stderr


def summarize(output: str) -> str:
    m = re.search(r"✗ FAILED: (.+)", output)
    if m:
        return f"First failing gate: {m.group(1).strip()}."
    if "✓ All gates passed" in output:
        return "All gates passed (bump-cache, audit.py --strict, link-checker.py, Playwright)."
    return "See the full log for details."


def main() -> int:
    STATE_DIR.mkdir(exist_ok=True)
    LOG_DIR.mkdir(exist_ok=True)

    ok, output = run_verify()
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    ts = now.strftime("%Y-%m-%d %H:%M")

    log_path = LOG_DIR / f"{date_str}.log"
    log_path.write_text(output)

    prev = STATE_FILE.read_text() if STATE_FILE.exists() else None
    changed = prev != output
    STATE_FILE.write_text(output)

    status = "PASSED" if ok else "FAILED"

    if not changed:
        print(f"[{ts}] verify.py {status} — unchanged since last scheduled run, TASK_LOG.md not touched.")
        return 0 if ok else 1

    digest = summarize(output)
    rel_log = log_path.relative_to(SITE.parent.parent).as_posix()
    entry = (
        f"\n## {date_str} — Scheduled QA check: {status} (automated)\n\n"
        f"- **Agent:** Scheduled task (`tools/scheduled-qa.py`, weekly local launchd job).\n"
        f"- **Result:** {status} — changed since the last scheduled run. {digest}\n"
        f"- **Full log:** `{rel_log}`\n"
        f"- **Next Action:** {'Resolve the failing gate above before shipping.' if not ok else 'None.'}\n"
    )
    with TASK_LOG.open("a") as f:
        f.write(entry)
    print(f"[{ts}] verify.py {status} — changed since last scheduled run, logged to TASK_LOG.md.")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
