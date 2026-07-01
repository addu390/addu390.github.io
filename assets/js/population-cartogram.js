(function () {
    "use strict";
    if (typeof d3 === "undefined") return;

    var hexbin = (typeof d3.hexbin === "function") ? d3.hexbin : (window.d3 && window.d3.hexbin);
    var topoFeature = (typeof topojson !== "undefined") ? topojson.feature : null;
    if (!hexbin || !topoFeature) return;

    var colors = [
        "#7f1d17", "#b23c31", "#c8794f", "#d9a441", "#8a8f4a", "#4f7a5b",
        "#3f6f78", "#3a5a80", "#5b5b8a", "#6b4a6e", "#8a5a4a", "#a86f5a",
        "#5c6b73", "#7d7461", "#9c8a5a", "#6f8f6a", "#4a6a6a", "#834a4a",
        "#6a6a6a", "#454545"
    ];
    var margin = { top: 15, right: 10, bottom: 15, left: 10 };
    var width = 1350 - margin.left - margin.right;
    var height = 750 - margin.top - margin.bottom;
    var strokeWidth = 0.5;
    var BASE_FILL = "#ffffff", BASE_STROKE = "#e2ddd4", CELL_STROKE = "#1a1a1a";
    var cellAction = { Add: "Add", Remove: "Remove" };
    var cellPolygon = { Hexagon: "Hexagon", Square: "Square" };
    var outputFileType = { SVG: "SVG", GeoJSON: "GeoJSON", CSV: "CSV" };
    var cellScale = { Fixed: "Fixed", Fluid: "Fluid" };

    function getTotalPopulation(data, year) {
        var total = 0;
        for (var x in data) {
            var count = data[x][year];
            if (!isNaN(count)) total += Number(data[x][year]);
        }
        return total;
    }
    function cosArctan(dx, dy) {
        if (dy === 0) return 0;
        var div = dx / dy;
        return dy > 0 ? 1 / Math.sqrt(1 + div * div) : -1 / Math.sqrt(1 + div * div);
    }
    function sinArctan(dx, dy) {
        if (dy === 0) return 1;
        var div = dx / dy;
        return dy > 0 ? div / Math.sqrt(1 + div * div) : -div / Math.sqrt(1 + div * div);
    }
    function reverse(array, n) {
        var t, j = array.length, i = j - n;
        while (i < --j) (t = array[i]), (array[i++] = array[j]), (array[j] = t);
    }
    function copyTopo(o) {
        return o instanceof Array
            ? o.map(copyTopo)
            : (typeof o === "string" || typeof o === "number") ? o : copyObject(o);
    }
    function copyObject(o) {
        var obj = {};
        for (var k in o) obj[k] = copyTopo(o[k]);
        return obj;
    }

    function rightRoundedRect(x, y, w, h, radius) {
        return "M" + x + "," + y + "h" + (w - radius) + "a" + radius + "," + radius +
            " 0 0 1 " + radius + "," + radius + "v" + (h - 2 * radius) + "a" + radius + "," +
            radius + " 0 0 1 " + -radius + "," + radius + "h" + (radius - w) + "z";
    }
    function getRadius(radius, cellShape) {
        switch (cellShape) {
            case cellPolygon.Hexagon: return radius * 1.5;
            case cellPolygon.Square: return radius * 2;
        }
    }
    function getGridData(cellShape, bin, grid) {
        switch (cellShape) {
            case cellPolygon.Hexagon: return bin(grid);
            case cellPolygon.Square: return grid;
        }
    }
    function getPath(cellShape, bin, distance) {
        switch (cellShape) {
            case cellPolygon.Hexagon: return bin.hexagon();
            case cellPolygon.Square:
                return function (d) { return rightRoundedRect(d.x / 2, d.y / 2, distance, distance, 0); };
        }
    }
    function getTransformation(cellShape) {
        switch (cellShape) {
            case cellPolygon.Hexagon:
                return function (d) { return "translate(" + d.x + ", " + d.y + ")"; };
            case cellPolygon.Square:
                return function (d) { return "translate(" + d.x / 2 + ", " + d.y / 2 + ")"; };
        }
    }
    function getNearestSlot(x, y, n, cellShape) {
        var gridx, gridy, sx, sy;
        switch (cellShape) {
            case cellPolygon.Hexagon:
                var factor = Math.sqrt(3) / 2, d = n * 2;
                sx = d * factor; sy = n * 3;
                if (y % sy < n) { gridy = y - (y % sy); gridx = x - (x % sx); }
                else { gridy = y + (d - (n * factor) / 2) - (y % sy); gridx = x + n * factor - (x % sx); }
                return [gridx, gridy];
            case cellPolygon.Square:
                sx = n * 2; sy = n * 2;
                gridy = y - (y % sy); gridx = x - (x % sx);
                return [gridx, gridy];
        }
    }

    function cellDrag() {
        return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended).clickDistance(8);
    }

    var tip = null;
    function nameForClass(cls) {
        var code = (cls && cls.indexOf("hex") === 0) ? cls.slice(3) : null;
        return code != null ? nameByCode[code] : null;
    }
    function positionTip(event) {
        if (!tip || !tip.parentNode) return;
        var rect = tip.parentNode.getBoundingClientRect();
        tip.style.left = (event.clientX - rect.left) + "px";
        tip.style.top = (event.clientY - rect.top) + "px";
    }
    function mover(event) {
        if (highlightOn) {
            d3.selectAll(".pc-countries path").style("fill-opacity", 0.5);
            d3.selectAll("." + this.getAttribute("class")).style("fill-opacity", 1);
        }
        if (tip) {
            var name = nameForClass(this.getAttribute("class"));
            if (name) { tip.textContent = name; tip.hidden = false; positionTip(event); }
            else tip.hidden = true;
        }
    }
    function movetip(event) { positionTip(event); }
    function mout() {
        d3.selectAll(".pc-countries path").style("fill-opacity", 1);
        if (tip) tip.hidden = true;
    }
    function mclickBase() {
        var selectElement = document.querySelector("#cell-action");
        switch (selectElement.value) {
            case cellAction.Remove:
                d3.select(this).style("fill", BASE_FILL).style("stroke", BASE_STROKE).style("stroke-width", strokeWidth).lower();
                break;
            case cellAction.Add:
                var colorElement = document.querySelector("#cell-color");
                d3.select(this).style("stroke-width", strokeWidth).style("fill", colorElement.value).style("stroke", CELL_STROKE)
                    .on("mouseover", mover).on("mouseout", mout)
                    .call(cellDrag()).raise();
                break;
        }
    }
    function removeCell(node) {
        var rx = node.getAttribute("x"), ry = node.getAttribute("y");
        if (rx != null && ry != null) {
            d3.selectAll(".pc-countries path").filter(function () {
                return this.getAttribute("x") === rx && this.getAttribute("y") === ry;
            }).remove();
        } else {
            d3.select(node).style("fill", BASE_FILL).style("stroke", BASE_STROKE).style("stroke-width", strokeWidth).lower();
        }
    }

    function dragstarted(event, d) {
        if (document.querySelector("#cell-action").value === cellAction.Remove) {
            removeCell(this);
            return;
        }
        var color = document.querySelector("#cell-color").value;
        d.fixed = false;
        d3.select(this).raise().style("fill", color).style("stroke", CELL_STROKE).style("stroke-width", 1)
            .on("mouseover", mover).on("mousemove", movetip).on("mouseout", mout);
    }
    function dragged(event, d) {
        if (document.querySelector("#cell-action").value === cellAction.Remove) return;
        var cellShape = document.querySelector("#cell-shape").value;
        var hexRadius = document.querySelector("input#radius").value;
        var grids = getNearestSlot(event.x, event.y, hexRadius, cellShape);
        d3.select(this).attr("x", (d.x = grids[0])).attr("y", (d.y = grids[1])).attr("transform", getTransformation(cellShape));
    }
    function dragended(event, d) {
        if (!this.isConnected) return;
        d.fixed = true;
        d3.select(this).style("stroke-width", strokeWidth).style("stroke", CELL_STROKE);
    }

    function makeCartogram() {
        var iterations = 8,
            projection = d3.geoAlbers(),
            properties = function () { return {}; },
            value = function () { return 1; };

        function cartogram(topology, geometries, cellDetails, populationData, year) {
            topology = copyTopo(topology);
            var tf = transformer(topology.transform),
                x, y, len1, i1, out1,
                len2 = topology.arcs.length, i2 = 0,
                projectedArcs = new Array(len2);
            while (i2 < len2) {
                x = 0; y = 0;
                len1 = topology.arcs[i2].length; i1 = 0;
                out1 = new Array(len1);
                while (i1 < len1) {
                    topology.arcs[i2][i1][0] = x += topology.arcs[i2][i1][0];
                    topology.arcs[i2][i1][1] = y += topology.arcs[i2][i1][1];
                    out1[i1] = projection === null ? tf(topology.arcs[i2][i1]) : projection(tf(topology.arcs[i2][i1]));
                    i1++;
                }
                projectedArcs[i2++] = out1;
            }

            var path = d3.geoPath().projection(null);
            var objects = object(projectedArcs, { type: "GeometryCollection", geometries: geometries }).geometries.map(function (geom) {
                return { type: "Feature", id: geom.id, properties: properties.call(null, geom, topology), geometry: geom };
            });

            var values = objects.map(value), totalValue = d3.sum(values);
            var pFactor = populationFactor(cellDetails.scale, populationData, year);
            if (iterations <= 0) return objects;

            var i = 0;
            while (i++ < iterations) {
                var areas = objects.map(path.area);
                var totalArea = d3.sum(areas), sizeErrorsTot = 0, sizeErrorsNum = 0,
                    meta = objects.map(function (o, j) {
                        var area = Math.abs(areas[j]), v = +values[j],
                            desired = (totalArea * v) / (totalValue * pFactor),
                            radius = Math.sqrt(area / Math.PI),
                            mass = Math.sqrt(desired / Math.PI) - radius,
                            sizeError = Math.max(area, desired) / Math.min(area, desired);
                        sizeErrorsTot += sizeError; sizeErrorsNum++;
                        return { id: o.id, area: area, centroid: path.centroid(o), value: v, desired: desired, radius: radius, mass: mass, sizeError: sizeError };
                    });

                var sizeError = sizeErrorsTot / sizeErrorsNum, forceReductionFactor = 1 / (1 + sizeError);
                var len1, i1, delta, len2 = projectedArcs.length, i2 = 0, len3, i3, centroid, mass, radius, rSquared, dx, dy, distSquared, dist, Fij;
                while (i2 < len2) {
                    len1 = projectedArcs[i2].length; i1 = 0;
                    while (i1 < len1) {
                        delta = [0, 0]; len3 = meta.length; i3 = 0;
                        while (i3 < len3) {
                            centroid = meta[i3].centroid; mass = meta[i3].mass; radius = meta[i3].radius; rSquared = radius * radius;
                            dx = projectedArcs[i2][i1][0] - centroid[0]; dy = projectedArcs[i2][i1][1] - centroid[1];
                            distSquared = dx * dx + dy * dy; dist = Math.sqrt(distSquared);
                            Fij = dist > radius ? (mass * radius) / dist : mass * (distSquared / rSquared) * (4 - (3 * dist) / radius);
                            delta[0] += Fij * cosArctan(dy, dx); delta[1] += Fij * sinArctan(dy, dx);
                            i3++;
                        }
                        projectedArcs[i2][i1][0] += delta[0] * forceReductionFactor;
                        projectedArcs[i2][i1][1] += delta[1] * forceReductionFactor;
                        i1++;
                    }
                    i2++;
                }
                if (sizeError <= 1) break;
            }
            return { features: objects, arcs: projectedArcs };
        }

        function populationFactor(selectedScale, populationData, year) {
            switch (selectedScale) {
                case cellScale.Fixed:
                    var factor = getTotalPopulation(populationData, 2018) / getTotalPopulation(populationData, year) / 1.6;
                    return factor > 0.8 ? factor : 1;
                case cellScale.Fluid:
                    return 1;
            }
        }

        function object(arcs, o) {
            function arc(i, points) {
                if (points.length) points.pop();
                for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length; k < n; ++k) points.push(a[k]);
                if (i < 0) reverse(points, n);
            }
            function line(arcs) {
                var points = [];
                for (var i = 0, n = arcs.length; i < n; ++i) arc(arcs[i], points);
                return points;
            }
            function polygon(arcs) { return arcs.map(line); }
            function geometry(o) { o = Object.create(o); o.coordinates = geometryType[o.type](o.arcs); return o; }
            var geometryType = {
                LineString: line, MultiLineString: polygon, Polygon: polygon,
                MultiPolygon: function (arcs) { return arcs.map(polygon); }
            };
            return o.type === "GeometryCollection"
                ? ((o = Object.create(o)), (o.geometries = o.geometries.map(geometry)), o)
                : geometry(o);
        }

        cartogram.path = d3.geoPath().projection(null);
        cartogram.iterations = function (i) { if (arguments.length) { iterations = i; return cartogram; } return iterations; };
        cartogram.value = function (v) { if (arguments.length) { value = typeof v === "function" ? v : constant(v); return cartogram; } return value; };
        cartogram.projection = function (p) { if (arguments.length) { projection = p; return cartogram; } return projection; };
        cartogram.feature = function (topology, geom) {
            return { type: "Feature", id: geom.id, properties: properties.call(null, geom, topology),
                geometry: { type: geom.type, coordinates: topoFeature(topology, geom).geometry.coordinates } };
        };
        cartogram.features = function (topo, geometries) { return geometries.map(function (f) { return cartogram.feature(topo, f); }); };
        cartogram.properties = function (props) { if (arguments.length) { properties = typeof props === "function" ? props : constant(props); return cartogram; } return properties; };
        function constant(x) { return function () { return x; }; }
        var transformer = (cartogram.transformer = function (tf) {
            var kx = tf.scale[0], ky = tf.scale[1], dx = tf.translate[0], dy = tf.translate[1];
            function transform(c) { return [c[0] * kx + dx, c[1] * ky + dy]; }
            transform.invert = function (c) { return [(c[0] - dx) / kx, (c[1] - dy) / ky]; };
            return transform;
        });
        return cartogram;
    }

    var exportCsv = [];
    var lastViewBox = null, viewDirty = true;
    function markViewDirty() { viewDirty = true; }
    var nameByCode = {};
    var highlightOn = false;

    function render(topo, populationData, cellDetails, year) {
        var cellRadius = cellDetails.radius;
        var cellShape = cellDetails.shape;

        var shapeDistance = getRadius(cellRadius, cellShape);
        var cols = width / shapeDistance;
        var rows = height / shapeDistance;
        var pointGrid = d3.range(rows * cols).map(function (el, i) {
            return { x: Math.floor(i % cols) * shapeDistance, y: Math.floor(i / cols) * shapeDistance, datapoint: 0 };
        });

        var populationJson = indexByCode(populationData);
        for (var c in populationJson) nameByCode[c] = populationJson[c].name;
        var totalPopulation = getTotalPopulation(populationData, year);

        var topoCartogram = makeCartogram()
            .projection(null)
            .properties(function (d) { return d.properties; })
            .value(function (d) { return +d.properties.count; });
        topoCartogram.features(topo, topo.objects.tiles.geometries);
        topoCartogram.value(function (d) { return +populationJson[d.properties.id][year]; });

        var topoFeatures = topoCartogram(topo, topo.objects.tiles.geometries, cellDetails, populationData, year).features;

        var newHexbin = hexbin().radius(cellRadius).x(function (d) { return d.x; }).y(function (d) { return d.y; });

        d3.select("#container").selectAll("*").remove();
        exportCsv = [];
        var root = d3.select("#container").append("svg")
            .attr("width", width + margin.left + margin.top)
            .attr("height", height + margin.top + margin.bottom)
            .attr("preserveAspectRatio", "xMidYMid meet");
        var svg = root.append("g").attr("transform", "translate(" + margin.left + " " + margin.top + ")");

        svg.append("g").attr("id", "hexes").selectAll(".hex")
            .data(getGridData(cellShape, newHexbin, pointGrid)).enter().append("path")
            .attr("class", "hex").attr("transform", getTransformation(cellShape))
            .attr("d", getPath(cellShape, newHexbin, shapeDistance))
            .style("fill", BASE_FILL).style("stroke", BASE_STROKE).style("stroke-width", strokeWidth)
            .on("click", mclickBase);

        var countries = svg.append("g").attr("class", "pc-countries");
        var features = flattenFeatures(topoFeatures);
        var polygonCellCount = 0;
        for (var i = 0; i < features.length; i++) {
            for (var j = 0; j < features[i].coordinates.length; j++) {
                var polygonPoints = features[i].coordinates[j];
                var tessellatedPoints = pointGrid.reduce(function (arr, el) {
                    if (d3.polygonContains(polygonPoints, [el.x, el.y])) arr.push(el);
                    return arr;
                }, []);
                for (var k = 0; k < tessellatedPoints.length; k++) {
                    exportCsv[polygonCellCount] = [tessellatedPoints[k].x, tessellatedPoints[k].y, features[i].properties.id];
                    polygonCellCount++;
                }
                countries.append("g").attr("id", "hexes").selectAll(".hex")
                    .data(getGridData(cellShape, newHexbin, tessellatedPoints)).enter().append("path")
                    .attr("class", "hex" + features[i].properties.id)
                    .attr("transform", getTransformation(cellShape))
                    .attr("x", function (d) { return d.x; }).attr("y", function (d) { return d.y; })
                    .attr("d", getPath(cellShape, newHexbin, shapeDistance))
                    .style("fill", colors[i % colors.length]).style("stroke", CELL_STROKE).style("stroke-width", strokeWidth)
                    .on("mouseover", mover).on("mousemove", movetip).on("mouseout", mout)
                    .call(cellDrag());
            }
        }
        setCellSize(totalPopulation, polygonCellCount);

        try {
            if (viewDirty || !lastViewBox) {
                var bb = countries.node().getBBox();
                if (bb.width && bb.height) {
                    var pad = 12;
                    lastViewBox = (bb.x + margin.left - pad) + " " + (bb.y + margin.top - pad) + " " +
                        (bb.width + 2 * pad) + " " + (bb.height + 2 * pad);
                    viewDirty = false;
                }
            }
            if (lastViewBox) root.attr("viewBox", lastViewBox).attr("width", null).attr("height", null);
        } catch (e) { }
    }

    function indexByCode(data) {
        var obj = {};
        for (var x in data) obj[data[x].code] = data[x];
        return obj;
    }
    function setCellSize(totalPopulation, cellCount) {
        var el = document.getElementById("cell-size");
        if (el) el.textContent = cellCount ? (totalPopulation / (cellCount * 1000000)).toFixed(1) + "M" : "—";
    }
    function flattenFeatures(topoFeatures) {
        var features = [];
        for (var i = 0; i < topoFeatures.length; i++) {
            var tempFeatures = [];
            if (topoFeatures[i].geometry.type == "MultiPolygon") {
                for (var j = 0; j < topoFeatures[i].geometry.coordinates.length; j++) tempFeatures[j] = topoFeatures[i].geometry.coordinates[j][0];
            } else if (topoFeatures[i].geometry.type == "Polygon") {
                tempFeatures[0] = topoFeatures[i].geometry.coordinates[0];
            }
            features[i] = { coordinates: tempFeatures, properties: topoFeatures[i].properties };
        }
        return features;
    }

    function downloadByMimeType(content, fileName, mimeType) {
        var a = document.createElement("a");
        mimeType = mimeType || "application/octet-stream";
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(new Blob([content], { type: mimeType }), fileName);
        } else if (URL && "download" in a) {
            a.href = URL.createObjectURL(new Blob([content], { type: mimeType }));
            a.setAttribute("download", fileName);
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } else {
            location.href = "data:application/octet-stream," + encodeURIComponent(content);
        }
    }
    function download(fileType, year) {
        var filename = "cartogram" + year;
        switch (fileType) {
            case outputFileType.CSV:
                var csvContent = "";
                exportCsv.forEach(function (row, index) {
                    var dataString = row.join(",");
                    csvContent += index < exportCsv.length ? dataString + "\n" : dataString;
                });
                downloadByMimeType(csvContent, filename + ".csv", "text/csv;encoding:utf-8");
                break;
            case outputFileType.GeoJSON:
                break;
            case outputFileType.SVG:
                d3.select("#select-download").each(function () {
                    d3.select(this)
                        .attr("href", "data:application/octet-stream;base64," + btoa(d3.select("#container").html()))
                        .attr("download", filename + ".svg");
                });
                break;
        }
    }

    var PLAY_ICON = '<svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true"><path d="M2 1l8 5-8 5z" fill="currentColor"/></svg>';
    var PAUSE_ICON = '<svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true"><rect x="2" y="1" width="3" height="10" fill="currentColor"/><rect x="7" y="1" width="3" height="10" fill="currentColor"/></svg>';

    var yearInput = document.querySelector("#year");
    var yearOut = document.querySelector("#pc-year-out");
    var yearTitle = document.querySelector("#pc-year-title");
    var radiusInput = document.querySelector("input#radius");
    var radiusOut = document.querySelector("#pc-radius-out");
    var shapeInput = document.querySelector("#cell-shape");
    var scaleInput = document.querySelector("#cell-scale");
    var actionInput = document.querySelector("#cell-action");
    var colorInput = document.querySelector("#cell-color");
    var downloadButton = document.querySelector("#select-download");
    var loader = document.querySelector("#loader");
    var playBtn = document.querySelector("#pc-play");
    var stepSelect = document.querySelector("#pc-step");
    var stage = document.querySelector(".pc-stage");
    tip = document.querySelector("#pc-tip");

    var PENCIL_SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'><path d='M14.7 2.3l3 3-9.4 9.4-3.6.6.6-3.6z' fill='white' stroke='black' stroke-width='1.4'/><path d='M13.3 3.7l3 3' stroke='black' stroke-width='1.4'/></svg>";
    var ERASER_SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'><rect x='3.5' y='9' width='10' height='6' transform='rotate(-40 8.5 12)' fill='white' stroke='black' stroke-width='1.4'/></svg>";
    function setCursor(kind) {
        if (!stage) return;
        stage.style.cursor = kind === "erase"
            ? "url(\"data:image/svg+xml," + encodeURIComponent(ERASER_SVG) + "\") 8 12, cell"
            : "url(\"data:image/svg+xml," + encodeURIComponent(PENCIL_SVG) + "\") 4 16, crosshair";
    }

    var TOPO_URL = "./assets/demos/population-cartogram/topo.json";
    var POP_URL = "./assets/demos/population-cartogram/unpd-flat.csv";
    var YEAR_MIN = 1950, YEAR_MAX = 2100;
    var cache = null, playTimer = null;

    function showLoader(on) { if (loader) loader.classList[on ? "remove" : "add"]("hide"); }

    function draw() {
        if (!yearInput) return;
        showLoader(true);
        var cellDetails = { radius: radiusInput.value, shape: shapeInput.value, scale: scaleInput.value };
        var year = yearInput.value;
        var ready = cache
            ? Promise.resolve(cache)
            : Promise.all([d3.json(TOPO_URL), d3.csv(POP_URL)]).then(function (res) { cache = res; return res; });
        ready.then(function (res) {
            render(res[0], res[1], cellDetails, year);
            showLoader(false);
        }).catch(function () { showLoader(false); });
    }

    function setYear(y, redraw) {
        y = Math.max(YEAR_MIN, Math.min(YEAR_MAX, y));
        if (yearInput) yearInput.value = y;
        if (yearOut) yearOut.textContent = y;
        if (yearTitle) yearTitle.textContent = y;
        if (redraw) draw();
    }

    function setActive(selector, el) {
        var nodes = document.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) nodes[i].classList.toggle("is-active", nodes[i] === el);
    }

    if (yearInput) {
        yearInput.addEventListener("input", function () {
            if (yearOut) yearOut.textContent = this.value;
            if (yearTitle) yearTitle.textContent = this.value;
        });
        yearInput.addEventListener("change", function () { setYear(+this.value, true); });
    }

    document.querySelectorAll("[data-tool]").forEach(function (b) {
        b.addEventListener("click", function () {
            var tool = this.getAttribute("data-tool");
            if (actionInput) actionInput.value = tool === "erase" ? "Remove" : "Add";
            setActive("[data-tool]", this);
            setCursor(tool);
        });
    });

    document.querySelectorAll("[data-shape]").forEach(function (b) {
        b.addEventListener("click", function () {
            if (shapeInput) shapeInput.value = this.getAttribute("data-shape");
            setActive("[data-shape]", this);
            markViewDirty();
            draw();
        });
    });

    document.querySelectorAll("[data-scale]").forEach(function (b) {
        b.addEventListener("click", function () {
            if (scaleInput) scaleInput.value = this.getAttribute("data-scale");
            setActive("[data-scale]", this);
            markViewDirty();
            draw();
        });
    });

    document.querySelectorAll("[data-color]").forEach(function (b) {
        b.addEventListener("click", function () {
            var c = this.getAttribute("data-color");
            if (colorInput) colorInput.value = c;
            setActive("[data-color]", this);
            if (actionInput) actionInput.value = "Add";
            var draws = document.querySelectorAll("[data-tool]");
            for (var i = 0; i < draws.length; i++) draws[i].classList.toggle("is-active", draws[i].getAttribute("data-tool") === "draw");
            setCursor("draw");
        });
    });
    if (colorInput) colorInput.addEventListener("input", function () { setActive("[data-color]", null); });

    function setRadius(v) {
        v = Math.max(1, Math.min(12, v));
        if (radiusInput) radiusInput.value = v;
        if (radiusOut) radiusOut.textContent = v;
        markViewDirty();
        draw();
    }
    var rdec = document.querySelector("#pc-radius-dec"), rinc = document.querySelector("#pc-radius-inc");
    if (rdec) rdec.addEventListener("click", function () { setRadius(+radiusInput.value - 1); });
    if (rinc) rinc.addEventListener("click", function () { setRadius(+radiusInput.value + 1); });

    var highlightBtn = document.querySelector("#pc-highlight");
    if (highlightBtn) highlightBtn.addEventListener("click", function () {
        highlightOn = !highlightOn;
        this.classList.toggle("is-active", highlightOn);
        this.setAttribute("aria-pressed", highlightOn ? "true" : "false");
        if (!highlightOn) d3.selectAll(".pc-countries path").style("fill-opacity", 1);
    });

    if (downloadButton) downloadButton.addEventListener("click", function () {
        download(document.querySelector("#download").value, yearInput.value);
    });

    function stopPlay() {
        if (playTimer) { clearInterval(playTimer); playTimer = null; }
        if (playBtn) { playBtn.classList.remove("is-playing"); playBtn.setAttribute("aria-label", "Play"); playBtn.innerHTML = PLAY_ICON; }
    }
    function startPlay() {
        if (playTimer || !yearInput) return;
        if (playBtn) { playBtn.classList.add("is-playing"); playBtn.setAttribute("aria-label", "Pause"); playBtn.innerHTML = PAUSE_ICON; }
        var step = stepSelect ? +stepSelect.value : 10;
        if (+yearInput.value >= YEAR_MAX) setYear(YEAR_MIN, true);
        playTimer = setInterval(function () {
            var next = +yearInput.value + step;
            if (next > YEAR_MAX) { setYear(YEAR_MAX, true); stopPlay(); return; }
            setYear(next, true);
        }, 1100);
    }
    if (playBtn) { playBtn.innerHTML = PLAY_ICON; playBtn.addEventListener("click", function () { playTimer ? stopPlay() : startPlay(); }); }

    setCursor("draw");
    setYear(yearInput ? +yearInput.value : 2022, false);
    draw();
})();
