---
layout: post
title: "Stomping Grounds: Spatio-Temporal Index"
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
<p>Spatio-temporal data has grown (/is growing) rapidly thanks to web services tracking where and when users do things. Most applications add location tags and often allow users check in specific places and times. This surge is largely due to smartphones, which act as location sensors, making it easier than ever to capture and analyze this type of data.</p>

<p>The goal of this post is to dive into the different spatial and spatio-temporal indexes that are widely used in both relational and non-relational databases. We'll look at the pros and cons of each type, and also discuss which indexes are the most popular today.</p>

<img class="center-image-0" src="./assets/posts/spatial-index/spatial-index-types.svg" /> 
<p class="figure-header">Figure 0: Types of Spatial Indexes</p>

</details>

<hr class="clear-hr">

<details open><summary class="h3">1. Foundation</summary>
<img class="center-image-30" src="./assets/posts/spatial-index/no-sort-no-partition-table.svg" /> 
<p class="figure-header">Figure 1: Initial Table Structure</p>
<p>Consider a table with the following fields: <code>device</code>, <code>X</code>, and <code>Y</code>, all of which are integers ranging from 1 to 4. Data is inserted into this table randomly by an external application.</p>

<img class="center-image-60" src="./assets/posts/spatial-index/no-sort-no-partition-full-scan.svg" /> 
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

<details open><summary class="h3">2. Spatial Indexes</summary>
<p></p>

<details open class="text-container"><summary class="h4">1.1. Space-Filling Curves</summary>
<p><code>X</code> and <code>Y</code> from 1 to 4 on a 2D axis. The goal is to traverse the data and number them accordingly (the path).</p>

<img class="center-image-0 center-image-80" src="./assets/posts/spatial-index/space-filling-trivial-details.svg" /> 
<p class="figure-header">Figure 6: Exploring Space-Filling Curve and Traversing the X-Y Axis</p>

<p>Starting from <code>Y = 1</code> and <code>X = 1</code>, as we traverse up to <code>X = 1</code> and <code>Y = 4</code>, it's evident that there is no locality preservation. The distance between points <code>(1, 4)</code> and <code>(1, 3)</code> is 6, a significant difference for points that are quite close to each other. Grouping this data into files keeps unrelated data together and ended up sorting by one column while ignoring the information in the other column (back to square one). i.e. <code>X = 2</code> leads to a full scan.</p>

<img class="center-image-0 center-image-80" src="./assets/posts/spatial-index/z-order.svg" /> 
<p class="figure-header">Figure 7: Z-Order Curve</p>
<p>A recursive Z pattern, also known as the Z-order curve, is an effective way to preserve locality in many cases. For instance, points like <code>(1, 4)</code> and <code>(1, 3)</code> are separated by a single square. By generating 4 files based on this curve, the data is not spread out along a single dimension. Instead, the 4 files are clustered across both dimensions, making the data selective on both <code>X</code> and <code>Y</code> dimensions.</p>

<img class="center-image-0 center-image-60" src="./assets/posts/spatial-index/z-order-types.svg" /> 
<p class="figure-header">Figure 7a: Z-Order Curve Types</p>
<p>The Z-order curve can take many shapes, depending on which coordinate goes first. The typical Z-shape occurs when the Y-coordinate goes first (most significant bit), and the upper left corner is the base. A mirror image Z-shape occurs when the Y-coordinate goes first and the lower left corner is the base. An N-shape occurs when the X-coordinate goes first and the lower left corner is the base.</p>

<img class="center-image-0 center-image-80" src="./assets/posts/spatial-index/hilbert-curve.svg" /> 
<p class="figure-header">Figure 8: Hilbert Curve</p>
<p>Similarly, other space-filling curves, such as the Hilbert curve, serve a similar purpose. These curves traverse through the data, ensuring that multi-dimensional data points that are close together in 2D space remain close together along the 1D line or curve, thus preserving locality and enhancing query efficiency across both dimensions.</p>

<img class="center-image-0" src="./assets/posts/spatial-index/hilbert-curve-example.svg" /> 
<p class="figure-header">Figure 8: Hilbert Curve</p>
<p>Taking an example, if we query for <code>X = 3</code>, we only need to search 2 of the files. Similarly, for <code>Y = 3</code>, the search is also limited to 2 files. Unlike a hierarchical sort on only one dimension, the data is selective across both dimensions, making the multi-dimensional search more efficient.</p>

<hr class="hr">

<p>In the examples so far, we have presumed that the <code>X</code> and <code>Y</code> values are dense, meaning that there is a value for every combination of <code>X</code> and <code>Y</code>. However, in real-world scenarios, data can be sparse, with many <code>X, Y</code> combinations missing</p>

<img class="center-image" src="./assets/posts/spatial-index/3-partition-curves.svg" /> 
<p class="figure-header">Figure 9: Flexibility in Number of Files</p>
<p>The number of files (4 in the prior examples) isn't necessarily dictated. Here's what 3 files would look like using both Z-order and Hilbert curves. The benefits still hold because of the space-filling curve, which efficiently clusters related data points.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/z-order-sparse.svg" /> 
<p class="figure-header">Figure 10: Optimizing with Z-Values</p>
<p>To improve efficiency, we can use Z-values. If files are organized by Z-values, each file has a min-max Z-value range. Filters on <code>X</code> and <code>Y</code> can be transformed into Z-values, enabling efficient querying by limiting the search to relevant files based on their Z-value ranges.</p>

<img class="center-image-0" src="./assets/posts/spatial-index/z-order-z-values.svg" /> 
<p class="figure-header">Figure 11: Efficient Querying with Min-Max Z-Values</p>
<p>Consider a scenario where the min-max Z-values of 3 files are <code>1 to 5</code>, <code>6 to 9</code>, and <code>13 to 16</code>. Querying by <code>2 ≤ X ≤ 3</code> and <code>3 ≤ Y ≤ 4</code> would initially require scanning 2 files. However, if we convert these ranges to their Z-value equivalent, which is <code>10 ≤ Z ≤ 15</code>, we only need to scan one file, since the min-max Z-values are known.</p>

<hr class="hr">

<p>Z-ordering arranges the 2D pairs on a 1-dimensional line. More importantly, values that were close together in the 2D plane would still be close to each other on the Z-order line. The implementation is quite simple: Interleave or combine the bits of two or more values (multi-dimensional) to create a single value that preserves spatial locality.</p>

<img class="center-image-40" src="./assets/posts/spatial-index/interleave.svg" /> 
<p class="figure-header">Figure 12: Bit Interleaving</p>

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/z-order-2d-plane.svg" /> 
<p class="figure-header">Figure 13:</p>

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/z-order-success.svg" /> 
<p class="figure-header">Figure 14:</p>

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/z-order-danger.svg" /> 
<p class="figure-header">Figure 15:</p>

</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">1.2. Geo Hash</summary>
</details>

</details>

<hr class="clear-hr">

<details open><summary class="h3">2. Spatio-Temporal Index</summary>
</details>

<details><summary class="h3">5. References</summary>

<pre style="height: 300px"><code>
1. Primary credit goes to John Skilling for his article "Programming the Hilbert curve" (American Institue of Physics (AIP) Conf. Proc. 707, 381 (2004)).
</code></pre>

</details>