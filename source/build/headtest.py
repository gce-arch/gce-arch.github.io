import sys, math
from catlib import *
from cathead import *
from PIL import Image

def compose(W, H, xf, eye='open'):
    im = Img(W, H)
    el = render_ear(xf, W, H, 'l'); er = render_ear(xf, W, H, 'r')
    im.stamp(el); im.stamp(er)
    hd = render_head(xf, W, H)
    im.stamp(hd)
    ey = render_eyes(xf, W, H, eye)
    im.stamp(ey)
    return im

W = H = 72
sheet = Image.new('RGBA', (W*3*8 + 40, H*8*2 + 30), (14, 38, 68, 255))
x = 8
for i, (eye, rot, s, mx) in enumerate([('open', 0, 1.0, False), ('half', 0.0, 1.0, False), ('closed', 0.0, 1.0, False)]):
    xf = Xf(W/2, H/2+1, rot, s, mx)
    im = compose(W, H, xf, eye)
    sheet.alpha_composite(to_pil(im, 8), (x, 8))
    x += W*8 + 8
# second row: rolled heads
x = 8
for i, (eye, rot, s, mx) in enumerate([('open', 1.3, 0.9, False), ('closed', 2.9, 0.9, True), ('half', -0.35, 0.6, False)]):
    xf = Xf(W/2, H/2+1, rot, s, mx)
    im = compose(W, H, xf, eye)
    sheet.alpha_composite(to_pil(im, 8), (x, H*8 + 22))
    x += W*8 + 8
sheet.save('../shots/head_test.png')
print('ok')
