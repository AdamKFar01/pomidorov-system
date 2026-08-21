#!/usr/bin/env python3
"""Build AppIcon.icns from logo.png.

macOS does not round app icons for you. Every app, including Apple's own,
ships artwork with the rounded shape and the surrounding padding already
baked in. The ratios below were measured from Notes.app and Calculator.app:
the rounded square fills 0.8047 of the canvas, with a corner radius of
0.225 of that square.

Needs Pillow:  pip3 install Pillow
"""

import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(ROOT, "logo.png")
OUT = os.path.join(HERE, "..", "Resources", "AppIcon.icns")

CANVAS = 1024
CONTENT = int(CANVAS * 0.8047)      # 824
RADIUS = int(CONTENT * 0.225)       # 185
SS = 4                              # supersample the mask for clean edges

# (name, pixel size) pairs that iconutil expects in an .iconset
SIZES = [
    ("icon_16x16.png", 16),
    ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32),
    ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128),
    ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256),
    ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512),
    ("icon_512x512@2x.png", 1024),
]


def rounded_master():
    art = Image.open(SRC).convert("RGBA").resize((CONTENT, CONTENT), Image.LANCZOS)

    mask = Image.new("L", (CONTENT * SS, CONTENT * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, CONTENT * SS - 1, CONTENT * SS - 1),
        radius=RADIUS * SS,
        fill=255,
    )
    mask = mask.resize((CONTENT, CONTENT), Image.LANCZOS)

    shape = Image.new("RGBA", (CONTENT, CONTENT), (0, 0, 0, 0))
    shape.paste(art, (0, 0), mask)

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    offset = (CANVAS - CONTENT) // 2

    # Real macOS icons sit on a soft shadow, offset slightly downward.
    shadow = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 90), (offset, offset + 10), mask)
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(12)))

    canvas.alpha_composite(shape, (offset, offset))
    return canvas


def main():
    if not os.path.exists(SRC):
        sys.exit(f"missing source artwork: {SRC}")

    master = rounded_master()
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)

    with tempfile.TemporaryDirectory() as td:
        iconset = os.path.join(td, "AppIcon.iconset")
        os.makedirs(iconset)
        for name, size in SIZES:
            master.resize((size, size), Image.LANCZOS).save(
                os.path.join(iconset, name)
            )
        subprocess.run(
            ["iconutil", "-c", "icns", iconset, "-o", os.path.abspath(OUT)],
            check=True,
        )

    print(f"wrote {os.path.normpath(OUT)}")


if __name__ == "__main__":
    main()
