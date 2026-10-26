#!/usr/bin/env python3
"""Validate supplied original media, extract exactly 240 JPEG frames per clip.

Usage: python3 scripts/prepare-assets.py --source /absolute/path/to/media
Source must contain logo-pievese.png, anchor.jpg, sweep.mp4, opening.mp4,
strike.mp4. Assets are never fabricated. ffmpeg and ffprobe required.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLIPS = ('sweep', 'opening', 'strike')

def probe(path):
    data = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]))
    video = next((s for s in data['streams'] if s['codec_type'] == 'video'), None)
    if not video:
        raise ValueError(f'{path.name}: no video stream')
    return video, float(data['format']['duration'])

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    args = parser.parse_args()
    source = args.source.resolve()
    required = ['logo-pievese.png', 'anchor.jpg', *[f'{clip}.mp4' for clip in CLIPS]]
    missing = [name for name in required if not (source / name).is_file() or (source / name).stat().st_size == 0]
    if missing:
        raise ValueError('Missing original assets: ' + ', '.join(missing))
    for tool in ('ffmpeg', 'ffprobe'):
        if not shutil.which(tool):
            raise ValueError(f'{tool} is required')
    for clip in CLIPS:
        stream, duration = probe(source / f'{clip}.mp4')
        if stream['width'] != 1920 or stream['height'] != 1080:
            raise ValueError(f'{clip}: expected 1920×1080, got {stream["width"]}×{stream["height"]}')
        if abs(duration - 10) > .15:
            raise ValueError(f'{clip}: expected 10 seconds, got {duration}')
    assets = ROOT / 'assets'
    assets.mkdir(exist_ok=True)
    manifest_path = assets / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['frameCount'] = 240
    manifest['ready'] = False
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    for name in required:
        destination = assets / name
        if (source / name) != destination:
            shutil.copy2(source / name, destination)
    for clip in CLIPS:
        directory = ROOT / 'frames' / clip
        directory.mkdir(parents=True, exist_ok=True)
        for old in directory.glob('frame_*.jpg'):
            old.unlink()
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(assets / f'{clip}.mp4'), '-vf', 'fps=24,scale=1600:-2', '-frames:v', '240', '-q:v', '3', '-start_number', '1', str(directory / 'frame_%04d.jpg')], check=True)
        frames = list(directory.glob('frame_*.jpg'))
        if len(frames) != 240 or any(p.stat().st_size == 0 for p in frames):
            raise ValueError(f'{clip}: expected exactly 240 nonempty JPEG frames')
    # Keep original Full HD masters; encode browser-compatible mobile fallbacks.
    for clip in manifest['clips']:
        name = clip['id']
        source_video = assets / f'{name}.mp4'
        mobile_mp4 = assets / f'{name}-mobile.mp4'
        mobile_webm = assets / f'{name}-mobile.webm'
        common = ['ffmpeg', '-v', 'error', '-y', '-i', str(source_video), '-vf', 'scale=1280:-2', '-an']
        subprocess.run(common + ['-c:v', 'libx264', '-profile:v', 'baseline', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '23', '-movflags', '+faststart', str(mobile_mp4)], check=True)
        subprocess.run(common + ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-deadline', 'realtime', '-cpu-used', '6', '-crf', '34', '-b:v', '0', str(mobile_webm)], check=True)
        clip['video'] = f'assets/{mobile_mp4.name}'
        clip['webm'] = f'assets/{mobile_webm.name}'
    manifest['ready'] = True
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    subprocess.run([sys.executable, str(ROOT / 'scripts' / 'verify-assets.py')], check=True)
    print('720 frames verified. Visual review remains required before deployment.')

if __name__ == '__main__':
    try:
        main()
    except (ValueError, subprocess.CalledProcessError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
