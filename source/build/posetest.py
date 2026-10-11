import sys
from catlib import *
import catposes
from PIL import Image, ImageDraw
names = sys.argv[1].split(',') if len(sys.argv) > 1 else catposes.POSES
scale = int(sys.argv[2]) if len(sys.argv) > 2 else 5
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 2
tiles = []
for n in names:
    layers, xf, meta = getattr(catposes, 'pose_' + n)()
    out = catposes.render_pose(layers, xf, meta)
    im = catposes.compose(out, meta['order'])
    t = to_pil(im, scale)
    base = Image.new('RGBA', t.size, (14, 38, 68, 255))
    d = ImageDraw.Draw(base)
    d.rectangle([0, 91 * scale, t.width, t.height], fill=(40, 26, 20, 255))
    base.alpha_composite(t)
    tiles.append(base)
rows = (len(tiles) + cols - 1) // cols
tw, th = tiles[0].size
sheet = Image.new('RGBA', (cols * (tw + 12) + 12, rows * (th + 12) + 12), (0, 0, 0, 255))
for i, t in enumerate(tiles):
    sheet.alpha_composite(t, (12 + (i % cols) * (tw + 12), 12 + (i // cols) * (th + 12)))
sheet.save('../shots/pose_test.png')
print('ok', sheet.size)
