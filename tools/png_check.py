"""Validate a PNG's chunk CRCs — a corrupted IDAT is invisible to the eye but
makes the Vela image converter and runtime reject the file."""

from __future__ import annotations

import struct
import sys
import zlib
from pathlib import Path


def check(path):
    data = Path(path).read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        print(f"{path}: not a PNG")
        return False
    offset = 8
    ok = True
    while offset < len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        chunk_type = data[offset + 4 : offset + 8].decode("latin1")
        payload = data[offset + 8 : offset + 8 + length]
        stored = struct.unpack(">I", data[offset + 8 + length : offset + 12 + length])[0]
        actual = zlib.crc32(data[offset + 4 : offset + 8 + length]) & 0xFFFFFFFF
        status = "ok" if stored == actual else "CRC MISMATCH"
        if stored != actual:
            ok = False
        print(f"  {chunk_type:<5} len={length:<7} crc={stored:08x} calc={actual:08x} {status}")
        offset += 12 + length
        if chunk_type == "IEND":
            break

    # also check that the pixel data decompresses
    packed = bytearray()
    offset = 8
    while offset < len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        chunk_type = data[offset + 4 : offset + 8]
        if chunk_type == b"IDAT":
            packed += data[offset + 8 : offset + 8 + length]
        offset += 12 + length
        if chunk_type == b"IEND":
            break
    try:
        zlib.decompress(bytes(packed))
        print("  IDAT stream: decompresses")
    except zlib.error as error:
        ok = False
        print(f"  IDAT stream: BROKEN ({error})")
    print(f"{path}: {'VALID' if ok else 'CORRUPT'}")
    return ok


if __name__ == "__main__":
    for target in sys.argv[1:]:
        check(target)
