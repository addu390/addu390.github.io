---
layout: post
title: "Real-time insights: Telemetry Pipeline"
date: 2024-05-12
tags:
  - System Design
  - Database
author: Adesh Nalpet Adimurthy
feature: assets/featured/telemetry-pipeline.png
category: System Wisdom
---

<img class="center-image" src="./assets/featured/telemetry-pipeline.png" /> 
<p style="text-align: center;">Figure 1: Telemetry Pipeline</p>

Hey 👋 it's a work in progress, stay tuned! [Subscribe](https://pyblog.medium.com/subscribe) maybe?


<details open><summary class="h3">1. Data Collection</summary>

<p>To start, we'll use <a href="https://www.influxdata.com/time-series-platform/telegraf/" target="_blank" rel="noopener noreferrer">Telegraf</a>, a versatile open-source agent that collects metrics from various sources and writes them to different outputs. Telegraf supports a wide range of <a href="https://docs.influxdata.com/telegraf/v1/plugins/#input-plugins" target="_blank" rel="noopener noreferrer">input</a> and <a href="https://docs.influxdata.com/telegraf/v1/plugins/#output-plugins" target="_blank" rel="noopener noreferrer">output plugins</a>, making it easy to gather data from sensors, servers, GPS systems, and more.</p>

<p><img class="center-image" src="./assets/posts/telemetry/telegraf-overview.png" /> </p>

<p>For this example, we'll focus on collecting the CPU temperature from a macOS system using the <a href="https://github.com/influxdata/telegraf/blob/release-1.30/plugins/inputs/exec/README.md" target="_blank" rel="noopener noreferrer">exec plugin</a> in Telegraf. We'll leverage the osx-cpu-temp command line tool to fetch the CPU temperature. Here’s how you can set this up:</p>


<h3 id="kafka-connect">1.1. Install Telegraf:</h3>
<p>Using Homebrew: <code>brew install telegraf</code></p>
<p> For other OS, refer: <a href="https://docs.influxdata.com/telegraf/v1/install/" target="_blank" rel="noopener noreferrer">docs.influxdata.com/telegraf/v1/instal</a>. <br/>
Optionally, download the latest telegraf release from: <a href="https://www.influxdata.com/downloads" target="_blank" rel="noopener noreferrer">https://www.influxdata.com/downloads</a><br/></p>


</details>

<details open><summary class="h3">2. Data Transmission</summary>
</details>

<details open><summary class="h3">3. Telmetry Server (Authentication & Processing)</summary>
</details>

<details open><summary class="h3">4. Data Conversion & Enrichment</summary>
</details>

<details open><summary class="h3">5. Data Storage & Visualization</summary>
</details>