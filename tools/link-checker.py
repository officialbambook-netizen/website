"""link-checker.py — report links that point at nothing.

Two sources of noise used to bury every real finding, so nobody read the output
and a genuine dead link survived two reviews (CODER_BUGLOG 2026-08-01):
  1. git worktrees under .worktrees/ are OTHER branches — their links are not
     this branch's problem, and they produced hundreds of duplicate lines.
  2. 404.html deliberately uses root-absolute EXTENSIONLESS links (/faq,
     /product) because production serves clean URLs. There is no file literally
     named "faq", so a naive existence check flags all ~24 of them as broken.
     Resolve <path> -> <path>.html the same way tools/dev-server.py and the
     production host do, instead of crying wolf.
"""
import os
import re
import sys

site_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(site_dir)

SKIP_DIRS = {'.worktrees', 'node_modules', '.git', 'test-results', 'artifacts'}

missing_assets = []
external_links = []
local_links_checked = 0


def resolves(target_path):
    """True if the path exists, or exists once production's clean-URL rule
    (<path> -> <path>.html) or a directory index is applied."""
    if os.path.exists(target_path):
        return True
    if os.path.exists(target_path + '.html'):
        return True
    return False


for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find all src="..." and href="..."
            matches = re.findall(r'(src|href)="([^"]+)"', content)
            for attr, link in matches:
                if link.startswith('http') or link.startswith('mailto:') or link.startswith('tel:') or link.startswith('#') or link.startswith('//'):
                    external_links.append(link)
                    continue
                
                # Remove query params/hash
                clean_link = link.split('?')[0].split('#')[0]
                if not clean_link:
                    continue
                
                # Check if file exists relative to the current file's directory
                # or relative to site root if it starts with /
                if clean_link.startswith('/'):
                    target_path = os.path.join(site_dir, clean_link.lstrip('/'))
                else:
                    target_path = os.path.normpath(os.path.join(os.path.dirname(filepath), clean_link))
                
                local_links_checked += 1
                if not resolves(target_path):
                    missing_assets.append((filepath, link, target_path))

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for file in files:
        if file.endswith('.css'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find all url(...)
            matches = re.findall(r'url\([\'"]?([^\'"()]+)[\'"]?\)', content)
            for link in matches:
                if link.startswith('http') or link.startswith('data:'):
                    continue
                
                clean_link = link.split('?')[0].split('#')[0]
                if not clean_link:
                    continue
                
                if clean_link.startswith('/'):
                    target_path = os.path.join(site_dir, clean_link.lstrip('/'))
                else:
                    target_path = os.path.normpath(os.path.join(os.path.dirname(filepath), clean_link))
                
                local_links_checked += 1
                if not os.path.exists(target_path):
                    missing_assets.append((filepath, link, target_path))

if missing_assets:
    print(f"FOUND {len(missing_assets)} MISSING/BROKEN LINKS:")
    for src, link, target in missing_assets:
        print(f"  {src} -> {link} (Expected: {target})")
else:
    print(f"All {local_links_checked} local links/assets exist within the site directory!")

