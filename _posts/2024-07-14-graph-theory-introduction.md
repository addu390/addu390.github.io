---
layout: post
title: "Graph Theory: Introduction"
date: 2024-07-14
tags:
- Graph Theory
- Data Structures
author: Adesh Nalpet Adimurthy
image: assets/featured/webp/graph-theory-101.webp
feature: assets/featured/webp/graph-theory-101.webp
category: Code on the Road
---

<img class="center-image-0 center-image-65" src="./assets/featured/graph-theory-101.png" />

<p>Before heading into details of how we store, represent, and traverse various kinds of graphs, this post is more of a ramp-up to better understand what graphs are and the different kinds from a computer science point of view, rather than a mathematical one. So, no proofs and equations, mostly just diagrams and implementation details, with an emphasis on how to apply graph theory to real-world applications.</p>

<p><a href="https://en.wikipedia.org/wiki/Graph_theory" target="_blank">Graph theory</a> is the mathematical theory of the properties and applications of graphs/networks, which is just a collection of objects that are all interconnected.</p>

<img class="center-image-0 center-image-60" src="./assets/posts/graph-theory/gt-wardrobe.svg" />
<p>Graph theory is a broad enough topic to say it can be applied to almost any problem—first (maybe not first, make it 21st) thing in the morning, choosing what to wear - given all of the wardrobe, how many sets of clothes can I make by choosing one from each category (by category, I mean tops, bottoms, shoes, hats, and glasses)? While this sounds like a math problem to find permutations, using graphs to visualize each clothing item as a node and edges to represent relationships between them can be helpful.</p>

<img class="center-image-0 center-image-70" src="./assets/posts/graph-theory/gt-social-network.svg" />
<p>Another everyday example is the social network. A graph representation answers questions such as how many mutual friends or how many degrees of separation exist between two people.</p>

<h3>1. Types of Graphs</h3>

<p>There are a lot of types of graphs, and it's important to understand the kind of graph you are dealing with. Let's go over the most commonly known graph variants.</p>

<h3>1.1. Undirected Graph</h3>
<p>The most simple kind of graph, where the edges have no orientation (<a href="https://en.wikipedia.org/wiki/Bidirected_graph" target="_blank">bi-directional</a>). i.e., edge <code>(u, v)</code> is identical to edge <code>(v, u)</code>.</p>
<img class="center-image-0 center-image-50" src="./assets/posts/graph-theory/gt-undirected.svg" />
<p>Example: A city interconnected by bi-directional roads. You can drive from one city to another and can retrace the same path back.</p>

<h3>1.2. Directed Graph/Digraph</h3>
<p>In contrast to an undirected graph, <a href="https://en.wikipedia.org/wiki/Directed_graph" target="_blank">directed graphs</a> or digraphs have edges that are directed/have orientation. Edge <code>(u, v)</code> represents that you can only go from node u to node v and not the other way around. As shown in the figure below, the edges are directed, indicated by the arrowheads on the edges between nodes.</p>

<img class="center-image-0 center-image-55" src="./assets/posts/graph-theory/gt-directed.svg" />

<p>Example: This graph could represent people who bought each other gifts. C and D got gifts for each other, E didn't get any nor give any, B got one from A, gave a gift to D, and sent a gift to itself.</p>

<h3>1.3. Weighted Graphs</h3>
<p>So far, we have seen unweighted graphs, but edges on graphs can contain weights to represent arbitrary values such as distance, cost, quantity, etc.</p>
<img class="center-image-0 center-image-50" src="./assets/posts/graph-theory/gt-weighted.svg" />
<p>Weighted graphs can again be directed or undirected. An edge of a weighted graph can be denoted with <code>(u, v, w)</code>, where <code>w</code> is the weight.<p>

<h3>2. Special Graphs</h3>
<p>While directed, undirected and weighted graphs covers the basic types, there are many other types of graphs governed by rules and restrictions.</p>

