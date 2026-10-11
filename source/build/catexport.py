"""Export the cat art as compact run-length data for the page (catdata.json).

Row format: tokens "<char><count>" (count omitted when 1), rows joined with "/", trailing
transparent runs dropped. The cat uses no digit characters in its legend, so tokens are unambiguous.
"""
import json, sys
from catlib import *
import catposes, caticon


def rle_rows(a):
    H, W = a.shape
    rows = []
    for y in range(H):
        row = a[y]
        toks = []
        x = 0
        while x < W:
            v = row[x]
            x2 = x + 1
            while x2 < W and row[x2] == v:
                x2 += 1
            ch = '.' if v < 0 else KEY2CH[KEYS[v]]
            assert not ch.isdigit(), ch
            n = x2 - x
            toks.append((ch, n))
            x = x2
        if toks and toks[-1][0] == '.':
            toks.pop()
        rows.append(''.join(c + (str(n) if n > 1 else '') for c, n in toks))
    return '/'.join(rows)


def layer_dict(name, im):
    c, x0, y0 = im.crop()
    if c is None:
        return None
    return dict(k=name, x=int(x0), y=int(y0), w=int(c.W), h=int(c.H), g=rle_rows(c.a))


def export():
    data = dict(poses=[])
    for pname in catposes.POSES:
        layers, xf, meta = getattr(catposes, 'pose_' + pname)()
        out = catposes.render_pose(layers, xf, meta)
        P = dict(id=meta['name'], say=meta['label'], eye=meta['eyes'], shadow=list(meta['shadow']),
                 br=meta['br'], zzz=meta['zzz'], L=[])
        for k in meta['order']:
            if k == 'eyes':
                ims = {st: out['eyes_' + st] for st in ('open', 'half', 'closed')}
                bbs = [im.bbox() for im in ims.values() if im.bbox()]
                x0 = min(b[0] for b in bbs); y0 = min(b[1] for b in bbs)
                x1 = max(b[2] for b in bbs); y1 = max(b[3] for b in bbs)
                g = {}
                for st, im in ims.items():
                    sub = im.a[y0:y1 + 1, x0:x1 + 1]
                    g[st] = rle_rows(sub)
                L = dict(k='eyes', x=int(x0), y=int(y0), w=int(x1 - x0 + 1), h=int(y1 - y0 + 1), g=g)
            else:
                L = layer_dict(k, out[k])
            if k in meta['lift']:
                L['lf'] = 1
            if k == meta['sway']['layer']:
                L['sw'] = {kk: vv for kk, vv in meta['sway'].items() if kk != 'layer'}
            if k == 'body':
                L['bs'] = 1
            if k in meta['bob']:
                L['bb'] = 1
            if k in ('ear_l', 'ear_r'):
                L['ear'] = 1
            P['L'].append(L)
        data['poses'].append(P)
    im, xf = caticon.build_icon()
    caticon.hand_features(im)
    im.outline(lambda k: 'ink')
    data['icon'] = im.rows()
    return data


if __name__ == '__main__':
    d = export()
    js = json.dumps(d, separators=(',', ':'))
    open('catdata.json', 'w').write(js)
    print('catdata.json', len(js), 'bytes;', {p['id']: sum(len(l['g']) if isinstance(l['g'], str) else sum(len(v) for v in l['g'].values()) for l in p['L']) for p in d['poses']})
