---
layout: post
title: "Spatial Index: Grid Systems"
date: 2024-06-12
tags:
- Database
- Spatial Index
author: Adesh Nalpet Adimurthy
image: assets/featured/webp/space-grids.webp
feature: assets/featured/webp/space-grids.webp
category: System Wisdom
description: Grid systems in spatial indexing, including Geohash and Google S2, encode geographic locations for efficient spatial data management. Geohash uses a Z-order curve, offering ease of implementation but has proximity preservation issues. Google S2 subdivides the Earth into hierarchical cells using a spherical projection, providing better proximity handling. The article discusses their encoding processes, advantages, and limitations, with implementation examples.
---

<img class="center-image" src="./assets/featured/webp/space-grids.webp" /> 

<p>This post is a continuation of <a href="/spatial-index-space-filling-curve">Stomping Grounds: Spatial Indexes</a>, but don’t worry if you missed the first part—you’ll still find plenty of new insights right here.</p>

<h3>3. Geohash</h3>

<p><a href="https://en.wikipedia.org/wiki/Geohash" target="_blank">Geohash</a>: Invented in 2008 by Gustavo Niemeyer, encodes a geographic location into a short string of letters and digits. It's a hierarchical spatial data structure that subdivides space into buckets of grid shape using a Z-order curve (<a href="/spatial-index-space-filling-curve#2-space-filling-curves">Section 2.</a>).</p>

<details open class="text-container"><summary class="h4">3.1. Geohash - Intuition</summary>

<p>Earth is round or more accurately, an ellipsoid. Map projection is a set of transformations represent the globe on a plane. In a map projection. Coordinates (latitude and longitude) of locations from the surface of the globe are transformed to coordinates on a plane. And GeoHash Uses <a href="https://en.wikipedia.org/wiki/Equirectangular_projection" target="_blank">Equirectangular projection</a></p>

<img class="center-image-0 center-image" src="./assets/posts/spatial-index/projection.svg" /> 
<p class="figure-header">Figure 21: Equirectangular projection/ Equidistant Cylindrical Projection</p>

<p>The core of GeoHash is just an clever use of Z-order curves. Split the map-projection (rectangle) into 2 equal rectangles, each identified by unique bit strings.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/geohash-level-0.svg" /> 
<p class="figure-header">Figure 22: GeoHash Level 1 - Computation</p>

<p>Observation: the divisions along X and Y axes are interleaved between bit strings. For example: an arbitrary bit string <code>01110 01011 00000</code>, follows:</p>

<img class="center-image-0 center-image" src="./assets/posts/spatial-index/geohash-bit-interleave.svg" />

<p>By futher encoding this to Base32 (<code>0123456789bcdefghjkmnpqrstuvwxyz</code>), we map a unique string to a quadrant in a grid and quadrants that share the same prefix are closer to each other; e.g. <code>000000</code> and <code>000001</code>. By now we know that interleaving trace out a Z-order curve.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/geohash-z-order.svg" /> 
<p class="figure-header">Figure 23: GeoHash Level 1 - Z-Order Curve</p>

<p>Higher levels (higher order z-curves) lead to higher precision. The geohash algorithm can be iteratively repeated for higher precision. That's one cool property of geohash, adding more characters increase precision of the location.</p>

<img class="center-image-0 center-image-80" src="./assets/posts/spatial-index/geohash-level-1.svg" /> 
<img class="center-image-0 center-image-80" src="./assets/posts/spatial-index/geohash-level-2.svg" /> 
<p class="figure-header">Figure 24: GeoHash Level 2</p>

<p>Despite the easy implementation and wide usage of geohash, it inherits the disadvantages of Z-order curves (<a href="/spatial-index-space-filling-curve#2-5-z-order-curve-implementation">Section 2.5</a>): weakly preserved latitude-longitude proximity; does not always guarantee that locations that are physically close are also close on the Z-curve. </p>

<p>Adding on to it, is the use of <a href="https://en.wikipedia.org/wiki/Tissot%27s_indicatrix" target="_blank">equirectangular projection</a>, where the division of the map into equal subspaces leads to unequal/disproportional surface areas, especially near the poles (northern and southern hemisphere). However, there are alternatives such as <a href="https://www.researchgate.net/publication/328727378_GEOHASH-EAS_-_A_MODIFIED_GEOHASH_GEOCODING_SYSTEM_WITH_EQUAL-AREA_SPACES" target="_blank">Geohash-EAS</a> (Equal-Area Spaces).</p>
</details>
<hr class="sub-hr">

