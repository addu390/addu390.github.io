---
layout: post
title: "Spatial Index: Tessellation"
date: 2024-06-17
state: Draft
tags:
- Database
- Spatial Index
author: Adesh Nalpet Adimurthy
image: assets/featured/space-tessellation.png
feature: assets/featured/space-tessellation.png
category: System Wisdom
description: Tessellation for spatial indexing divides space into non-overlapping shapes for efficient data management. The Uber H3 grid system uses hexagonal cells, offering better uniformity and efficiency than squares or triangles. This system projects hexagons onto an icosahedron to minimize distortion, enhancing geographic algorithms. The article also provides a custom implementation of H3, explaining the process of converting latitude and longitude to 3D Cartesian coordinates, identifying icosahedron vertices, and encoding cell IDs into a 64-bit integer.
---

<img class="center-image" src="./assets/featured/space-tessellation.png" /> 

<p>Brewing! this post a continuation of <a href="/spatial-index-grid-system">Spatial Index: Grid Systems</a> where we will set the foundation for tessellation and delve into the details of <a href="https://github.com/uber/h3" target="_blank">Uber H3</a></p>


<details open><summary class="h3">0. Foundation</summary>
<p>Tessellation or tiling is the process of covering/dividing a space into smaller, non-overlapping shapes that fit together perfectly without gaps or overlaps. In spatial indexing, tessellation is used to break down the Earth's surface into manageable units for efficient data storage, querying, and analysis.</p>

<p>The rationale behind why a geographical grid system (<a href="cartograms-documentation#tessellation" target="_blank">Tessellation system</a>) is necessary: The real world is cluttered with various geographical elements, both natural and man-made, none of which follow any consistent structure. To perform geographic algorithms or analyses on it, we need a more abstract form.</p>

<p>Maps are a good start and are the most common abstraction, with which most people are familiar. However, maps still contain all sorts of inconsistencies. This calls for a grid system, which takes the cluttered geographic space and provides a more clean and structured mathematical space, making it much easier to perform computations and queries.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/h3-why-grids.png" />
<p class="figure-header">Figure 0: Tessellated View of Halifax</p>

<p>The primary principle of the grid is to break the space into uniform cells. These cells are the units of analysis used in geographic systems. Think of it as pixels in an image.</p>

<p>A grid system adds a couple more layers on top of this, consisting of a series of nested grids, usually at increasingly fine resolutions. They include a way to uniquely identify any cell in the system. Other common grid systems include <a href="https://en.wikipedia.org/wiki/Graticule_(cartography)" target="_blank">Graticule</a> (latitude and longitude), <a href="https://learn.microsoft.com/en-us/bingmaps/articles/bing-maps-tile-system#tile-coordinates-and-quadkeys" target="_blank">Quad Key</a>  (Mercator projection), <a href="/spatial-index-grid-system#3-geohash" target="_blank">Geohash</a> (Equirectangular projection) and <a href="/spatial-index-grid-system#4-google-s2" target="_blank">Google S2</a> (Spherical projection).</p>
</details>

<hr class="clear-hr">

<details open><summary class="h3">1. Uber H3 - Intuition</summary>
<p>Most systems use four-sided polygons (Square, Rectangle and Quadrilateral). H3 is the grid system developed by Uber, which uses hexagon cells as its base. It covers the space/world with hexagons and has different levels of resolution, with the smallest cells representing about <code>1 cm²</code> of space.</p>

<h3>1.1. Why Hexagons?</h3>

<p>Starting off by adding rules or needs for choosing a tile, such as:</p>
<ul style="list-style-type:none;">
<li>(a) Uniform shape</li>
<li>(b) Uniform edge length</li>
<li>(c) Uniform angles</li>
</ul>
<p>Brings down the number of options, with the most commonly used shapes being squares, equilateral triangles, and hexagons.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/h3-tile-options-2.svg" />
<p class="figure-header">Figure 1: Triangle vs Square vs Hexagon (neighbors)</p>

<p>Another important property of tiles is uniform adjacency, i.e., how unambiguous the neighbors are. For example, squares have 4 unambiguous neighbors but also have 4 ambiguous neighbors at the corners, which may not provide the best perception of neighbors if you consider a circular radius.</p> 

<p>Equilateral triangles are much worse, with 3 unambiguous neighbors and 9 ambiguous neighbors, which is one of the reasons why triangles are not commonly used, along with the rotation of cells necessary for tessellation. Lastly, hexagons are the best, with 6 unambiguous neighbors and a structure very close to finding neighbors by radius.</p>

