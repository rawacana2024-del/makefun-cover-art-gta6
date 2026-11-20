# makefun-cover-art-gta6
[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/rawacana2024-del/makefun-cover-art-gta6/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/rawacana2024-del/makefun-cover-art-gta6/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice Nights — Cover Studio** is a static web app (HTML + CSS + Canvas, no build
step, no network) that turns up to three photos and a caption into GTA-style
multi-panel poster art and exports it as a PNG. All art, lettering and fonts
are original — there is no Rockstar logo, artwork, wordmark or font anywhere.
The three built-in samples (Sunset Blvd, Neon Pier, City Dusk) are illustrations
drawn programmatically with Pillow. Photos never leave the device: everything
is drawn on a local canvas and exported in the browser.

## Open it

```bash
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Export needs the local
server — opening `index.html` over `file://` taints the canvas, so the PNG
export would refuse to run. Node 22.18+ is required (`node --version`).

## Use it

1. Pick a sample or upload a photo for **Photo 1 (hero)**, **Photo 2** and
   **Photo 3**. Thumbnails show what is loaded.
2. Choose a **layout**: Poster (one hero photo on top, two insets below),
   Triptych (three vertical panels) or Single (one photo full-bleed).
3. Choose a **colour grade**: Sunset, Neon, Noir or Palm. A grade tints the
   cover and recolours the title and caption.
4. Type a **title** and a **caption**. The title is fitted to the cover and
   drawn large with an outline; the caption sits in a bar at the bottom.
5. Zoom the hero photo with the slider and drag the cover to pan it.
   **Reset view** restores zoom 1× and no pan.
6. Pick an **export size** (1080×1080, 1080×1350, 1920×1080 or 1080×1920)
   and press **Export PNG**. It downloads
   `vice-nights-cover-<width>x<height>.png`.

## Fixed scenes

`shots.json` lists the four fixed scenes used for the screenshots. The app
reads the same parameters from the URL, so any scene is reproducible:

- `?shot=editor` — the editor with a photo loaded.
- `?shot=cover` — the cover full-screen, with no editor chrome.

Both accept `photo`, `photo2`, `photo3` (sample keys `sunset`/`boulevard`,
`neon`/`pier`, `dusk`/`city`), `layout`, `grade`, `title`, `caption`, `size`,
`zoom`, `panx` and `pany`, and set `window.__shotReady` when painted. A test
hook, `window.__coverApp.exportDataURL(width, height)`, returns a Promise of
a PNG data URL for the current cover.

| Screenshot | Scene |
| --- | --- |
| `1-cover.png` | Single layout, Palm grade, 1920×1080 cover at 1280×720 |
| `2-editor.png` | Editor with a photo loaded (Poster, Sunset), 1280×720 |
| `3-cover-portrait.png` | Triptych, Neon, 1080×1350 cover at 1024×1280 |
| `4-cover-square.png` | Poster, Sunset, 1080×1080 cover |

## What was tested

- PNG export through the `exportDataURL` hook in headless Chromium: all four
  sizes return valid PNGs with the exact requested dimensions
  (1080×1080, 1080×1350, 1920×1080, 1080×1920).
- All four screenshots were taken in headless Chromium from the fixed scenes
  in `shots.json` and visually checked: the title and caption are large and
  readable in every layout, the three panels show three different photos, and
  no text overlaps or is cut off. The screenshots are the app's own renders;
  three were palette-encoded (256 colours, same pixels) to fit the 256 KiB
  cap — no content was edited or composited.
- `main.ts` runs clean and writes `dossier.json` (schema `makefun/dossier/v1`)
  within the caps: dossier text ≤ 163,840 bytes, app/ ≤ 993 files and
  48 MiB, every screenshot ≤ 256 KiB, total output ≤ 1,000 files and 64 MiB.

## Files

- `main.ts` — entry program: copies `app/` and `screenshots/` to `/output`
  (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with the vendored
  make.fun library. Run it with
  `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.
- `serve.ts` — tiny static server (Node standard library only) for local use.
- `app/index.html`, `app/style.css`, `app/app.js` — the app.
- `app/samples/sunset-boulevard.png`, `app/samples/neon-pier.png`,
  `app/samples/city-dusk.png` — built-in sample illustrations.
- `screenshots/` — the four fixed-scene screenshots.
- `shots.json` — the four fixed scenes (name, query, viewport).
- `vendor/makefun-app.ts` — vendored make.fun dossier library (unchanged).
- `LICENSE` — MIT.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
