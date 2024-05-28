---
layout: post
title: "Real-time insights: Telemetry Pipeline"
date: 2024-05-04
tags:
  - Realtime
  - Database
author: Adesh Nalpet Adimurthy
feature: assets/featured/telemetry-pipeline.png
category: System Wisdom
---

<img class="center-image" src="./assets/featured/telemetry-pipeline.png" /> 

Hey 👋 it's a work in progress, stay tuned! [Subscribe](https://pyblog.medium.com/subscribe) maybe?

<details open><summary class="h3">0. Overview</summary>
<p>A <a href="https://en.wikipedia.org/wiki/Telemetry" target="_blank" rel="noopener noreferrer">telemetry</a> pipeline is a system that collects, ingests, processes, stores, and analyzes telemetry data (metrics, logs, traces) from various sources in real-time or near real-time to provide insights into the performance and health of applications and infrastructure.</p>

<img class="telemetry-barebone center-image-90" src="./assets/posts/telemetry/telemetry-barebone.svg" /> 
<p style="text-align: center;">Figure 0: Barebone Telemetry Pipeline Architecture (Psst... hover over me! 🤫)</p>

<p>It typically involves tools like Telegraf for data collection, Kafka for ingestion, Flink for processing, and <a href="https://cassandra.apache.org/" target="_blank" rel="noopener noreferrer">Cassandra</a> and <a href="https://victoriametrics.com/" target="_blank" rel="noopener noreferrer">VictoriaMetrics</a> for storage and analysis.</p>

<img class="telemetry-architecture" src="./assets/posts/telemetry/telemetry-architecture.svg" /> 
<p style="text-align: center;">Figure 1: Detailed Telemetry Pipeline Architecture (Me too! 😎)</p>

<details open class="text-container"><summary class="h4">0.1. Stages</summary>
<ul>
<li><p><b>Collection</b>: Telemetry data is collected from various sources using agents like Telegraf and <a href="https://www.fluentd.org/" target="_blank" rel="noopener noreferrer">Fluentd</a>.</p></li>
<li><p><b>Ingestion</b>: Data is ingested through message brokers such as Apache Kafka or Kinesis to handle high throughput.</p></li>
<li><p><b>Processing</b>: Real-time processing is done using stream processing frameworks like Apache Flink for filtering, aggregating, and enriching data.</p></li>
<li><p><b>Storage and Analysis</b>: Processed data is stored in systems like Cassandra, VictoriaMetrics and <a href="https://www.elastic.co/downloads/elasticsearch" target="_blank" rel="noopener noreferrer">Elasticsearch</a>, and analyzed using tools like Grafana and Kibana for visualization and alerting.</p></li>
</ul>
</details>
</details>

<hr class="clear-hr">

<details open><summary class="h3">1. Collection</summary>

<p>To start, we'll use <a href="https://www.influxdata.com/time-series-platform/telegraf/" target="_blank" rel="noopener noreferrer">Telegraf</a>, a versatile open-source agent that collects metrics from various sources and writes them to different outputs. Telegraf supports a wide range of <a href="https://docs.influxdata.com/telegraf/v1/plugins/#input-plugins" target="_blank" rel="noopener noreferrer">input</a> and <a href="https://docs.influxdata.com/telegraf/v1/plugins/#output-plugins" target="_blank" rel="noopener noreferrer">output plugins</a>, making it easy to gather data from sensors, servers, GPS systems, and more.</p>

<p><img class="center-image" src="./assets/posts/telemetry/telegraf-overview.png" /> </p>
<p style="text-align: center;">Figure 2: Telegraf for collecting metrics & data</p>

<p>For this example, we'll focus on collecting the CPU temperature and Fan speed from a macOS system using the <a href="https://github.com/influxdata/telegraf/blob/release-1.30/plugins/inputs/exec/README.md" target="_blank" rel="noopener noreferrer">exec plugin</a> in Telegraf. And leverage the <a href="https://github.com/lavoiesl/osx-cpu-temp" target="_blank" rel="noopener noreferrer">osx-cpu-temp</a> command line tool to fetch the CPU temperature.</p>

<details class="code-container"><summary class="h4">1.1. Install Dependencies</summary>
<ul>
<li><p>Using Homebrew: <code>brew install telegraf</code><br/>
For other OS, refer: <a href="https://docs.influxdata.com/telegraf/v1/install/" target="_blank" rel="noopener noreferrer">docs.influxdata.com/telegraf/v1/install</a>. <br/>
Optionally, download the latest telegraf release from: <a href="https://www.influxdata.com/downloads" target="_blank" rel="noopener noreferrer">https://www.influxdata.com/downloads</a><br/></p></li>

