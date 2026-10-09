#!/usr/bin/env python3
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def jpeg_size(path):
    with path.open('rb') as stream:
        if stream.read(2) != b'\xff\xd8':
            raise ValueError(f'{path}: invalid JPEG')
        while True:
            byte = stream.read(1)
            if not byte:
                raise ValueError(f'{path}: missing JPEG dimensions')
            if byte != b'\xff':
                continue
            marker = stream.read(1)
            while marker == b'\xff':
                marker = stream.read(1)
            if marker in (b'\xd8', b'\xd9'):
                continue
            length = struct.unpack('>H', stream.read(2))[0]
            if marker[0] in (0xc0, 0xc1, 0xc2):
                precision, height, width = struct.unpack('>BHH', stream.read(5))
                return width, height
            stream.seek(length - 2, 1)

def main():
    manifest = json.loads((ROOT / 'assets/manifest.json').read_text())
    if manifest.get('ready') is not True:
        raise ValueError('Deployment blocked: original Higgsfield assets are incomplete.')
    if manifest['frameCount'] != 150 or manifest['width'] != 1600:
        raise ValueError('Invalid frame specification')
    if [c['id'] for c in manifest['clips']] != ['sweep', 'opening', 'strike']:
        raise ValueError('Expected sweep, opening, strike in order')
    for key in ('logo', 'anchor'):
        file = ROOT / manifest[key]
        if not file.is_file() or file.stat().st_size == 0:
            raise ValueError(f'Missing {key}')
    for clip in manifest['clips']:
        video = ROOT / clip['video']
        if not video.is_file() or video.stat().st_size == 0:
            raise ValueError(f'Missing {clip["id"]} MP4 fallback')
        for index in range(1, 151):
            frame = ROOT / f'{clip["frames"]}{index:04}.jpg'
            if not frame.is_file() or frame.stat().st_size == 0:
                raise ValueError(f'Missing frame: {frame}')
            if jpeg_size(frame) != (1600, 900):
                raise ValueError(f'Wrong dimensions: {frame}')
    print('Verified 450 JPEGs at 1600×900, 3 MP4s, anchor and original logo.')

if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, struct.error) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
