"""Find and capture the Vela emulator window by process id.

The Vela emulator renders into its own top-level window. `EnumWindows` is
authoritative here: no guessing about titles or aspect ratios.

  python tools/emu_window.py find                 # list emulator/qemu windows
  python tools/emu_window.py grab  outputs/x.png  # capture the largest one
"""

from __future__ import annotations

import ctypes
import ctypes.wintypes as wt
import subprocess
import sys
from pathlib import Path

from PIL import Image

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # pragma: no cover
    pass

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32
user32.SetProcessDPIAware()


def pids_for(names=("emulator.exe", "qemu-system-x86_64.exe", "qemu-system-aarch64.exe")):
    """Return process ids for the emulator binaries using tasklist."""
    try:
        output = subprocess.run(
            ["tasklist", "/FO", "CSV", "/NH"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        ).stdout
    except OSError:
        return {}
    wanted = {name.lower() for name in names}
    found = {}
    for line in output.splitlines():
        parts = [part.strip('"') for part in line.split('","')]
        if len(parts) < 2:
            continue
        if parts[0].lower() in wanted:
            found[int(parts[1])] = parts[0]
    return found


def windows_for_pid(pid):
    rows = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
    def callback(hwnd, _lparam):
        owner = ctypes.c_ulong(0)
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(owner))
        if owner.value != pid:
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        buffer = ctypes.create_unicode_buffer(max(1, length) + 1)
        if length:
            user32.GetWindowTextW(hwnd, buffer, length + 1)
        rect = wt.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        rows.append(
            {
                "hwnd": hwnd,
                "title": buffer.value,
                "visible": bool(user32.IsWindowVisible(hwnd)),
                "rect": (rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top),
            }
        )
        return True

    user32.EnumWindows(callback, 0)
    return rows


def capture(hwnd, path):
    _left, _top, width, height = windows_for_pid(0)[0]["rect"] if False else (0, 0, 0, 0)
    rect = wt.RECT()
    user32.GetClientRect(hwnd, ctypes.byref(rect))
    width = rect.right - rect.left
    height = rect.bottom - rect.top
    if width <= 0 or height <= 0:
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        width = rect.right - rect.left
        height = rect.bottom - rect.top

    hdc_window = user32.GetDC(hwnd)
    hdc_mem = gdi32.CreateCompatibleDC(hdc_window)
    bitmap = gdi32.CreateCompatibleBitmap(hdc_window, width, height)
    gdi32.SelectObject(hdc_mem, bitmap)
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
    header.biHeight = -height
    header.biPlanes = 1
    header.biBitCount = 32
    buffer = ctypes.create_string_buffer(width * height * 4)
    gdi32.GetDIBits(hdc_mem, bitmap, 0, height, buffer, ctypes.byref(header), 0)
    image = Image.frombuffer("RGBA", (width, height), buffer, "raw", "BGRA", 0, 1).convert("RGB")

    gdi32.DeleteObject(bitmap)
    gdi32.DeleteDC(hdc_mem)
    user32.ReleaseDC(hwnd, hdc_window)

    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    print(f"captured {width}x{height} -> {out}")
    return image


def main():
    command = sys.argv[1] if len(sys.argv) > 1 else "find"
    found = pids_for()
    if not found:
        print("no emulator process found")
        return
    print("processes:", found)

    candidates = []
    for pid in found:
        for window in windows_for_pid(pid):
            candidates.append(window)
            print(f"  hwnd={window['hwnd']} visible={window['visible']} rect={window['rect']} title={window['title']!r}")

    if command == "grab":
        if not candidates:
            raise SystemExit("emulator process has no top-level window")
        best = max(candidates, key=lambda item: item["rect"][2] * item["rect"][3])
        capture(best["hwnd"], sys.argv[2])


if __name__ == "__main__":
    main()