<li><p>Using Homebrew: <code>brew install osx-cpu-temp</code><br/>
Refer: <a href="https://github.com/lavoiesl/osx-cpu-temp" target="_blank" rel="noopener noreferrer">github.com/lavoiesl/osx-cpu-temp</a></p></li>
</ul>
</details>
<hr class="sub-hr">

<details class="code-container"><summary class="h4">1.2. Capture Metrics</summary>

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
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4">1.3. Configure Telegraf</summary>
<p>The location of <code>telegraf.conf</code> installed using homebrew: <code>/opt/homebrew/etc/telegraf.conf</code></p>

<p>Telegraf's configuration file is written using <a href="https://github.com/toml-lang/toml#toml" target="_blank" rel="noopener noreferrer">TOML</a> and is composed of three sections: <a href="https://github.com/influxdata/telegraf/blob/master/docs/CONFIGURATION.md#global-tags" target="_blank" rel="noopener noreferrer">global tags</a>, <a href="https://github.com/influxdata/telegraf/blob/master/docs/CONFIGURATION.md#agent" target="_blank" rel="noopener noreferrer">agent</a> settings, and <a href="https://github.com/influxdata/telegraf/blob/master/docs/CONFIGURATION.md#plugins" target="_blank" rel="noopener noreferrer">plugins</a> (inputs, outputs, processors, and aggregators).</p>

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

<p>🚧: Don't forget to expore tons of other input and output plugins: <a href="https://docs.influxdata.com/telegraf/v1/plugins/" target="_blank" rel="noopener noreferrer">docs.influxdata.com/telegraf/v1/plugins</a></p>
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4">1.4. Run Telegraf</summary>
<p>Edit <code>telegraf.conf</code> (with the above config):<br/> <code>vi /opt/homebrew/etc/telegraf.conf</code></p>
<p>Run <code>telegraf</code> (when installed from Homebrew):<br/> <code>/opt/homebrew/opt/telegraf/bin/telegraf -config /opt/homebrew/etc/telegraf.conf</code></p>
</details>

</details>

<hr class="clear-hr">

<details open><summary class="h3">2. Ingestion</summary>

<p>The telemetry server layer is designed to be <u>lightweight</u>. Its primary function is to authenticate incoming data and publish raw events directly to Kafka. Further processing of these events will be carried out by the stream processing framework.</p>

<p>For our example, the Flask application serves as the telemetry server, acting as the entry point for the data. It receives the data via a POST request, validates it (Authentication), and publishes the messages to a Kafka topic.</p>

<details class="code-container"><summary class="h4">2.1. Install Dependencies</summary>
<p>Using PIP: <code>pip3 install Flask flask-cors kafka-python</code></p>
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4">2.2. Docker Compose</summary>

<p>To set up Kafka using Docker Compose, ensure Docker is installed on your machine by following the instructions on the <a href="https://docs.docker.com/get-docker/" target="_blank" rel="noopener noreferrer">Docker installation</a> page. Once Docker is installed, create a <code>docker-compose.yml</code> file with the configuration below to start <code>Kafka</code> and <code>Zookeeper</code> services:</p>

<pre><code>version: '3.7'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.3.5
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-enterprise-kafka:7.3.5
    ports:
      - "9092:9092"  # Internal port
      - "9094:9094"  # External port
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,OUTSIDE:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka:9092,OUTSIDE://localhost:9094
      KAFKA_LISTENERS: INTERNAL://0.0.0.0:9092,OUTSIDE://0.0.0.0:9094
      KAFKA_INTER_BROKER_LISTENER_NAME: INTERNAL
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      CONFLUENT_SUPPORT_METRICS_ENABLE: "false"
    depends_on:
      - zookeeper

  kafka-topics-creator:
    image: confluentinc/cp-enterprise-kafka:7.3.5
    depends_on:
      - kafka
    entrypoint: ["/bin/sh", "-c"]
    command: |
      "cub kafka-ready -b kafka:9092 1 20 && \
      kafka-topics --create --topic raw-events --bootstrap-server kafka:9092 --replication-factor 1 --partitions 1 && \
      echo 'Kafka topic created.'"
</code></pre>
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4">2.2. Run Telemetry Server</summary>

<p>The Flask application includes a <code>/metrics</code> endpoint, as configured in <code>telegraf.conf</code> output to collect metrics. When data is sent to this endpoint, the Flask app receives and publishes the message to <code>Kafka</code>.</p>

<p>New to Flask? Refer: <a href="https://flask.palletsprojects.com/en/3.0.x/quickstart/" target="_blank" rel="noopener noreferrer">Flask Quickstart</a></p>

