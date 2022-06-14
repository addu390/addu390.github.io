---
layout: post
title: "Conceptualization of a Hexagonal Cartogram"
date: 2022-06-12
tags:
  - Project
author: Adesh Nalpet Adimurthy
feature: assets/featured/hex-spiderman.png
category: Comics
---

<img class="center-image" src="./assets/featured/hex-spiderman.png" /> 
<p style="text-align: center;">Hex Spiderman. </p>

## What is a cartogram?
Simply put, a cartogram is a map. But a cartogram is a unique type of map that combines statistical information such as population with geographic location. Typically, physical or topographical maps show relative area and distance, but they do not provide any data about the inhabitants or the population of a place. For example, a quick and intuitive view of the world map in relation to population makes it easy for viewers to co-relate the effect and the relative measure's gravity. 

The basic idea is distorting the map by resizing the regions by population (or any other metric) since the population is among the most important aspects to consider; for example, if malnutrition is high in a vast country, then the severity is much worse than if malnutrition is high in a tiny country.

## How are grids related to cartograms?
With an objective to plot a visually conclusive map by illustrating territories using a method for trading off shape and area.

It’s vital to ensure the shape or the outline of a region (Example: Country and Province) is preserved, i.e., visualization steps have to be in place so that the resulting cartograms appear similar to the original world cartograms, such that the area is easily recognizable only by its appearance without the explicit need for labels and quickly understand the displayed data.

While generating a cartogram algorithmically yields good results, the best cartograms out there are the ones that as designed artistically/manually. This boils down to finding a balance between using algorithms to generate cartograms and manually nitpicking fine details - that's where the grids come into the picture.

<img src="./assets/posts/hex-grid-cartogram.png" /> 
<p style="text-align: center;">Figure 1: Hex grid cartogram. </p>

## Choosing the right grid

Grids are built from a repetition of simple shapes such as squares and hexagons. Grids have three types of parts: faces (tiles), edges, and vertices.
- Each face is a two-dimensional surface enclosed by edges. 
- Each edge is a one-dimensional line segment ending at two vertices. 
- Each vertex is a zero-dimensional point

### Square
One of the most commonly used grids is a square grid. It's simple, easy to work with, and maps nicely onto a computer screen. The location uses cartesian coordinates (x, y), and the axes are orthogonal. Not to mention, the coordinate system is the same even if the squares are angled in an isometric or axonometric projection.

- Squares are 4-sided polygons. 
- Squares have all the sides the same length. 
- They have 4 sides and 4 corners.
- Each side is shared by 2 squares. 
- Each corner is shared by 4 squares.

### Hexagon
Hexagonal grids are the next commonly used grids, as they offer less distortion of distances than square grids because each hexagon has more non-diagonal neighbors than a square (diagonals distort grid distances). Moreover, hexagons have a pleasing appearance (the honeycomb is a good example). As for the grids, the position is either pointy tops and flat sides or flat tops and pointy sides.

<img class="center-image" src="./assets/posts/hexagon-grid-details.png" /> 
<p style="text-align: center;">Figure 2: Modified from original Image source: <a href="https://www.redblobgames.com/grids/hexagons" target="_blank">@redblobgames</a></p>

- Hexagons are 6-sided polygons. 
- Regular hexagons have all the sides the same length. 
- They have 6 sides and 6 corners.
- Each side is shared by 2 hexagons. 
- Each corner is shared by 3 hexagons.
- Typically, the orientations for hex grids are vertical columns (flat-topped) and horizontal rows (pointy-topped).

<hr class="hr">

## Hexagons vs Squares

### Square grids
- Square grids are universally used in Raster datasets in GIS. 
- Ease of definition and storage: the only explicit geographical information necessary to define a raster grid are the coordinates of the origin, cell size, and grid dimensions, i.e., the number of cells in each direction. The attribute data can be stored as an aspatial matrix, and the geographical location of any cell can be derived from the cell’s position relative to the origin - this makes data storage and retrieval easier since the coordinates of the vertices of each grid cell are not explicitly stored.
- Ease of resampling to different spatial scales: increasing the spatial resolution of a square grid is just a matter of dividing each grid cell into four. Similarly, decreasing the spatial resolution only requires combining groups of four cells into one.

