"""
Regenerates assets/whatsapp-icon.png — a clean, standard "2D white line icon"
WhatsApp glyph (an outlined chat bubble with a solid white phone-handset
silhouette inside), single color, transparent background.

This is a generated asset, not a hand-drawn one: it's built procedurally so
it can be tweaked and re-run instead of hand-editing pixels. Requires
Pillow (`pip install Pillow`); not part of the site's runtime, so it isn't
loaded by any page — run it manually when the icon needs to change:

    python scripts/make-whatsapp-icon.py

then copy/overwrite assets/whatsapp-icon.png with the output.

Technique: draws shapes at 4x resolution then downsamples with LANCZOS for
anti-aliased edges (Pillow's basic ImageDraw shapes aren't anti-aliased at
native resolution). The bubble's "outline" look comes from filling the full
bubble shape, filling a smaller inset copy of the same shape, and
subtracting the two masks — simpler and more robust here than trying to
stroke a custom polygon path directly.
"""
from PIL import Image, ImageDraw, ImageChops

SS = 4  # supersample factor
BASE = 256
SIZE = BASE * SS
STROKE = 15 * SS


def bubble_mask(inset=0):
    """Filled chat-bubble-with-tail shape, inset inward by `inset` px."""
    m = 20 * SS + inset
    box = [m, m, SIZE - m, SIZE - m - 34 * SS]
    radius = max(58 * SS - inset * 0.55, 1)
    img = Image.new("L", (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(box, radius=radius, fill=255)
    # Tail: a small triangular point at the bottom-left of the bubble,
    # tapering smoothly out of the rounded body (no separate pieces, so the
    # outline (outer-minus-inner) subtraction below doesn't leave stray
    # rings where a disconnected shape would have overlapped itself).
    tail_top_y = box[3] - 6 * SS
    tail = [
        (m + 26 * SS, tail_top_y),
        (m + 78 * SS, tail_top_y),
        (m + 22 * SS, SIZE - 26 * SS - inset),
    ]
    d.polygon(tail, fill=255)
    return img


def outline_mask():
    outer = bubble_mask(inset=0)
    inner = bubble_mask(inset=STROKE)
    return ImageChops.subtract(outer, inner)


def handset_mask():
    """A simple rounded 'capsule' phone-receiver silhouette, rotated, as a
    solid glyph centered inside the bubble."""
    img = Image.new("L", (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE / 2, SIZE / 2 - 14 * SS

    # Capsule body (rounded rectangle) representing the receiver.
    body_w, body_h = 132 * SS, 40 * SS
    box = [cx - body_w / 2, cy - body_h / 2, cx + body_w / 2, cy + body_h / 2]
    d.rounded_rectangle(box, radius=body_h / 2, fill=255)

    # Two rounded "earpiece/mouthpiece" caps at the ends, slightly larger,
    # to read clearly as a handset rather than a plain bar.
    cap_r = 26 * SS
    for sign in (-1, 1):
        ex = cx + sign * (body_w / 2 - 6 * SS)
        d.ellipse([ex - cap_r, cy - cap_r, ex + cap_r, cy + cap_r], fill=255)

    img = img.rotate(-40, resample=Image.BICUBIC, center=(cx, cy))
    return img


def build():
    bubble_outline = outline_mask()
    handset = handset_mask()
    combined = ImageChops.lighter(bubble_outline, handset)

    white_rgba = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    solid_white = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255))
    white_rgba = Image.composite(solid_white, white_rgba, combined)

    final = white_rgba.resize((BASE, BASE), Image.LANCZOS)
    return final


if __name__ == "__main__":
    icon = build()
    out_path = "whatsapp-icon-white.png"
    icon.save(out_path)
    print("saved", out_path, icon.size)