<pre><code>import os
from flask_cors import CORS
from flask import Flask, jsonify, request
from dotenv import load_dotenv
from kafka import KafkaProducer
import json


app = Flask(__name__)
cors = CORS(app)
load_dotenv()

producer = KafkaProducer(bootstrap_servers='localhost:9094', 
                         value_serializer=lambda v: json.dumps(v).encode('utf-8'))

@app.route('/metrics', methods=['POST'])
def process_metrics():
    data = request.get_json()
    print(data)
    producer.send('raw-events', data)
    return jsonify({'status': 'success'}), 200


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
</code></pre>

<p>Start all services 🚀:</p>
<ul>
<li><p>Run <code>docker-compose up</code> to start the services (Kafka + Zookeeper).</p></li>
<li><p>Run Flask App (Telemetry Server):<br/> <code>flask run</code></p></li>
<li><p>Ensure <code>telegraf</code> is running:<br/> <code>/opt/homebrew/opt/telegraf/bin/telegraf -config /opt/homebrew/etc/telegraf.conf</code></p></li>
</ul>
</details>

</details>

<hr class="clear-hr">

<details open><summary class="h3">3. Processing</summary>
<p></p>
<img src="./assets/posts/telemetry/stateful-stream-processing.svg" />

<details class="code-container"><summary class="h4">3.1. Install Dependencies</summary>

<ul>
<li><p>Download <code>Flink</code> and extract the archive: <a href="https://www.apache.org/dyn/closer.lua/flink/flink-1.18.1/flink-1.18.1-bin-scala_2.12.tgz" target="_blank" rel="noopener noreferrer">www.apache.org/dyn/closer.lua/flink/flink-1.18.1/flink-1.18.1-bin-scala_2.12.tgz</a><br/>At the time of writing this post <code>Flink 1.18.1</code> is the latest stable version that supports <a href="https://www.apache.org/dyn/closer.lua/flink/flink-connector-kafka-3.1.0/flink-connector-kafka-3.1.0-src.tgz" target="_blank" rel="noopener noreferrer">kafka connector plugin</a>.</p></li>
<li><p>Start Flink: <code>cd flink-1.18.1 && ./bin/start-cluster.sh</code>
<br/>Flink dashboard at: <a href="http://localhost:8081" target="_blank" rel="noopener noreferrer">localhost:8081</a></p></li>
<li><p>Download <code>Kafka Connector</code> and extract the archive: <a href="https://www.apache.org/dyn/closer.lua/flink/flink-connector-kafka-3.1.0/flink-connector-kafka-3.1.0-src.tgz" target="_blank" rel="noopener noreferrer">www.apache.org/dyn/closer.lua/flink/flink-connector-kafka-3.1.0/flink-connector-kafka-3.1.0-src.tgz</a><br/>Copy/Move the <code>flink-connector-kafka-3.1.0-1.18.jar</code> to <code>flink-1.18.1/lib</code> (<code>$FLINK_HOME/lib</code>)</p></li>
<li><p>PyFlink Using PIP: <code>pip3 install apache-flink==1.18.1</code><br/>Usage examples: <a href="https://github.com/apache/flink/tree/release-1.19/flink-python/pyflink/examples" target="_blank" rel="noopener noreferrer">flink-python/pyflink/examples</a></p></li>
</ul>
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4">3.2. Docker Compose</summary>
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4">3.3. Run Flink Job</summary>
</details>

</details>

<hr class="clear-hr">

<details open><summary class="h3">4. Storage and Analysis </summary>
<p></p>
<details open class="text-container"><summary class="h4">4.1. Choosing the Data Store(s) </summary>
<p>When choosing the right database for telemetry data, it's crucial to consider several factors:</p>
<ul>
<li><p><b>Read and Write Patterns</b>: Understanding the frequency and volume of read and write operations is key. High write and read throughput require different database optimizations and consistencies.</p></li>
<li><p><b>Data Amplification</b>: Be mindful of how the data volume might grow over time (+<a href="https://en.wikipedia.org/wiki/Write_amplification" target="_blank" rel="noopener noreferrer">Write Amplification</a>) and how the database handles this increase without significant performance degradation.</p></li>
<li><p><b>Cost</b>: Evaluate the cost implications, including storage, processing, and any associated services.</p></li>
<li><p><b>Analytics Use Cases</b>: Determine whether the primary need is for real-time analytics, historical data analysis, or both.</p></li>
<li><p><b>Transactions</b>: Consider the nature and complexity of transactions that will be performed. For example: Batch write transactions</p></li>
<li><p><b>Read and Write Consistency</b>: Decide on the level of consistency required for the application. For example, OLTP (Online Transaction Processing) systems prioritize consistency and transaction integrity, while OLAP (Online Analytical Processing) systems are optimized for complex queries and read-heavy workloads.</p></li>
</ul>

