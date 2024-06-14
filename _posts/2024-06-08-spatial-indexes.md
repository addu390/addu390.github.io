---
layout: post
title: "Stomping Grounds: Spatial Indexes"
date: 2024-06-07
state: Draft
tags:
- Database
- Index
tips:
- <img class="twemoji" src="../assets/img/emoji/warning.svg" alt=""> WIP
author: Adesh Nalpet Adimurthy
category: System Wisdom
feature: assets/featured/spatio-temporal-index.png
---

<img class="center-image" src="./assets/featured/spatio-temporal-index.png" /> 

<p>Brewing! <a href="https://pyblog.medium.com/subscribe" target="_blank">Subscribe</a> now to be the first to know when it's live 🐙</p>

<details open><summary class="h3">0. Overview</summary>
<p>Spatial data has grown (/is growing) rapidly thanks to web services tracking where and when users do things. Most applications add location tags and often allow users check in specific places and times. This surge is largely due to smartphones, which act as location sensors, making it easier than ever to capture and analyze this type of data.</p>

<p>The goal of this post is to dive into the different spatial indexes that are widely used in both relational and non-relational databases. We'll look at the pros and cons of each type, and also discuss which indexes are the most popular today.</p>

<img class="center-image-0" src="./assets/posts/spatial-index/spatial-index-types.svg" /> 
<p class="figure-header">Figure 0: Types of Spatial Indexes</p>

<p>Spatial indexes fall into two main categories: space-driven and data-driven structures. Data-driven structures, like the R-tree family, are tailored to the distribution of the data itself. Space-driven structures include partitioning trees (kd-trees, quad-trees), space-filling curves (Z-order, Hilbert), and grid systems (H3, S2, Geohash), each partitioning space to optimize spatial queries. This classification isn't exhaustive, as many other methods cater to specific needs in spatial data management.</p>

</details>

<hr class="clear-hr">

<details open><summary class="h3">1. Foundation</summary>
<p>To understand the need for spatial indexes, or more generally, a way to index multi-dimensional data.</p>
<img class="center-image-40" src="./assets/posts/spatial-index/no-sort-no-partition-table.svg" /> 
<p class="figure-header">Figure 1: Initial Table Structure</p>
<p>Consider a table with the following fields: <code>device</code>, <code>X</code>, and <code>Y</code>, all of which are integers ranging from 1 to 4. Data is inserted into this table randomly by an external application.</p>

<img class="center-image" src="./assets/posts/spatial-index/no-sort-no-partition-full-scan.svg" /> 
<p class="figure-header">Figure 2: Unpartitioned and Unsorted Table</p>
<p>Currently, the table is neither partitioned nor sorted. As a result, the data is distributed across all files (8 files), each containing a mix of all ranges. This means all files are similar in nature. Running a query like <code>Device = 1 and X = 2</code> requires a full scan of all files, which is inefficient.</p>

<img class="center-image-90" src="./assets/posts/spatial-index/no-sort-full-scan.svg" /> 
<p class="figure-header">Figure 3: Partitioning by Device</p>
<p>To optimize this, we partition the table by the <code>device</code> field into 4 partitions: <code>Device = 1</code>, <code>Device = 2</code>, <code>Device = 3</code>, and <code>Device = 4</code>. Now, the same query (<code>Device = 1 and X = 2</code>) only needs to scan the relevant partition. This reduces the scan to just 2 files.</p>

<img class="center-image-90" src="./assets/posts/spatial-index/partial-scan-x.svg" /> 
<p class="figure-header">Figure 4: Sorting Data Within Partitions</p>
<p>Further optimization can be achieved by sorting the data within each partition by the <code>X</code> field. With this setup, each file in a partition holds a specific range of <code>X</code> values. For example, one file in the <code>Device = 1</code> partition hold <code>X = 1 to 2</code>. This makes the query <code>Device = 1 and X = 2</code> even more efficient.</p>

