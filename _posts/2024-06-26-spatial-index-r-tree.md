---
layout: post
title: "Spatial Index: R Trees"
date: 2024-06-26
tags:
- Database
- Spatial Index
author: Adesh Nalpet Adimurthy
image: assets/featured/webp/rtree-spatial-index.webp
feature: assets/featured/webp/rtree-spatial-index.webp
category: System Wisdom
---

<img class="center-image-0 center-image" src="./assets/featured/webp/rtree-spatial-index.webp" /> 

<p>In this post, let's explore the <a href="https://en.wikipedia.org/wiki/R-tree" target="_blank">R-Tree</a> data structure, which is popularly used to store multi-dimensional data, such as data points, segments, and rectangles.</p>

<h3>1. R-Trees and Rectangles</h3>

<p>For example, consider the plan of a university layout below. We can use the R-Tree data structure to index the buildings on the map.</p>

<p>To do so, we can place rectangles around a building or group of buildings and then index them. Suppose there's a much bigger section of the map signifying a larger department, and we need to query all the buildings within a department. We can use the R-Tree to find all the buildings within (partially or fully contained) the larger section (query rectangle).</p>

<img class="center-image-0 center-image" src="./assets/posts/spatial-index/r-tree-campus-level-2.svg" />
<p class="figure-header">Figure 0: Layout with MBRs and Query Rectangle</p>

<p>In the above figure, the red rectangle represent the query rectangle, used to ask the R-Tree to get all the buildings that intersect with the query rectangle (<code>R2, R3, R6</code>).</p>

<h3>2. R-Tree - Intuition</h3>

<p>The main idea in R-trees is the <a href="https://en.wikipedia.org/wiki/Minimum_bounding_rectangle" target="_blank">minimum bounding rectangles</a>. We'll come to what "minimum" implies in a second.</p>

<p>The inner node of an R-tree is as follows: We start with the root node, representing the large landscape. The inner nodes are guideposts that hold pointers to the child nodes we need to go down to in the tree. i.e. each entry of a node points to an area of the data space (described by MBR).</p>

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/r-tree-inner-node.svg" />
<p class="figure-header">Figure 1: R-Tree Inner Node</p>

<p>For instance, think of a <a href="https://en.wikipedia.org/wiki/Binary_search_tree" target="_blank">Binary Search Tree</a>. From the root node, we make a decision to go left or right. The R-tree is similar, but more of an <a href="/b-tree" target="_blank">M-way tree</a>, where each node can have multiple entries as seen above. Instead of having integer or string values (one-dimensional), the inner nodes consist of entries (multi-dimensional). In the example, there are 4 entries of rectangles.</p>

<h3>2.1. MBR - Minimum Bounding Rectangle</h3>

<img class="center-image-0 center-image-35" src="./assets/posts/spatial-index/r-tree-mbr.svg" />
<p class="figure-header">Figure 2: R-Tree Minimum Bounding Rectangle</p>

<p>Minimum Bounding Rectangles, <code>R1, R2, R3, R4</code>, contain the objects which are stored in the sub-trees in a minimal way. For instance, say we have 3 rectangles <code>R11, R12, R13</code>. <code>R1</code> is the smallest rectangle that can be created to completely contain all three rectangles, hence the name "minimum."</p>

<h3>2.2. Search Process and Overlapping MBRs</h3>

<p>The search process in an R-tree is simple: for a query object/query rectangle; at an inner node, it is the decision to check if any of the entries in a node intersect with the query rectangle.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/spatial-index/r-tree-query-rectangle.svg" />
<p class="figure-header">Figure 3: R-Tree Query Rectangle(s)</p>

<p>For example, consider a query rectangle <code>Q1</code>. It's clear that R1 intersects with <code>Q1</code>, so we would follow down the tree from <code>R1</code>. Similarly, <code>Q2</code> intersects with <code>R2</code>. However, in scenarios where the query rectangle intersects with multiple entries/rectangles (<code>Q3</code> with <code>R2, R3, R4</code>), all the intersecting rectangles have to be searched. This can happen if the indexing is not optimized and has to be avoided as it defeats the purpose of indexing in the first place.</p>

<h3>2.3. R-Tree - Properties</h3>

<p>Here's a bit of a larger example of an R-tree.</p>

<img class="center-image-0 center-image-85" src="./assets/posts/spatial-index/r-tree-l-3.svg" />
<p class="figure-header">Figure 3: R-Tree Level-2</p>

<p>Every node in an R-tree has between <code>m</code> and <code>M</code> entries. More specifically, each node has between <code>m ≤ ⌈M/2⌉ and M</code> entries. The node has at least 2 entries unless it's a leaf.</p>

<p>By now, if you also read the blog post on <a href="/b-tree" target="_blank">B-Trees and B+ Trees</a>, you’ll see that an R-Tree is quite similar to a B+ Tree. It uses a similar idea to split the space at each (inner) node into multiple areas. However, B+ Trees mostly work with one-dimensional data, and the data ranges do not overlap.</p>

<h3>3. Search using an R-Tree</h3>

