#!/usr/bin/env python3
"""LithTech DTX -> PNG converter. Handles DXT1 / DXT3 / DXT5.

Format facts confirmed from Empire Rising client files:
  - Fixed 164-byte header. Pixel data (largest mip first) starts at offset 164.
  - width  = uint16 @ 8, height = uint16 @ 10, mipmaps = uint16 @ 12
  - BPPIdent byte @ 26:  4 = DXT1,  5 = DXT3,  6 = DXT5
The previous version guessed the pixel offset by skipping leading zero bytes,
which lands one byte late whenever the first pixel byte is 0x00 -> corruption.
This uses the fixed 164 offset instead.

Usage:
  python convert_dtx.py                    # batch: SKINS tree -> OUT
  python convert_dtx.py path/to/file.dtx   # single file (writes ./<name>.png), prints header
  python convert_dtx.py in.dtx out.png     # single file to a chosen path
"""
import struct, os, sys
from PIL import Image
from pathlib import Path

SKINS = 'game/Resources/Skins'   # adjust to wherever your extracted skins live
OUT = 'textures_extracted'
HEADER_SIZE = 164                 # LithTech DTX fixed header size


def rgb565(v):
    r = ((v >> 11) & 0x1F) * 255 // 31
    g = ((v >> 5) & 0x3F) * 255 // 63
    b = (v & 0x1F) * 255 // 31
    return (r, g, b)


def _colors(c0, c1, dxt1):
    """Return the 4-color palette for a block. For DXT1, c0<=c1 means index 3 is
    transparent; DXT3/DXT5 always use the 4-opaque-color interpolation."""
    a = rgb565(c0); b = rgb565(c1)
    if dxt1 and c0 <= c1:
        mid = tuple((a[i] + b[i]) // 2 for i in range(3))
        return [a, b, mid, None]
    c2 = tuple((a[i] * 2 + b[i]) // 3 for i in range(3))
    c3 = tuple((a[i] + b[i] * 2) // 3 for i in range(3))
    return [a, b, c2, c3]


def _put(out, w, h, x, y, idxs, cols, alpha=None):
    for r in range(4):
        for c in range(4):
            px, py = x + c, y + r
            if px >= w or py >= h:
                continue
            ci = (idxs >> ((r * 4 + c) * 2)) & 3
            clr = cols[ci]
            off = (py * w + px) * 4
            if clr is None:
                out[off:off + 4] = b'\x00\x00\x00\x00'
            else:
                av = 255 if alpha is None else alpha(r, c)
                out[off:off + 4] = bytes([clr[0], clr[1], clr[2], av])


def decode_dxt1(block, out, x, y, w, h):
    c0, c1 = struct.unpack('<HH', block[0:4])
    idxs = struct.unpack('<I', block[4:8])[0]
    _put(out, w, h, x, y, idxs, _colors(c0, c1, True))


def decode_dxt3(block, out, x, y, w, h):
    alpha = struct.unpack('<Q', block[0:8])[0]       # 16 * 4-bit explicit alpha
    c0, c1 = struct.unpack('<HH', block[8:12])
    idxs = struct.unpack('<I', block[12:16])[0]
    _put(out, w, h, x, y, idxs, _colors(c0, c1, False),
         alpha=lambda r, c: ((alpha >> ((r * 4 + c) * 4)) & 0xF) * 255 // 15)


def decode_dxt5(block, out, x, y, w, h):
    a0, a1 = block[0], block[1]
    abits = int.from_bytes(block[2:8], 'little')      # 16 * 3-bit alpha indices
    if a0 > a1:
        al = [a0, a1] + [((8 - i) * a0 + (i - 1) * a1) // 7 for i in range(2, 8)]
    else:
        al = [a0, a1] + [((6 - i) * a0 + (i - 1) * a1) // 5 for i in range(2, 6)] + [0, 255]
    c0, c1 = struct.unpack('<HH', block[8:12])
    idxs = struct.unpack('<I', block[12:16])[0]
    _put(out, w, h, x, y, idxs, _colors(c0, c1, False),
         alpha=lambda r, c: al[(abits >> ((r * 4 + c) * 3)) & 7])


FORMATS = {3: ('RGBA8', 4, None), 4: ('DXT1', 8, decode_dxt1), 5: ('DXT3', 16, decode_dxt3), 6: ('DXT5', 16, decode_dxt5)}


def convert(path, verbose=False):
    with open(path, 'rb') as f:
        d = f.read()
    if len(d) < HEADER_SIZE + 8:
        return None
    w = struct.unpack('<H', d[8:10])[0]
    h = struct.unpack('<H', d[10:12])[0]
    mips = struct.unpack('<H', d[12:14])[0]
    fmt = d[26]
    if not (0 < w <= 4096 and 0 < h <= 4096) or fmt not in FORMATS:
        if verbose:
            print(f"  skip: w={w} h={h} fmt={fmt}")
        return None
    name, bsize, decode = FORMATS[fmt]
    bw, bh = max(1, (w + 3) // 4), max(1, (h + 3) // 4)
    psize = w * h * 4 if fmt == 3 else bw * bh * bsize   # fmt3 = raw RGBA, pixel-exact
    pixels = d[HEADER_SIZE:HEADER_SIZE + psize]        # largest mip, right after header
    if len(pixels) < psize:
        return None
    if verbose:
        print(f"  {w}x{h} {name} mips={mips} mip0={psize}B @offset {HEADER_SIZE} (file {len(d)}B)")
    if fmt == 3:                                       # raw 32-bit RGBA (uncompressed)
        return (w, h, bytes(pixels))
    out = bytearray(w * h * 4)
    for by in range(bh):
        for bx in range(bw):
            i = (by * bw + bx) * bsize
            decode(pixels[i:i + bsize], out, bx * 4, by * 4, w, h)
    return (w, h, bytes(out))


def convert_to(src, dst):
    r = convert(src, verbose=True)
    if not r:
        print(f"FAIL  {src}")
        return False
    w, h, px = r
    Image.frombytes('RGBA', (w, h), px).save(dst, 'PNG')
    print(f"OK    {dst}")
    return True


if __name__ == '__main__':
    if len(sys.argv) > 1:
        src = sys.argv[1]
        dst = sys.argv[2] if len(sys.argv) > 2 else Path(src).stem + '.png'
        convert_to(src, dst)
        sys.exit(0)

    dtx_files = []
    for root, dirs, files in os.walk(SKINS):
        for f in files:
            if f.lower().endswith('.dtx'):
                dtx_files.append(os.path.join(root, f))
    print(f"Converting {len(dtx_files)} DTX files from {SKINS}...")
    ok = fail = 0
    for i, path in enumerate(dtx_files):
        rel = os.path.relpath(path, SKINS)
        out_dir = os.path.join(OUT, os.path.dirname(rel))
        os.makedirs(out_dir, exist_ok=True)
        out_png = os.path.join(out_dir, Path(rel).stem + '.png')
        r = convert(path)
        if r:
            w, h, px = r
            Image.frombytes('RGBA', (w, h), px).save(out_png, 'PNG')
            ok += 1
        else:
            fail += 1
        if (i + 1) % 200 == 0:
            print(f"  {i + 1}/{len(dtx_files)}: {ok} ok, {fail} fail")
    print(f"Done: {ok} ok, {fail} fail")
