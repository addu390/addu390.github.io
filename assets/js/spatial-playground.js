(function () {
    "use strict";
    var INK = "#161616", SOFT = "#8a8a8a", HAIR = "#dcdcdc", ACCENT = "#9c2f27", ACCENT_TINT = "rgba(156,47,39,0.10)";
    var BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    var W = 640, H = 520, M = 8;

    var canvas = document.getElementById("sp-canvas");
    if (!canvas) return;
    var ratio = window.devicePixelRatio || 1;
    canvas.width = W * ratio;
    canvas.height = H * ratio;
    canvas.style.height = (H) + "px";
    var ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);

    var state = {
        structure: "kd",
        points: [],
        hover: null,
        query: null, qlon: 0, qlat: 0,
        kdLines: true, kdDepth: true, kdNN: true,
        qtCap: 2, qtDepth: 6, qtGrid: true,
        ghPrec: 3, ghLabels: true,
        hyCap: 6, hyDepth: 6, hyCells: true, hyKd: true,
        rkCap: 6, rkRects: true, rkKd: true
    };

    var DESC = {
        kd: "A k-d tree splits points by alternating axes. Click to drop points; hover to find the nearest neighbour.",
        quadtree: "A point-region quadtree splits a cell into four once it overflows. Click to add points; tune capacity and depth.",
        geohash: "Geohash interleaves longitude and latitude bits into a base-32 string, recursively boxing the globe. Click to place a point.",
        hybrid: "A quad-kd tree combines both: a quadtree partitions space into bounding cells, and the points inside each cell are indexed by a local k-d tree. Click to add points.",
        rkd: "An r-kd tree groups nearby points into r-tree bounding rectangles (which can overlap), then indexes the points inside each rectangle with a local k-d tree. Click to add points."
    };
    var TITLE = { kd: "k-d Tree", quadtree: "Quadtree", geohash: "Geohash", hybrid: "Quad-KD Tree", rkd: "R-KD Tree" };
    var HINT = {
        kd: "Click to add a point. Hover to query the nearest neighbour.",
        quadtree: "Click to add a point and watch the cells subdivide.",
        geohash: "Click anywhere to geohash that location.",
        hybrid: "Click to add points: the quadtree splits space, a k-d tree partitions the points inside each cell.",
        rkd: "Click to add points: the r-tree groups them into bounding rectangles, a k-d tree partitions the points inside each."
    };

    function clampi(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    function toLocal(e) {
        var r = canvas.getBoundingClientRect();
        var cx = (e.touches ? e.touches[0].clientX : e.clientX);
        var cy = (e.touches ? e.touches[0].clientY : e.clientY);
        return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H };
    }

    function clear() { ctx.clearRect(0, 0, W, H); }
    function dot(x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill(); }
    function seg(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

    function buildKD(pts, depth) {
        if (!pts.length) return null;
        var axis = depth % 2;
        pts.sort(function (a, b) { return axis === 0 ? a.x - b.x : a.y - b.y; });
        var mid = Math.floor(pts.length / 2);
        return {
            point: pts[mid], axis: axis,
            left: buildKD(pts.slice(0, mid), depth + 1),
            right: buildKD(pts.slice(mid + 1), depth + 1)
        };
    }
    function drawKD(node, x0, x1, y0, y1, depth) {
        if (!node) return;
        var p = node.point;
        if (state.kdLines) {
            ctx.lineWidth = 1;
            ctx.globalAlpha = state.kdDepth ? clampi(1 - depth * 0.09, 0.28, 1) : 0.5;
            ctx.strokeStyle = node.axis === 0 ? ACCENT : INK;
            if (node.axis === 0) seg(p.x, y0, p.x, y1); else seg(x0, p.y, x1, p.y);
            ctx.globalAlpha = 1;
        }
        if (node.axis === 0) {
            drawKD(node.left, x0, p.x, y0, y1, depth + 1);
            drawKD(node.right, p.x, x1, y0, y1, depth + 1);
        } else {
            drawKD(node.left, x0, x1, y0, p.y, depth + 1);
            drawKD(node.right, x0, x1, p.y, y1, depth + 1);
        }
    }
    function renderKD() {
        clear();
        if (state.points.length) {
            var root = buildKD(state.points.slice(), 0);
            drawKD(root, M, W - M, M, H - M, 0);
        }
        for (var i = 0; i < state.points.length; i++) dot(state.points[i].x, state.points[i].y, 3.5, INK);
        if (state.kdNN && state.hover && state.points.length) {
            var best = null, bd = Infinity;
            for (var j = 0; j < state.points.length; j++) {
                var dx = state.points[j].x - state.hover.x, dy = state.points[j].y - state.hover.y;
                var d = dx * dx + dy * dy;
                if (d < bd) { bd = d; best = state.points[j]; }
            }
            if (best) {
                ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5; seg(state.hover.x, state.hover.y, best.x, best.y);
                ctx.beginPath(); ctx.arc(best.x, best.y, 8, 0, 2 * Math.PI); ctx.stroke();
                dot(best.x, best.y, 4, ACCENT);
                dot(state.hover.x, state.hover.y, 3, SOFT);
            }
            setReadout("nearest distance: " + Math.sqrt(bd).toFixed(1) + " px");
        } else {
            setReadout(state.points.length + " points");
        }
    }

    function makeCell(x, y, w, h, depth) { return { x: x, y: y, w: w, h: h, depth: depth, pts: [], kids: null }; }
    function qtInsert(cell, p, cap, maxDepth) {
        if (cap == null) cap = state.qtCap;
        if (maxDepth == null) maxDepth = state.qtDepth;
        if (cell.kids) { qtInsert(cell.kids[qtQuad(cell, p)], p, cap, maxDepth); return; }
        cell.pts.push(p);
        if (cell.pts.length > cap && cell.depth < maxDepth) {
            var hw = cell.w / 2, hh = cell.h / 2;
            cell.kids = [
                makeCell(cell.x, cell.y, hw, hh, cell.depth + 1),
                makeCell(cell.x + hw, cell.y, hw, hh, cell.depth + 1),
                makeCell(cell.x, cell.y + hh, hw, hh, cell.depth + 1),
                makeCell(cell.x + hw, cell.y + hh, hw, hh, cell.depth + 1)
            ];
            var old = cell.pts; cell.pts = [];
            for (var i = 0; i < old.length; i++) qtInsert(cell.kids[qtQuad(cell, old[i])], old[i], cap, maxDepth);
        }
    }
    function qtQuad(cell, p) {
        var right = p.x >= cell.x + cell.w / 2, bottom = p.y >= cell.y + cell.h / 2;
        return (bottom ? 2 : 0) + (right ? 1 : 0);
    }
    function drawQuad(cell) {
        if (state.qtGrid) {
            ctx.strokeStyle = HAIR; ctx.lineWidth = 1;
            ctx.globalAlpha = clampi(1 - cell.depth * 0.07, 0.35, 1);
            ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
            ctx.globalAlpha = 1;
        }
        if (cell.kids) for (var i = 0; i < 4; i++) drawQuad(cell.kids[i]);
    }
    function renderQuad() {
        clear();
        var root = makeCell(M, M, W - 2 * M, H - 2 * M, 0);
        for (var i = 0; i < state.points.length; i++) qtInsert(root, state.points[i]);
        drawQuad(root);
        for (var k = 0; k < state.points.length; k++) dot(state.points[k].x, state.points[k].y, 3.5, INK);
        setReadout(state.points.length + " points, capacity " + state.qtCap);
    }

    function drawKDCell(node, x0, x1, y0, y1) {
        if (!node) return;
        var p = node.point;
        ctx.lineWidth = 1;
        ctx.strokeStyle = ACCENT;
        ctx.globalAlpha = 0.8;
        if (node.axis === 0) seg(p.x, y0, p.x, y1); else seg(x0, p.y, x1, p.y);
        ctx.globalAlpha = 1;
        if (node.axis === 0) {
            drawKDCell(node.left, x0, p.x, y0, y1);
            drawKDCell(node.right, p.x, x1, y0, y1);
        } else {
            drawKDCell(node.left, x0, x1, y0, p.y);
            drawKDCell(node.right, x0, x1, p.y, y1);
        }
    }
    function collectLeaves(cell, out) {
        if (cell.kids) { for (var i = 0; i < 4; i++) collectLeaves(cell.kids[i], out); }
        else out.push(cell);
    }
    function renderHybrid() {
        clear();
        var root = makeCell(M, M, W - 2 * M, H - 2 * M, 0);
        for (var i = 0; i < state.points.length; i++) qtInsert(root, state.points[i], state.hyCap, state.hyDepth);
        if (state.hyCells) {
            (function walk(cell) {
                ctx.strokeStyle = HAIR; ctx.lineWidth = 1;
                ctx.globalAlpha = clampi(1 - cell.depth * 0.07, 0.4, 1);
                ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
                ctx.globalAlpha = 1;
                if (cell.kids) for (var j = 0; j < 4; j++) walk(cell.kids[j]);
            })(root);
        }
        var leaves = []; collectLeaves(root, leaves);
        var filled = 0;
        for (var L = 0; L < leaves.length; L++) {
            var c = leaves[L];
            if (!c.pts.length) continue;
            filled++;
            if (state.hyKd && c.pts.length > 1) {
                var kroot = buildKD(c.pts.slice(), 0);
                drawKDCell(kroot, c.x, c.x + c.w, c.y, c.y + c.h);
            }
        }
        for (var k = 0; k < state.points.length; k++) dot(state.points[k].x, state.points[k].y, 3.5, INK);
        setReadout(state.points.length + " points in " + filled + " cells  \u00b7  grey: quadtree, red: k-d");
    }

    function buildRLeaves(points, cap) {
        var pts = points.slice();
        var n = pts.length;
        if (!n) return [];
        var leafCount = Math.ceil(n / cap);
        var sliceCount = Math.max(1, Math.round(Math.sqrt(leafCount)));
        var perSlice = Math.ceil(n / sliceCount) || 1;
        pts.sort(function (a, b) { return a.x - b.x; });
        var leaves = [];
        for (var s = 0; s < n; s += perSlice) {
            var slice = pts.slice(s, s + perSlice);
            slice.sort(function (a, b) { return a.y - b.y; });
            for (var g = 0; g < slice.length; g += cap) leaves.push(slice.slice(g, g + cap));
        }
        return leaves;
    }
    function renderRKD() {
        clear();
        var leaves = buildRLeaves(state.points, state.rkCap);
        var pad = 5;
        for (var L = 0; L < leaves.length; L++) {
            var grp = leaves[L];
            var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
            for (var i = 0; i < grp.length; i++) {
                if (grp[i].x < minx) minx = grp[i].x;
                if (grp[i].y < miny) miny = grp[i].y;
                if (grp[i].x > maxx) maxx = grp[i].x;
                if (grp[i].y > maxy) maxy = grp[i].y;
            }
            var x0 = minx - pad, y0 = miny - pad, x1 = maxx + pad, y1 = maxy + pad;
            if (state.rkRects) {
                ctx.strokeStyle = SOFT; ctx.lineWidth = 1; ctx.globalAlpha = 0.85;
                ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
                ctx.globalAlpha = 1;
            }
            if (state.rkKd && grp.length > 1) {
                drawKDCell(buildKD(grp.slice(), 0), x0, x1, y0, y1);
            }
        }
        for (var k = 0; k < state.points.length; k++) dot(state.points[k].x, state.points[k].y, 3.5, INK);
        setReadout(state.points.length + " points in " + leaves.length + " rectangles  \u00b7  grey: r-tree MBRs, red: k-d");
    }

    function geohashChar(col, row, parity) {
        var lonBits = parity === 0 ? 3 : 2, latBits = parity === 0 ? 2 : 3;
        var lon = [], lat = [], i;
        for (i = lonBits - 1; i >= 0; i--) lon.push((col >> i) & 1);
        for (i = latBits - 1; i >= 0; i--) lat.push((row >> i) & 1);
        var li = 0, ai = 0, val = 0;
        for (var k = 0; k < 5; k++) {
            var bit = ((parity + k) % 2 === 0) ? lon[li++] : lat[ai++];
            val = (val << 1) | bit;
        }
        return BASE32[val];
    }
    var worldLand = null;
    function mapX(lon) { return M + (lon + 180) / 360 * (W - 2 * M); }
    function mapY(lat) { return M + (90 - lat) / 180 * (H - 2 * M); }
    function drawWorld() {
        if (worldLand) {
            ctx.fillStyle = "rgba(22,22,22,0.08)";
            ctx.strokeStyle = "rgba(22,22,22,0.22)"; ctx.lineWidth = 0.6;
            for (var i = 0; i < worldLand.length; i++) {
                var ring = worldLand[i];
                ctx.beginPath();
                for (var j = 0; j < ring.length; j++) {
                    var x = mapX(ring[j][0]), y = mapY(ring[j][1]);
                    if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.closePath(); ctx.fill(); ctx.stroke();
            }
        }
        ctx.strokeStyle = "rgba(22,22,22,0.06)"; ctx.lineWidth = 1;
        for (var lon = -150; lon < 180; lon += 30) seg(mapX(lon), M, mapX(lon), H - M);
        for (var lat = -60; lat < 90; lat += 30) seg(M, mapY(lat), W - M, mapY(lat));
    }
    function renderGeohash() {
        clear();
        drawWorld();
        var pw = W - 2 * M, ph = H - 2 * M, c, r;
        ctx.strokeStyle = HAIR; ctx.lineWidth = 1;
        for (c = 0; c <= 8; c++) seg(M + c * pw / 8, M, M + c * pw / 8, H - M);
        for (r = 0; r <= 4; r++) seg(M, M + r * ph / 4, W - M, M + r * ph / 4);
        if (state.ghLabels) {
            ctx.fillStyle = SOFT; ctx.font = "12px monospace";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            for (c = 0; c < 8; c++) for (r = 0; r < 4; r++) {
                ctx.fillText(geohashChar(c, r, 0), M + c * pw / 8 + pw / 16, M + (3 - r) * ph / 4 + ph / 8);
            }
        }
        if (state.query) {
            var lonMin = -180, lonMax = 180, latMin = -90, latMax = 90;
            var px = M, py = M, pW = pw, pH = ph, parity = 0, code = "";
            for (var lv = 0; lv < state.ghPrec; lv++) {
                var cols = parity === 0 ? 8 : 4, rows = parity === 0 ? 4 : 8;
                var cw = pW / cols, ch = pH / rows, gc, gr;
                if (lv > 0) {
                    ctx.strokeStyle = "rgba(156,47,39,0.55)"; ctx.lineWidth = 1;
                    ctx.strokeRect(px, py, pW, pH);
                    if (cw >= 4 && ch >= 4) {
                        for (gc = 1; gc < cols; gc++) seg(px + gc * cw, py, px + gc * cw, py + pH);
                        for (gr = 1; gr < rows; gr++) seg(px, py + gr * ch, px + pW, py + gr * ch);
                    }
                }
                var col = clampi(Math.floor((state.qlon - lonMin) / ((lonMax - lonMin) / cols)), 0, cols - 1);
                var row = clampi(Math.floor((state.qlat - latMin) / ((latMax - latMin) / rows)), 0, rows - 1);
                var cellPx = px + col * cw, cellPy = py + (rows - 1 - row) * ch;
                var ch32 = geohashChar(col, row, parity); code += ch32;
                var last = lv === state.ghPrec - 1;
                ctx.fillStyle = last ? "rgba(156,47,39,0.16)" : "rgba(156,47,39,0.05)";
                ctx.fillRect(cellPx, cellPy, cw, ch);
                if (cw >= 14 && ch >= 12) {
                    ctx.fillStyle = ACCENT; ctx.font = "bold 11px monospace";
                    ctx.textAlign = "left"; ctx.textBaseline = "top";
                    ctx.fillText(ch32, cellPx + 2, cellPy + 2);
                }
                var cellLon = (lonMax - lonMin) / cols, cellLat = (latMax - latMin) / rows;
                lonMin = lonMin + col * cellLon; lonMax = lonMin + cellLon;
                latMin = latMin + row * cellLat; latMax = latMin + cellLat;
                px = cellPx; py = cellPy; pW = cw; pH = ch; parity = (parity + 1) % 2;
            }
            ctx.strokeStyle = ACCENT; ctx.lineWidth = 2; ctx.strokeRect(px, py, pW, pH);
            dot(state.query.x, state.query.y, 4, ACCENT);
            setReadout("geohash: " + code + "  (" + state.qlat.toFixed(3) + ", " + state.qlon.toFixed(3) + ")");
        } else {
            setReadout("click the map to geohash a location");
        }
    }

    function setReadout(txt) { document.getElementById("sp-readout").textContent = txt; }

    function render() {
        if (state.structure === "kd") renderKD();
        else if (state.structure === "quadtree") renderQuad();
        else if (state.structure === "hybrid") renderHybrid();
        else if (state.structure === "rkd") renderRKD();
        else renderGeohash();
    }

    function setStructure(s) {
        state.structure = s;
        document.getElementById("sp-title").textContent = TITLE[s];
        document.getElementById("sp-desc").textContent = DESC[s];
        document.getElementById("sp-hint").textContent = HINT[s];
        var tabs = document.querySelectorAll(".sp-tab");
        for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("is-active", tabs[i].getAttribute("data-structure") === s);
        document.getElementById("sp-knobs-kd").hidden = s !== "kd";
        document.getElementById("sp-knobs-quadtree").hidden = s !== "quadtree";
        document.getElementById("sp-knobs-geohash").hidden = s !== "geohash";
        document.getElementById("sp-knobs-hybrid").hidden = s !== "hybrid";
        document.getElementById("sp-knobs-rkd").hidden = s !== "rkd";
        render();
    }

    function setQueryFromPoint(pt) {
        state.query = pt;
        state.qlon = -180 + clampi((pt.x - M) / (W - 2 * M), 0, 1) * 360;
        state.qlat = 90 - clampi((pt.y - M) / (H - 2 * M), 0, 1) * 180;
    }

    canvas.addEventListener("click", function (e) {
        var pt = toLocal(e);
        if (state.structure === "geohash") setQueryFromPoint(pt);
        else state.points.push(pt);
        render();
    });
    canvas.addEventListener("mousemove", function (e) {
        if (state.structure === "kd" && state.kdNN) { state.hover = toLocal(e); render(); }
    });
    canvas.addEventListener("mouseleave", function () { if (state.hover) { state.hover = null; render(); } });

    document.querySelectorAll(".sp-tab").forEach(function (t) {
        t.addEventListener("click", function () { setStructure(this.getAttribute("data-structure")); });
    });

    document.getElementById("sp-random").addEventListener("click", function () {
        if (state.structure === "geohash") {
            setQueryFromPoint({ x: M + Math.random() * (W - 2 * M), y: M + Math.random() * (H - 2 * M) });
        } else {
            for (var i = 0; i < 18; i++) state.points.push({ x: M + Math.random() * (W - 2 * M), y: M + Math.random() * (H - 2 * M) });
        }
        render();
    });
    document.getElementById("sp-clear").addEventListener("click", function () {
        state.points = []; state.query = null; state.hover = null; render();
    });

    document.getElementById("kd-lines").addEventListener("change", function () { state.kdLines = this.checked; render(); });
    document.getElementById("kd-depth").addEventListener("change", function () { state.kdDepth = this.checked; render(); });
    document.getElementById("kd-nn").addEventListener("change", function () { state.kdNN = this.checked; if (!this.checked) state.hover = null; render(); });

    document.getElementById("qt-cap").addEventListener("input", function () {
        state.qtCap = +this.value; document.getElementById("qt-cap-val").textContent = this.value; render();
    });
    document.getElementById("qt-depth").addEventListener("input", function () {
        state.qtDepth = +this.value; document.getElementById("qt-depth-val").textContent = this.value; render();
    });
    document.getElementById("qt-grid").addEventListener("change", function () { state.qtGrid = this.checked; render(); });

    document.getElementById("gh-prec").addEventListener("input", function () {
        state.ghPrec = +this.value; document.getElementById("gh-prec-val").textContent = this.value; render();
    });
    document.getElementById("gh-labels").addEventListener("change", function () { state.ghLabels = this.checked; render(); });

    document.getElementById("hy-cap").addEventListener("input", function () {
        state.hyCap = +this.value; document.getElementById("hy-cap-val").textContent = this.value; render();
    });
    document.getElementById("hy-depth").addEventListener("input", function () {
        state.hyDepth = +this.value; document.getElementById("hy-depth-val").textContent = this.value; render();
    });
    document.getElementById("hy-cells").addEventListener("change", function () { state.hyCells = this.checked; render(); });
    document.getElementById("hy-kd").addEventListener("change", function () { state.hyKd = this.checked; render(); });

    document.getElementById("rk-cap").addEventListener("input", function () {
        state.rkCap = +this.value; document.getElementById("rk-cap-val").textContent = this.value; render();
    });
    document.getElementById("rk-rects").addEventListener("change", function () { state.rkRects = this.checked; render(); });
    document.getElementById("rk-kd").addEventListener("change", function () { state.rkKd = this.checked; render(); });

    setStructure("kd");

    fetch("./assets/demos/geohash/world-land.json")
        .then(function (r) { return r.json(); })
        .then(function (d) { worldLand = d; if (state.structure === "geohash") render(); })
        .catch(function () { });
})();
