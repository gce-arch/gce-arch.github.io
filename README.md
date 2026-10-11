# Gregor Čehovin – Publications and projects

A single-page site that lists the scientific publications, research projects, and profile links of doc. dr. Gregor Čehovin. It is styled as a late-1990s fantasy role-playing interface in pixel art. The whole page is one self-contained file, `index.html`: HTML, CSS, JavaScript, fonts, and graphics are inline, and the page makes no network request when it loads.

## Opening the page

Double-click `index.html` to open it from disk, or serve the folder with any static host. The active tab is kept in the URL hash (`#publications`, `#projects`, `#links`, `#cat`); the default is `#publications`.

## Editing the content

All text comes from the `DATA` object at the top of the main `<script>` in `index.html`, below the comment block `EDIT CONTENT HERE`. Edit the strings and reload the page; no other part of the file needs to change.

Fields:

- `header`: `name` and `lines` (the four institution links, each with `text` and `href`).
- `publications`: `id`, `shortTitle`, `fullTitle`, `titleEn` (optional), `citation`, `href`, `abstractLang` (`"en"` or `"sl"`), `abstract`, and `abstractEn` (only when `abstractLang` is `"sl"`).
- `projects`: `id`, `kind` (`"project"` or `"program"`), `title`, `leader`, `period`, `funder` (optional), `code` (optional), and `abstract` (optional).
- `links`: `heading` and `items` (each with `title`, `subtitle`, and `href`).

Notes:

- `citation`, `abstract`, `abstractEn`, and the title fields may contain the tags `<i>` and `<b>`. Any other markup is shown as plain text.
- Paragraphs in `abstract` and `abstractEn` are separated by a blank line. A paragraph that starts with `• ` (a bullet character and a space) is shown as a list item with a gem bullet instead of the character.
- To add an abstract to a project, add an `abstract` field to its entry. Use a template literal (backticks) so that the text can span several lines. A project without an `abstract` shows only its facts.
- Cards and signposts appear in the order of the arrays. Nothing is sorted.

## Cat room

The square, icon-only fourth tab at the right end of the tab row opens a room with an animated pixel-art cat (a golden shaded British shorthair type). The cat rests in one of five poses: loafing, lying on its side, asleep on its back, sprawled out, and sitting. It moves only slightly: it breathes, blinks, flicks an ear, sways its tail, and now and then turns its head. The pose changes by itself every 30 seconds and whenever the cat is clicked (or Enter or Space is pressed while the room has keyboard focus). The old pose dissolves into the new one, and a heart rises from the cat after a click. The wall clock shows the visitor's local time.

When the system setting for reduced motion is on, nothing animates and the pose changes only on click, Enter, or Space. The animation stops when another tab is selected or the browser tab is hidden.

The cat is stored as the `CAT` object in the script (run-length rows; each pose is a stack of layers that the room moves or swaps by whole pixels). The room itself (window, rug, props) is drawn by the code in the section `Cat room`. To change how long a pose lasts, edit `CAT_EVERY` (milliseconds) there.

## Fonts

Both fonts are embedded as subsetted WOFF2 files and are used under the SIL Open Font License, Version 1.1.

- Press Start 2P: Copyright 2012 The Press Start 2P Project Authors (cody@zone38.net), with Reserved Font Name "Press Start 2P".
- VT323: Copyright 2011, The VT323 Project Authors (peter.hull@oikoi.com).

## Graphics

All pixel art is original and drawn in code from character grids (the `SPR` object in the script) or, for the cat, from run-length rows (the `CAT` object); the color palette is defined as CSS custom properties.
