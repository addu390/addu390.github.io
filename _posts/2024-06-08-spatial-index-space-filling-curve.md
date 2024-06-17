---
layout: post
title: "Spatial Index: Space-Filling Curves"
date: 2024-06-08
tags:
- Database
- Spatial Index
author: Adesh Nalpet Adimurthy
category: System Wisdom
feature: assets/featured/spatio-temporal-index.png
image: assets/featured/spatio-temporal-index.png
description: Spatial indexes optimize multi-dimensional data querying using space-filling curves like Z-order and Hilbert curves. Z-order curves employ a recursive Z pattern, and Hilbert curves use a U-shaped pattern, both maintaining data locality to improve spatial query performance. The article compares their effectiveness and includes implementation examples.
---

<img class="center-image" src="./assets/featured/spatio-temporal-index.png" /> 

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

<p>At this point, there's a clear need for efficiently partitioning 2-dimensional data. Why not use <a href="/b-tree">B-tree</a> with a composite index? A composite index prioritizes the first column in the index, leading to inefficient querying for the second column. This leads us back to the same problem, particularly when both dimensions need to be considered simultaneously for efficient querying.</p>
</details>

<hr class="clear-hr">

<details open><summary class="h3">2. Space-Filling Curves</summary>

<p><code>X</code> and <code>Y</code> from 1 to 4 on a 2D axis. The goal is to traverse the data and number them accordingly (the path). using Space-Filling Curves AKA squiggly lines.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/space-filling-trivial-details.svg" /> 
<p class="figure-header">Figure 6: Exploring Space-Filling Curve and Traversing the X-Y Axis</p>

<p>Starting from <code>Y = 1</code> and <code>X = 1</code>, as we traverse up to <code>X = 1</code> and <code>Y = 4</code>, it's evident that there is no locality preservation (Lexicographical Order). The distance between points <code>(1, 4)</code> and <code>(1, 3)</code> is 6, a significant difference for points that are quite close to each other. Grouping this data into files keeps unrelated data together and ended up sorting by one column while ignoring the information in the other column (back to square one). i.e. <code>X = 2</code> leads to a full scan.</p>


<details open class="text-container"><summary class="h4">2.1. Z-Order Curve - Intuition</summary>
<p>A recursive Z pattern, also known as the Z-order curve, is an effective way to preserve locality in many cases.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/z-order-types.svg" /> 
<p class="figure-header">Figure 7: Z-Order Curve Types</p>
<p>The Z-order curve can take many shapes, depending on which coordinate goes first. The typical Z-shape occurs when the Y-coordinate goes first (most significant bit), and the upper left corner is the base. A mirror image Z-shape occurs when the Y-coordinate goes first and the lower left corner is the base. An N-shape occurs when the X-coordinate goes first and the lower left corner is the base.</p>

<p>Z-order curve grows exponentially, and the next size is the second-order curve that has 2-bit sized dimensions. Duplicate the first-order curve four times and connect them together to form a continuous curve.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/z-order.svg" /> 
<p class="figure-header">Figure 8: Z-Order Curve</p>

<p>Points <code>(1, 4)</code> and <code>(1, 3)</code> are separated by a single square. With 4 files based on this curve, the data is not spread out along a single dimension. Instead, the 4 files are clustered across both dimensions, making the data selective on both <code>X</code> and <code>Y</code> dimensions.</p>
</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">2.2. Hilbert Curve - Intuition</summary>

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
</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">2.3. Z-Order Curve and Hilbert Curve - Comparison</summary>

<p>Taking an example, if we query for <code>X = 3</code>, we only need to search 2 of the files. Similarly, for <code>Y = 3</code>, the search is also limited to 2 files in both Z-order and Hilbert Curves</p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/z-order-curve-example.svg" /> 
<p class="figure-header">Figure 12: Z-Order Curve - Example</p>

<p>Unlike a hierarchical sort on only one dimension, the data is selective across both dimensions, making the multi-dimensional search more efficient.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/hilbert-curve-example.svg" /> 
<p class="figure-header">Figure 13: Hilbert Curve - Example</p>

<p>Although both the curves give a similar advantage, the main shortcoming with Z-order curve: it fails to maintain perfect data locality across all the data points in the curve. In Figure 12, notice the data points between index 8 and 9 are further apart. As the size of the Z-curve increases, so does the distance between such points that connect different parts of curve together.</p>