<hr class="hr">

<p>Choosing a data store typically boils down to selecting between OLTP (Online Transaction Processing), OLAP (Online Analytical Processing), or a Hybrid approach, depending on your specific use case requirements</p>
<ul>
<li><p><b>Transactional and High Throughput Needs</b>: For high write throughput and transactional batches (all or nothing), with queries needing wide row fetches and limited indexed queries based on client_id, time stamp, geo-spatial (<a href="https://www.geomesa.org/documentation/stable/index.html" target="_blank" rel="noopener noreferrer">GeoMesa</a>) points within the client partition, Cassandra is better suited.</p></li>

<li><p><b>Complex Analytical Queries</b>: For more complex analytical queries, aggregations on specific columns, and machine learning models, data store(s) such as ClickHouse or VictoriaMetrics (emphasis on time-series) is more appropriate. Its optimized columnar storage and powerful query capabilities make it ideal for handling large-scale analytical tasks.</p></li>

<li><p><b>Hybrid Approach</b>: In scenarios requiring both fast write-heavy transactional processing and complex analytics, a common approach is to use Cassandra for real-time data ingestion and storage, and periodically perform ETL (Extract, Transform, Load) or CDC (Change Data Capture) processes to batch insert data into OLAP DB for analytical processing. This leverages the strengths of both databases, ensuring efficient data handling and comprehensive analytical capabilities. Proper indexing and data modeling goes unsaid 🧐</p></li>
</ul>

<hr class="hr">

<p>☢️ Using a HTAP (Hybrid Transactional/Analytical Processing) database that's suitable for both transactional and analytical workloads is worth considering.</p>

<p>While you get some of the best from both worlds 🌎, you also inherit a few of the worst from each! <br/>Lucky for you, I have first hand experience with it 🤭:</p>
<img class="center-image-60" src="./assets/posts/telemetry/of-both-worlds.png" />

<p>Worth the extra read for geospatial data 🗺️:</p>
<ul>
<li>Hybrid Spatial Index (Quad-KD and R-KD trees): <a href="https://www.pyblog.xyz/hybrid-spatial-index-conclusion" target="_blank" rel="noopener noreferrer">pyblog.xyz/hybrid-spatial-index-conclusion</a></li>
<li>Grid, Cell Shape and Tessellation: <a href="https://www.pyblog.xyz/cartograms-documentation" target="_blank" rel="noopener noreferrer">pyblog.xyz/cartograms-documentation</a></li>
</ul>
</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">4.2. Analytics and Alerts</summary>

<p>Typically, analytics are performed as batch queries on bounded datasets of recorded events, requiring reruns to incorporate new data. In contrast, streaming queries ingest real-time event streams, continuously updating results as events are consumed, with outputs either written to an external database or maintained as internal state.</p>

<img src="./assets/posts/telemetry/usecases-analytics.svg" />
<p style="text-align: center;">Figure 3: Batch Analytics vs Stream Analytics</p>

<table>
    <tr>
        <td>Feature</td>
        <td>Batch Analytics</td>
        <td>Stream Analytics</td>
    </tr>
    <tr>
        <td>Data Processing</td>
        <td>Processes large volumes of stored data</td>
        <td>Processes data in real-time as it arrives</td>
    </tr>
    <tr>
        <td>Result Latency</td>
        <td>Produces results with some delay; near real-time results with frequent query runs</td>
        <td>Provides immediate insights and actions</td>
    </tr>
    <tr>
        <td>Resource Efficiency</td>
        <td>Requires querying the database often for necessary data</td>
        <td>Continuously updates results in transient data stores without re-querying the database</td>
    </tr>
    <tr>
        <td>Typical Use</td>
        <td>Ideal for historical analysis and periodic reporting</td>
        <td>Best for real-time monitoring, alerting, and dynamic applications</td>
    </tr>
    <tr>
        <td>Complexity Handling</td>
        <td>Can handle complex queries and computations</td>
        <td>Less effective for highly complex queries</td>
    </tr>
    <tr>
        <td>Backfill</td>
        <td>Easy to backfill historical data and re-run queries</td>
        <td>Backfill may introduce incorrect metrics</td>
    </tr>
</table>
</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">4.3. Visualization </summary>
</details>

</details>

<hr class="clear-hr">

<details><summary class="h3">5. References</summary>
</details>