<p>Now that we know the idea behind R-Trees and the search process, Let's put a clear-cut definition to the search process:</p>

<ul>
<li><p>Goal: Find all rectangles that overlap with the given rectangle <code>S</code> (query rectangle).</p></li>
<li><p>Let <code>T</code> denote the node (at the current level/sub-tree).</p></li>
<li><p>S1 (Search in sub-trees): If <code>T</code> is not a leaf, check all the entries <code>E</code> in <code>T</code>. If the MBR of <code>E</code> overlaps with <code>S</code>, then continue the search in the sub-tree to which <code>E</code> points.</p></li>
<li><p>S2 (Search in Leaves): If <code>T</code> is a leaf node, inspect all entries of <code>E</code>. All entries that overlap with <code>S</code> are part of the query result.</p></li>
</ul>

<h3>4. Inserting to an R-Tree</h3>

<p>Coming to inserts, consider a leaf node (MBR) as shown below with 3 entries/objects, <code>R1</code>, <code>R2</code>, and <code>R3</code>. Let's assume that the leaf is not full yet (MBR has a threshold capacity on the number of objects it can hold).</p>

<p>Say, there's a new rectangle <code>R4</code> coming and it has to be inserted inside the leaf node. As you can see, in order to capture the new objects, the MBR is adjusted, i.e., enlarged to minimally contain <code>R1</code> to <code>R4</code>. Going on and inserting another object <code>R5</code>, the MBR is once again adjusted.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/r-tree-insert.svg" />
<p class="figure-header">Figure 4: R-Tree Insert (Adjusting MBR)</p>

<p>On an insert, when the MBR is updated, i.e., contains more objects, the new MBR has to be updated not only for the node but also propagated to other lower levels and potentially (not always) up to the root node. This is to reflect that the sub-tree now contains more information.</p>

<h3>4.1. Choice for Insert</h3>

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

<p>Summarizing the insertion into R-Tree so far:</p>
<ul>
<li>In principle, a new rectangle can be inserted into any node.</li>
<li>If the node is full, a split needs to be performed (more on that in the next section).</li>
<li>If not, the MBR may have to be adjusted/expanded to accommodate new objects (as seen ).</li>
</ul>

<p>Observations:</p>
<ul>
<li>Extending bounding boxes is a critical factor for the performance of the R-Tree.</li>
<li>Try to minimize overlap (of the MBRs).</li>
<li>Try to minimize spread (the size of the MBR, as seen in section 4.1).</li>
</ul>

<h3>4.2. Insert - Algorithm</h3>

<p>Here's the algorithm proposed by the author of the R-Tree paper "<a href="https://www.researchgate.net/publication/221213205_R_Trees_A_Dynamic_Index_Structure_for_Spatial_Searching" target="_blank">A Dynamic Index Structure for Spatial Searching</a>," by A. Guttman, 1984.</p>

<p>The rest of this section is mostly going over snippets of code and explanations from this paper, but with more examples and visualization.</p>

<p>Algorithm: Search for leaf to insert (<a href="https://en.wikipedia.org/wiki/Hilbert_R-tree#Insertion" target="_blank">ChooseLeaf</a>):</p>
<ul>
<li><p>CS1: Let <code>N</code> be the root.</p></li>
<li>CS2:
<ul>
    <li>If <code>N</code> is a leaf, return <code>N</code>.</li>
    <li><p>If <code>N</code> is not a leaf: Search for an entry in <code>N</code> whose rectangle (MBR) requires the least area increase in order to accommodate the new rectangle. In the case where there are multiple options, consider an entry that has the smallest (in area) MBR.</p></li>
</ul>
</li>
<li>CS3: Let <code>N</code> be the child node, then continue to step CS2 (repeat).</li>
</ul>

<hr class="post-hr">

<p>A much simpler example of 8 objects, each object with one multidimensional attribute (Range or line-segments on x-axis) and one identity (Color). To insert these objects one by one in an empty R-tree of degree <code>M = 3</code> (maximum number of entries at each node) and <code>m ≥ M/2</code> (minimum number of entries at each node = 2).</p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/r-tree-insert-example.svg" />

<p>Observation: in the case where the selected leaf is already full, a splitting operation is performed. Let's understand the overflow problem better (the split problem):</p>

<h3>4.3. Handling Overflow</h3>

<p>In the case a node/leaf is full and a new entry cannot be stored anymore, a split needs to be performed, just as for a B+ Tree. The difference is that the split can be done arbitrarily and not only in the middle as for a B+ Tree.</p>

<img class="center-image-0 center-image-30" src="./assets/posts/spatial-index/r-tree-split-problem.svg" />

<h3>4.3.1. The Split Problem</h3>
<p>Given <code>M + 1</code> entries in a node (exceeded maximum capacity per node), which two subsets of these entries should be considered as new and old nodes?</p>

<p>To better understand the split problem, let's take a step back and consider 4 rectangles (<code>R1, R2, R3, R4</code>) that need to be assigned to two nodes (MBRs) in a meaningful way.</p>

<img class="center-image-0 center-image-90" src="./assets/posts/spatial-index/r-tree-split-problem-example.svg" />

