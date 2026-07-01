(function () {
    "use strict";
    if (typeof document === "undefined") return;

    var INK = "#161616", SOFT = "#b9b9b9", HAIR = "#dcdcdc", ACCENT = "#9c2f27";
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ratio = window.devicePixelRatio || 1;

    var previews = [];

    function fit(cv) {
        var r = cv.getBoundingClientRect();
        var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
        if (cv.width !== w * ratio || cv.height !== h * ratio) {
            cv.width = w * ratio; cv.height = h * ratio;
        }
        return { w: w, h: h };
    }

    function ellipse(ctx, cx, cy, rx, ry) {
        rx = Math.max(0.4, rx);
        ctx.beginPath();
        if (ctx.ellipse) ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        else { ctx.save(); ctx.translate(cx, cy); ctx.scale(rx / ry, 1); ctx.arc(0, 0, ry, 0, 2 * Math.PI); ctx.restore(); }
        ctx.stroke();
    }

    function drawGlobe(ctx, size, phase) {
        var w = size.w, h = size.h;
        ctx.save();
        ctx.scale(ratio, ratio);
        ctx.clearRect(0, 0, w, h);
        var cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 8;

        ctx.strokeStyle = SOFT; ctx.lineWidth = 0.7;
        for (var lat = -60; lat <= 60; lat += 30) {
            var y = cy - R * Math.sin(lat * Math.PI / 180);
            var hw = R * Math.cos(lat * Math.PI / 180);
            ctx.beginPath(); ctx.moveTo(cx - hw, y); ctx.lineTo(cx + hw, y); ctx.stroke();
        }

        var N = 6;
        for (var k = 0; k < N; k++) {
            var ang = phase + k * Math.PI / N;
            var rx = R * Math.cos(ang);
            var front = Math.sin(ang) >= 0;
            ctx.strokeStyle = (k === 0) ? ACCENT : (front ? INK : HAIR);
            ctx.lineWidth = (k === 0) ? 1.1 : 0.7;
            ellipse(ctx, cx, cy, Math.abs(rx), R);
        }

        ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
        ctx.restore();
    }

    function makePreview(cv) {
        var ctx = cv.getContext("2d");
        var p = {
            cv: cv, ctx: ctx, size: fit(cv), visible: true,
            draw: function (t) { drawGlobe(ctx, this.size, t * 0.5 + 0.6); },
            resize: function () { this.size = fit(cv); }
        };
        p.draw(0);
        return p;
    }

    var canvases = document.querySelectorAll(".np-play-canvas");
    if (!canvases.length) return;
    for (var i = 0; i < canvases.length; i++) previews.push(makePreview(canvases[i]));

    var lastT = 0;
    var resizeTimer = null;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            for (var j = 0; j < previews.length; j++) { previews[j].resize(); previews[j].draw(lastT); }
        }, 150);
    });

    if (reduce) return;

    if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                for (var j = 0; j < previews.length; j++) if (previews[j].cv === e.target) previews[j].visible = e.isIntersecting;
            });
        }, { threshold: 0.05 });
        for (var m = 0; m < previews.length; m++) io.observe(previews[m].cv);
    }

    var start = null;
    function frame(now) {
        if (start == null) start = now;
        lastT = (now - start) / 1000;
        for (var j = 0; j < previews.length; j++) if (previews[j].visible) previews[j].draw(lastT);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
