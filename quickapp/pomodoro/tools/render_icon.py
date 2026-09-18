"""Rasterise design-assets/app-icon.svg into the runtime 192x192 PNG.

The Vela runtime loads `manifest.icon` as a raster PNG and the AIoT image
converter additionally produces the LVGL `.bin` beside it. Both steps must
produce *valid* files: a PNG whose IDAT CRC is wrong is silently unusable — the
launcher simply shows nothing — so this script re-validates the result and
fails loudly.

  python tools/render_icon.py
  python tools/render_icon.py --size 192
"""

from __future__ import annotations

import argparse
import struct
import sys
import zlib
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SVG_SOURCE = ROOT / "design-assets" / "app-icon.svg"
PNG_TARGET = ROOT / "src" / "common" / "pomodoro-icon.png"


def rasterise(svg_path: Path, png_path: Path, size: int) -> Image.Image:
    import cairosvg

    png_path.parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(
        url=str(svg_path),
        write_to=str(png_path),
        output_width=size,
        output_height=size,
    )
    image = Image.open(png_path).convert("RGBA")
    # Re-encode with Pillow so the container is unambiguous (RGBA, 8 bit, no
    # interlace) regardless of what the SVG rasteriser emitted.
    image.save(png_path, format="PNG", optimize=True)
    return image


def verify(png_path: Path, expected_size: int) -> None:
    data = png_path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(f"{png_path} is not a PNG")
    offset = 8
    packed = bytearray()
    while offset < len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        chunk_type = data[offset + 4 : offset + 8]
        payload = data[offset + 8 : offset + 8 + length]
        stored = struct.unpack(">I", data[offset + 8 + length : offset + 12 + length])[0]
        actual = zlib.crc32(data[offset + 4 : offset + 8 + length]) & 0xFFFFFFFF
        if stored != actual:
            raise SystemExit(f"chunk {chunk_type!r} CRC mismatch in {png_path}")
        if chunk_type == b"IDAT":
            packed += payload
        offset += 12 + length
        if chunk_type == b"IEND":
            break
    try:
        zlib.decompress(bytes(packed))
    except zlib.error as error:
        raise SystemExit(f"IDAT stream does not decompress: {error}") from error
    image = Image.open(png_path)
    if image.size != (expected_size, expected_size):
        raise SystemExit(f"expected {expected_size}x{expected_size}, got {image.size}")
    print(f"verified {png_path.name}: {image.size[0]}x{image.size[1]} {image.mode} {png_path.stat().st_size} bytes")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--size", type=int, default=192)
    parser.add_argument("--svg", type=Path, default=SVG_SOURCE)
    parser.add_argument("--out", type=Path, default=PNG_TARGET)
    arguments = parser.parse_args()

    if not arguments.svg.exists():
        raise SystemExit(f"missing SVG source {arguments.svg}")
    if arguments.size != 192:
        print("warning: Vela runtime icons are 192x192", file=sys.stderr)
    rasterise(arguments.svg, arguments.out, arguments.size)
    verify(arguments.out, arguments.size)


if __name__ == "__main__":
    main()