<p>Hilbert curve is more preferred over the Z-order curve for ensuring better data locality and Z-order curve is still widely used because of it's simplicity.</p>
</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">2.4. Optimizing with Z-Values</summary>

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
</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">2.5. Z-Order Curve - Implementation</summary>

<p>So far, wkt, Z-ordering arranges the 2D pairs on a 1-dimensional line. More importantly, values that were close together in the 2D plane would still be close to each other on the Z-order line. The implementation goal is to derive Z-Values that preserves spatial locality from M-dimensional data-points (Z-ordering is not limited to 2-dimensional space and it can be abstracted to work in any number of dimensions)</p>

<p>Z-order bit-interleaving is a technique that interleave bits of two or more values to create a 1-D value while spatial locality is preserved:</p>

<img class="center-image-0 center-image-45" src="./assets/posts/spatial-index/interleave.svg" /> 
<p class="figure-header">Figure 17: Bit Interleaving</p>
<p>Example: 4-bit values <code>X = 10</code>, <code>Y = 12</code> on a 2D grid, <code>X = 1010</code>, <code>Y = 1100</code>, then interleaved value <code>Z = 1110 0100</code> (<code>228</code>)</p>

<details class="code-container"><summary class="p">2.5a. Z-Order Curve - Snippet</summary>

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
</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">2.6. Hilbert Curve - Implementation</summary>
<p>From <a href="#2-2-hilbert-curve-intuition">Section 2.2</a>, wkt: The Hilbert curve implementation converts 2D coordinates to a single scalar value that preserves spatial locality by recursively rotating and transforming the coordinate space.</p>

<p>In the code snippet: The <code>xyToHilbert</code> function computes this scalar value using bitwise operations, while the <code>hilbertToXy</code> function reverses this process. This method ensures that points close in 2D space remain close in the 1D Hilbert curve index, making it useful for spatial indexing.</p>

<details class="code-container"><summary class="p">2.6a. Hilbert Curve - Snippet</summary>
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
</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">2.7. Z-Order Curve and Hilbert Curve - Conclusion</summary>

<p>Usage: Insert data points and their Z-order keys/Hilbert Keys (let's call it Z and H keys) into a one-dimensional hierarchical index structure, such as a <a href="/b-tree">B-Tree</a> or Quad-Tree. For range or nearest neighbor queries, convert the search criteria into Z/H keys or range of keys. After retrieval, further filter the results as necessary to remove any garbage values.</p>

<p>To conclude: Space-Filling Curves such as Z-Order/Hilbert indexing is a powerful technique to query higher-dimensional data, especially as the data volumes grows. By combining bits from multiple dimensions into a single value, space-Filling Curves indexing preserves spatial locality, enabling efficient data indexing and retrieval.</p>

<p>However, as seen in <a href="#2-5-z-order-curve-implementation">Section 2.5</a>, large jumps along the Z-Order curve can affect certain types of queries (better with Hilbert curves <a href="#2-2-hilbert-curve-intuition">Section 2.2</a>). The success of Z-Order indexing relies on the data's distribution and cardinality. Therefore, it is essential to evaluate the nature of the data, query patterns, performance needs and limitation(s) of indexing strategies.</p>
</details>

</details>

<hr class="clear-hr">

<details><summary class="h3">3. References</summary>

<pre style="max-height: 300px"><code>1. "Programming the Hilbert curve" (American Institue of Physics (AIP) Conf. Proc. 707, 381 (2004)).
2. Wikipedia. “Z-order curve,” [Online]. Available: https://en.wikipedia.org/wiki/Z-order_curve.
3. Amazon Web Services, “Z-order indexing for multifaceted queries in Amazon DynamoDB – Part 1,” [Online]. Available: https://aws.amazon.com/blogs/database/z-order-indexing-for-multifaceted-queries-in-amazon-dynamodb-part-1/. [Accessed: 10-Jun-2024].
4. N. Chandra, “Z-order indexing for efficient queries in Data Lake,” Medium, 20-Sep-2021. [Online]. Available: https://medium.com/@nishant.chandra/. [Accessed: 10-Jun-2024]z-order-indexing-for-efficient-queries-in-data-lake-48eceaeb2320. [Accessed: 10-Jun-2024].
5. YouTube, “Z-order indexing for efficient queries in Data Lake,” [Online]. Available: https://www.youtube.com/watch?v=YLVkITvF6KU. [Accessed: 10-Jun-2024].
</code></pre>

</details>