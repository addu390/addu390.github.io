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
---

<img class="center-image" src="./assets/featured/space-tessellation.png" /> 

<p>⚠️ Brewing! this post a continuation of <a href="/spatial-index-grid-system">Spatial Index: Grid Systems</a> where we will set the foundation for tessellation and delve into the details of <a href="https://github.com/uber/h3" target="_blank">Uber H3</a>. Don't forget to <a href="https://pyblog.medium.com/subscribe" target="_blank">subscribe</a> to get the latest updates straight to your inbox!</p>


<details open><summary class="h3">0. Foundation</summary>
<p>The rationale behind why a geographical grid system is necessary: The real world is cluttered with various geographical elements, both natural and man-made, none of which follow any consistent structure. To perform geographic algorithms or analyses on it, we need a more abstract form. </p>

<p>Maps are a good start and are the most common abstraction, with which most people are familiar. However, maps still contain all sorts of inconsistencies. This calls for a grid system, which takes the cluttered geographic space and provides a more clean and structured mathematical space, making it much easier to perform computations and queries.</p>

<img class="center-image-0 center-image-100" src="./assets/posts/spatial-index/h3-why-grids.png" />
<p class="figure-header">Figure 0: Tessellated View of Halifax</p>

<p>The primary principle of the grid is to break the space into uniform cells. These cells are the units of analysis used in geographic systems. Think of it as pixels in an image.</p>

<p>A grid system adds a couple more layers on top of this, consisting of a series of nested grids, usually at increasingly fine resolutions. They include a way to uniquely identify any cell in the system. Other common grid systems include <a href="https://en.wikipedia.org/wiki/Graticule_(cartography)" target="_blank">Graticule</a> (latitude and longitude), <a href="https://learn.microsoft.com/en-us/bingmaps/articles/bing-maps-tile-system#tile-coordinates-and-quadkeys" target="_blank">Quad Key</a>  (Mercator projection), <a href="/spatial-index-grid-system#3-geohash" target="_blank">Geohash</a> (Equirectangular projection) and <a href="/spatial-index-grid-system#4-google-s2" target="_blank">Google S2</a> (Spherical projection).</p>
</details>

<hr class="clear-hr">

<details open><summary class="h3">1. Uber H3</summary>
<p>Most systems use four-sided polygons (Square, Rectangle and Quadrilateral). H3 is the grid system developed by Uber, which uses hexagon cells as its base. It covers the space/world with hexagons and has different levels of resolution, with the smallest cells representing about <code>1 cm²</code> of space.</p>
</details>