<img class="center-image-90" src="./assets/posts/spatial-index/no-sort-full-scan-y.svg" /> 
<p class="figure-header">Figure 5: Limitation with Sorting on a Single Field</p>
<p>However, if the query changes to <code>Device = 1 and Y = 2</code>, the optimization is lost because the sorting was done on <code>X</code> and not <code>Y</code>. This means the query will still require scanning the entire partition for <code>Device = 1</code>, bringing us back to a less efficient state.</p>

<p>At this point, there's a clear need for efficiently partitioning 2-dimensional data. Why not use B-tree with a composite index? A composite index prioritizes the first column in the index, leading to inefficient querying for the second column. This leads us back to the same problem, particularly when both dimensions need to be considered simultaneously for efficient querying.</p>
</details>

<hr class="clear-hr">

<details open><summary class="h3">2. Spatial Indexes</summary>
<p></p>

<details open class="text-container"><summary class="h4">2.1. Space-Filling Curves</summary>
<p><code>X</code> and <code>Y</code> from 1 to 4 on a 2D axis. The goal is to traverse the data and number them accordingly (the path).</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/space-filling-trivial-details.svg" /> 
<p class="figure-header">Figure 6: Exploring Space-Filling Curve and Traversing the X-Y Axis</p>

<p>Starting from <code>Y = 1</code> and <code>X = 1</code>, as we traverse up to <code>X = 1</code> and <code>Y = 4</code>, it's evident that there is no locality preservation (Lexicographical Order). The distance between points <code>(1, 4)</code> and <code>(1, 3)</code> is 6, a significant difference for points that are quite close to each other. Grouping this data into files keeps unrelated data together and ended up sorting by one column while ignoring the information in the other column (back to square one). i.e. <code>X = 2</code> leads to a full scan.</p>

<hr class="hr">

<h3>2.1.1. Z-Order Curve - Intuition</h3>
<p>A recursive Z pattern, also known as the Z-order curve, is an effective way to preserve locality in many cases.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/z-order-types.svg" /> 
<p class="figure-header">Figure 7: Z-Order Curve Types</p>
<p>The Z-order curve can take many shapes, depending on which coordinate goes first. The typical Z-shape occurs when the Y-coordinate goes first (most significant bit), and the upper left corner is the base. A mirror image Z-shape occurs when the Y-coordinate goes first and the lower left corner is the base. An N-shape occurs when the X-coordinate goes first and the lower left corner is the base.</p>

<p>Z-order curve grows exponentially, and the next size is the second-order curve that has 2-bit sized dimensions. Duplicate the first-order curve four times and connect them together to form a continuous curve.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/z-order.svg" /> 
<p class="figure-header">Figure 8: Z-Order Curve</p>

<p>Points <code>(1, 4)</code> and <code>(1, 3)</code> are separated by a single square. With 4 files based on this curve, the data is not spread out along a single dimension. Instead, the 4 files are clustered across both dimensions, making the data selective on both <code>X</code> and <code>Y</code> dimensions.</p>

<hr class="hr">

<h3>2.1.2. Hilbert Curve - Intuition</h3>

<p>The Hilbert curve is another type of space-filling curve that serve a similar purpose, rather than using a Z-shaped pattern like the Z-order curve, it uses a gentler U-shaped pattern. When compared with the Z-order curve in Figure 9, it’s quite clear that the Hilbert curve always maintains the same distance between adjacent data points.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/hilbert-second-order.svg"/>
<p class="figure-header">Figure 9: First Order and Second Order Hilbert Curve</p>
<p>Hilbert curve also grows exponentially, to do so, duplicate the first-order curve and connect them. Additionally, some of the first-order curves are rotated to ensure that the interconnections are not larger than 1 point.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/hilbert-exponent.svg" /> 
<p>Comparing with the Z-curves (from Figure 8, higher-order in Figure 18), the Z-order curve is longer than the Hilbert curve at all levels, for the same area.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/hilbert-types.svg"/> 
<p class="figure-header">Figure 10: Hilbert Curve Types</p>
<p>Although there are quite a lot of varaints of Hilbert curve, the common pattern is to rotate by 90 degrees and repeat the pattern in next higher order(s).</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/hilbert-curve.svg" /> 
<p class="figure-header">Figure 11: Hilbert Curve</p>
<p>Hilbert curves traverse through the data, ensuring that multi-dimensional data points that are close together in 2D space remain close together along the 1D line or curve, thus preserving locality and enhancing query efficiency across both dimensions.</p>

