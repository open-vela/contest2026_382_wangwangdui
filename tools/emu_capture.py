"""Capture the Vela emulator window and analyse the device screen.

Vela (NuttX) images have no `screencap`, so the only way to see the UI is the
host window. This module grabs it with GDI + PrintWindow and provides a few
cheap analyses (device-screen bounds, pixel colours, ASCII rendering) that work
without a vision model.

Usage:
  python tools/emu_capture.py grab  outputs/emu/step1.png
  python tools/emu_capture.py info  outputs/emu/step1.png
  python tools/emu_capture.py ascii outputs/emu/step1.png [cols]
  python tools/emu_capture.py crop  outputs/emu/step1.png outputs/emu/screen.png
"""

from __future__ import annotations

import ctypes
import ctypes.wintypes as wt
import sys
from pathlib import Path

from PIL import Image

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # pragma: no cover - older interpreters
    pass

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32

user32.SetProcessDPIAware()


def find_window(keywords=("vela", "emulator", "qemu")):
    """Return (hwnd, title, rect) of the largest visible window matching keywords."""
    matches = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
    def callback(hwnd, _lparam):
        if not user32.IsWindowVisible(hwnd):
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        if length == 0:
            return True
        buffer = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buffer, length + 1)
        title = buffer.value
        if not any(key in title.lower() for key in keywords):
            return True
        rect = wt.RECT()
        user32.GetClientRect(hwnd, ctypes.byref(rect))
        width = rect.right - rect.left
        height = rect.bottom - rect.top
        # The emulator window keeps a tall aspect; the IDE is much wider than
        # tall, so require the window to be taller than 0.55x its own width to
        # avoid grabbing the IDE.
        if width > 100 and height > 100 and height > width * 0.55:
            matches.append((width * height, hwnd, title, (rect.left, rect.top, width, height)))
        return True

    user32.EnumWindows(callback, 0)
    if not matches:
        return None
    matches.sort(reverse=True)
    _area, hwnd, title, rect = matches[0]
    return hwnd, title, rect


def grab(path):
    found = find_window()
    if not found:
        raise SystemExit("emulator window not found")
    hwnd, title, (_l, _t, width, height) = found

    hdc_window = user32.GetDC(hwnd)
    hdc_mem = gdi32.CreateCompatibleDC(hdc_window)
    bitmap = gdi32.CreateCompatibleBitmap(hdc_window, width, height)
    gdi32.SelectObject(hdc_mem, bitmap)

    # PW_RENDERFULLCONTENT = 2 — required for GPU-composited windows.
    user32.PrintWindow(hwnd, hdc_mem, 2)

    class BITMAPINFOHEADER(ctypes.Structure):
        _fields_ = [
            ("biSize", wt.DWORD),
            ("biWidth", wt.LONG),
            ("biHeight", wt.LONG),
            ("biPlanes", wt.WORD),
            ("biBitCount", wt.WORD),
            ("biCompression", wt.DWORD),
            ("biSizeImage", wt.DWORD),
            ("biXPelsPerMeter", wt.LONG),
            ("biYPelsPerMeter", wt.LONG),
            ("biClrUsed", wt.DWORD),
            ("biClrImportant", wt.DWORD),
        ]

    header = BITMAPINFOHEADER()
    header.biSize = ctypes.sizeof(BITMAPINFOHEADER)
    header.biWidth = width
    header.biHeight = -height  # top-down
    header.biPlanes = 1
    header.biBitCount = 32
    header.biCompression = 0

    buffer = ctypes.create_string_buffer(width * height * 4)
    gdi32.GetDIBits(hdc_mem, bitmap, 0, height, buffer, ctypes.byref(header), 0)

    image = Image.frombuffer("RGBA", (width, height), buffer, "raw", "BGRA", 0, 1)
    image = image.convert("RGB")

    gdi32.DeleteObject(bitmap)
    gdi32.DeleteDC(hdc_mem)
    user32.ReleaseDC(hwnd, hdc_window)

    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    print(f"captured {width}x{height} window '{title}' -> {out}")
    return image