<img class="center-image-0 center-image" src="./assets/posts/spatial-index/hex-square-tessellation.png" />
<p class="figure-header">Figure 2: Square vs Hexagon (Optimal Space-Filling)</p>

<p>Hexagons are more space-efficient and have optimal space-filling properties. This means that when filling a polygon with uniform cells, hexagons generally result in less over/under filling compared to squares.</p>

<img class="center-image-0 center-image-50" src="./assets/posts/spatial-index/h3-tile-options-3.svg" />
<p class="figure-header">Figure 3: Square vs Hexagon (Child Containment)</p>

<p>Hierarchical relationships between resolutions are another important property. Evidently, squares have hierarchical relationships with perfect child containment and can use algorithms such as quad trees to navigate up and down the hierarchy and space-filling curves to traverse the grid. Hexagons, while not having perfect child containment, can still function effectively with a tolerable margin of error.</p>

<p>Without taking triangles into account, the summary of the comparison between squares and hexagons:</p>

<img class="center-image-0 center-image-50" src="./assets/posts/spatial-index/h3-tile-options.svg" />
<p class="figure-header">Figure 4: Squares vs Hexagons (Full Comparison)</p>

<p>More on Hexagons vs Squares at <a href="/cartograms-documentation#hexagonsvssquares">Conceptualization of a Cartogram</a></p>

<hr class="sub-hr"/>

<h3>1.2. Why Icosahedron?</h3>

<p>Lastly, low shape and area distortion is more related to the projection than the shape of the tile. There are many types of projections, but the most commonly used are polyhedra. One such projection is the <a href="/spatial-index-grid-system#3-1-geohash-intuition">cylindrical projection</a>, used in <a href="/spatial-index-grid-system#3-geohash">Geohash</a>, which works well for squares but has the problem of distortion near the poles, making it hard to get equal surface area cells across the projection.</p>

<img class="center-image-0 center-image-80" src="./assets/posts/spatial-index/uniform-shape-polyhedrons.png" />
<p class="figure-header">Figure 5: Uniform Shape Polyhedrons</p>

<p>The smaller the face, the lesser the distortion. An icosahedron, with 20 faces, is the better option among the uniform-face polyhedrons for fitting hexagons and triangles on them. Fitting squares on an icosahedron or even a tetrahedron is not ideal. Squares are mostly suitable for cubes (as seen in <a href="/spatial-index-grid-system#4-google-s2">S2</a>). Taking the best of both worlds, an icosahedron with hexagons is the way to go.</p>

<h3>1.3. H3 Grid System</h3>

<p>Putting it all together, we take the polyhedron, the <a href="https://en.wikipedia.org/wiki/Icosahedron" target="_blank">icosahedron</a>, project it on the surface of the Earth, then each face on the icosahedron is split into hexagon cells. More specifically, 4 full hexagon cells are completely contained by the face, 3 cells are half contained, and 3 corners form the pentagon.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/h3-tessellation.svg" />
<p>Each hexagonal cell can be further subdivided into 7 hexagon cells with marginal error for containment. The number of levels decides the resolution.</p>
<img class="center-image-0 center-image" src="./assets/posts/spatial-index/h3-tessellation-2.svg" />
<p class="figure-header">Figure 6: H3 Projection and Tessellation</p>

<h3>1.4. Why Pentagons?</h3>

<p>Looking at the icosahedron, the 5 faces come together at every vertex, and truncating that creates the base cell. Pentagons are unavoidable at the vertices. However, there are only 12 of them at every resolution. But again, for most cases dealing with spaces within a city where the resolution is higher than 9, the pentagons, if far off in the water, they are safe to ignore.</p>

<img class="center-image-0 center-image-80" src="./assets/posts/spatial-index/dymaxion-layout.svg" />
<p class="figure-header">Figure 7: Dymaxion layout (12 Vertices in Water)</p>

<p>While the layout of the faces on the icosahedron can be done in any fashion, H3 uses the layout developed by Buckminster Fuller called the <a href="https://en.wikipedia.org/wiki/Dymaxion_map" target="_blank">Dymaxion layout</a>.</p>

<img class="center-image-0 center-image-30" src="./assets/posts/spatial-index/h3-tessellation.gif" />
<p class="figure-header">Figure 8: H3 Projection and Tessellation (Animated)</p>

<p>The benefit is that all the vertices end up in the water. For most applications, land is more important than water, and since the vertices are in the water, it reduces the need to deal with pentagons.</p>

<h3>1.5. Cell ID</h3>
<p>A cell ID is a 64-bit integer that uniquely identifies a hexagonal cell at a particular resolution. The composition of an H3 cell ID is as follows:</p>

