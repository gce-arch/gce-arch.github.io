import json, sys, importlib
from artlib import *

def collect():
    import sprites_icons
    importlib.reload(sprites_icons)
    spr = {}
    for name, fn in sprites_icons.ICONS.items():
        cv = fn(); rows = cv.rows(); check_rows(name, rows); spr[name] = rows
    try:
        import sprites_art
        importlib.reload(sprites_art)
        for name, rows in sprites_art.build().items():
            check_rows(name, rows); spr[name] = rows
    except ImportError:
        pass
    return spr

def page(spr, scale=12, only=None):
    css_vars = ''.join(f'--{k}:{v};' for k, v in PALETTE.items())
    names = [n for n in spr if (not only or n in only)]
    runtime = open('sprite_runtime.js').read()
    html = f"""<!doctype html><meta charset=utf-8><style>
:root{{{css_vars}--px:{scale}px}}
body{{margin:0;background:#0b0e16;color:#ddd;font:12px monospace;padding:12px}}
.row{{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:18px}}
.cell{{padding:8px;border:1px solid #333}}
.bg1{{background:#151b28}} .bg2{{background:#12355b}} .bg3{{background:#ecdca8}} .bg4{{background:#b8892b}}
.spr{{display:block;width:calc(var(--sw)*var(--px));height:calc(var(--sh)*var(--px))}}
.small .spr{{width:calc(var(--sw)*3px);height:calc(var(--sh)*3px)}}
</style><body><div id=out></div><script>
var LEGEND={json.dumps(LEGEND)};var SPR={json.dumps(spr)};
{runtime}
readPalette();
var out=document.getElementById('out'),h='';
var TOMEMAPS={json.dumps(TOME_COLORWAYS)};
{json.dumps(names)}.forEach(function(n){{
  var remaps=(n.indexOf('tome')===0)?TOMEMAPS:[null];
  remaps.forEach(function(rm){{
    h+='<div class=row><div class="cell bg1">'+spriteSVG(n,'',{{remap:rm}})+'<div>'+n+' '+sprW(n)+'x'+sprH(n)+'</div></div>'
     +'<div class="cell bg2">'+spriteSVG(n,'',{{remap:rm}})+'</div><div class="cell bg3">'+spriteSVG(n,'',{{remap:rm}})+'</div>'
     +'<div class="cell bg2 small">'+spriteSVG(n,'',{{remap:rm}})+'</div></div>';
  }});
}});
out.innerHTML=h;
</script>"""
    return html

if __name__ == '__main__':
    scale = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
    spr = collect()
    open('../shots/preview.html', 'w').write(page(spr, scale, only))
    json.dump(spr, open('sprites.json', 'w'))
    print('sprites:', {k: f'{len(v[0])}x{len(v)}' for k, v in spr.items()})