def device_bounds(image):
    """Locate the phone/band screen inside the window frame.

    The emulator draws the device on a black bezel; the screen is the largest
    bright/coloured region in the centre. We find it by trimming near-uniform
    bezel rows/columns from the middle band of the image.
    """
    import numpy as np

    array = np.asarray(image).astype(int)
    height, width, _ = array.shape
    mid_row = array[height // 2, :, :]
    mid_col = array[:, width // 2, :]

    def is_bezel(pixel):
        return int(pixel[0]) < 26 and int(pixel[1]) < 26 and int(pixel[2]) < 26

    left = 0
    while left < width - 1 and is_bezel(mid_row[left]):
        left += 1
    right = width - 1
    while right > left and is_bezel(mid_row[right]):
        right -= 1
    top = 0
    while top < height - 1 and is_bezel(mid_col[top]):
        top += 1
    bottom = height - 1
    while bottom > top and is_bezel(mid_col[bottom]):
        bottom -= 1
    return left, top, right + 1, bottom + 1


def crop(path, out_path):
    image = Image.open(path).convert("RGB")
    box = device_bounds(image)
    cropped = image.crop(box)
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    cropped.save(out_path)
    print(f"device screen {cropped.width}x{cropped.height} box={box} -> {out_path}")
    return cropped


def info(path):
    import numpy as np

    image = Image.open(path).convert("RGB")
    array = np.asarray(image)
    print(f"image {image.width}x{image.height}")
    print("dominant colours:", image.getcolors(maxcolors=1 << 24)[:6] if image.getcolors(maxcolors=1 << 24) else "many")
    slice_ = array[::8, ::8].reshape(-1, 3)
    palette, counts = np.unique(slice_, axis=0, return_counts=True)
    order = np.argsort(-counts)[:8]
    for index in order:
        colour = palette[index]
        print(f"  #{colour[0]:02X}{colour[1]:02X}{colour[2]:02X}  {counts[index] * 100 // max(1, counts.sum())}%")


def ascii_render(path, cols=96):
    import numpy as np

    image = Image.open(path).convert("RGB")
    ratio = image.height / image.width
    rows = max(8, int(cols * ratio * 0.5))
    small = image.resize((cols, rows))
    array = np.asarray(small).astype(int)
    ramp = " .:-=+*#%@"
    lines = []
    for row in array:
        line = ""
        for pixel in row:
            lum = (pixel[0] * 299 + pixel[1] * 587 + pixel[2] * 114) // 1000
            line += ramp[min(len(ramp) - 1, lum * len(ramp) // 256)]
        lines.append(line)
    print("\n".join(lines))


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "list":
        for width, height, hwnd, pid, visible, title in list_windows():
            flag = "V" if visible else "-"
            print(f"{hwnd:>10} pid={pid:<7} {flag} {width:>5}x{height:<5} {title}")
        return
    if len(sys.argv) < 3:
        print(__doc__)
        return
    command = sys.argv[1]
    if command == "grab":
        grab(sys.argv[2])
    elif command == "crop":
        crop(sys.argv[2], sys.argv[3])
    elif command == "info":
        info(sys.argv[2])
    elif command == "ascii":
        ascii_render(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 96)
    elif command == "bounds":
        image = Image.open(sys.argv[2]).convert("RGB")
        print(device_bounds(image))
    else:
        print(__doc__)


def list_windows():
    """Print every top-level window: hwnd, pid, visible flag, size and title."""
    rows = []

    user32.GetWindowThreadProcessId.restype = ctypes.c_ulong

    @ctypes.WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
    def callback(hwnd, _lparam):
        length = user32.GetWindowTextLengthW(hwnd)
        buffer = ctypes.create_unicode_buffer(max(1, length) + 1)
        if length:
            user32.GetWindowTextW(hwnd, buffer, length + 1)
        rect = wt.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        pid = ctypes.c_ulong(0)
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        rows.append(
            (
                rect.right - rect.left,
                rect.bottom - rect.top,
                hwnd,
                pid.value,
                bool(user32.IsWindowVisible(hwnd)),
                buffer.value,
            )
        )
        return True

    user32.EnumWindows(callback, 0)
    rows.sort(reverse=True)
    return rows


if __name__ == "__main__":
    main()