<p>Why is one better than the other? As mentioned before (Section 4.1), the area of expansion of the poor split is much larger compared to the good split (despite the overlap). This leads to more empty spaces in the node/MBR that do not have any objects.</p>

<p>A realistic use case for an R-Tree is <code>M = 50</code> and there are <code>2^(M-1)</code> possibilities. Hence, a naive approach to look at all possible subsets and choose the best one is not practical (too expensive!).</p>

<h3>4.3.2. The Split Problem: Quadratic Cost</h3>

<ul>
<li>Search for split with smallest possible area</li>
<li>Cost is Quadratic in <code>M</code> and linear in number of dimensions <code>d</code>.</li>
<li>Idea:</li>
<ul>
<li>Search for pairs of entries that would cause the largest MBR area if placed in the same node. Then put these entries in two different nodes</li>
<li><p>Then: Consider all remaining entries and consider the one (among the 2 nodes) for which the increase in area (of MBR) has the largest possible difference between the two nodes.</p></li>
<li><p>This entry is assigned to the node with the smallest increase. Repeat until all entries are assigned</p></li>
</ul>
</ul>

<img class="center-image-0 center-image-80" src="./assets/posts/spatial-index/r-tree-split-quadratic.svg" />

<p>In this example, two nodes, <code>MBR1</code> and <code>MBR2</code>, are created. <code>R1</code> and <code>R2</code> in the same MBR would lead to creating the largest MBR. <code>R3</code> is then inserted into <code>MBR1</code> and not <code>MBR2</code>, as the area increase of <code>MBR1</code> is smaller compared to <code>MBR2</code>.</p>

<p>Method "AdjustTree," is called whenever a new entry is inserted. It is responsible for adapting the parent's MBR and propagating the changes bottom up, handling splits as well as changes to MBRs. In the worst case, the propagation can be up to the root node.</p>

<h3>5. R-Tree Variants</h3>

<p>R-trees do not guarantee good worst-case performance, but generally speaking, they perform well with real-world data. Addressing this specific problem, the <a href="https://en.wikipedia.org/wiki/Priority_R-tree" target="_blank">Priority R-tree</a> is a worst-case <a href="https://en.wikipedia.org/wiki/Asymptotically_optimal_algorithm" target="_blank">asymptotically optimal</a> alternative to the spatial tree R-tree, which is essentially a hybrid between a k-dimensional tree (<a href="https://en.wikipedia.org/wiki/K-d_tree" target="_blank">k-d tree</a>) and an R-tree.</p>

<p>Another commonly used variant is the <a href="https://en.wikipedia.org/wiki/R*-tree" target="_blanl">R*-Tree</a>, which uses the same algorithm as the regular R-tree for query and delete operations. However, while inserting, the R*-tree uses a combined strategy: for leaf nodes, overlap is minimized, and for inner nodes, enlargement and area are minimized, making the tree construction slightly more expensive.</p>

<p>The <a href="https://en.wikipedia.org/wiki/R%2B_tree" target="_blanl">R+-Tree</a>, on the other hand, solves one main problem to ensure nodes do not overlap with each other, leading to better point query performance. However, it does so by inserting an object into multiple leaves if necessary, which is a disadvantage due to duplicate entries and larger tree size.</p>

<p>The <a href="https://en.wikipedia.org/wiki/Hilbert_R-tree" target="_blanl">Hilbert R-Tree</a> uses <a href="/spatial-index-space-filling-curve">space-filling curves</a>, specifically the Hilbert curve, to impose a linear ordering on the data rectangles. It has two variants: Packed Hilbert R-trees, suitable for static databases in which updates are very rare, and dynamic Hilbert R-trees, suitable for dynamic databases where insertions, deletions, or updates may occur in real time.</p>

<h3>6. Conclusion</h3>

<p>R-trees have come a long way since the first paper was published in 1984. Today, their applications span over multi-dimensional indexes, computer graphics, video games, spatial data management systems, and many more.</p>

<p>On the flip side, R-trees can degrade badly with discrete data. Hence, it's highly recommended to understand the data representation before using R-trees. R-trees are also relatively slow when there's a very high mutation rate, i.e., where the index changes often; this is because of the higher cost for constructing and updating the index (due to tree rebalancing) and they are more optimized for various search operations. Lastly, R-trees can be a poor algorithm choice when primarily dealing with points as opposed to polygons/regions.</p>

<h3>7. References</h3>
<pre style="max-height: 300px"><code>[1] A. Guttman, "A Dynamic Index Structure for Spatial Searching," presented at the ACM SIGMOD International Conference on Management of Data, 1984. [Online]. Available: https://www.researchgate.net/publication/220805321_A_Dynamic_Index_Structure_for_Spatial_Searching.
[2] "R-Tree," Wikipedia. [Online]. Available: https://en.wikipedia.org/wiki/R-tree.
[3] "B-Trees and B+ Trees," PyBlog. [Online]. Available: https://www.pyblog.xyz/b-trees-b-plus-trees.
[4] "Spatial Index R-Tree," YouTube, https://www.youtube.com/watch?v=U0jUvvQkaFw.
</code></pre>