<details open class="text-container"><summary class="h4">3.2. Geohash - Implementation</summary>
<p>To Convert a geographical location (latitude, longitude) into a concise string of characters and vice versa:</p>
<ul>
<li>Convert latitude and longitude to a binary strings.</li>
<li>Interleave the binary strings of latitude and longitude.</li>
<li>Geohash: Convert the interleaved binary string into a base32 string.</li>
</ul>

<hr class="sub-hr">

<details class="code-container"><summary class="p">3.2a. Geohash Encoder - Snippet</summary>

<pre><code>public class GeohashEncoder {

    public static String encodeGeohash(double latitude, double longitude, int precision) {
        // 1. Convert Lat and Long into a binary string based on the range.
        String latBin = convertToBinary(latitude, -90, 90, precision * 5 / 2);
        String lonBin = convertToBinary(longitude, -180, 180, precision * 5 / 2);

        // 2. Interweave the binary strings.
        String interwovenBin = interweave(lonBin, latBin);

        // 3. Converts a binary string to a base32 geohash.
        String geohash = binaryToBase32(interwovenBin);

        return geohash.substring(0, precision);
    }

    private static String convertToBinary(double value, double min, double max, int precision) {
        StringBuilder binaryStr = new StringBuilder();
        for (int i = 0; i < precision; i++) {
            double mid = (min + max) / 2;
            if (value >= mid) {
                binaryStr.append('1');
                min = mid;
            } else {
                binaryStr.append('0');
                max = mid;
            }
        }
        return binaryStr.toString();
    }

    private static String interweave(String str1, String str2) {
        StringBuilder interwoven = new StringBuilder();
        for (int i = 0; i < str1.length(); i++) {
            interwoven.append(str1.charAt(i));
            interwoven.append(str2.charAt(i));
        }
        return interwoven.toString();
    }

    private static String binaryToBase32(String binaryStr) {
        String base32Alphabet = "0123456789bcdefghjkmnpqrstuvwxyz";
        StringBuilder base32Str = new StringBuilder();
        for (int i = 0; i < binaryStr.length(); i += 5) {
            String chunk = binaryStr.substring(i, Math.min(i + 5, binaryStr.length()));
            int decimalVal = Integer.parseInt(chunk, 2);
            base32Str.append(base32Alphabet.charAt(decimalVal));
        }
        return base32Str.toString();
    }

    public static void main(String[] args) {
        double latitude = 37.7749;
        double longitude = -122.4194;
        int precision = 5;
        String geohash = encodeGeohash(latitude, longitude, precision);
        System.out.println("Geohash: " + geohash);
    }
}
</code></pre>
</details>
</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">3.3. Geohash - Conclusion</summary>
<p>Similar to <a href="/spatial-index-space-filling-curve#2-7-z-order-curve-and-hilbert-curve-conclusion">Section 2.7</a> (Indexing the Z-values); Geohashes convert latitude and longitude into a single, sortable string, simplifying spatial data management. A <a href="/b-tree">B-trees</a> or search tree such as GiST/SP-GiST (Generalized Search Tree) index are commonly used for geohash indexing in databases.</p>

<p>Prefix Search: Nearby locations share common geohash prefixes, enabling efficient filtering of locations by performing prefix searches on the geohash column</p>

<p>Neighbor Searches: Generate geohashes for a target location and its neighbors to quickly retrieve nearby points. Which also extends to Area Searches: Calculate geohash ranges that cover a specific area and perform range queries to find all relevant points within that region.</p>

<p>Popular databases such as <a href="https://clickhouse.com/docs/en/sql-reference/functions/geo/geohash" target="_blank">ClickHouse</a>, <a href="https://dev.mysql.com/doc/refman/8.4/en/spatial-geohash-functions.html" target="_blank">MySQL</a>, <a href="https://postgis.net/docs/ST_GeoHash.html" target="_blank">PostGIS</a>, <a href="https://cloud.google.com/bigquery/docs/reference/standard-sql/geography_functions#st_geohash" target="_blank">BigQuery</a>, <a href="https://docs.aws.amazon.com/redshift/latest/dg/ST_GeoHash-function.html" target="_blank">RedShift</a> and many others offer built-in geohash function. And many variations have been developed, such as the <a href="https://github.com/yinqiwen/geohash-int" target="_blank">64-bit Geohash</a> and <a href="https://ntnuopen.ntnu.no/ntnu-xmlui/handle/11250/2404058" target="_blank">Hilbert-Geohash</a></p>