<ul>
<li>Mode (4 bits): Identifies the H3 mode, which indicates the type of the identifier. For cell IDs, this value defaults set to 1.</li>
<li>Edge Mode (Reserved, 3 bits): Indicates the edge mode, which is 0 for cell IDs.</li>
<li>Resolution (4 bits): Specifies the resolution of the cell. H3 supports resolutions from 0 (coarsest) to 15 (finest).</li>
<li>Base Cell (7 bits): Identifies the base cell, which is one of the 122 base cells that form the foundation of the H3 grid.</li>
<li>Cell Index (45 bits): Contains the specific index of the cell within the base cell and resolution.</li>
</ul>

<p>This structure allows H3 to efficiently encode the hierarchical location and resolution of each hexagonal cell in a compact 64-bit integer.</p>
</details>

<hr class="clear-hr"/>

<details open><summary class="h3">2. H3 - Implementation</summary>

<p>The custom implementation below, loosely follows the steps of the actual H3 index calculation for demonstration purposes (to better understand the H3 Index). Here's a step-by-step process with reasonable simplifications:</p>

<h3>2.1. (Lat, Long) to (X,Y,Z)</h3>
<p>Convert latitude and longitude to <a href="https://en.wikipedia.org/wiki/Cartesian_coordinate_system" target="_blank">3D Cartesian coordinates</a> using the formulas (similar to Section <a href="/spatial-index-grid-system#4-2-1-lat-long-to-x-y-z-">4.2.1 in S2</a>):.</p>

<img class="center-image-0 center-image-80" src="./assets/posts/spatial-index/ecef.svg" /> 
<p class="figure-header">Figure 9: (lat, long) to (x, y, z) Transformation</p>

<details class="code-container" open><summary class="p">2.1a. (Lat, Long) to (X,Y,Z) - Snippet</summary>
<pre><code>private static double[] latLonToCartesian(double lat, double lon) {
    double r = Math.cos(Math.toRadians(lat));
    double x = r * Math.cos(Math.toRadians(lon));
    double y = r * Math.sin(Math.toRadians(lon));
    double z = Math.sin(Math.toRadians(lat));
    return new double[]{x, y, z};
}
</code></pre>
</details>

<hr class="hr">

<h3>2.2. Icosahedron Vertices</h3>
<p>Identify the <code>12</code> vertices of the icosahedron using the <a href="https://en.wikipedia.org/wiki/Golden_ratio" target="_blank">golden ratio</a> <code>(ϕ)</code></p>

<p>The icosahedron has 12 vertices, 20 faces, and 30 edges. The vertices can be computed based on the golden ratio <code>φ</code>
And the 12 vertices are given by <code>(±1, ±ϕ, 0)</code>, <code>(±ϕ, 0, ±1)</code>, <code>(0, ±1, ±ϕ)</code>. Lastly, the vertices need to be normalized to lie on the surface of a unit sphere.</p>

<img class="center-image-0 center-image" src="./assets/posts/spatial-index/golden-ratio.svg" /> 
<p class="figure-header">Figure 10: Golden Ratio Rectangles</p>

<details class="code-container" open><summary class="p">2.2a. Icosahedron Vertices - Snippet</summary>
<pre><code>// Normalizes a vector to lie on the unit sphere.
private static double[] normalize(double[] v) {
    double length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return new double[]{v[0] / length, v[1] / length, v[2] / length};
}

double PHI = (1.0 + Math.sqrt(5.0)) / 2.0;
double[][] vertices = {
        {-1, PHI, 0}, {1, PHI, 0}, {-1, -PHI, 0}, {1, -PHI, 0},
        {0, -1, PHI}, {0, 1, PHI}, {0, -1, -PHI}, {0, 1, -PHI},
        {PHI, 0, -1}, {PHI, 0, 1}, {-PHI, 0, -1}, {-PHI, 0, 1}
};

// Normalize the vertices to lie on the unit sphere
for (int i = 0; i < vertices.length; i++) {
    vertices[i] = normalize(vertices[i]);
}
</code></pre>
</details>

<hr class="hr">

<h3>2.3. Icosahedron Face Centers</h3>
<p>Calculate the <code>20</code> face centers of the icosahedron:</p>
<p>For each face, average the coordinates of its three vertices and normalize the resulting vector to lie on the unit sphere. Use the formula:</p>

<img class="center-image-0 center-image-65" src="./assets/posts/spatial-index/face-centers.svg" /> 
<p class="figure-header">Figure 11: Icosahedron Face Center</p>