<hr class="hr">

<h3>2.1.3. Z-Order Curve and Hilbert Curve - Comparison</h3>

<p>Taking an example, if we query for <code>X = 3</code>, we only need to search 2 of the files. Similarly, for <code>Y = 3</code>, the search is also limited to 2 files in both Z-order and Hilbert Curves</p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/z-order-curve-example.svg" /> 
<p class="figure-header">Figure 12: Z-Order Curve - Example</p>

<p>Unlike a hierarchical sort on only one dimension, the data is selective across both dimensions, making the multi-dimensional search more efficient.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/hilbert-curve-example.svg" /> 
<p class="figure-header">Figure 13: Hilbert Curve - Example</p>

<p>Although both the curves give a similar advantage, the main shortcoming with Z-order curve: it fails to maintain perfect data locality across all the data points in the curve. In Figure 12, notice the data points between index 8 and 9 are further apart. As the size of the Z-curve increases, so does the distance between such points that connect different parts of curve together.</p>

<p>Hilbert curve is more preferred over the Z-order curve for ensuring better data locality and Z-order curve is still widely used because of it's simplicity.</p>

<hr class="hr">

<h3>2.1.4. Optimizing with Z-Values</h3>

<p>In the examples so far, we have presumed that the <code>X</code> and <code>Y</code> values are dense, meaning that there is a value for every combination of <code>X</code> and <code>Y</code>. However, in real-world scenarios, data can be sparse, with many <code>X, Y</code> combinations missing</p>

<img class="center-image-0 center-image-80" src="./assets/posts/spatial-index/3-partition-curves.svg" /> 
<p class="figure-header">Figure 14: Flexibility in Number of Files</p>
<p>The number of files (4 in the prior examples) isn't necessarily dictated. Here's what 3 files would look like using both Z-order and Hilbert curves. The benefits still holds to an extent because of the space-filling curve, which efficiently clusters related data points.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/z-order-sparse.svg" /> 
<p class="figure-header">Figure 15: Optimizing with Z-Values</p>
<p>To improve efficiency, we can use Z-values. If files are organized by Z-values, each file has a min-max Z-value range. Filters on <code>X</code> and <code>Y</code> can be transformed into Z-values, enabling efficient querying by limiting the search to relevant files based on their Z-value ranges.</p>

<img class="center-image-0" src="./assets/posts/spatial-index/z-order-z-values.svg" /> 
<p class="figure-header">Figure 16: Efficient Querying with Min-Max Z-Values</p>
<p>Consider a scenario where the min-max Z-values of 3 files are <code>1 to 5</code>, <code>6 to 9</code>, and <code>13 to 16</code>. Querying by <code>2 ≤ X ≤ 3</code> and <code>3 ≤ Y ≤ 4</code> would initially require scanning 2 files. However, if we convert these ranges to their Z-value equivalent, which is <code>10 ≤ Z ≤ 15</code>, we only need to scan one file, since the min-max Z-values are known.</p>

<hr class="hr">

<h3>2.1.5. Z-Order Curve - Implementation</h3>

<p>So far, wkt, Z-ordering arranges the 2D pairs on a 1-dimensional line. More importantly, values that were close together in the 2D plane would still be close to each other on the Z-order line. The implementation goal is to derive Z-Values that preserves spatial locality from M-dimensional data-points (Z-ordering is not limited to 2-dimensional space and it can be abstracted to work in any number of dimensions)</p>

<p>Z-order bit-interleaving is a technique that interleave bits of two or more values to create a 1-D value while spatial locality is preserved:</p>

<img class="center-image-40" src="./assets/posts/spatial-index/interleave.svg" /> 
<p class="figure-header">Figure 17: Bit Interleaving</p>
<p>Example: 4-bit values <code>X = 10</code>, <code>Y = 12</code> on a 2D grid, <code>X = 1010</code>, <code>Y = 1100</code>, then interleaved value <code>Z = 1110 0100</code> (<code>228</code>)</p>