<p>Interactive Geohash Visualization: <a href="/geohash" target="_blank">/geohash</a></p>
</details>

<hr class="clear-hr">

<h3>4. Google S2</h3>
<p></p>

<details open class="text-container"><summary class="h4">4.1. S2 - Intuition</summary>

<p>Google's S2 library was released more than 10 years ago and didn't exactly the get the attention it deserved, much later in 2017, Google announced the release of open-source C++ <a href="https://github.com/google/s2geometry" target="_blank">s2geometry library</a>. With the use of Hilbert Curve (<a href="/spatial-index-space-filling-curve#2-2-hilbert-curve-intuition">Section 2.2</a>) and cube face (spherical) projection instead of geohash's Z-order curve and equirectangular projection; S2 addresses (to an extent) the large jumps (<a href="/spatial-index-space-filling-curve#2-5-z-order-curve-implementation">Section 2.5</a>) problem with Z-order curves and disproportional surface areas associated with equirectangular projection.</p>

<p>The core of S2 is the hierarchical decomposition of the sphere into "cells"; done using a <a href="/quadtree" target="_blank">Quad-tree</a>, where a quadrant is recursively subdivided into four equal sub-cells and the use of Hilbet Curve goes hand-in-hand - runs across the centers of the quad-tree’s leaf nodes.</p>
</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">4.2. S2 - Implementation</summary>

<p>The overview of solution is to:</p>
<ul>
    <li>Enclose sphere in cube</li>
    <li>Project point(s) <code>p</code> onto the cube</li>
    <li>Build a quad-tree/hilbert-curve on each cube face (6 faces)</li>
    <li>Assign ID to the quad-tree cell that contains the projection of point(s) <code>p</code></li>
</ul>

<p>Starting with the input <a href="https://en.wikipedia.org/wiki/Geographic_coordinate_system#Latitude_and_longitude" target="_blank">co-ordinates</a>, latitude (Degrees: -90° to +90°. Radians: -π/2 to π/2) and longitude (-180° to +180°. Radians: 0 to 2π). And <a href="https://en.wikipedia.org/wiki/World_Geodetic_System" target="_blank">WGS84</a> is a commmonly standard used in <a href="https://en.wikipedia.org/wiki/Earth-centered,_Earth-fixed_coordinate_system" target="_blank">geocentric coordinate system</a>.</p>

<hr class="hr">

<h3>4.2.1. (Lat, Long) to (X,Y,Z)</h3>

<p>Covert <code>p = (lattitude,longitude) => (x,y,z)</code> XYZ co-ordinate system (<code>x = [-1.0, 1.0], y = [-1.0, 1.0], z = [-1.0, -1.0]</code>), based on coordinates on the unit sphere (unit radius), which is similar to <a href="https://en.wikipedia.org/wiki/Earth-centered,_Earth-fixed_coordinate_system" target="_blank">Earth-centered, Earth-fixed coordinate system</a>.</p>

<img class="center-image-0 center-image-80" src="./assets/posts/spatial-index/ecef.svg" /> 
<p class="figure-header">Figure 25: (lat, long) to (x, y, z) Transformation with ECEF</p>

<p>Where, <code>(x, y, z)</code>: X-axis at latitude 0°, longitude 0° (equator and prime meridian intersection), Y-axis at latitude 0°, longitude 90° (equator and 90°E meridian intersection), Z-axis at latitude 90° (North Pole), Altitude (<code>PM</code> on Figure 25) = Height to the reference ellipsoid/Sphere (Zero for a Round Planet approximation)</p>

<hr class="hr">

<h3>4.2.2. (X,Y,Z) to (Face,U,V)</h3>

<p>To map <code>(x,y,z)</code> to <code>(face, u,v)</code>, each of the six faces of the cube is projected onto the sphere. The process is similar to <a href="https://en.wikipedia.org/wiki/UV_mapping" target="_blank">UV Mapping</a>: to project 3D model surface into a 2D coordinate space. where <code>u</code> and <code>v</code> denote the axes of the 2D plane. In this case, <code>U,V</code> represent the location of a point on one face of the cube.</p>

<p>The projection can simply be imagined as a unit sphere circumscribed by a cube. And a ray is emitted from the center of the sphere to obtain the projection of the point on the sphere to the 6 faces of the cube, that is, the sphere is projected into a cube.</p>

<img class="center-image-0 center-image" src="./assets/posts/spatial-index/s2-cell-step-1-2.svg" /> 
<p class="figure-header">Figure 26: (lat, long) to (x, y, z) and (x, y, z) to (face, u, v)</p>

