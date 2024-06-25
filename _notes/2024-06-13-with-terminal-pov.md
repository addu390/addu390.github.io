---
layout: post
title: "With Terminal: Point of View"
date: 2024-06-13
tags:
  - Project
author: Adesh Nalpet Adimurthy
category: Notes
---

<img class="center-image-0 center-image-40" src="../assets/notes/with-terminal-what.svg" />
<p><span class="header">1. What?</span> Data normalization across various telematics providers, offering a unified API platform to streamline integrations. To simplify the process of connecting disparate systems, ensuring consistent and clean data.</p>

<img class="center-image-0 center-image-35" src="../assets/notes/with-terminal-what-data.svg" />
<p><span class="header">2. Data?</span> is predominantly spatio-temporal (the best kind of data with high precision), meaning it focuses on the "where?" and "when?" aspects. Expect queries primarily on these dimensions alongside other models.</p>

<img class="center-image-0 center-image" src="../assets/notes/with-terminal.svg" />
<p><span class="header">3. How?</span> The core of the product is to allow easy telematics integration into existing applications (for businesses) without the need to worry about integrating with every provider and handling every variant of integration. An ETL pipeline, where the output is normalized models accessed via APIs.</p>

<hr class="hr">

<p><span class="header">4. And?</span> The way I see it, the core of the solution is "to empower businesses to do what they do best and leave the integration complexities to us." This calls for solidifying the integration with (1) Input and Output connectors, (2) Context and Template Mapping, (3) Predictions and Aggregations, (4) Analytics and Alerts.</p>
<img class="center-image-0 center-image-80" src="../assets/notes/with-terminal-extension.svg" />

<p><span class="header">4.1. Output connectors</span>: Given the highly frequent and time-series nature of the data, it's less transactional and more analytical. This implies that the use of the data (for businesses) primarily involves storage in analytical databases and BI systems. This is solved with output connectors, making it a one-stop telematics integration solution.</p>

<img class="center-image-90" src="../assets/posts/telemetry/telemetry-barebone.svg" /> 

<p><span class="header">4.2a. Context Mapping (Enrichments)</span>: It's not uncommon to have systems from multiple providers in a vehicle. Context mapping refers to mapping data from different sources. For example, data outside of telematics providers includes monitoring for in-vehicle cargo, electrical/battery systems, tire pressure, engine health, etc., as well as other relevant data such as environmental conditions (weather) and traffic information.</p>

<p><span class="header">4.2b. Template Mapping</span>: Although a normalized API makes integrations easy, it often requires further transformations to use it with current systems. Template mapping is a schema transformation layer to define the output schema on top of the normalized models. However, this may become an anti-pattern if overused and adds overhead for version upgrades.</p>

<hr class="hr">

<p><span class="header">4.3. Predictions and Aggregations</span>: A lot of the data points add no value when they are not aggregated. Examples include speed at a specific moment, a single fuel consumption reading, an isolated engine fault code incident, a one-time tire pressure reading, a brief idle period, a single temperature reading (for engine or cargo), and many more. However, these data points become more usable when aggregated, such as averages, sums, counts, min/max values, percentiles, medians, etc.</p>
<img src="../assets/posts/telemetry/stateful-stream-processing.svg" />
<p>Boils down to: Windowing techniques to have context of prior data, which also evolves to predictions (and anomalies). One good example is <a href="https://docs.mindsdb.com/use-cases/data_enrichment/overview">MindsDB</a>: to enrich data with AI-generated content.</p> 

<p>Predictions and Aggregations based on prior data is now a new data source for context mapping.</p>

<hr class="hr">

<p><span class="header">4.4. Analytics and Alerts</span>: Analytics/Database as a service for both real-time streaming analytics and batch analytics allows users to access analytical data via APIs.</p>

<img src="../assets/posts/telemetry/usecases-analytics.svg" />