<h3>2.1. Trees</h3>
<p>A <a href="https://en.wikipedia.org/wiki/Tree_(graph_theory)" target="_blank">tree</a> is simply a collection of nodes connected by directed (or undirected) edges with no cycles or loops (no node can be its own ancestor). A tree has <code>N</code> nodes and <code>N-1</code> edges.</p>
<img class="center-image-0 center-image" src="./assets/posts/graph-theory/gt-trees.svg" />
<p>All of the above are indeed trees, even the left-most graph, which has no cycles and N-1 edges.</p>

<h3>2.2. Rooted Trees</h3>
<p>A related but totally different kind of graph is a rooted tree. It has a designated root node, where every edge either points away from or towards the root node. When edges point away from the root, it's called an out-tree (arborescence) and an in-tree (anti-arborescence) otherwise.</p>
<img class="center-image-0 center-image" src="./assets/posts/graph-theory/gt-rooted-trees.svg" />
<p>Out-trees are more commonly used than in-trees, so much so that out-trees are often referred to as just "trees."</p>

<h3>2.3. Directed Acyclic Graphs (DAGs)</h3>
<p><a href="https://en.wikipedia.org/wiki/Directed_acyclic_graph" target="_blank">DAGs</a> are directed acyclic graphs, i.e., with directed edges and no cycles or loops. DAGs play an important role and are very common in computer science, including dependency management, workflows, schedulers, and many more.</p>
<p>When dealing with DAGs, commonly used algorithms include finding the shortest path and topological sort (how to process nodes in a graph in the correct order considering dependencies).</p>
<img class="center-image-0 center-image" src="./assets/posts/graph-theory/gt-dags.svg" />
<p>Fun Fact: All out-trees are DAGs, but not all DAGs are out-trees.</p>
<p>DAG nodes can have multiple parents, meaning there can be multiple paths that eventually merge. Out-trees are DAGs with the restriction that a child can only have one parent. Another way to see it is that a tree is like single-class inheritance, and a DAG is like multiple-class inheritance.</p>

<h3>2.4. Bipartite Graph</h3>
<p>A <a href="https://en.wikipedia.org/wiki/Bipartite_graph" target="_blank">bipartite graph</a> is one whose vertices can be split into two independent groups, <code>U</code> and <code>V</code>, such that every edge connects between <code>U</code> and <code>V</code>. A bipartite graph is two-colorable, in other words, it is a graph in which every edge connects a vertex of one set (Example, set 1: red color) to a vertex of the other set (Example, set 2: blue color).</p>
<img class="center-image-0 center-image-65" src="./assets/posts/graph-theory/gt-bipartite.svg" />
<p>A common question is to find the maximum matching that can be created on a bipartite graph (covered in a follow-up post). For example, say red nodes are jobs and blue nodes are people. The problem is to determine how many people can be matched to jobs.</p>

<h3>2.5. Complete Graph</h3>
<p>In a <a href="https://en.wikipedia.org/wiki/Complete_graph" target="_blank">complete graph</a>, there is a unique edge between every pair of nodes, i.e., every node is connected to every other node except itself. A complete graph with <code>n</code> vertices is denoted by the graph <code>K<sub>n</sub></code>.</p>
<img class="center-image-0 center-image-100" src="./assets/posts/graph-theory/gt-complete.svg" />
<p>A complete graph is often seen as the worst-case possible graph and is used for performance testing.</p>

<h3>3. Graph Representation</h3>
<p>The next important aspect is the data structure we use to represent a graph, which can have a huge impact on performance. The simplest and most common way is using an adjacency matrix.</p>

<h3>3.1. Adjacency Matrix</h3>
<p>An <a href="https://en.wikipedia.org/wiki/Adjacency_matrix" target="_blank">adjacency matrix</a> <code>m</code> represents a graph, where <code>m[i][j]</code> is the edge weight of going from node <code>i</code> to node <code>j</code>. Unless specified, it's often assumed that the edge of going from a node to itself has zero cost. Which is why the diagonal of the matrix has all zeroes.</p>
<img class="center-image-0 center-image-65" src="./assets/posts/graph-theory/gt-adjacency-matrix.svg" />
<p>For example, the weight of the edge going from node D to node B is 5, as represented in the matrix.</p>

<p>Pros:</p>
<ul>
<li>Space efficient for representing dense graphs.</li>
<li>Edge weight lookup is constant time: <code>O(1)</code>.</li>
<li>Simplest graph representation.</li>
</ul>

