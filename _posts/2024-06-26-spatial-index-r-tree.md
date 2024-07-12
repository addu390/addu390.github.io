---
layout: post
title: "Spatial Index: R Trees"
date: 2024-06-26
state: Draft
tags:
- Database
- Spatial Index
author: Adesh Nalpet Adimurthy
image: assets/featured/webp/rtree-spatial-index.webp
feature: assets/featured/webp/rtree-spatial-index.webp
category: System Wisdom
---

<img class="center-image" src="./assets/featured/webp/rtree-spatial-index.webp" /> 

<div class="blog-reference green-disclaimer">
<p>Work in Progress! This is the last post of the series "<a href="/tags/#Spatial%20Index">Spatial Index</a>", diving into data-driven structures and more specifically the R-tree family. <a href="https://pyblog.medium.com/subscribe" target="_blank">Subscribe</a> to get notified when the post is up!</p>
</div>

<p>In this post, let's explore the <a href="https://en.wikipedia.org/wiki/R-tree" target="_blank">R-Tree</a> data structure, which is popularly used to store multi-dimensional data, such as data points, segments, and rectangles.</p>

<h3>Points, Segments and Rectangles</h3>

<p>For example, consider the plan of a university layout below. We can use the R-Tree data structure to index the buildings on the map.</p>

<p>To do so, we can place rectangles around a building or group of buildings and then index them. Suppose there's a much bigger section of the map signifying a larger department, and we need to query all the buildings within a department. We can use the R-Tree to find all the buildings within (partially or fully contained) the larger section (query rectangle).</p>

<img class="center-image-0 center-image" src="./assets/posts/spatial-index/r-tree-campus-level-2.svg" />
<p class="figure-header">Figure 0: Layout with MBRs and Query Rectangle</p>

<p>In the above figure, the red rectangle represent the query rectangle, used to ask the R-Tree to get all the buildings that intersect with the query rectangle (<code>R2, R3, R6</code>).</p>

<h3>R3-Tree Idea</h3>

<p>The main idea in R-trees is the <a href="https://en.wikipedia.org/wiki/Minimum_bounding_rectangle" target="_blank">minimum bounding rectangles</a>. We'll come to what "minimum" implies in a second.</p>

<p>The inner node of an R-tree is as follows: We start with the root node, representing the large landscape. The inner nodes are guideposts that hold pointers to the child nodes we need to go down to in the tree. i.e. each entry of a node points to an area of the data space (described by MBR).</p>

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/r-tree-inner-node.svg" />
<p class="figure-header">Figure 1: R-Tree Inner Node</p>

<p>For instance, think of a <a href="https://en.wikipedia.org/wiki/Binary_search_tree" target="_blank">Binary Search Tree</a>. From the root node, we make a decision to go left or right. The R-tree is similar, but more of an <a href="/b-tree" target="_blank">M-way tree</a>, where each node can have multiple entries as seen above. Instead of having integer or string values (one-dimensional), the inner nodes consist of entries (multi-dimensional). In the example, there are 4 entries of rectangles.</p>

<h3>MBR - Minimum Bounding Rectangle</h3>

<img class="center-image-0 center-image-35" src="./assets/posts/spatial-index/r-tree-mbr.svg" />
<p class="figure-header">Figure 2: R-Tree Minimum Bounding Rectangle</p>

<p>Minimum Bounding Rectangles, <code>R1, R2, R3, R4</code>, contain the objects which are stored in the sub-trees in a minimal way. For instance, say we have 3 rectangles <code>R11, R12, R13</code>. <code>R1</code> is the smallest rectangle that can be created to completely contain all three rectangles, hence the name "minimum."</p>

<h3>Search Process and Overlapping MBRs</h3>

<p>The search process in an R-tree is simple: for a query object/query rectangle; at an inner node, it is the decision to check if any of the entries in a node intersect with the query rectangle.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/r-tree-query-rectangle.svg" />
<p class="figure-header">Figure 3: R-Tree Query Rectangle(s)</p>

<p>For example, consider a query rectangle <code>Q1</code>. It's clear that R1 intersects with <code>Q1</code>, so we would follow down the tree from <code>R1</code>. Similarly, <code>Q2</code> intersects with <code>R2</code>. However, in scenarios where the query rectangle intersects with multiple entries/rectangles (<code>Q3</code> with <code>R2, R3, R4</code>), all the intersecting rectangles have to be searched. This can happen if the indexing is not optimized and has to be avoided as it defeats the purpose of indexing in the first place.</p>

