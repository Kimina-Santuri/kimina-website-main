#!/usr/bin/env python3
"""Measures an audio file for its sleeve on the Music page: how loud and how bright each of 96 moments is.
Prints the `sound:` value and the length to paste into the entry in site/content/music/. Needs ffmpeg.

    python3 tools/music_sound.py path/to/mix.mp3
"""
import array, math, subprocess, sys

RATE, SLICES = 8000, 96
DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"


def main(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"], check=True, capture_output=True).stdout
    samples = array.array("h")
    samples.frombytes(raw[: len(raw) - len(raw) % 2])
    if not samples:
        sys.exit("No audio found in that file.")
    size = max(1, len(samples) // SLICES)
    loud, bright = [], []
    for s in range(SLICES):
        part = samples[s * size : (s + 1) * size] or samples[-size:]
        # Long mixes: a sample of each slice is plenty, and much quicker.
        step = max(1, len(part) // 40000)
        part = part[::step]
        loud.append(math.sqrt(sum(x * x for x in part) / len(part)) / 32768)
        # How often the wave crosses zero: a simple stand-in for how bright it sounds.
        bright.append(sum(1 for a, b in zip(part, part[1:]) if (a < 0) != (b < 0)) / len(part))
    def scale(values, power=1.0):
        low, high = min(values), max(values)
        span = (high - low) or 1
        return "".join(DIGITS[round(((v - low) / span) ** power * 35)] for v in values)
    seconds = len(samples) / RATE
    print(f'sound: "{scale(loud, 0.8)}|{scale(bright)}"')
    print(f'duration: "{int(seconds // 60)}:{int(seconds % 60):02d}"')


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
