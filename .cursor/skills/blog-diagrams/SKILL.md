---
name: blog-diagrams
description: >-
  Author SVG diagrams for this blog's posts in the draw.io export style (pastel
  fills, black 1px strokes, monospace labels, classic arrowheads) and embed them
  with the site's image/stop-motion conventions. Use when creating, editing, or
  embedding diagrams/figures for posts under _posts (e.g. Doris, Flink, Kafka),
  or when the user mentions draw.io style, SVG figures, diagram palette, or the
  Play/Prev/Next slider.
---

# Blog Diagrams (draw.io-style SVG)

Diagrams are **hand-authored SVGs engineered to look identical to draw.io exports**. Reuse the tokens below so every figure is consistent. Real examples live in `assets/img/posts/doris/*.svg` and `assets/img/posts/flink/*.svg` — open one before authoring to match geometry.

## Canvas / root
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="Npx" height="Npx" viewBox="0 0 N N"
     style="background: transparent; color-scheme: light;" version="1.1">
```
- Size `viewBox` with ~2px of padding around content.

## Shapes
- Sharp rectangles by default (`rounded=0`); ellipses only for operators.
- `stroke-width="1"`.
- Group/containers: `fill="none"` + dashed border `stroke-dasharray="4 4"`.

## Labels
- `font-family="monospace"`, `font-size="12px"`, `text-anchor="middle"` — the monospace label is the signature look.
- Baseline at box-center-y **+ 4**.
- `fill="light-dark(#000000,#ffffff)"` (renders black; site bakes `color-scheme: light`).

## Arrows
- draw.io "classic" concave 4-point arrowhead: a line `path` that stops ~5px before the tip, plus a filled arrowhead `path` (`M…L…L…L…Z`), `stroke-miterlimit="10"`, black.
- Straight or orthogonal routing.
- Red (`fill #f8cecc` / `stroke #b85450`) is reserved for **data-plane / shuffle / hot-path** edges.

## Graph-node figures (vertices + edges)
For graph/tree diagrams (circular nodes, not architecture boxes), match the
established look in `assets/img/posts/graph-theory/**` (the graph-traversal post):
- **Node:** `<circle r="25">` (50px diameter), `stroke-width="1"`.
- **Label:** `font-family="monospace" font-size="18px" text-anchor="middle"`, baseline at `cy + 6`.
- **Spacing:** centers ~80–95px apart (≈30–45px edge gaps) — keep nodes close so they don't read small and scattered.
- **Edges:** plain 1px lines for undirected; for directed graphs add a `userSpaceOnUse` marker ~10px (`refX≈9`, path `M 0 0 L 10 5 L 0 10 L 2.5 5 Z`). Start lines at `center + r`, end at `center − r`.
- **Inline text** (maps, edge lists, `=`): same 18px monospace; an `=` separator is ~40px. Monospace runs ~11px/char — size the `viewBox` width accordingly with right margin.
- **Display width:** size each `viewBox` near its content, then pick `center-image-NN` ≈ `viewBoxWidth / 720 × 78` so every figure renders at the same ~0.8 px-per-unit (node ≈ 40px, label ≈ 14px on screen), matching graph-traversal. Using the same token scale + this rule keeps a multi-figure post cohesive.

## Color legend (every box's color carries meaning)
Fills stay constant in light/dark; only strokes/labels adapt via `light-dark()`.

| Role | Fill | Light stroke | Dark stroke |
|---|---|---|---|
| FE / control plane | `#dae8fc` (blue) | `#000000` | `#5c79a3` |
| BE / compute | `#ffe6cc` (orange) | `#000000` | `#996500` |
| Storage / durable data (rowset/segment/tablet/disk) | `#d5e8d4` (green) | `#000000` | `#446e2c` |
| Meta-service / cloud layer | `#e1d5e7` (purple) | `#000000` | `#9577a3` |
| Client / external (MySQL, Kafka, object store) | `#f5f5f5` (gray) | `#000000` | `#959595` |
| Hot path / shuffle / highlight | `#f8cecc` (red) | `#000000` | `#d7817e` |
| State / version / accent callout | `#fff2cc` (yellow) | `#000000` | `#6d5100` |

To make strokes dark-mode adaptive, use `stroke="light-dark(#000000, <dark stroke>)"`. Finished Doris figures use plain `stroke="#000000"` since the export is light-locked; either is acceptable, just be consistent within a figure.

## Minimal reference figure
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="440" height="120" viewBox="0 0 440 120"
     style="background:transparent;color-scheme:light;" version="1.1">
  <rect x="40" y="40" width="140" height="60" fill="#dae8fc" stroke="#000000" stroke-width="1"/>
  <text x="110" y="74" text-anchor="middle" font-family="monospace" font-size="12px" fill="#000000">FE (Master)</text>
  <rect x="280" y="40" width="140" height="60" fill="#ffe6cc" stroke="#000000" stroke-width="1"/>
  <text x="350" y="74" text-anchor="middle" font-family="monospace" font-size="12px" fill="#000000">BE</text>
  <path d="M 180 70 L 274 70" fill="none" stroke="#000000" stroke-miterlimit="10"/>
  <path d="M 279 70 L 272 73.5 L 274 70 L 272 66.5 Z" fill="#000000" stroke="#000000"/>
</svg>
```

## File naming
- Static figure: `assets/img/posts/<post>/<post>-<name>.svg`.
- Animated sequence: one folder per sequence with paginated frames, `assets/img/posts/<post>/<seq>/<seq>-Page-N.svg` (1-based).

## Embedding in a post
Static image (`center-image-<NN>` is the width %, default `100`; `85`/`95` for smaller):
```html
<img class="center-image-0 center-image-100" src="./assets/img/posts/<post>/<post>-<name>.svg">
```

Stop-motion sequence (Play/Prev/Next). `id` is camelCase and unique per slider; every frame `<img>` has `class="slide"`:
```html
<div class="slider" id="e2eWrite">
  <div class="slides center-image-0 center-image-100">
    <img src="./assets/img/posts/<post>/<seq>/<seq>-Page-1.svg" class="slide">
    <!-- ...Page-2 ... Page-N... -->
  </div>
  <div class="controls">
    <button onclick="plusSlides(-1, 'e2eWrite')" class="prev black-button">Prev</button>
    <button onclick="playSlides('e2eWrite')" class="play black-button">Play</button>
    <button onclick="stopSlides('e2eWrite')" class="stop black-button" hidden>Stop</button>
    <button onclick="plusSlides(1, 'e2eWrite')" class="next black-button">Next</button>
  </div>
</div>
```
Slider behavior is handled by `assets/js/slider.js` (`plusSlides`, `playSlides`, `stopSlides`); styling lives in `_sass/_slider.scss` and `.black-button` / `.center-image-*` in the newspaper theme.
