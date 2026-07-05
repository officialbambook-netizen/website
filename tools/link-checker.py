import os
import re
import sys

site_dir = '/Users/openclaworion/Documents/Lavero project/LaveroWork/05_WEBSITE/site'
os.chdir(site_dir)

missing_assets = []
external_links = []
local_links_checked = 0

for root, _, files in os.walk('.'):
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find all src="..." and href="..."
            matches = re.findall(r'(src|href)="([^"]+)"', content)
            for attr, link in matches:
                if link.startswith('http') or link.startswith('mailto:') or link.startswith('#') or link.startswith('//'):
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
                if not os.path.exists(target_path):
                    missing_assets.append((filepath, link, target_path))

for root, _, files in os.walk('.'):
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

