#!/usr/bin/env python3
"""Prepare the immersive stadium background and browser-native 60 fps playback."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
assets = ROOT / 'assets'
source = assets / 'strike.mp4'
stadium = assets / 'stadium.jpg'
mp4 = assets / 'strike-fluid.mp4'
webm = assets / 'strike-fluid.webm'

def run(args):
    subprocess.run(args, check=True)

if not stadium.is_file():
    run(['ffmpeg', '-v', 'error', '-y', '-sseof', '-0.15', '-i', str(source),
         '-frames:v', '1', '-vf', 'crop=1920:800:0:280,scale=1920:1080', str(stadium)])
if not mp4.is_file():
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-an',
         '-vf', 'scale=1600:-2,format=yuv420p,tpad=stop_mode=clone:stop_duration=0.2,minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1',
         '-t', '10', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21',
         '-movflags', '+faststart', str(mp4)])
if not webm.is_file():
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp4), '-an', '-c:v', 'libvpx-vp9',
         '-pix_fmt', 'yuv420p', '-deadline', 'realtime', '-cpu-used', '6',
         '-crf', '30', '-b:v', '0', str(webm)])

for path in (mp4, webm):
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error',
            '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate',
            '-show_entries', 'format=duration', '-of', 'json', str(path)]))
    stream = probe['streams'][0]
    n, d = map(int, stream['r_frame_rate'].split('/'))
    assert (stream['width'], stream['height']) == (1600, 900), path
    assert n / d >= 59.9, path
    assert 9.8 <= float(probe['format']['duration']) <= 10.2, path
assert stadium.is_file() and stadium.stat().st_size > 1000
print('Verified stadium image and native MP4/WebM playback at 1600×900, 60 fps, 10 seconds.')

