#!/usr/bin/env python3
"""Download completed Higgsfield jobs and prepare all sequences once strike exists."""
import argparse
import json
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--strike', type=Path)
args = parser.parse_args()
source = args.source.resolve()
source.mkdir(parents=True, exist_ok=True)
for name in ('anchor.jpg', 'logo-pievese.png'):
    shutil.copy2(ROOT / 'assets' / name, source / name)
status = json.loads((ROOT / 'assets/generation-status.json').read_text())
for name, job in status['clips'].items():
    target = source / f'{name}.mp4'
    if job.get('status') == 'completed' and job.get('result_url') and not target.exists():
        temporary = target.with_suffix('.download')
        with urllib.request.urlopen(job['result_url'], timeout=120) as response, temporary.open('wb') as output:
            shutil.copyfileobj(response, output)
        temporary.replace(target)
        print(f'Downloaded {name}')
if args.strike:
    target = source / 'strike.mp4'
    if args.strike.resolve() != target:
        shutil.copy2(args.strike, target)
if not (source / 'strike.mp4').is_file():
    print('Completed clips recovered. Strike still requires a generation: Higgsfield credits were exhausted.', file=sys.stderr)
    sys.exit(1)
subprocess.run([sys.executable, str(ROOT / 'scripts/prepare-assets.py'), '--source', str(source)], check=True)