### Hexagonal grids
- Reduced edge effects: a hexagonal grid gives the lowest perimeter to area ratio of any regular tessellation of the plane - this means that edge effects are minimized when working with hexagonal grids.
- All neighbours are identical: square grids have two classes of neighbours, those in the cardinal directions that share an edge and those in diagonal directions that share a vertex. In contrast, a hexagonal grid cell has six identical neighboring cells, each sharing one of the six equal-length sides. Furthermore, the distance between centroids is the same for all neighbors.
- Better fit to curved surfaces: when dealing with large areas, where the curvature of the earth becomes important, hexagons are better able to fit this curvature than squares (this is why soccer balls are constructed of hexagonal panels).

<img class="center-image" src="./assets/posts/hex-square-tessellation.png" /> 
<p style="text-align: center;">Figure 3: Tessellation of the plane (Square and Hexagon). </p>

### Hexagonal grid for Cartograms
For a cartogram, the reasons to choose hexagons over squares are as follows:
- It's a better fit for curved surfaces, thereby supporting most geographic projections.
- Representing a complex-shaped polygon by hexagons offers a lower error factor (tessellation of the plane), i.e., (the actual area of the polygon - Area formed by tiny tiles/hexagons) is lower as compared to that formed by squares.
- They look badass! Without a doubt, hexagonal grids look way more impressive than square grids.

<hr class="hr">

## Building a shape preserved hexagonal grid cartogram