<details class="code-container"><summary class="p">2.3a. Icosahedron Face Centers - Snippet</summary>
<pre><code>private static final int NUM_ICOSA_FACES = 20;

// Computes the center of a face defined by three vertices.
private static double[] computeFaceCenter(double[] a, double[] b, double[] c) {
    double[] center = new double[3];
    center[0] = (a[0] + b[0] + c[0]) / 3.0;
    center[1] = (a[1] + b[1] + c[1]) / 3.0;
    center[2] = (a[2] + b[2] + c[2]) / 3.0;
    return normalize(center);
}

// Computes the 20 face centers of an icosahedron.
double[][] faces = new double[NUM_ICOSA_FACES][3];
faces[0] = computeFaceCenter(vertices[0], vertices[11], vertices[5]);
faces[1] = computeFaceCenter(vertices[0], vertices[5], vertices[1]);
faces[2] = computeFaceCenter(vertices[0], vertices[1], vertices[7]);
faces[3] = computeFaceCenter(vertices[0], vertices[7], vertices[10]);
faces[4] = computeFaceCenter(vertices[0], vertices[10], vertices[11]);
faces[5] = computeFaceCenter(vertices[1], vertices[5], vertices[9]);
faces[6] = computeFaceCenter(vertices[5], vertices[11], vertices[4]);
faces[7] = computeFaceCenter(vertices[11], vertices[10], vertices[2]);
faces[8] = computeFaceCenter(vertices[10], vertices[7], vertices[6]);
faces[9] = computeFaceCenter(vertices[7], vertices[1], vertices[8]);
faces[10] = computeFaceCenter(vertices[3], vertices[9], vertices[4]);
faces[11] = computeFaceCenter(vertices[3], vertices[4], vertices[2]);
faces[12] = computeFaceCenter(vertices[3], vertices[2], vertices[6]);
faces[13] = computeFaceCenter(vertices[3], vertices[6], vertices[8]);
faces[14] = computeFaceCenter(vertices[3], vertices[8], vertices[9]);
faces[15] = computeFaceCenter(vertices[4], vertices[9], vertices[5]);
faces[16] = computeFaceCenter(vertices[2], vertices[4], vertices[11]);
faces[17] = computeFaceCenter(vertices[6], vertices[2], vertices[10]);
faces[18] = computeFaceCenter(vertices[8], vertices[6], vertices[7]);
faces[19] = computeFaceCenter(vertices[9], vertices[8], vertices[1]);
</code></pre>
</details>

<hr class="hr">

<h3>2.4. Closest Icosahedron Face</h3>
<p>To identify the closest icosahedral face, compute the dot product of the 3D Cartesian coordinates with the normal vectors of the 20 icosahedral faces. The face with the highest dot product value is the closest.</p>

<details class="code-container" open><summary class="p">2.4a. Closest Icosahedron Face - Snippet</summary>
<pre><code>private static final int NUM_ICOSA_FACES = 20;

