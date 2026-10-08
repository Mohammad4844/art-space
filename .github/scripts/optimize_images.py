"""Shrink phone photos to web size and strip their metadata (including GPS).

Rotates according to the camera's orientation tag first, so nothing ends
up sideways. Files that are already small and clean are left untouched.
Usage: python optimize_images.py images
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

MAX_SIDE = 2000
JPEG_QUALITY = 84
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def optimize(path):
    with Image.open(path) as im:
        if max(im.size) <= MAX_SIDE and not im.getexif():
            return False
        im = ImageOps.exif_transpose(im)
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        if path.suffix.lower() in {".jpg", ".jpeg"}:
            im.convert("RGB").save(path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        else:
            im.save(path, optimize=True)
    return True


def main(folder):
    changed = 0
    for path in sorted(Path(folder).rglob("*")):
        if path.suffix.lower() in EXTENSIONS and optimize(path):
            changed += 1
            print(f"optimized {path}")
    print(f"{changed} image(s) optimized")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "images")