<p>Cons:</p>
<ul>
<li>Requires <code>O(V<sup>2</sup>)</code> space, where <code>V</code> is the number of nodes/vertices.</li>
<li>Iterating over all edges requires <code>O(V<sup>2</sup>)</code> time.</li>
</ul>

<p>The quadratic space complexity becomes less feasible when dealing with networks with nodes in the order of thousands or more.</p>

<h3>3.2. Adjacency List</h3>
<p>The other alternative to the adjacency matrix is the <a href="https://en.wikipedia.org/wiki/Adjacency_list" target="_blank">adjacency list</a>. This is a way to represent the graph as a map from nodes to lists of outgoing edges. In other words, each node tracks all its outgoing edges. i.e., <code>N<sub>1</sub> = [(N<sub>x</sub>, W), (N<sub>y</sub>, W), ...]</code></p>
<img class="center-image-0 center-image-70" src="./assets/posts/graph-theory/gt-adjacency-list.svg" />
<p>For example, Node C has 3 outgoing edges, so the map entry for Node C has those 3 entries, each represented by the combination of the destination node and edge weight/cost.</p>

<p>Pros:</p>
<ul>
<li>Space efficient for representing sparse graphs (no extra space for unused edges).</li>
<li>Iterating over all edges is efficient.</li>
</ul>

<p>Cons:</p>
<ul>
<li>Less space efficient for dense graphs.</li>
<li>Edge weight lookup is <code>O(E)</code>, where <code>E</code> is the number of edges of a node.
</li>
<li>Slightly more complex graph representation.</li>
</ul>
<p>Adjacency lists are still very commonly used, since edge weight lookup is not a common use case and many real-world use cases involve sparse graphs.</p>

<h3>3.3. Edge List</h3>
<p>The edge list takes an overly simplified approach to represent a graph simply as an unordered list of edges with the source node, destination node, and the weight. For example, <code>(u, v, w)</code> represents the cost from node <code>u</code> to node <code>v</code> as <code>w</code>.</p>
<img class="center-image-0 center-image-65" src="./assets/posts/graph-theory/gt-edge-list.svg" />
<p>Pros:</p>
<ul>
<li>Space efficient for representing sparse graphs.</li>
<li>Iterating over all edges is efficient.</li>
<li>Overly simple structure/representation.</li>
</ul>

<p>Cons:</p>
<ul>
<li>Less space efficient for dense graphs.</li>
<li>Edge weight lookup is <code>O(E)</code>, where <code>E</code> is the number of edges.</li>
</ul>

<p>Despite the seeming simplicity and lack of structure, edge lists do come in handy for a variety of problems and algorithms.</p>

<h3>4. Graph Problems</h3>

<p>One of the best approaches to dealing with graph problems is to better understand and familiarize yourself with common graph theory algorithms. Many other problems can be reduced to a known graph problem.</p>

<ul>
<li>Does the graph already exist, or is it to be derived/constructed?</li>
<li>Is the graph directed or undirected?</li>
<li>Is it a weighted graph (edges)?</li>
<li>Is it a sparse graph or a dense graph?</li>
<li>Based on all of the above, should I use an adjacency matrix, adjacency list, edge list, or other structures?</li>
</ul>

<h3>4.1. Shortest Path Problem</h3>

<p>Given a weighted graph, find the shortest path of edges from Node A to Node B (source and destination nodes).</p>
<p>Algorithms: <a href="https://en.wikipedia.org/wiki/Breadth-first_search" target="_blank">Breadth First Search</a> (unweighted graph), <a href="https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm" target="_blank">Dijkstra</a>'s, Bellman-Ford, Floyd-Warshall, A*, and many more.</p>
<img class="center-image-0 center-image-100" src="./assets/posts/graph-theory/gt-shortest-path.svg" />
<p>In the example, to find the shortest path from Node A to Node H, the sum of all the weights/costs of the path taken should be the least.</p>

<h3>4.2. Connectivity</h3>

