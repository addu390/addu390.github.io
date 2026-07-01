(function () {
  "use strict";
  if (typeof document === "undefined" || !window.requestAnimationFrame) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var SVGNS = "http://www.w3.org/2000/svg";

  function lerp(a, b, t) { return a + (b - a) * t; }

  function initArt(container, svg, mode) {
    var vb = svg.viewBox && svg.viewBox.baseVal;
    var W = (vb && vb.width) || 160;
    var H = (vb && vb.height) || 100;

    var shift = document.createElementNS(SVGNS, "g");
    while (svg.firstChild) shift.appendChild(svg.firstChild);
    svg.appendChild(shift);

    var boxLayer = null, boxCx = W / 2, boxCy = H / 2;
    if (mode === "chase" || mode === "drift") {
      var deco = [];
      Array.prototype.forEach.call(shift.children, function (el) {
        if (el.tagName && el.tagName.toLowerCase() !== "circle") deco.push(el);
      });
      if (deco.length) {
        boxLayer = document.createElementNS(SVGNS, "g");
        shift.insertBefore(boxLayer, deco[0]);
        deco.forEach(function (el) { boxLayer.appendChild(el); });
        try {
          var bb = boxLayer.getBBox();
          if (bb.width || bb.height) { boxCx = bb.x + bb.width / 2; boxCy = bb.y + bb.height / 2; }
        } catch (e) { }
      }
    }

    var dots = Array.prototype.map.call(shift.querySelectorAll("circle"), function (c) {
      return {
        el: c,
        cx: parseFloat(c.getAttribute("cx")),
        cy: parseFloat(c.getAttribute("cy")),
        r: parseFloat(c.getAttribute("r")),
        o: parseFloat(c.getAttribute("opacity") || "1")
      };
    });
    if (!dots.length) return;

    var sigma = Math.min(W, H) * 0.26;
    var twoSig2 = 2 * sigma * sigma;
    var parallax = W * 0.028;
    var boxDrift = W * 0.06;
    var chaseK = 0.4;
    var chaseCap = W * 0.16;
    var pull = 1.6;
    var grow = 0.95;

    var tx = W / 2, ty = H / 2, px = tx, py = ty;
    var targetAmp = 0, amp = 0;
    var running = false;

    function toLocal(e) {
      var rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      tx = (e.clientX - rect.left) / rect.width * W;
      ty = (e.clientY - rect.top) / rect.height * H;
    }

    function rest() {
      shift.removeAttribute("transform");
      if (boxLayer) boxLayer.removeAttribute("transform");
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.el.removeAttribute("transform");
        d.el.setAttribute("r", d.r);
        d.el.setAttribute("opacity", d.o);
      }
    }

    function frame() {
      px = lerp(px, tx, 0.18);
      py = lerp(py, ty, 0.18);
      amp = lerp(amp, targetAmp, 0.12);

      if (targetAmp === 0 && amp < 0.004) {
        rest();
        running = false;
        return;
      }

      var nx = (px - W / 2) / (W / 2);
      var ny = (py - H / 2) / (H / 2);
      shift.setAttribute("transform", "translate(" + (nx * parallax * amp).toFixed(2) + "," + (ny * parallax * amp).toFixed(2) + ")");
      if (boxLayer) {
        var bx, by;
        if (mode === "chase") {
          bx = (px - boxCx) * chaseK;
          by = (py - boxCy) * chaseK;
          var m = Math.sqrt(bx * bx + by * by);
          if (m > chaseCap) { bx = bx / m * chaseCap; by = by / m * chaseCap; }
          bx *= amp; by *= amp;
        } else {
          bx = nx * boxDrift * amp;
          by = ny * boxDrift * amp;
        }
        boxLayer.setAttribute("transform", "translate(" + bx.toFixed(2) + "," + by.toFixed(2) + ")");
      }

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var dx = px - d.cx, dy = py - d.cy;
        var dist2 = dx * dx + dy * dy;
        var f = Math.exp(-dist2 / twoSig2) * amp;
        if (f < 0.004) {
          d.el.removeAttribute("transform");
          d.el.setAttribute("r", d.r);
          d.el.setAttribute("opacity", d.o);
          continue;
        }
        var dist = Math.sqrt(dist2) || 1;
        var sx = (dx / dist) * pull * f;
        var sy = (dy / dist) * pull * f;
        d.el.setAttribute("transform", "translate(" + sx.toFixed(2) + "," + sy.toFixed(2) + ")");
        d.el.setAttribute("r", (d.r * (1 + grow * f)).toFixed(2));
        d.el.setAttribute("opacity", (d.o + (1 - d.o) * f).toFixed(3));
      }
      requestAnimationFrame(frame);
    }

    function start() {
      if (!running) { running = true; requestAnimationFrame(frame); }
    }

    container.addEventListener("pointerenter", function (e) { toLocal(e); targetAmp = 1; start(); });
    container.addEventListener("pointermove", function (e) { toLocal(e); targetAmp = 1; start(); });
    container.addEventListener("pointerleave", function () { targetAmp = 0; start(); });
  }

  function modeFor(src) {
    if (/grid-systems|tessellation/.test(src)) return "chase";
    if (/space-filling/.test(src)) return "none";
    return "drift";
  }

  function inline(img) {
    var src = img.getAttribute("src");
    if (!src) return;
    var mode = modeFor(src);
    fetch(src).then(function (r) {
      if (!r.ok) throw new Error("fetch failed");
      return r.text();
    }).then(function (txt) {
      var svg = new DOMParser().parseFromString(txt, "image/svg+xml").querySelector("svg");
      if (!svg) return;
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("class", "np-series-svg");
      svg.setAttribute("aria-hidden", "true");
      var container = img.parentNode;
      container.replaceChild(svg, img);
      initArt(container, svg, mode);
    }).catch(function () { });
  }

  function run() {
    var imgs = document.querySelectorAll(".np-series-art img");
    Array.prototype.forEach.call(imgs, inline);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