<details class="code-container"><summary class="p">2.1.5a. Z-Order Curve - Snippet</summary>

<pre><code>public class ZOrderCurve {

    // Function to interleave bits of two integers x and y
    public static long interleaveBits(int x, int y) {
        long z = 0;
        for (int i = 0; i < 32; i++) {
            z |= (long)((x & (1 << i)) << i) | ((y & (1 << i)) << (i + 1));
        }
        return z;
    }

    // Function to compute the Z-order curve values for a list of points
    public static long[] zOrderCurve(int[][] points) {
        long[] zValues = new long[points.length];
        for (int i = 0; i < points.length; i++) {
            int x = points[i][0];
            int y = points[i][1];
            zValues[i] = interleaveBits(x, y);
        }
        return zValues;
    }

    public static void main(String[] args) {
        int[][] points = { {1, 2}, {3, 4}, {5, 6} };
        long[] zValues = zOrderCurve(points);

        System.out.println("Z-order values:");
        for (long z : zValues) {
            System.out.println(z);
        }
    }
}
</code></pre>
</details>

<hr class="hr">

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/z-order-2d-plane.svg" /> 
<p class="figure-header">Figure 18: 2-D Z-Order Curve Space</p>

<p>From the above Z-order keys, we see that points that are close to each other in the original space have close Z-order keys. For instance, points sharing the prefix <code>000</code> in their Z-order keys are close in 2D space, while points with the prefix <code>110</code> indicate greater distance.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/z-order-success.svg" /> 
<p class="figure-header">Figure 19: 2-D Z-Order Curve Space and a Query Region</p>
<p>Now that we know how to calculate the z-order keys, we can use the z-order keys to define a range of values to read (reange-query), to do so, we have to find the lower and upper counds. For example: The query rectangle: <code>2 ≤ X ≤ 3</code> to <code>4 ≤ Y ≤ 5</code>, the lower bound is <code>Z-Order(X = 2, Y = 4) = 100100</code> and upper bound is <code>(X = 3, Y = 5) = 100111</code>, translates to Z-order values of <code>36</code> and <code>39</code>.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/z-order-danger.svg" /> 
<p class="figure-header">Figure 20: 2-D Z-Order Curve Space and a Query Region (The Problem)</p>
<p>However, range queries based on Z-Order keys are not always present in a continuous Z path. For example: The query rectangle <code>1 ≤ X ≤ 3</code> to <code>3 ≤ Y ≤ 4</code>, the lower bound <code>Z-Order(X = 1, Y = 3) = 001011</code> and upper bound is <code>(X = 3, Y = 4) = 100101</code>, translates to Z-order values of <code>11 and 37</code> - optimized using subranges.</p>

<p>The Z-order curve weakly preserves latitude-longitude proximity, i.e. two locations that are close in physical distance are not guaranteed to be close following the Z-curve</p>

<hr class="hr">

<h3>2.1.6. Hilbert Curve - Implementation</h3>
<p>From <a href="#2-1-2-hilbert-curve-intuition">Section 2.1.2</a>, wkt: The Hilbert curve implementation converts 2D coordinates to a single scalar value that preserves spatial locality by recursively rotating and transforming the coordinate space.</p>

<p>In the code snippet: The <code>xyToHilbert</code> function computes this scalar value using bitwise operations, while the <code>hilbertToXy</code> function reverses this process. This method ensures that points close in 2D space remain close in the 1D Hilbert curve index, making it useful for spatial indexing.</p>