// Computes the dot product of two vectors.
private static double dotProduct(double[] a, double[] b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// Finds the closest icosahedral face to the given vector.
private static int findFace(double[] vec) {
    int face = 0;
    double maxDot = -1;
    for (int i = 0; i < NUM_ICOSA_FACES; i++) {
        double dot = dotProduct(vec, ICOSA_FACES[i]); // previously computed in 2.3a
        if (dot > maxDot) {
            maxDot = dot;
            face = i;
        }
    }
    return face;
}
</code></pre>
</details>

<hr class="hr">

<h3>2.5. XYZ to FaceUVLocal Face Coordinates</h3>
<p>Project the 3D Cartesian coordinates onto the local coordinate system of the identified face i.e. convert 3D coordinates into a 2D coordinate system relative to the face; using the Basis vectors to define a coordinate system on the 2D plane of an icosahedral face.</p>

<details class="code-container"><summary class="p">2.5a. XYZ to Icosahedron FaceUV - Snippet</summary>
<pre><code>
</code></pre>
</details>
<p>Work in Progress!</p>
<hr class="hr">

<h3>2.6. 64-bit H3 index</h3>
<p>Encode the face, resolution, and grid coordinates into a 64-bit H3 index. Use bitwise operations to combine these components into a single integer value:</p>

<details class="code-container" open><summary class="p">2.6a. FaceUV to H3 Index - Snippet</summary>
<pre><code>private static long computeH3Index(double[] localCoords, int face, int resolution) {
    long h3Index = 0L;
    h3Index |= (1L << 63); // Set the mode bit (MSB)
    h3Index |= ((long) face << 45); // Set the base cell (face)
    h3Index |= ((long) resolution << 52); // Set the resolution

    long localX = (long) (localCoords[0] * 1e6);
    long localY = (long) (localCoords[1] * 1e6);
    h3Index |= (localX & 0x1FFFFFFFFFFFL);
    h3Index |= ((localY & 0x1FFFFFFFFFFFL) << 23);

    return h3Index;
}
</code></pre>
</details>

<p>Multiplying by <code>1e6</code> converts the coordinates to a fixed-point representation, making them suitable for encoding in the H3 index format.</p>

<p>Again, this implementation is a simplified presentation of the H3 indexing process, and it does not capture the full accuracy and complexity of the actual H3 calculations. For precise and reliable H3 index calculations, please use the official H3 library provided by Uber.</p>

<hr class="hr">

<h3>2.7. Official H3 library</h3>
<p>Here's a Java snippet using the official H3 library provided by Uber:</p>
<details open class="code-container"><summary class="p">2.7a. Official H3 - Snippet</summary>
<pre><code>import com.uber.h3core.H3Core;

public class H3Index {
    public static void main(String[] args) throws Exception {
        H3Core h3 = H3Core.newInstance();
        double lat = 37.7749;
        double lon = -122.4194;
        int resolution = 9;

        long h3Index = h3.geoToH3(lat, lon, resolution);
        System.out.println(Long.toHexString(h3Index));
    }
}
</code></pre>
</details>


</details>

<hr class="clear-hr"/>

<details><summary class="h3">3. H3 - Conclusion</summary>
</details>

<hr class="clear-hr"/>

<details><summary class="h3">4. References</summary>
<pre style="max-height: 300px"><code>1. Uber Technologies, Inc., "H3: A Hexagonal Hierarchical Spatial Index," GitHub. [Online]. Available: https://github.com/uber/h3.
2. Wikipedia, "Graticule," [Online]. Available: https://en.wikipedia.org/wiki/Graticule.
3. Microsoft, "QuadKey," Microsoft Docs. [Online]. Available: https://learn.microsoft.com/en-us/bingmaps/articles/bing-maps-tile-system.
4. Wikipedia, "Geohash," [Online]. Available: https://en.wikipedia.org/wiki/Geohash.
5. Google, "Google S2 Geometry Library," [Online]. Available: https://s2geometry.io/.
6. Wikipedia, "Icosahedron," [Online]. Available: https://en.wikipedia.org/wiki/Icosahedron.
7. Wikipedia, "Dot product," [Online]. Available: https://en.wikipedia.org/wiki/Dot_product.
8. Wikipedia, "Basis vectors," [Online]. Available: https://en.wikipedia.org/wiki/Basis_(linear_algebra).
9. Wikipedia, "3D Cartesian coordinates," [Online]. Available: https://en.wikipedia.org/wiki/Cartesian_coordinate_system.
10. A. N. Adimurthy, "Spatial Index: Tessellation," PyBlog. [Online]. Available: https://www.pyblog.xyz/spatial-index-tessellation.
11. Wikipedia, "Conceptualization of a Cartogram," [Online]. Available: https://en.wikipedia.org/wiki/Cartogram.
12. Wikipedia, "Golden ratio," [Online]. Available: https://en.wikipedia.org/wiki/Golden_ratio.
13. Wikipedia, "Icosahedron vertices," [Online]. Available: https://en.wikipedia.org/wiki/Icosahedron#Vertices.
14. Wikipedia, "H3: A Hexagonal Hierarchical Spatial Index," [Online]. Available: https://en.wikipedia.org/wiki/H3_(spatial_index).
15. Wikipedia, "Dymaxion map," [Online]. Available: https://en.wikipedia.org/wiki/Dymaxion_map.
16. K. Sahr, "Geodesic Discrete Global Grid Systems," Southern Oregon University. [Online]. Available: https://webpages.sou.edu/~sahrk/sqspc/pubs/gdggs03.pdf.
17. D. F. Marble, "The Fundamental Data Structures for Implementing Digital Tessellation," University of Edinburgh. [Online]. Available: https://www.geos.ed.ac.uk/~gisteac/gis_book_abridged/files/ch36.pdf.
18. J. Castner, "The Application of Tessellation in Geographic Data Handling," Semantic Scholar. [Online]. Available: https://pdfs.semanticscholar.org/feb2/3e69e19875817848ac8694b15f58d2ef52b0.pdf.
19. "Hexagonal Tessellation and Its Application in Geographic Information Systems," YouTube. [Online]. Available: https://www.youtube.com/watch?v=wDuKeUkNLkQ&list=PL0HGds8aHQsAYm86RzQdZtFFeLpIOjk00.
</code></pre>
</details>