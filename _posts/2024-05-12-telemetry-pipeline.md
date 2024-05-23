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


<details><summary class="h3">1. Collection and Transmission</summary>

<p>To start, we'll use <a href="https://www.influxdata.com/time-series-platform/telegraf/" target="_blank" rel="noopener noreferrer">Telegraf</a>, a versatile open-source agent that collects metrics from various sources and writes them to different outputs. Telegraf supports a wide range of <a href="https://docs.influxdata.com/telegraf/v1/plugins/#input-plugins" target="_blank" rel="noopener noreferrer">input</a> and <a href="https://docs.influxdata.com/telegraf/v1/plugins/#output-plugins" target="_blank" rel="noopener noreferrer">output plugins</a>, making it easy to gather data from sensors, servers, GPS systems, and more.</p>

<p><img class="center-image" src="./assets/posts/telemetry/telegraf-overview.png" /> </p>

<p>For this example, we'll focus on collecting the CPU temperature and Fan speed from a macOS system using the <a href="https://github.com/influxdata/telegraf/blob/release-1.30/plugins/inputs/exec/README.md" target="_blank" rel="noopener noreferrer">exec plugin</a> in Telegraf. And leverage the <a href="https://github.com/lavoiesl/osx-cpu-temp" target="_blank" rel="noopener noreferrer">osx-cpu-temp</a> command line tool to fetch the CPU temperature.</p>

<h3 id="install-telegraf">1.1. Install Telegraf</h3>
<p>Using Homebrew: <code>brew install telegraf</code></p>
<p> For other OS, refer: <a href="https://docs.influxdata.com/telegraf/v1/install/" target="_blank" rel="noopener noreferrer">docs.influxdata.com/telegraf/v1/install</a>. <br/>
Optionally, download the latest telegraf release from: <a href="https://www.influxdata.com/downloads" target="_blank" rel="noopener noreferrer">https://www.influxdata.com/downloads</a><br/></p>

<hr class="hr">

<h3 id="install-osx">1.2. Install osx-cpu-temp</h3>
<p>Using Homebrew: <code>brew install osx-cpu-temp</code><br/>
Refer: <a href="https://github.com/lavoiesl/osx-cpu-temp" target="_blank" rel="noopener noreferrer">github.com/lavoiesl/osx-cpu-temp</a></p>

<p>Here's a <b>custom script</b> to get the CPU and Fan Speed:</p>
<pre><code>#!/bin/bash
timestamp=$(date +%s)000000000
hostname=$(hostname | tr "[:upper:]" "[:lower:]")
cpu=$(osx-cpu-temp -c | sed -e 's/\([0-9.]*\).*/\1/')
fans=$(osx-cpu-temp -f | grep '^Fan' | sed -e 's/^Fan \([0-9]\) - \([a-zA-Z]*\) side *at \([0-9]*\) RPM (\([0-9]*\)%).*/\1,\2,\3,\4/')
echo "cpu_temp,device_id=$hostname temp=$cpu $timestamp"
for f in $fans; do
  side=$(echo "$f" | cut -d, -f2 | tr "[:upper:]" "[:lower:]")
  rpm=$(echo "$f" | cut -d, -f3)
  pct=$(echo "$f" | cut -d, -f4)
  echo "fan_speed,device_id=$hostname,side=$side rpm=$rpm,percent=$pct $timestamp"
done
</code></pre>

<hr class="hr">

<p><b>Output Format</b>: <code>measurement,host=foo,tag=measure val1=5,val2=3234.34 1609459200000000000</code></p>

<ul>
<li><p>The output is of <a href="https://docs.influxdata.com/influxdb/v1/write_protocols/line_protocol_reference/" target="_blank" rel="noopener noreferrer">Line protocol syntax</a></p></li>
<li><p>Where <code>measurement</code> is the “table” (“measurement" in InfluxDB terms) to which the metrics are written.</p></li>
<li><p><code>host=foo,tag=measure</code> are tags to can group and filter by.</p></li>
<li><p><code>val1=5,val2=3234.34</code> are values, to display in graphs.</p></li>
<li><p><code>1716425990000000000</code> is the current unix timestamp + 9 x "0" — representing nanosecond timestamp.</p></li>
</ul>

<p><b>Sample Output</b>: <code>cpu_temp,device_id=adeshs-mbp temp=0.0 1716425990000000000</code></p>

<hr class="hr">

<h3 id="configure-telegraf">1.3. Configure Telegraf</h3>
<p>The location of <code>telegraf.conf</code> installed using homebrew: <code>/opt/homebrew/etc/telegraf.conf</code></p>

<p>Telegraf's configuration file is written using <a href="https://github.com/toml-lang/toml#toml" target="_blank" rel="noopener noreferrer">TOML</a> and is composed of three sections: <a href="https://github.com/influxdata/telegraf/blob/master/docs/CONFIGURATION.md#global-tags" target="_blank" rel="noopener noreferrer">global tags</a>, <a href="https://github.com/influxdata/telegraf/blob/master/docs/CONFIGURATION.md#agent" target="_blank" rel="noopener noreferrer">agent</a> settings, and <a href="https://github.com/influxdata/telegraf/blob/master/docs/CONFIGURATION.md#plugins" target="_blank" rel="noopener noreferrer">plugins</a> (nputs, outputs, processors, and aggregators).</p>

<p>Once Telegraf collects the data, we need to transmit it to a designated endpoint for further processing. For this, we'll use the <a href="https://github.com/influxdata/telegraf/blob/release-1.30/plugins/outputs/http/README.md" target="_blank" rel="noopener noreferrer">HTTP output plugin</a> in Telegraf to send the data in JSON format to a Flask application (covered in the next section).</p>

<p>Below is what the <code>telegraf.conf</code> file looks like, with <code>exec</code> input plugin (format: <code>influx</code>) and <code>HTTP</code> output plugin (format: <code>JSON</code>).</p>

<pre><code>[agent]
  interval = "10s"
  round_interval = true
  metric_buffer_limit = 10000
  flush_buffer_when_full = true
  collection_jitter = "0s"
  flush_interval = "10s"
  flush_jitter = "0s"
  precision = ""
  debug = false
  quiet = false
  logfile = "/path to telegraf log/telegraf.log"
  hostname = "host"
  omit_hostname = false

[[inputs.exec]]
  commands = ["/path to custom script/osx_metrics.sh"]
  timeout = "5s"
  name_suffix = "_custom"
  data_format = "influx"
  interval = "10s"

[[outputs.http]]
  url = "http://127.0.0.1:5000/metrics"
  method = "POST"
  timeout = "5s"
  data_format = "json"
  [outputs.http.headers]
    Content-Type = "application/json"
</code></pre>

<p>🚧: Don't forget to expore tons of other input and output plugins: <a href="https://docs.influxdata.com/telegraf/v1/plugins/" target="_blank" rel="noopener noreferrer"></a>docs.influxdata.com/telegraf/v1/plugins</p>

</details>

<hr class="hr">

<details open><summary class="h3">2. Exchange/Routing</summary>
</details>

<hr class="hr">

<details open><summary class="h3">3. Processing & Storage</summary>
</details>

<hr class="hr">

<details open><summary class="h3">4. Visualization</summary>
</details>

<hr class="hr">

<details><summary class="h3">5. References</summary>
</details>