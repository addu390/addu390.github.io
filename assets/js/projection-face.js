(function () {
    "use strict";
    if (typeof d3 === "undefined") return;

    var INK = "#161616", SOFT = "#cfcfcf", ACCENT = "#9c2f27", ACCENT_TINT = "rgba(156,47,39,0.10)";

    var ratio = window.devicePixelRatio || 1,
        BASEW = 630 * 1.3,
        width = BASEW * ratio,
        height = 450 * 1.3 * ratio;

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    var options = [
        { name: "Natural Earth (Default)", projection: d3.geo.naturalEarth() },
        { name: "Aitoff", projection: d3.geo.aitoff() },
        { name: "Albers", projection: d3.geo.albers().scale(145).parallels([20, 50]) },
        { name: "August", projection: d3.geo.august().scale(60) },
        { name: "Baker", projection: d3.geo.baker().scale(100) },
        { name: "Berghaus", projection: d3.geo.berghaus().scale(100) },
        { name: "Boggs", projection: d3.geo.boggs() },
        { name: "Bonne", projection: d3.geo.bonne().scale(100) },
        { name: "Bromley", projection: d3.geo.bromley() },
        { name: "Collignon", projection: d3.geo.collignon().scale(93) },
        { name: "Craster Parabolic", projection: d3.geo.craster() },
        { name: "Eckert I", projection: d3.geo.eckert1().scale(165) },
        { name: "Eckert II", projection: d3.geo.eckert2().scale(165) },
        { name: "Eckert III", projection: d3.geo.eckert3().scale(180) },
        { name: "Eckert IV", projection: d3.geo.eckert4().scale(180) },
        { name: "Eckert V", projection: d3.geo.eckert5().scale(170) },
        { name: "Eckert VI", projection: d3.geo.eckert6().scale(170) },
        { name: "Eisenlohr", projection: d3.geo.eisenlohr().scale(60) },
        { name: "Equirectangular (Plate Carrée)", projection: d3.geo.equirectangular() },
        { name: "Fahey", projection: d3.geo.fahey().scale(120) },
        { name: "Gall Stereographic", projection: d3.geo.cylindricalStereographic().parallel(45).scale(140) },
        { name: "Goode Homolosine", projection: d3.geo.homolosine() },
        { name: "Ginzburg IV", projection: d3.geo.ginzburg4().scale(120) },
        { name: "Ginzburg V", projection: d3.geo.ginzburg5().scale(120) },
        { name: "Ginzburg VI", projection: d3.geo.ginzburg6().scale(120) },
        { name: "Ginzburg VIII", projection: d3.geo.ginzburg8().scale(120) },
        { name: "Ginzburg IX", projection: d3.geo.ginzburg9().scale(120) },
        { name: "Gringorten", projection: d3.geo.gringorten().scale(220) },
        { name: "Guyou", projection: d3.geo.guyou().scale(150) },
        { name: "Hammer", projection: d3.geo.hammer().scale(165) },
        { name: "Hammer Retroazimuthal", projection: d3.geo.hammerRetroazimuthal().scale(90) },
        { name: "HEALPix", projection: d3.geo.healpix() },
        { name: "Hill", projection: d3.geo.hill().scale(120) },
        { name: "Kavrayskiy VII", projection: d3.geo.kavrayskiy7() },
        { name: "Lagrange", projection: d3.geo.lagrange().scale(120) },
        { name: "Lambert cylindrical equal-area", projection: d3.geo.cylindricalEqualArea() },
        { name: "Larrivée", projection: d3.geo.larrivee().scale(95) },
        { name: "Laskowski", projection: d3.geo.laskowski().scale(120) },
        { name: "Loximuthal", projection: d3.geo.loximuthal() },
        { name: "Mercator", projection: d3.geo.mercator().scale(100) },
        { name: "Miller", projection: d3.geo.miller().scale(100) },
        { name: "McBryde–Thomas Flat-Polar Parabolic", projection: d3.geo.mtFlatPolarParabolic() },
        { name: "McBryde–Thomas Flat-Polar Quartic", projection: d3.geo.mtFlatPolarQuartic() },
        { name: "McBryde–Thomas Flat-Polar Sinusoidal", projection: d3.geo.mtFlatPolarSinusoidal() },
        { name: "Mollweide", projection: d3.geo.mollweide().scale(165) },
        { name: "Natural Earth", projection: d3.geo.naturalEarth() },
        { name: "Nell–Hammer", projection: d3.geo.nellHammer() },
        { name: "Orthographic", projection: d3.geo.orthographic().scale(200).clipAngle(90) },
        { name: "Polyconic", projection: d3.geo.polyconic().scale(100) },
        { name: "Rectangular Polyconic", projection: d3.geo.rectangularPolyconic().scale(120) },
        { name: "Robinson", projection: d3.geo.robinson() },
        { name: "Sinusoidal", projection: d3.geo.sinusoidal() },
        { name: "Sinu-Mollweide", projection: d3.geo.sinuMollweide() },
        { name: "Stereographic", projection: d3.geo.stereographic().clipAngle(120) },
        { name: "Times", projection: d3.geo.times().scale(140) },
        { name: "Van der Grinten", projection: d3.geo.vanDerGrinten().scale(75) },
        { name: "Van der Grinten II", projection: d3.geo.vanDerGrinten2().scale(75) },
        { name: "Van der Grinten III", projection: d3.geo.vanDerGrinten3().scale(75) },
        { name: "Van der Grinten IV", projection: d3.geo.vanDerGrinten4().scale(120) },
        { name: "Wagner IV", projection: d3.geo.wagner4() },
        { name: "Wagner VI", projection: d3.geo.wagner6() },
        { name: "Wagner VII", projection: d3.geo.wagner7() },
        { name: "Waterman", projection: d3.geo.polyhedron.waterman().scale(70) },
        { name: "Winkel Tripel", projection: d3.geo.winkel3() }
    ];

    var descriptions = {
        "Orthographic": "The view from space — one hemisphere at a time. Drag to spin it.",
        "Waterman": "Steve Waterman's butterfly, unfolding the globe from a polyhedron.",
        "Winkel Tripel": "National Geographic's world map; balances area, direction and distance.",
        "Robinson": "A hand-tuned compromise that simply looks right.",
        "Mollweide": "An equal-area ellipse, ideal for global distributions.",
        "Mercator": "Conformal and famous for navigation — and for inflating the poles.",
        "HEALPix": "An equal-area scheme born in cosmology, tiling the sphere.",
        "Hammer": "Equal-area and elliptical, with gentler shape distortion than Mollweide.",
        "Van der Grinten": "The whole world in a circle — the old National Geographic look.",
        "Guyou": "Peirce-style: the sphere folded into squares.",
        "Aitoff": "The azimuthal cousin that inspired the Winkel Tripel.",
        "Natural Earth (Default)": "A rounded compromise projection designed for world maps."
    };

    var featuredNames = [
        "Orthographic", "Waterman", "Winkel Tripel", "Robinson", "Mollweide", "Mercator",
        "HEALPix", "Hammer", "Van der Grinten", "Guyou", "Aitoff", "Natural Earth (Default)"
    ];

    function indexOfName(name) {
        for (var k = 0; k < options.length; k++) if (options[k].name === name) return k;
        return 0;
    }

    var graticule = d3.geo.graticule()();
    var face = null;
    var rotation = [0, 0];
    var current = indexOfName("Orthographic");
    var transitioning = false, dragging = false, autorotate = false;
    var showGrat = true, showSphere = true, showFace = true;

    options.forEach(function (o) { o.origScale = o.projection.scale(); });
    options.forEach(function (option) {
        option.projection
            .translate([width / 2, height / 2])
            .scale(option.origScale * ratio)
            .clipExtent([[2 * ratio, 2 * ratio], [width - 2 * ratio, height - 2 * ratio]]);
    });

    var projection = options[current].projection;

    var menu = d3.select("#projection-menu").on("change", function () { select(this.selectedIndex, true); });
    menu.selectAll("option").data(options).enter().append("option").text(function (d) { return d.name; });

    var canvas = d3.select("#map").append("canvas")
        .attr("width", width)
        .attr("height", height)
        .style("width", width / ratio + "px")
        .style("height", height / ratio + "px");

    var context = canvas.node().getContext("2d");
    var path = d3.geo.path().projection(projection).context(context);

    function descFor(name) {
        return descriptions[name] || ("The sphere, graticule and S2 cube face under the " + name + " projection.");
    }

    function drawInto(ctx, pathGen, w, h) {
        ctx.clearRect(0, 0, w, h);
        if (showGrat) {
            ctx.lineWidth = 0.5 * ratio;
            ctx.strokeStyle = SOFT;
            ctx.beginPath(); pathGen(graticule); ctx.stroke();
        }
        if (showSphere) {
            ctx.lineWidth = 1 * ratio;
            ctx.strokeStyle = INK;
            ctx.beginPath(); pathGen({ type: "Sphere" }); ctx.stroke();
        }
        if (showFace && face) {
            ctx.beginPath(); pathGen(face);
            ctx.fillStyle = ACCENT_TINT; ctx.fill();
            ctx.lineWidth = 2 * ratio; ctx.strokeStyle = ACCENT; ctx.stroke();
        }
    }

    function redraw(pathGen) { drawInto(context, pathGen, width, height); }

    function pathTween(projection0, projection1) {
        var t = 0,
            proj = d3.geo.projection(function (λ, φ) {
                λ *= 180 / Math.PI, φ *= 180 / Math.PI;
                var p0 = projection0([λ, φ]), p1 = projection1([λ, φ]);
                return [(1 - t) * p0[0] + t * p1[0], (1 - t) * -p0[1] + t * -p1[1]];
            }).scale(1).translate([width / 2, height / 2]).clipExtent(projection0.clipExtent()),
            tweenPath = d3.geo.path().projection(proj).context(context);
        return function () { return function (u) { t = u; redraw(tweenPath); }; };
    }

    function update(option) {
        transitioning = true;
        option.projection.rotate(rotation);
        projection.rotate(rotation);
        canvas.transition()
            .duration(750)
            .ease(d3.ease("quad"))
            .tween("path", pathTween(projection, projection = option.projection))
            .each("end", function () {
                transitioning = false;
                path.projection(projection);
                redraw(path);
            });
        path.projection(projection);
    }

    function select(index, animate) {
        current = index;
        menu.property("selectedIndex", index);
        var name = options[index].name;
        d3.select("#pf-name").text(name);
        d3.select("#pf-desc").text(descFor(name));
        d3.selectAll(".pf-card").classed("is-active", function () {
            return +this.getAttribute("data-index") === index;
        });
        if (animate) {
            update(options[index]);
        } else {
            projection = options[index].projection;
            projection.rotate(rotation);
            path.projection(projection);
            redraw(path);
        }
    }

    function drawMini(cv, option) {
        var mctx = cv.getContext("2d");
        var mw = cv.width, mh = cv.height;
        var proj = option.projection;
        var bt = proj.translate(), bs = proj.scale(), bc = proj.clipExtent ? proj.clipExtent() : null, br = proj.rotate();
        proj.rotate([0, 0]).translate([mw / 2, mh / 2]).scale(option.origScale * mw / BASEW);
        if (proj.clipExtent) proj.clipExtent([[0, 0], [mw, mh]]);
        var mpath = d3.geo.path().projection(proj).context(mctx);
        mctx.clearRect(0, 0, mw, mh);
        mctx.lineWidth = 0.5 * ratio; mctx.strokeStyle = SOFT;
        mctx.beginPath(); mpath(graticule); mctx.stroke();
        mctx.lineWidth = 0.9 * ratio; mctx.strokeStyle = INK;
        mctx.beginPath(); mpath({ type: "Sphere" }); mctx.stroke();
        if (face) {
            mctx.beginPath(); mpath(face);
            mctx.fillStyle = ACCENT_TINT; mctx.fill();
            mctx.lineWidth = 1.4 * ratio; mctx.strokeStyle = ACCENT; mctx.stroke();
        }
        proj.rotate(br).translate(bt).scale(bs);
        if (bc && proj.clipExtent) proj.clipExtent(bc);
    }

    var featuredCards = [];
    (function buildFeatured() {
        var host = d3.select("#pf-featured");
        var mw = 104, mh = 74;
        featuredNames.forEach(function (name) {
            var idx = indexOfName(name);
            var card = host.append("div").attr("class", "pf-card").attr("data-index", idx)
                .on("click", function () { select(idx, true); });
            var cv = card.append("canvas")
                .attr("width", mw * ratio).attr("height", mh * ratio)
                .style("width", mw + "px").style("height", mh + "px").node();
            card.append("div").attr("class", "pf-card-label").text(name.replace(" (Default)", ""));
            featuredCards.push({ canvas: cv, option: options[idx], index: idx });
        });
    })();

    function stepBy(delta) {
        var n = options.length;
        select(((current + delta) % n + n) % n, true);
    }
    d3.select("#pf-prev").on("click", function () { stepBy(-1); });
    d3.select("#pf-next").on("click", function () { stepBy(1); });
    d3.select("#pf-shuffle").on("click", function () {
        var j = current;
        while (j === current) j = Math.floor(Math.random() * options.length);
        select(j, true);
    });

    d3.select("#pf-grat").on("change", function () { showGrat = this.checked; if (!transitioning) redraw(path); });
    d3.select("#pf-sphere").on("change", function () { showSphere = this.checked; if (!transitioning) redraw(path); });
    d3.select("#pf-face").on("change", function () { showFace = this.checked; if (!transitioning) redraw(path); });
    d3.select("#pf-rotate").on("change", function () {
        autorotate = this.checked;
        if (autorotate) d3.timer(tick);
    });

    function tick() {
        if (!autorotate) return true;
        if (!transitioning && !dragging) {
            rotation[0] = (rotation[0] + 0.3) % 360;
            projection.rotate([rotation[0], rotation[1]]);
            redraw(path);
        }
        return false;
    }

    var lastX = 0, lastY = 0;
    canvas.on("mousedown", function () {
        d3.event.preventDefault(); dragging = true;
        lastX = d3.event.clientX; lastY = d3.event.clientY;
    });
    canvas.on("touchstart", function () {
        var t = d3.event.touches[0]; if (!t) return;
        d3.event.preventDefault(); dragging = true;
        lastX = t.clientX; lastY = t.clientY;
    });
    canvas.on("touchmove", function () {
        if (!dragging) return; var t = d3.event.touches[0]; if (!t) return;
        d3.event.preventDefault(); dragMove(t.clientX, t.clientY);
    });
    canvas.on("touchend", function () { dragging = false; });
    d3.select(window)
        .on("mousemove.pf", function () { if (dragging) dragMove(d3.event.clientX, d3.event.clientY); })
        .on("mouseup.pf", function () { dragging = false; });

    function dragMove(cx, cy) {
        var dx = cx - lastX, dy = cy - lastY;
        lastX = cx; lastY = cy;
        rotation[0] = (rotation[0] + dx * 0.4) % 360;
        rotation[1] = clamp(rotation[1] - dy * 0.4, -90, 90);
        if (!transitioning) {
            projection.rotate([rotation[0], rotation[1]]);
            redraw(path);
        }
    }

    d3.json("./assets/demos/geohash/face.geojson", function (error, data) {
        face = data;
        featuredCards.forEach(function (c) { drawMini(c.canvas, c.option); });
        select(current, false);
    });
})();