<h3>R-Tree Properties</h3>

<p>Here's a bit of a larger example of an R-tree.</p>

<img class="center-image-0 center-image-85" src="./assets/posts/spatial-index/r-tree-l-3.svg" />
<p class="figure-header">Figure 3: R-Tree Level-2</p>

<p>Every node in an R-tree has between <code>m</code> and <code>M</code> entries. More specifically, each node has between <code>m ≤ ⌈M/2⌉ and M</code> entries. The node has at least 2 entries unless it's a leaf.</p>

<p>By now, if you also read the blog post on <a href="/b-tree" target="_blank">B-Trees and B+ Trees</a>, you’ll see that an R-Tree is quite similar to a B+ Tree. It uses a similar idea to split the space at each (inner) node into multiple areas. However, B+ Trees mostly work with one-dimensional data, and the data ranges do not overlap.</p>

<h3>Search using an R-Tree</h3>

<p>Now that we know the idea behind R-Trees and the search process, Let's put a clear-cut definition to the search process:</p>

<ul>
<li><p>Goal: Find all rectangles that overlap with the given rectangle <code>S</code> (query rectangle).</p></li>
<li><p>Let <code>T</code> denote the node (at the current level/sub-tree).</p></li>
<li><p>S1 (Search in sub-trees): If <code>T</code> is not a leaf, check all the entries <code>E</code> in <code>T</code>. If the MBR of <code>E</code> overlaps with <code>S</code>, then continue the search in the sub-tree to which <code>E</code> points.</p></li>
<li><p>S2 (Search in Leaves): If <code>T</code> is a leaf node, inspect all entries of <code>E</code>. All entries that overlap with <code>S</code> are part of the query result.</p></li>
</ul>

<h3>Inserting to an R-Tree</h3>

<p>Coming to inserts, consider a leaf node (MBR) as shown below with 3 entries/objects, <code>R1</code>, <code>R2</code>, and <code>R3</code>. Let's assume that the leaf is not full yet (MBR has a threshold capacity on the number of objects it can hold).</p>

<p>Say, there's a new rectangle <code>R4</code> coming and it has to be inserted inside the leaf node. As you can see, in order to capture the new objects, the MBR is adjusted, i.e., enlarged to minimally contain <code>R1</code> to <code>R4</code>. Going on and inserting another object <code>R5</code>, the MBR is once again adjusted.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/r-tree-insert.svg" />
<p class="figure-header">Figure 4: R-Tree Insert (Adjusting MBR)</p>

<p>On an insert, when the MBR is updated, i.e., contains more objects, the new MBR has to be updated not only for the node but also propagated to other lower levels and potentially (not always) up to the root node. This is to reflect that the sub-tree now contains more information.</p>

<h3>Choice for Insert</h3>

<p>Unlike the example, it's not always clear in which node/sub-tree an object should be inserted. Here: <code>MBR1</code>, <code>MBR2</code>, or <code>MBR3</code>.</p>

<img class="center-image-0 center-image-55" src="./assets/posts/spatial-index/r-tree-insert-mbrs.svg" />

<p>The question is, in which MBR should we insert <code>R1</code> into? Setting aside any rules or justification for a second, <code>R1</code> can be inserted into any MBR.</p>

<img class="center-image-0 center-image-55" src="./assets/posts/spatial-index/r-tree-insert-mbr1.svg" />

<p>Inserting into <code>MBR1</code> would need to immensely grow/expand <code>MBR1</code> to fully contain <code>R1</code>. The implication? Say there's a query rectangle <code>Q1</code>. After leading down the sub-tree to <code>MBR1</code>, we find that there's nothing (no objects). This is because, to contain <code>R1</code>, we have expanded <code>MBR1</code> so much that there is a lot of space without any objects. So, it's fair to conclude that one criterion to add is to insert into MBRs that need to expand the least.</p>

<img class="center-image-0 center-image-55" src="./assets/posts/spatial-index/r-tree-insert-mbr2.svg" />

<p>Going by that, inserting into <code>MBR2</code> is a better option as opposed to <code>MBR1</code>. Similarly, <code>MBR3</code> may not be a bad option either, depending on the expansion factor.</p>

<hr class="post-hr">

<p>Stating the obvious (for implementation), the minimum-bounding-rectangle (MBR) is defined as the rectangle that has the maximal and minimal values of all rectangles in each dimension.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/r-tree-overlap-criterion.svg" />

<hr class="post-hr">

<p>Work in Progress. Half way there and more to come! </p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>
<p></p>