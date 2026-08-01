#!/usr/bin/env python3
"""Local preview server that mirrors production's clean-URL resolution.

Canonical/og:url tags across the site (faq.html, mission.html, blog/*.html, etc.)
deliberately use extensionless URLs (e.g. https://mybambook.com/faq) as an SEO
decision, and the production host resolves them to the matching .html file.
Plain `python3 -m http.server` does not do that resolution, so any absolute
extensionless link (used throughout blog/ and 404.html) 404s locally even
though it's correct for production. This server closes that gap for local
preview only — it changes nothing about what ships.

Usage: python3 tools/dev-server.py [port]  (default 8000)
"""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit

SITE_ROOT = Path(__file__).resolve().parent.parent


class CleanUrlHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE_ROOT), **kwargs)

    def translate_path(self, path):
        split = urlsplit(path)
        clean_path = unquote(split.path)
        candidate = (SITE_ROOT / clean_path.lstrip("/")).resolve()

        # Only resolve <path> -> <path>.html when <path> doesn't already
        # exist as a file or directory (so real files/dirs are untouched).
        if (
            not candidate.exists()
            and SITE_ROOT in candidate.parents
            and candidate.with_suffix(".html").is_file()
        ):
            return super().translate_path(path + ".html")

        return super().translate_path(path)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = HTTPServer(("127.0.0.1", port), CleanUrlHandler)
    print(f"Serving {SITE_ROOT} with clean-URL resolution at http://127.0.0.1:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