<p>Along the same lines, to determine if connectivity exists from Node A to Node B. In other words, given the nodes, do they exist in the same network/graph? This is quite commonly used in communication networks such as WiFi, Thread, Zigbee, etc.</p>
<img class="center-image-0 center-image-65" src="./assets/posts/graph-theory/gt-connectivity.svg" />
<p>Algorithms: Any search algorithm such as BFS (Breadth First Search) or DFS (<a href="https://en.wikipedia.org/wiki/Depth-first_search" target="_blank">Depth First Search</a>).</p>

<h3>4.3. Negative Cycles</h3>
<p>To detect negative cycles in a directed graph. Also known as a negative-weight cycle, it is a cycle in a graph whose edges sum to a negative value.</p>
<p></p>
<img class="center-image-0 center-image-45" src="./assets/posts/graph-theory/gt-cycles.svg" />
<p>In the example, nodes B, C, and D form a negative cycle, where the sum of costs is -1, which can lead to cycling endlessly with a smaller cost for every iteration. For instance, finding the shortest path without detecting negative cycles would be a trap, never escaping out of it.</p>
<img class="center-image-0 center-image-55" src="./assets/posts/graph-theory/gt-currency.svg" />
<p>Detecting negative cycles has other applications, such as currency arbitrage. In this context, assign currencies to different vertices, and let the edge weight represent the exchange rate.</p>
<p>Algorithms to detect negative cycles: <a href="https://en.wikipedia.org/wiki/Bellman%E2%80%93Ford_algorithm" target="_blank">Bellman-Ford</a> and <a href="https://en.wikipedia.org/wiki/Floyd%E2%80%93Warshall_algorithm" target="_blank">Floyd-Warshall</a>.</p>
<p></p>

<h3>4.4. Strongly Connected Components</h3>
<p><a href="https://en.wikipedia.org/wiki/Strongly_connected_component" target="_blank">SSCs</a> are self-contained cycles within a directed graph, i.e., every vertex/node in a cycle can reach every other vertex in the same cycle. </p>
<img class="center-image-0 center-image" src="./assets/posts/graph-theory/gt-ssc.svg" />
<p>If each strongly connected component is contracted to a single vertex, the resulting graph is a directed acyclic graph (DAG), the condensation of Graph G.</p>
<p>Algorithms: <a href="https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm" target="_blank">Tarjan's SSC</a> and <a href="https://en.wikipedia.org/wiki/Kosaraju%27s_algorithm" target="_blank">Kosaraju</a>'s algorithm.</p>

<h3>4.5. Traveling Salesman Problem</h3>
<p>or the travelling salesperson problem (<a href="https://en.wikipedia.org/wiki/Travelling_salesman_problem" target="_blank">TSP</a>) asks "Given a list of cities and the distances between each pair of cities, what is the shortest possible route that visits each city exactly once and returns to the origin city?" It is an NP-hard problem.</p>
<img class="center-image-0 center-image-65" src="./assets/posts/graph-theory/gt-tsp.svg" />
<p>For the above graph, the TSP (Traveling Salesman Problem) solution has a cost of 9 to travel from Node A to all the other nodes and back to Node A.</p>
<p>Algorithms: <a href="https://en.wikipedia.org/wiki/Held%E2%80%93Karp_algorithm" target="_blank">Held-Karp</a>, Brand and Bound, Approximation (Ex: Ant Colony) algorithms</p>

<h3>4.6. Bridges</h3>
<p>A <a href="https://en.wikipedia.org/wiki/Bridge_(graph_theory)" target="_blank">bridge</a>, cut-edge, or cut-arc is an edge of a graph whose deletion increases the graph's number of connected components (islands or clusters).</p>
<img class="center-image-0 center-image-55" src="./assets/posts/graph-theory/gt-bridge.svg" />
<p>Detecting bridges is important as they often signify bottlenecks, weak points, or vulnerabilities in a graph. For instance, it's common to ensure that a mesh network is a bridgeless graph.</p>

<h3>4.7. Articulation Points</h3>
<p>An articulation point, or cut vertex, is similar to a bridge, but instead of edges, they are nodes. When removed, they increase the number of connected components.</p>
<img class="center-image-0 center-image-60" src="./assets/posts/graph-theory/gt-ap.svg" />
<p>In the same graph as for bridges, the nodes connected by the bridges are articulation points.</p>