<details class="code-container"><summary class="p">2.1.6a. Hilbert Curve - Snippet</summary>
<pre><code>public class HilbertCurve {
    // Rotate/flip a quadrant appropriately
    private static void rot(int n, int[] x, int[] y, int rx, int ry) {
        if (ry == 0) {
            if (rx == 1) {
                x[0] = n - 1 - x[0];
                y[0] = n - 1 - y[0];
            }
            // Swap x and y
            int temp = x[0];
            x[0] = y[0];
            y[0] = temp;
        }
    }

    // Convert (x, y) to Hilbert curve distance
    public static int xyToHilbert(int n, int x, int y) {
        int d = 0;
        int[] ix = { x };
        int[] iy = { y };

        for (int s = n / 2; s > 0; s /= 2) {
            int rx = (ix[0] & s) > 0 ? 1 : 0;
            int ry = (iy[0] & s) > 0 ? 1 : 0;
            d += s * s * ((3 * rx) ^ ry);
            rot(s, ix, iy, rx, ry);
        }

        return d;
    }

    // Convert Hilbert curve distance to (x, y)
    public static void hilbertToXy(int n, int d, int[] x, int[] y) {
        int rx, ry, t = d;
        x[0] = y[0] = 0;
        for (int s = 1; s < n; s *= 2) {
            rx = (t / 2) % 2;
            ry = (t ^ rx) % 2;
            rot(s, x, y, rx, ry);
            x[0] += s * rx;
            y[0] += s * ry;
            t /= 4;
        }
    }

    public static void main(String[] args) {
        int n = 16; // size of the grid (must be a power of 2)
        int x = 5;
        int y = 10;
        int d = xyToHilbert(n, x, y);
        System.out.println("The Hilbert curve distance for (" + x + ", " + y + ") is: " + d);

        int[] point = new int[2];
        hilbertToXy(n, d, point, point);
        System.out.println("The coordinates for Hilbert curve distance " + d + " are: (" + point[0] + ", " + point[1] + ")");
    }
}
</code></pre>
</details>

<hr class="hr">

<h3>2.1.7. Z-Order Curve and Hilbert Curve - Conclusion</h3>