<p>The <code>face</code> denotes which of the 6 (0 to 5) cube faces a point on the sphere is mapped onto. Figure 27, shows the 6 faces of the cube (<a href="https://en.wikipedia.org/wiki/Cube_mapping" target="_blank">cube mapping</a>) after the projection. For a unit-sphere, for each face, the point <code>u,v = (0,0)</code> represent the center of the face.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/s2-globe.svg" /> 
<p class="figure-header">Figure 27: Cube Face (Spherical) Projection</p>

<p>The evident problem here is that, the linear projection leads to same-area cells on the cube having different sizes on the sphere (Length and Area Distortion), with the ratio of highest to lowest area of <code>5.2</code> (areas on the cube can be up to 5.2 times longer or shorter than the corresponding distances on the sphere).</p>

<details class="code-container"><summary class="p">4.2.2a. S2 FaceXYZ to UV - Snippet</summary>
<pre><code>public static class Vector3 {
    public double x;
    public double y;
    public double z;

    public Vector3(double x, double y, double z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

public static int findFace(Vector3 r) {
    double absX = Math.abs(r.x);
    double absY = Math.abs(r.y);
    double absZ = Math.abs(r.z);

    if (absX >= absY && absX >= absZ) {
        return r.x > 0 ? 0 : 3;
    } else if (absY >= absX && absY >= absZ) {
        return r.y > 0 ? 1 : 4;
    } else {
        return r.z > 0 ? 2 : 5;
    }
}

public static double[] validFaceXYZToUV(int face, Vector3 r) {
    switch (face) {
        case 0:
            return new double[]{r.y / r.x, r.z / r.x};
        case 1:
            return new double[]{-r.x / r.y, r.z / r.y};
        case 2:
            return new double[]{-r.x / r.z, -r.y / r.z};
        case 3:
            return new double[]{r.z / r.x, r.y / r.x};
        case 4:
            return new double[]{r.z / r.y, -r.x / r.y};
        default:
            return new double[]{-r.y / r.z, -r.x / r.z};
    }
}

public static void main(String[] args) {
    Vector3 r = new Vector3(1.0, 2.0, 3.0);
    int face = 0;
    double[] uv = validFaceXYZToUV(face, r);
    System.out.println("u: " + uv[0] + ", v: " + uv[1]);
}
</code></pre>
</details>

<p>The Cube <code>Face</code> is the largest absolute X,Y,Z component, when component is -ve, back faces are used.</p>
<img class="center-image-0 center-image-60" src="./assets/posts/spatial-index/s2-xyz-uv.svg" /> 
<p>Face and XYZ is mapped to UV by using the other two X, Y, Z components (other than largest component of face) and diving it by the largest component, a value between <code>[-1, 1]</code>. Additionally, some faces of the cube are transposed (-ve) to produce the single continuous hilbert curve on the cube.</p>

<hr class="hr">

<h3>4.2.3. (Face,U,V) to (Face,S,T)</h3>

<p>The ST coordinate system is an extension of UV with an additional non-linear transformation layer to address the (Area Preservation) disproportionate sphere surface-area to cube cell mapping. Without which, cells near the cube face edges would be smaller than those near the cube face centers.</p>

<img class="center-image-0 center-image-80" src="./assets/posts/spatial-index/s2-cell-step-3.svg" /> 
<p class="figure-header">Figure 28: (u, v) to (s, t)</p>

<p>S2 uses Quadratic projection for <code>(u,v)</code> => <code>(s,t)</code>. Comparing <code>tan</code> and <code>quadratic</code> projections: The tan projection has the least Area/Distance Distortion. However, quadratic projection, which is an approximation of the tan projection - is much faster and almost as good as tangent.</p>
<table>
        <tr>
            <td></td>
            <td>Area Ratio</td>
            <td>Cell → Point (µs)</td>
            <td>Point → Cell (µs)</td>
        </tr>
        <tr>
            <td>Linear</td>
            <td>5.20</td>
            <td>0.087</td>
            <td>0.085</td>
        </tr>
        <tr>
            <td>Tangent</td>
            <td>1.41</td>
            <td>0.299</td>
            <td>0.258</td>
        </tr>
        <tr style="background-color: rgb(213, 232, 212);">
            <td>Quadratic</td>
            <td>2.08</td>
            <td>0.096</td>
            <td>0.108</td>
        </tr>
    </table>

<p><code>Cell → Point</code> and <code>Point → Cell</code> represents the transformation from (U, V) to (S, T) coordinates and vice versa.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/s2-uv-st-face-0.svg" /> 
<p class="figure-header">Figure 29: (face, u, v) to (face, s, t); for face = 0</p>

<p>For the quadratic transformation: Apply a square root transformation; sqrt(1 + 3 * u) and to maintain the uniformity of the grid cells</p>

<details class="code-container"><summary class="p">4.2.3a. S2 UV to ST - Snippet</summary>
<pre><code>public static double uvToST(double u) {
    if (u >= 0) {
        return 0.5 * Math.sqrt(1 + 3 * u);
    } else {
        return 1 - 0.5 * Math.sqrt(1 - 3 * u);
    }
}

public static void main(String[] args) {
    // (u, v) values in the range [-1, 1]
    double u1 = 0.5;
    double v1 = -0.5;
    
    // Convert (u, v) to (s, t)
    double s1 = uvToST(u1);
    double t1 = uvToST(v1);

    System.out.println("For (u, v) = (" + u1 + ", " + v1 + "):");
    System.out.println("s: " + s1);
    System.out.println("t: " + t1);
}
</code></pre>
</details>

<hr class="hr">

<h3>4.2.4. (Face,S,T) to (Face,I,J)</h3>

<p>The IJ coordinates are discretized ST coordinates and divides the ST plane into <code>2<sup>30</sup> × 2<sup>30</sup></code>, i.e. the i and j coordinates in S2 range from <code>0 to 2<sup>30</sup> - 1</code>. And represent the two dimensions of the leaf-cells (lowest-level cells) on a cube face.</p>

<p>Why 2<sup>30</sup>? The i and j coordinates are each represented using 30 bits, which is <code>2<sup>30</sup></code> distinct values for both i and j coordinates (every cm² of the earth), this large range allows precise positioning within each face of the cube (high spatial resolution). The total number of unique cells is <code>6 x (2<sup>30</sup> × 2<sup>30</sup>)</code></p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/s2-st-ij.svg" />
<p class="figure-header">Figure 30: (face, s, t) to (face, i, j); for face = 0</p>

<details class="code-container"><summary class="p">4.2.4a. S2 ST to IJ - Snippet</summary>
<pre><code>public static int stToIj(double s) {
  return Math.max(
    0, Math.min(1073741824 - 1, (int) Math.round(1073741824 * s))
  );
}
</code></pre>
</details>

<hr class="hr">

<h3>4.2.5. (Face,I,J) to S2 Cell ID</h3>
<p>The hierarchical sub-division of each cube face into 4 equal quadrants calls for Hilbert Space-Filling Curve (<a href="/spatial-index-space-filling-curve#2-2-hilbert-curve-intuition">Section 2.2</a>): to enumerate cells along a Hilbert space-filling curve.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/s2-ij-cell.svg" />
<p class="figure-header">Figure 31: (face, i, j) to Hilbert Curve Position</p>

<p>Hilbert Curve preserves spatial locality, meaning, the values that are close on the cube face/surface, are numerically close in the Hilbert curve position (illustration in Figure 31 - Level 3).</p>

<p>Transformation: The Hilbert curve transforms the IJ coordinate position on the cube face from 2D to 1D and is given by a <code>60 bit</code> integer (<code>0 to 2<sup>60</sup></code>).</p>

<details class="code-container"><summary class="p">4.2.5a. S2 IJ to S2 Cell ID - Snippet</summary>
<pre><code>public class S2CellId {
    private static final long MAX_LEVEL = 30;
    private static final long POS_BITS = 2 * MAX_LEVEL + 1;
    private static final long FACE_BITS = 3;
    private static final long FACE_MASK = (1L << FACE_BITS) - 1;
    private static final long POS_MASK = (1L << POS_BITS) - 1;

    public static long faceIjToCellId(int face, int i, int j) {
        // Face Encoding
        long cellId = ((long) face) << POS_BITS;
        // Loop from MAX_LEVEL - 1 down to 0
        for (int k = MAX_LEVEL - 1; k >= 0; --k) {
            // Hierarchical Position Encoding
            int mask = 1 << k;
            long bits = (((i & mask) != 0) ? 1 : 0) << 1 | (((j & mask) != 0) ? 1 : 0);
            cellId |= bits << (2 * k);
        }
        return cellId;
    }

    public static void main(String[] args) {
        int face = 2; 
        int i = 536870912;
        int j = 536870912;

        long cellId = faceIjToCellId(face, i, j);
        System.out.println("S2 Cell ID: " + cellId);
    }
}
</code></pre>
</details>

<p>The <b>S2 Cell ID</b> is represented by a <code>64-bit</code> integer,</p> 
<ul>
<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/s2-cell-id.svg" />
<p class="figure-header">Figure 32: (face, i, j) to S2 Cell ID</p>
<li>the left <code>3 bits</code> are used to represent the cube face <code>[0-5],</code></li>
<li>the next following <code>60 bits</code> represents the Hilbert Curve position,</li>
<li>with <code>[0-30]</code> levels; two bits for every higher order/level, followed by a trailing <code>1</code> bit, which is a marker to identify the level of the cell (by position).</li>
<li>and the last digits are padded with 0s</li>
</ul>

<pre><code>fffpppp...pppppppp1  # Level 30 cell ID
fffpppp...pppppp100  # Level 29 cell ID
fffpppp...pppp10000  # Level 28 cell ID
...
...
...
fffpp10...000000000  # Level 1 cell ID
fff1000...000000000  # Level 0 cell ID
</code></pre>
<p>Notice the position of trailing <code>1</code> and padded <code>0</code>s, correlated to the level.</p>
<hr class="hr">

<p><b>S2 Tokens</b> are a string representation of S2 Cell IDs (uint64), which can be more convenient for storage.</p>

<details class="code-container"><summary class="p">4.2.5b. S2 Cell ID to S2 Token - Snippet</summary>
<pre><code>public static String cellIdToToken(long cellId) {
    // The zero token is encoded as 'X' rather than as a zero-length string
    if (cellId == 0) {
        return "X";
    }

    // Convert cell ID to a hex string and strip any trailing zeros
    String hexString = Long.toHexString(cellId).replaceAll("0*$", "");
    return hexString;
}

public static void main(String[] args) {
    long cellId = 3383821801271328768L; // Given example value

    // Convert S2 Cell ID to S2 Token
    String token = cellIdToToken(cellId);

    System.out.println("S2 Cell ID: " + cellId);
    System.out.println("S2 Token: " + token);
}
</code></pre>
</details>
<p>It's similar to Geohash, however, prefixes from a high-order S2 token does not yield a parent lower-order token, because the trailing 1 bit in S2 cell ID wouldn't be set correctly. Convert S2 Cell ID to an S2 Token by encoding the ID into a base-16 (hexadecimal) string.</p>
</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">4.3. S2 - Conclusion</summary>
<p>Google's S2 provides spatial indexing by using hierarchical decomposition of the sphere into cells through a combination of Hilbert curves and cube face (spherical) projection. This approach mitigates some of the spatial locality issues present in Z-order curves and offers more balanced surface area representations. S2's use of (face, u, v) coordinates, quadratic projection, and Hilbert space-filling curves ensures efficient and precise spatial indexing.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/s2-stats.svg" />

<p>Closing with a strong pro and a con, S2 offers a high resolution of as low as <code>0.48 cm²</code> cell size (level 30), but the number of cells required to cover a given polygon isn't the best. This makes it a good transition to talk about Uber's <a href="https://www.uber.com/en-CA/blog/h3/" target="_blank">H3</a>. The question is, <a href="/cartograms-documentation#hexagonsvssquares">Why Hexagons?</a></p>
</details>

<hr class="clear-hr">

<details><summary class="h3">3. References</summary>

<pre style="max-height: 300px"><code>6. Christian S. Perone, "Google’s S2, geometry on the sphere, cells and Hilbert curve," in Terra Incognita, 14/08/2015, https://blog.christianperone.com/2015/08/googles-s2-geometry-on-the-sphere-cells-and-hilbert-curve/. [Accessed: 12-Jun-2024].
7. B. Feifke, "Geospatial Indexing Explained," Ben Feifke, Dec. 2022. [Online]. Available: https://benfeifke.com/posts/geospatial-indexing-explained/. [Accessed: 12-Jun-2024].
8. "S2 Concepts," S2 Geometry Library Documentation, 2024. [Online]. Available: https://docs.s2cell.aliddell.com/en/stable/s2_concepts.html. [Accessed: 13-Jun-2024].
9. "Geospatial Indexing: A Look at Google's S2 Library," CNIter Blog, Mar. 2023. [Online]. Available: https://cniter.github.io/posts/720275bd.html. [Accessed: 13-Jun-2024].
10. "S2 Geometry Library," S2 Geometry, 2024. [Online]. Available: https://s2geometry.io/. [Accessed: 13-Jun-2024].
</code></pre>
</details>