<h3>4.8. Minimum Spanning Tree (MST)</h3>
<p>A minimum spanning tree (<a href="https://en.wikipedia.org/wiki/Minimum_spanning_tree" target="_blank">MST</a>) or minimum weight spanning tree is a subset of the edges of a connected, edge-weighted undirected graph that connects all the vertices together, without any cycles and with the minimum possible total edge weight/cost.</p>
<img class="center-image-0 center-image-80" src="./assets/posts/graph-theory/gt-mst.svg" />
<p>A graph can have multiple minimum spanning trees with the same cost, but the resulting trees (MSTs) are not unique. Common use cases include designing a least-cost network, transportation networks, and more.</p>
<p>Algorithms: Kruskal's, Prim's and Boruvka's algorithm.</p>
<p></p>

<h3>4.7. Flow Network</h3>
<p><a href="https://en.wikipedia.org/wiki/Flow_network" target="_blank">Flow network</a> or the transportation network is a directed graph where the edge weight represents "capacity." The amount of flow on an edge cannot exceed the capacity of the edge. Capacity can represent fluids in a pipe, currents in an electrical circuit, cars on a road, etc.</p>
<p>Problem: For an infinite input to reach the sink, what's the max flow? With this, it's easier to see bottlenecks in the network that slow the flow. Correlating to the example, max flow would be the number of cars, volume of fluid, etc.</p>
<img class="center-image-0 center-image-65" src="./assets/posts/graph-theory/gt-flow-network.svg" />
<p>Also, there cannot be blockages in the network/flow, the amount of flow into a node equals the amount of flow out of it.</p>

<h3>5. Conclusion</h3>
<p>With the basics of graph theory covered, including various types of graphs and their representations, we've laid the groundwork for understanding how to efficiently store, represent, and traverse graphs in real-world applications. The next set of posts on Graph Theory will be a deep dive into specific problems and algorithms.</p>

<h3>6. References</h3>
<pre style="max-height: 180px"><code>[1] W. Fiset, "Algorithms repository," GitHub, 2017. [Online]. Available: https://github.com/williamfiset/Algorithms.
[2] V. Schwartz, "Currency Arbitrage and Graphs (2)," Reasonable Deviations, Apr. 21, 2019. [Online]. Available: https://reasonabledeviations.com/2019/04/21/currency-arbitrage-graphs-2/. 
[3] Wikipedia, "Graph theory," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Graph_theory.
[4] Wikipedia, "Bidirected graph," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Bidirected_graph.
[5] Wikipedia, "Directed graph," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Directed_graph.
[6] Wikipedia, "Tree (graph theory)," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Tree_(graph_theory).
[7] Wikipedia, "Directed acyclic graph," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Directed_acyclic_graph.
[8] Wikipedia, "Bipartite graph," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Bipartite_graph.
[9] Wikipedia, "Complete graph," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Complete_graph.
[10] Wikipedia, "Adjacency matrix," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Adjacency_matrix.
[11] Wikipedia, "Adjacency list," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Adjacency_list.
[12] Wikipedia, "Breadth-first search," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Breadth-first_search.
[13] Wikipedia, "Depth-first search," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Depth-first_search.
[14] Wikipedia, "Bellman–Ford algorithm," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Bellman%E2%80%93Ford_algorithm.
[15] Wikipedia, "Floyd–Warshall algorithm," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Floyd%E2%80%93Warshall_algorithm.
[16] Wikipedia, "Strongly connected component," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Strongly_connected_component.
[17] Wikipedia, "Travelling salesman problem," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Travelling_salesman_problem.
[18] Wikipedia, "Held–Karp algorithm," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Held%E2%80%93Karp_algorithm.
[19] Wikipedia, "Bridge (graph theory)," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Bridge_(graph_theory).
[20] Wikipedia, "Minimum spanning tree," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Minimum_spanning_tree.
[21] Wikipedia, "Flow network," Wikipedia, The Free Encyclopedia. [Online]. Available: https://en.wikipedia.org/wiki/Flow_network.
</code></pre>
