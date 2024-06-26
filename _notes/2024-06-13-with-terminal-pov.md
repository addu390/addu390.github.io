---
layout: post
title: "With Terminal: Point of View"
date: 2024-06-13
tags:
  - Project
author: Adesh Nalpet Adimurthy
feature: assets/featured/hex-spiderman.png
category: Notes
---

<img class="center-image-0 center-image-40" src="../assets/notes/with-terminal-what.svg" />
<p><span class="header">1. What?</span> Data normalization across various telematics providers, offering a unified API platform to streamline integrations. To simplify the process of connecting disparate systems, ensuring consistent and clean data.</p>

<img class="center-image-0 center-image-35" src="../assets/notes/with-terminal-what-data.svg" />
<p><span class="header">2. Data?</span> is predominantly spatio-temporal (the best kind of data with high precision), meaning it focuses on the "where?" and "when?" aspects. Expect queries primarily on these dimensions alongside other models.</p>

<img class="center-image-0 center-image" src="../assets/notes/with-terminal.svg" />
<p><span class="header">3. How?</span> The core of the product is to allow easy telematics integration into existing applications (for businesses) without the need to worry about integrating with every provider and handling every variant of integration. An ETL pipeline, where the output is normalized models accessed via APIs.</p>

<hr class="hr">

<p><span class="header">4. And?</span> The way I see it, the core of the solution is "to empower businesses to do what they do best and leave the integration complexities to us." This calls for solidifying the integration with, Top 4: (1) Input and Output connectors, (2) Context and Template Mapping, (3) Predictions and Aggregations, (4) Analytics and Alerts.</p>
<img class="center-image-0 center-image-80" src="../assets/notes/with-terminal-extension.svg" />
<p class="figure-header">Figure 4: Features; Connectors, Mapping, Agrregations and Analytics</p>

<p><span class="header">4.1. Output connectors</span>: Given the highly frequent and time-series nature of the data, it's less transactional and more analytical. This implies that the use of the data (for businesses) primarily involves storage in analytical databases and BI systems. This is solved with output connectors, making it a one-stop telematics integration solution.</p>

<img class="center-image-100" src="../assets/notes/with-terminal-connectors.svg" /> 
<p class="figure-header">Figure 5: Input and Output Connectors</p>

<p><span class="header">4.2a. Context Mapping</span> (Enrichments): It's not uncommon to have systems from multiple providers in a vehicle. Context mapping refers to mapping data from different sources. For example, data outside of telematics providers includes monitoring for in-vehicle cargo, electrical/battery systems, tire pressure, engine health, etc., as well as other relevant data such as environmental conditions (weather) and traffic information.</p>

<img class="center-image-50" src="../assets/notes/with-terminal-enrichment.svg" /> 
<p class="figure-header">Figure 6: Context Mapping (Enrichments) across Verticals</p>

<p><span class="header">4.2b. Template Mapping</span>: Although a normalized API makes integrations easy, it often requires further transformations to use it with current systems. Template mapping is a schema transformation layer to define the output schema on top of the normalized models.</p> 

<img class="center-image-50" src="../assets/notes/with-terminal-mapping.svg" /> 
<p class="figure-header">Figure 7: Template Mapping (Transformations)</p>

<p>This may seem like an anti-pattern and doesn't necessarily mean it's not normalized anymore. The concept of normalization typically applies to the internal structure of the data and how it's stored. Perform transformations while: Eliminating Redundancy, Ensuring Data Integrity and Optimizing for Queries.</p>

<hr class="hr">

<p><span class="header">4.3. Predictions and Aggregations</span>: A lot of the data points add no value when they are not aggregated. Examples include speed at a specific moment, a single fuel consumption reading, an isolated engine fault code incident, a one-time tire pressure reading, a brief idle period, a single temperature reading (for engine or cargo), and many more. However, these data points become more usable when aggregated, such as averages, sums, counts, min/max values, percentiles, medians, etc.</p>
<img src="../assets/posts/telemetry/stateful-stream-processing.svg" />
<p class="figure-header">Figure 8: Stateful Stream Processing from <a href="/telemetry-pipeline" target="_blank">Real-time insights: Telemetry Pipeline</a></p>
<p>Boils down to: Windowing techniques to have context of prior data, which also evolves to predictions (and anomalies). One good example is <a href="https://docs.mindsdb.com/use-cases/data_enrichment/overview">MindsDB</a>: to enrich data with AI-generated content.</p> 

<p>Predictions and Aggregations based on prior data is now a new data source for context mapping.</p>

<hr class="hr">

<p><span class="header">4.4. Analytics and Alerts</span>: Dotted lines in (Figure 4) for a reason! Heading towards analytics and alerts is stepping on the provider's/business's arena, but Analytics/Database as a Service (while still being API-first) is vast enough to coexist.</p>

<img src="../assets/posts/telemetry/usecases-analytics.svg" />
<p class="figure-header">Figure 9: Batch Analytics vs Stream Analytics from <a href="/telemetry-pipeline" target="_blank">Real-time insights: Telemetry Pipeline</a></p>

<hr class="hr">

<p class="header">5. Relevant blog posts:</p>
<p>Here are a few of my relevant blog posts delving into the details of Telemetry, CDC, Spatial Indexes, Anomaly Detection, and Serverless Architecture:</p>
<ul>
<li>Real-time insights: <a href="/telemetry-pipeline" target="_blank">Telemetry Pipeline</a></li>
<li>Debezium: PostgreSQL <a href="/debezium-postgres-cdc" target="_blank">Change Data Capture (CDC)</a></li>
<p></p>
<li>Spatial Index: <a href="/spatial-index-space-filling-curve" target="_blank">Space-Filling Curves</a></li>
<li>Spatial Index: <a href="/spatial-index-grid-system" target="_blank">Grid Systems</a></li>
<li>Spatial Index: <a href="/spatial-index-tessellation" target="_blank">Tessellation</a></li>
<li>Spatial Index: <a href="/spatial-index-r-tree" target="_blank">R Trees</a> (Draft)</li>
<li>Hybrid Spatial Data Structures: <a href="hybrid-spatial-index-conclusion" target="_blank">Quad-KD and R-KD trees</a></li>
<p></p>
<li><a href="/anomaly-detection-and-remediation" target="_blank">Anomaly Detection and Remediations</a></li>
<li>Deploying Django Application on <a href="/django-fargate-in-8-minutes" target="_blank">AWS Fargate in 8 minutes</a></li>
</ul>