Initial Proposal: [https://www.pyblog.xyz/gsoc-2022](https://www.pyblog.xyz/gsoc-2022)

Primary dependency: D3 is a Javascript library extensively used for drawing geographic visualizations. It uses [GeoJSON](https://geojson.org)/[TopoJSON](https://en.wikipedia.org/wiki/GeoJSON) for representing shapes on maps by converting them to rendered SVG element(s).

### Projection
Earth is round or more accurately, an ellipsoid. To show its features on a flat surface, it's not possible to accurately translate a sphere onto a plane, hence the need for projections. For instance, the Mercator projection is famously known to over-exaggerate the size of landmasses near the poles (No wonder Greenland looks massive). 

D3 offers a range of built-in [projections](https://github.com/d3/d3-geo-projection); however, no projection accurately depicts all points in the globe, so it's important to choose the appropriate projection for the use case. The purpose is simple: translate the latitude and longitude pair to a pair of X and Y coordinates on SVG. Lastly, to fit the coordinates to the SVG element, the `fitExtent` and `rotate` are handly, as the projection has no knowledge of the size or extent of the SVG element.

### Geopath
The projection function works well for converting points into X and Y coordinates but not lines. A typical map has regions represented by lines and not individual points. Hence to render the map, irregular lines are represented using the path element.
The `d` attribute in `<path></path>` defines the shape of the line.

`const path = d3.geoPath().projection(projection)`, the `path` functions takes `GeoJSON` polygons, and returns a string which can directly be used as the `d` attribute of an SVG path.

To render the map, the plan is to:
- Loop through each country’s `GeoJSON` polygon
- Create the `d` attribute string using the `d3.geopath` function
- Create and append an SVG path element with the above `d` attribute

### Dependencies
```
"d3": "^7.4.3",
"d3-array": "^3.1.6",
"d3-geo": "^3.0.1",
"d3-hexbin": "^0.2.2",
"topojson-client": "^3.1.0",
"topojson-server": "^3.0.1",
"topojson-simplify": "^3.0.3"
```

### Project Structure
- `index.html`: HTML page of the main screen.
- `app.js`: The logic for loading, scaling, and generating the cartogram.
- `app.css`: Styling for the index page and the SVG generated from input/scaled cartogram.
- `cartogram.js`: Implementation of the algorithm to construct continuous area cartograms.

<hr class="hr">

### File: cartogram.js
Refer to the research paper [An Algorithm to Construct Continous Area Cartograms](http://lambert.nico.free.fr/tp/biblio/Dougeniketal1985.pdf). Without getting into the exact details, line-by-line, the procedure to produce cartograms is as follows: 

```
For each polygon
  Read and store PolygonValue (negative value illegal)
  Sum PolygonValue into TotalValue
```

```
For each iteration (user controls when done)
  For each polygon
	  Calculate area and centroid (using current boundaries)
  Sum areas into TotalArea
  For each polygon
	  Desired = (TotalArea * (PolygonValuelTotaIValue))
	  Radius = SquareRoot (Areah)
	  Mass = SquareRoot (Desiredln) - SquareRoot (Areah)
	  SizeError = Max(Area, Desired) / Min(Area, Desired)

  ForceReductionFactor = 1 / (1 + Mean (SizeError))
  For each boundary line; Read coordinate chain
	  For each coordinate pair
		  For each polygon centroid
			  Find angle, Distance from centroid to coordinate
			    If (Distance > Radius of polygon): Fij = Mas * (RadiWDistance)
			    Else: Fij = Mass * (Distance A2 I Radius A2) * (4 - 3 * (Distance / Radius))
		  Using Fij and angles, calculate vector sum
		  Multiply by ForceReductionFactor
		  Move coordinate accordingly
	  Write distorted line to output and plot result
```

<hr class="hr">

### File: index.html
### Create a HTML `div` with a unique `id`
To append SVG, i.e., the hexagonal grid and polygons/regions of the cartogram (derived from the topojson).

```
<div class="container-fluid">
    <div id="container"></div>
</div>
```

<hr class="hr">

### File: app.js
### Create a point grid
A point grid is a matrix containing the centers of all the hexagons in the grid.

```
const hexRadius = 5
const margin = { top: 15, right: 10, bottom: 15, left: 10 };
const width = 1350 - margin.left - margin.right;
const height = 750 - margin.top - margin.bottom;

let hexDistance = hexRadius * 1.5
let cols = width / hexDistance
let rows = Math.ceil(height / hexDistance);
let pointGrid = d3.range(rows * cols).map(function (el, i) {
    return {
      x: Math.floor(i % cols) * hexDistance,
      y: Math.floor(i / cols) * hexDistance,
      datapoint: 0
    };
});
```
<img class="center-image" style="width: 8%" src="./assets/posts/down-arrow.png" /> 

### Plot the hexagonal grid playground

```
let newHexbin = hexbin()
    .radius(hexRadius)
    .x(function (d) { return d.x; })
    .y(function (d) { return d.y; })

const svg = d3.select('#container')
    .append('svg')
    .attr('width', width + margin.left + margin.top)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left} ${margin.top})`);

svg.append('g').attr('id', 'hexes')
    .selectAll('.hex')
    .data(newHexbin(pointGrid))
    .enter().append('path')
    .attr('class', 'hex')
    .attr('transform', function (d) { return 'translate(' + d.x + ', ' + d.y + ')'; })
    .attr('d', newHexbin.hexagon())
    .style('fill', '#fff')
    .style('stroke', '#e0e0e0')
    .style('stroke-width', strokeWidth)
```

<img class="center-image" style="width: 8%" src="./assets/posts/down-arrow.png" /> 

### Create the base cartogram
Set the topojson properties and map the values (population count). In this example, the base cartogram is a population-scaled world map for the year 2018.

```
var topo_cartogram = cartogram()
    .projection(null)
    .properties(function (d) {
        return d.properties;
    })
    .value(function (d) {
        var currentValue = d.properties.count
        return +currentValue
    });

topo_cartogram.features(topo, topo.objects.tiles.geometries)

topo_cartogram.value(function (d) {
    var currentValue = populationJson[d.properties.id][yearInput.value]
    return +currentValue
});
```

<img class="center-image" style="width: 8%" src="./assets/posts/down-arrow.png" /> 

### Flatten the features of the cartogram/topojson.

```
var topoFeatures = topo_cartogram(topo, topo.objects.tiles.geometries).features

let features = []
for (let i = 0; i < topoFeatures.length; i++) {
    var tempFeatures = []
    if (topoFeatures[i].geometry.type == "MultiPolygon") {
        for (let j = 0; j < topoFeatures[i].geometry.coordinates.length; j++) {
        tempFeatures[j] = topoFeatures[i].geometry.coordinates[j][0]
        }
    }
    else if (topoFeatures[i].geometry.type == "Polygon") {
        tempFeatures[0] = topoFeatures[i].geometry.coordinates[0]
    }
    features[i] = {
        "coordinates": tempFeatures,
        "properties": topoFeatures[i].properties
    }
}
```

<img class="center-image" style="width: 8%" src="./assets/posts/down-arrow.png" /> 

### Fill the polygons/regions of the base cartogram with hexagons (tessellation)

```
let colors = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50', '#f1c40f', '#e67e22', '#e74c3c', '#ecf0f1', '#95a5a6', '#f39c12', '#d35400', '#c0392b', '#bdc3c7', '#7f8c8d']

for (let i = 0; i < features.length; i++) {
    for (let j = 0; j < features[i].coordinates.length; j++) {
      var polygonPoints = features[i].coordinates[j];

      let usPoints = pointGrid.reduce(function (arr, el) {
        if (d3.polygonContains(polygonPoints, [el.x, el.y])) arr.push(el);
        return arr;
      }, [])

      let hexPoints = newHexbin(usPoints)

      svg.append('g')
        .attr('id', 'hexes')
        .selectAll('.hex')
        .data(hexPoints)
        .enter().append('path')
        .attr('class', 'hex' + features[i].properties.id)
        .attr('transform', function (d) { return 'translate(' + d.x + ', ' + d.y + ')'; })
        .attr("x", function (d) { return d.x; })
        .attr("y", function (d) { return d.y; })
        .attr('d', newHexbin.hexagon())
        .style('fill', colors[i % 19])
        .style('stroke', '#000')
        .style('stroke-width', strokeWidth);
    }
}
```

<img class="center-image" style="width: 8%" src="./assets/posts/down-arrow.png" /> 

### Drag and drop hexagons in the hex-grid
Implement `start`, `drag`, and `end` - representing the states when the drag has start, in-flight and dropped to a hexagonal slot.

In this case, it's important to ensure that a hexagonal cell can only be dragged to a hexagonal slot.

```
svg.append('g')
... // same as above
.call(d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended));
```

```
function dragstarted(event, d) {
  d.fixed = false
  d3.select(this).raise()
    .style('stroke-width', 1)
    .style('stroke', '#000');
}

function dragged(event, d) {
  let hexRadius = radiusInput.value
  var x = event.x
  var y = event.y
  var grids = round(x, y, hexRadius);
  d3.select(this)
    .attr("x", d.x = grids[0])
    .attr("y", d.y = grids[1])
    .attr('transform', function (d) { return 'translate(' + d.x + ', ' + d.y + ')'; })
}

function dragended(event, d) {
  d.fixed = true
  d3.select(this)
    .style('stroke-width', strokeWidth)
    .style('stroke', '#000');
}

function round(x, y, n) {
  var gridx
  var gridy
  var factor = Math.sqrt(3) / 2
  var d = n * 2
  var sx = d * factor
  var sy = n * 3
  if (y % sy < n) {
    gridy = y - (y % sy)
    gridx = x - (x % sx)
  } else {
    gridy = y + (d - (n * factor) / 2) - (y % sy);
    gridx = x + (n * factor) - (x % sx);
  }
  return [gridx, gridy]
}
```

<hr class="hr">

## Conclusion

A complete implementation of the above (with additional features):
- Prototype: [https://www.pyblog.xyz/population-cartogram](https://www.pyblog.xyz/population-cartogram/)
- Github Repository: [https://github.com/owid/cartograms](https://github.com/owid/cartograms)

However, this does not conclude meeting the expected requirement(s). The last pending piece is to generate a new cartogram/topojson after moving hex-cells. That's a work in progress; stay tuned! [Subscribe](https://pyblog.medium.com/subscribe) maybe?

<hr class="hr">

## References
```
[1] “Amit’s Thoughts on Grids,” www-cs-students.stanford.edu. http://www-cs-students.stanford.edu/~amitp/game-programming/grids

[2] M. Strimas-Mackey, “Fishnets and Honeycomb: Square vs. Hexagonal Spatial Grids,” Matt Strimas-Mackey, Jan. 14, 2016. https://strimas.com/post/hexagonal-grids

[3] S. Kamani, “D3 Geo Projections Explained” www.sohamkamani.com. https://www.sohamkamani.com/blog/javascript/2019-02-18-d3-geo-projections-explained (accessed Jun. 14, 2022).
‌
```
