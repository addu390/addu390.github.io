(function () {
    "use strict";

    var av = document.getElementById("ab-avatar");
    if (av) {
        var name = "addu390";
        var h = 0;
        for (var ci = 0; ci < name.length; ci++) h = (Math.imul(h, 31) + name.charCodeAt(ci)) | 0;
        h = h >>> 0;
        var reds = ["#d97b70", "#b23c31", "#9c2f27", "#7f1d17"];
        var color = reds[h % reds.length];
        var svg = '<svg viewBox="0 0 5 5" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">';
        for (var col = 0; col < 3; col++) {
            for (var row = 0; row < 5; row++) {
                if ((h >> (col * 5 + row)) & 1) {
                    svg += '<rect x="' + col + '" y="' + row + '" width="1" height="1" fill="' + color + '"/>';
                    if (col < 2) svg += '<rect x="' + (4 - col) + '" y="' + row + '" width="1" height="1" fill="' + color + '"/>';
                }
            }
        }
        av.innerHTML = svg + "</svg>";
    }

    var cells = document.getElementById("ab-cells");
    var months = document.getElementById("ab-months");
    if (!cells) return;

    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    var rand = mulberry32(20170523);
    var WEEKS = 53;
    var CELL = 16;

    var today = new Date();
    var start = new Date(today);
    start.setDate(start.getDate() - (WEEKS - 1) * 7 - today.getDay());

    var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var lastMonth = -1;
    var monthSpans = [];
    for (var w = 0; w < WEEKS; w++) {
        var d = new Date(start);
        d.setDate(d.getDate() + w * 7);
        var m = d.getMonth();
        if (m !== lastMonth) {
            monthSpans.push({ label: MON[m], week: w });
            lastMonth = m;
        }
    }
    var frag = document.createDocumentFragment();
    for (var i = 0; i < monthSpans.length; i++) {
        var span = document.createElement("span");
        var next = (i + 1 < monthSpans.length) ? monthSpans[i + 1].week : WEEKS;
        span.style.width = (next - monthSpans[i].week) * CELL + "px";
        span.textContent = (next - monthSpans[i].week) >= 3 ? monthSpans[i].label : "";
        frag.appendChild(span);
    }
    months.appendChild(frag);

    var cf = document.createDocumentFragment();
    for (var week = 0; week < WEEKS; week++) {
        for (var day = 0; day < 7; day++) {
            var r = rand();
            var lvl = r < 0.52 ? 0 : r < 0.72 ? 1 : r < 0.87 ? 2 : r < 0.96 ? 3 : 4;
            var when = new Date(start);
            when.setDate(when.getDate() + week * 7 + day);
            if (when > today) lvl = 0;
            var cell = document.createElement("div");
            cell.className = "ab-cell";
            cell.style.background = "var(--np-cell" + lvl + ")";
            cell.style.transitionDelay = (week * 12) + "ms";
            var n = lvl === 0 ? 0 : lvl * 3 + Math.floor(rand() * 4);
            cell.title = (n === 0 ? "No commits" : n + " commits") + " on " + when.toDateString();
            cf.appendChild(cell);
        }
    }
    cells.appendChild(cf);

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
        cells.classList.remove("ab-anim");
    } else if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { if (e.isIntersecting) { cells.classList.add("ab-in"); io.disconnect(); } });
        }, { threshold: 0.2 });
        io.observe(cells);
    } else {
        cells.classList.add("ab-in");
    }
})();
