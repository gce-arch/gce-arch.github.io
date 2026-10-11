# Source of index.html

`index.html` in the repository root is generated from the files in this folder. Rebuilding the page from
here gives a file that is byte-identical to the published `index.html` (commit 46c84da, SHA-256
`0eba3ba961bbf44739d82368590a909051fc11a0d94616b15e037a6b55727adb`). Everything is drawn in code or stored
as character grids and run-length data; the page contains no image files.

## Layout

| Folder | Content |
|---|---|
| `build/` | `template.html` (markup, CSS, placeholders), `app.js` (tabs, header, cards), `cat.js` (cat and room engine), `room.js` (room layout and animation), `sprite_runtime.js`, `catdata.json` (run-length cat artwork), and the Python generators |
| `build/build.py` | Assembles `index.html` from the template, fonts, sprites, the DATA block, the cat data, and the room props |
| `build/artlib.py`, `sprites_art.py`, `sprites_icons.py`, `preview.py` | Palette, legend, and the character-grid sprites (tomes, scrolls, icons, decorations) |
| `build/catlib.py`, `catbody.py`, `cathead.py`, `catposes.py`, `caticon.py`, `catexport.py` | The cat: layered height-field model, head, five poses, tab icon, export to `catdata.json` |
| `build/subset_fonts.py`, `fontinfo.py` | Font subsetting and inspection |
| `build/headtest.py`, `posetest.py` | Contact sheets for head and pose development (write PNG files to `../shots/`, which must exist) |
| `props/` | Room props as Canvas drawing functions (`rm_*.js`), concatenated into the page by `build.py` with comments removed; `render.js` and `harness_pal.js` render props to PNG for development |
| `fonts/` | Subsetted WOFF2 fonts and their base64 text, as embedded in the page |
| `tests/` | Playwright scripts; `verify.js` is the full suite of 90 checks |
| `content/` | `claude_code_prompt_gce-arch.md`, the original specification; section 12 holds the DATA block (all page text), and `verify.js` reads the file to check the page against it |

## Rebuilding

```
cd source/build
python3 build.py                       # writes source/out/index.html
OUT=/path/to/index.html python3 build.py
BODYFONT=pixelify python3 build.py     # alternative body font (the published page uses VT323)
```

`build.py` needs only the Python 3 standard library. To change the page text, edit the DATA block in
`content/claude_code_prompt_gce-arch.md` (section 12) or edit the `const DATA` block in the finished
`index.html` directly.

## Regenerating the generated files

* `catdata.json`: run `python3 catexport.py` inside `build/`. This needs numpy and Pillow.
* `fonts/*.b64`: `python3 subset_fonts.py <folder with the original fonts> <output folder>`. This needs
  fontTools and brotli, and the original Press Start 2P and VT323 (and, optionally, Pixelify Sans) files,
  which are not included. The fonts are used under the SIL Open Font License, Version 1.1; the notices are
  in the root `README.md` and in the header comment of `index.html`.

## Tests

Node.js 22 and Playwright with Chromium are required. Pass absolute paths:

```
cd source
NODE_PATH=<folder with playwright> node tests/verify.js /abs/path/index.html /abs/path/source/content/claude_code_prompt_gce-arch.md
NODE_PATH=<...> node tests/catkb.js /abs/path/index.html           # cat tab: keyboard, pose changes, reduced motion
NODE_PATH=<...> node tests/roomsizes.js /abs/path/index.html <output folder>   # screenshots at 8 window sizes
```

`finalshots.js`, `shots.js`, `catposes.js`, `catmotion.js`, and `cpu.js` are further screenshot and
measurement scripts (usage in their first lines); `contrast.py` computes palette contrast ratios.