<p>Usage: Insert data points and their Z-order keys/Hilbert Keys (let's call it Z and H keys) into a one-dimensional hierarchical index structure, such as a B-Tree or Quad-Tree. For range or nearest neighbor queries, convert the search criteria into Z/H keys or range of keys. After retrieval, further filter the results as necessary to remove any garbage values.</p>

<p>To conclude: Space-Filling Curves such as Z-Order/Hilbert indexing is a powerful technique to query higher-dimensional data, especially as the data volumes grows. By combining bits from multiple dimensions into a single value, space-Filling Curves indexing preserves spatial locality, enabling efficient data indexing and retrieval.</p>

<p>However, as seen in <a href="#2-1-5-z-order-curve-implementation">Section 2.1.5</a>, large jumps along the Z-Order curve can affect certain types of queries (better with Hilbert curves <a href="#2-1-2-hilbert-curve-intuition">Section 2.1.2</a>). The success of Z-Order indexing relies on the data's distribution and cardinality. Therefore, it is essential to evaluate the nature of the data, query patterns, performance needs and limitation(s) of indexing strategies.</p>

</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">2.2. Grid System</summary>

<p>Earth is round or more accurately, an ellipsoid. Map projection is a set of transformations represent the globe on a plane. In a map projection. Coordinates (latitude and longitude) of locations from the surface of the globe are transformed to coordinates on a plane. And GeoHash Uses <a href="https://en.wikipedia.org/wiki/Equirectangular_projection" target="_blank">Equirectangular projection</a></p>

<img class="center-image-0 center-image" src="./assets/posts/spatial-index/projection.svg" /> 
<p class="figure-header">Figure 21: Equirectangular projection/ Equidistant Cylindrical Projection</p>

<hr class="hr">

<h3>2.2.1. Geohash - Intuition</h3>
<p><a href="https://en.wikipedia.org/wiki/Geohash" target="_blank">Geohash</a>: Invented in 2008 by Gustavo Niemeyer, encodes a geographic location into a short string of letters and digits. It's a hierarchical spatial data structure that subdivides space into buckets of grid shape using a Z-order curve (<a href="#2-1-space-filling-curves">Section 2.1</a>).</p>

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

<p>Despite the easy implementation and wide usage of geohash, it inherits the disadvantages of Z-order curves (<a href="#2-1-5-z-order-curve-implementation">Section 2.1.5</a>): weakly preserved latitude-longitude proximity; does not always guarantee that locations that are physically close are also close on the Z-curve. </p>

<p>Adding on to it, is the use of <a href="https://en.wikipedia.org/wiki/Tissot%27s_indicatrix" target="_blank">equirectangular projection</a>, where the division of the map into equal subspaces leads to unequal/disproportional surface areas, especially near the poles (northern and southern hemisphere). However, there are alternatives such as <a href="https://www.researchgate.net/publication/328727378_GEOHASH-EAS_-_A_MODIFIED_GEOHASH_GEOCODING_SYSTEM_WITH_EQUAL-AREA_SPACES" target="_blank">Geohash-EAS</a> (Equal-Area Spaces).</p>

<hr class="hr">

<h3>2.2.2. Geohash - Implementation</h3>
<p>To Convert a geographical location (latitude, longitude) into a concise string of characters and vice versa:</p>
<ul>
<li>Convert latitude and longitude to a binary strings.</li>
<li>Interleave the binary strings of latitude and longitude.</li>
<li>Geohash: Convert the interleaved binary string into a base32 string.</li>
</ul>

<hr class="sub-hr">

<details class="code-container"><summary class="p">2.2.2a. Geohash Encoder - Snippet</summary>

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

<hr class="hr">

<h3>2.2.3. Geohash - Conclusion</h3>
<p>Similar to <a href="#2-1-7-z-order-curve-and-hilbert-curve-conclusion">Section 2.1.7</a> (Indexing the Z-values); Geohashes convert latitude and longitude into a single, sortable string, simplifying spatial data management. A B-trees or search tree such as GiST/SP-GiST (Generalized Search Tree) index are commonly used for geohash indexing in databases.</p>

<p>Prefix Search: Nearby locations share common geohash prefixes, enabling efficient filtering of locations by performing prefix searches on the geohash column</p>

<p>Neighbor Searches: Generate geohashes for a target location and its neighbors to quickly retrieve nearby points. Which also extends to Area Searches: Calculate geohash ranges that cover a specific area and perform range queries to find all relevant points within that region.</p>

<p>Popular databases such as <a href="https://clickhouse.com/docs/en/sql-reference/functions/geo/geohash" target="_blank">ClickHouse</a>, <a href="https://dev.mysql.com/doc/refman/8.4/en/spatial-geohash-functions.html" target="_blank">MySQL</a>, <a href="https://postgis.net/docs/ST_GeoHash.html" target="_blank">PostGIS</a>, <a href="https://cloud.google.com/bigquery/docs/reference/standard-sql/geography_functions#st_geohash" target="_blank">BigQuery</a>, <a href="https://docs.aws.amazon.com/redshift/latest/dg/ST_GeoHash-function.html" target="_blank">RedShift</a> and many others offer built-in geohash function.</p>

<p>And many variations have been developed, such as the <a href="https://github.com/yinqiwen/geohash-int" target="_blank">64-bit Geohash</a> and <a href="https://ntnuopen.ntnu.no/ntnu-xmlui/handle/11250/2404058" target="_blank">Hilbert-Geohash</a></p>

<hr class="hr">

<h3>2.2.4. S2 - Intuition</h3>

<p>Google's S2 library was released more than 10 years ago and didn't exactly the get the attention it deserved, much later in 2017, Google announced the release of open-source C++ <a href="https://github.com/google/s2geometry" target="_blank">s2geometry library</a>. With the use of Hilbert Curve (<a href="">Section 2.1.2</a>) and cube map projection instead of geohash's Z-order curve and equirectangular projection; S2 addresses (to an extent) the large jumps (<a href="">Section 2.1.5</a>) problem with Z-order curves and disproportional surface areas associated with equirectangular projection.</p>

<p>The core of S2 is the hierarchical decomposition of the sphere into "cells"; done using a <a href="/quadtree" target="_blank">Quad-tree</a>, where a quadrant is recursively subdivided into four equal sub-cells and the use of Hilbet Curve goes hand-in-hand - runs across the centers of the quad-tree’s leaf nodes.</p>

<hr class="hr">

<h3>2.2.5. S2 - Implementation</h3>

<p>The overview of solution is to:</p>
<ul>
    <li>Enclose sphere in cube</li>
    <li>Project point(s) <code>p</code> onto the cube</li>
    <li>Build a quad-tree/hilbert-curve on each cube face (6 faces)</li>
    <li>Assign ID to the quad-tree cell that contains the projection of point(s) <code>p</code></li>
</ul>

<p>Starting with the input <a href="https://en.wikipedia.org/wiki/Geographic_coordinate_system#Latitude_and_longitude" target="_blank">co-ordinates</a>, latitude (Degrees: -90° to +90°. Radians: -π/2 to π/2) and longitude (-180° to +180°. Radians: 0 to 2π). And <a href="https://en.wikipedia.org/wiki/World_Geodetic_System" target="_blank">WGS84</a> is a commmonly standard used in <a href="https://en.wikipedia.org/wiki/Earth-centered,_Earth-fixed_coordinate_system" target="_blank">geocentric coordinate system</a>.</p>

<hr class="hr">

<h3>2.2.5a. (Lat, Long) to (X,Y,Z)</h3>

<p>Covert <code>p = (lattitude,longitude) => (x,y,z)</code> XYZ co-ordinate system (<code>x = [-1.0, 1.0], y = [-1.0, 1.0], z = [-1.0, -1.0]</code>), based on coordinates on the unit sphere (unit radius), which is similar to <a href="https://en.wikipedia.org/wiki/Earth-centered,_Earth-fixed_coordinate_system" target="_blank">Earth-centered, Earth-fixed coordinate system</a>.</p>

<img class="center-image-0 center-image-80" src="./assets/posts/spatial-index/ecef.svg" /> 
<p class="figure-header">Figure 25: (lat, long) to (x, y, z) Transformation with ECEF</p>

<p>Where, <code>(x, y, z)</code>: X-axis at latitude 0°, longitude 0° (equator and prime meridian intersection), Y-axis at latitude 0°, longitude 90° (equator and 90°E meridian intersection), Z-axis at latitude 90° (North Pole), Altitude (<code>PM</code> on Figure 25) = Height to the reference ellipsoid/Sphere (Zero for a Round Planet approximation)</p>

<hr class="hr">

<h3>2.2.5b. (X,Y,Z) to (Face,U,V)</h3>

<p>To map <code>(x,y,z)</code> to <code>(face, u,v)</code>, each of the six faces of the cube is projected onto the sphere. The process is similar to <a href="https://en.wikipedia.org/wiki/UV_mapping" target="_blank">UV Mapping</a>: to project 3D model surface into a 2D coordinate space. where <code>u</code> and <code>v</code> denote the axes of the 2D plane. In this case, <code>U,V</code> represent the location of a point on one face of the cube.</p>

<p>The projection can simply be imagined as a unit sphere circumscribed by a cube. And a ray is emitted from the center of the sphere to obtain the projection of the point on the sphere to the 6 faces of the cube, that is, the sphere is projected into a cube.</p>

<img class="center-image-0 center-image" src="./assets/posts/spatial-index/s2-cell-step-1-2.svg" /> 
<p class="figure-header">Figure 26: (lat, long) to (x, y, z) and (x, y, z) to (face, u, v)</p>

<p>The <code>face</code> denotes which of the 6 (0 to 5) cube faces a point on the sphere is mapped onto. Figure 27, shows the 6 faces of the cube (<a href="https://en.wikipedia.org/wiki/Cube_mapping" target="_blank">cube mapping</a>) after the projection. For a unit-sphere, for each face, the point <code>u,v = (0,0)</code> represent the center of the face.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/s2-globe.svg" /> 
<p class="figure-header">Figure 27: Cube Face Projection</p>

<p>The evident problem here is that, the linear projection leads to same-area cells on the cube having different sizes on the sphere (Length and Area Distortion), with the ratio of highest to lowest area of <code>5.2</code> (areas on the cube can be up to 5.2 times longer or shorter than the corresponding distances on the sphere).</p>

<details class="code-container"><summary class="p">2.2.5c. S2 FaceXYZ to UV - Snippet</summary>
<pre><code>public class S2 {

    public static class Vector3 {
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
}

</code></pre>
</details>

<p>The Cube <code>Face</code> is the largest absolute X,Y,Z component, when component is -ve, back faces are used.</p>
<img class="center-image-0 center-image-60" src="./assets/posts/spatial-index/s2-xyz-uv.svg" /> 
<p>Face and XYZ is mapped to UV by using the other two X, Y, Z components (other than largest component of face) and diving it by the largest component, a value between <code>[-1, 1]</code>. Additionally, some faces of the cube are transposed (-ve) to produce the single continuous hilbert curve on the cube.</p>

<hr class="hr">

<h3>2.2.5d. (Face,U,V) to (Face,S,T)</h3>

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

<details class="code-container"><summary class="p">2.2.5e. S2 UV to ST - Snippet</summary>
<pre><code>public double stToUV(double s) {
  if (s >= 0.5) {
    return (1 / 3.) * (4 * s * s - 1);
  } else {
    return (1 / 3.) * (1 - 4 * (1 - s) * (1 - s));
  }
}

public double uvToST(double u) {
  if (u >= 0) {
    return 0.5 * Math.sqrt(1 + 3 * u);
  } else {
    return 1 - 0.5 * Math.sqrt(1 - 3 * u);
  }
}
</code></pre>
</details>

<hr class="hr">

<h3>2.2.5f. (Face,S,T) to (Face,I,J)</h3>

<p>The IJ coordinates are discretized ST coordinates and divides the ST plane into <code>2<sup>30</sup> × 2<sup>30</sup></code>, i.e. the i and j coordinates in S2 range from <code>0 to 2<sup>30</sup> - 1</code>.</p>

<p>Why 2<sup>30</sup>? The i and j coordinates are each represented using 30 bits, which is <code>2<sup>30</sup></code> distinct values for both i and j coordinates, this large range allows precise positioning within each face of the cube (high spatial resolution). The total number of unique cells is <code>6 x (2<sup>30</sup> × 2<sup>30</sup>)</code></p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/s2-st-ij.svg" />
<p class="figure-header">Figure 30: (face, s, t) to (face, i, j); for face = 0</p>

<details class="code-container"><summary class="p">2.2.5g. S2 ST to IJ - Snippet</summary>
<pre><code>public static int stToIj(double s) {
  return Math.max(
    0, Math.min(1073741824 - 1, (int) Math.round(1073741824 * s))
  );
}
</code></pre>
</details>

<hr class="hr">

<h3>2.2.5h. (Face,I,J) to S2 Cell ID</h3>
<hr class="sub-hr">

<img class="center-image-0 center-image-50" src="./assets/posts/spatial-index/s2-ij-cell.svg" />
<p class="figure-header">Figure 31: (face, i, j) to cell ID</p>

<img class="center-image-0 center-image" src="./assets/posts/spatial-index/s2-cell-id.svg" />

<hr class="hr">

<h3>2.2.6. S2 - Conclusion</h3>
<hr class="sub-hr">

</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">2.3. Space-Partioning Tree</summary>
</details>

</details>

<hr class="clear-hr">

<details><summary class="h3">3. References</summary>

<pre style="max-height: 300px"><code>
1. Primary credit goes to John Skilling for his article "Programming the Hilbert curve" (American Institue of Physics (AIP) Conf. Proc. 707, 381 (2004)).
2. Wikipedia. “Z-order curve,” [Online]. Available: https://en.wikipedia.org/wiki/Z-order_curve. [Accessed: 10-Jun-2024].
3. Amazon Web Services, “Z-order indexing for multifaceted queries in Amazon DynamoDB – Part 1,” [Online]. Available: https://aws.amazon.com/blogs/database/z-order-indexing-for-multifaceted-queries-in-amazon-dynamodb-part-1/. [Accessed: 10-Jun-2024].
4. N. Chandra, “Z-order indexing for efficient queries in Data Lake,” Medium, 20-Sep-2021. [Online]. Available: https://medium.com/@nishant.chandra/z-order-indexing-for-efficient-queries-in-data-lake-48eceaeb2320. [Accessed: 10-Jun-2024].
5. YouTube, “Z-order indexing for efficient queries in Data Lake,” [Online]. Available: https://www.youtube.com/watch?v=YLVkITvF6KU. [Accessed: 10-Jun-2024].
</code></pre>

</details>