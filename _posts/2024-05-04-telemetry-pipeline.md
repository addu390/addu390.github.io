---
layout: post
title: "Real-time insights: Telemetry Pipeline"
date: 2024-05-04
tags:
  - Realtime
  - Database
tips:
  - ⚠️ WIP
  - 🌵 Tangential topic
  - ☢️ Ponder on
  - 🚧 Alternatives
author: Adesh Nalpet Adimurthy
feature: assets/featured/telemetry-pipeline.png
category: System Wisdom
---

<img class="center-image" src="./assets/featured/telemetry-pipeline.png" /> 

<details open><summary class="h3">0. Overview</summary>
<p></p>
<details open class="text-container"><summary class="h4">0.1. Architecture</summary>
<p>A <a href="https://en.wikipedia.org/wiki/Telemetry" target="_blank" rel="noopener noreferrer">telemetry</a> pipeline is a system that collects, ingests, processes, stores, and analyzes telemetry data (metrics, logs, traces) from various sources in real-time or near real-time to provide insights into the performance and health of applications and infrastructure.</p>

<img class="telemetry-barebone center-image-90" src="./assets/posts/telemetry/telemetry-barebone.svg" /> 
<p class="figure-header">Figure 0: Barebone Telemetry Pipeline Architecture (Psst... hover over me! 🤫)</p>

<p>It typically involves tools like Telegraf for data collection, Kafka for ingestion, Flink for processing, and <a href="https://cassandra.apache.org/" target="_blank" rel="noopener noreferrer">Cassandra</a> and <a href="https://victoriametrics.com/" target="_blank" rel="noopener noreferrer">VictoriaMetrics</a> for storage and analysis.</p>

<img class="telemetry-architecture" src="./assets/posts/telemetry/telemetry-architecture.svg" /> 
<p class="figure-header">Figure 1: Detailed Telemetry Pipeline Architecture (Me too! 😎)</p>
</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">0.2. Stages</summary>
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
<p></p>
<details open class="text-container"><summary class="h4">1.1. Collection Agent</summary>

<p>To start, we'll use <a href="https://www.influxdata.com/time-series-platform/telegraf/" target="_blank" rel="noopener noreferrer">Telegraf</a>, a versatile open-source agent that collects metrics from various sources and writes them to different outputs. Telegraf supports a wide range of <a href="https://docs.influxdata.com/telegraf/v1/plugins/#input-plugins" target="_blank" rel="noopener noreferrer">input</a> and <a href="https://docs.influxdata.com/telegraf/v1/plugins/#output-plugins" target="_blank" rel="noopener noreferrer">output plugins</a>, making it easy to gather data from sensors, servers, GPS systems, and more.</p>

<p><img class="center-image telegraf-overview" src="./assets/posts/telemetry/telegraf-overview.svg" /> </p>
<p class="figure-header">Figure 2: Telegraf for collecting metrics & data</p>

<p>For this example, we'll focus on collecting the CPU temperature and Fan speed from a macOS system using the <a href="https://github.com/influxdata/telegraf/blob/release-1.30/plugins/inputs/exec/README.md" target="_blank" rel="noopener noreferrer">exec plugin</a> in Telegraf. And leverage the <a href="https://github.com/lavoiesl/osx-cpu-temp" target="_blank" rel="noopener noreferrer" target="_blank" rel="noopener noreferrer">osx-cpu-temp</a> command line tool to fetch the CPU temperature.</p>

<p>🌵 <a href="https://github.com/inlets/inlets-pro" target="_blank" rel="noopener noreferrer">Inlets</a> allows devices behind firewalls or NAT to securely expose local services to the public internet by tunneling traffic through a public-facing Inlets server</p>
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4">1.2. Dependencies</summary>
<ul>
<li><p>Using Homebrew: <code>brew install telegraf</code><br/>
For other OS, refer: <a href="https://docs.influxdata.com/telegraf/v1/install/" target="_blank" rel="noopener noreferrer">docs.influxdata.com/telegraf/v1/install</a>. <br/>
Optionally, download the latest telegraf release from: <a href="https://www.influxdata.com/downloads" target="_blank" rel="noopener noreferrer">https://www.influxdata.com/downloads</a><br/></p></li>

<li><p>Using Homebrew: <code>brew install osx-cpu-temp</code><br/>
Refer: <a href="https://github.com/lavoiesl/osx-cpu-temp" target="_blank" rel="noopener noreferrer">github.com/lavoiesl/osx-cpu-temp</a></p></li>
</ul>
</details>
<hr class="sub-hr">

<details class="code-container"><summary class="h4">1.3. Events</summary>

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

<details class="code-container"><summary class="h4">1.4. Configuration</summary>
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

<p>Edit <code>telegraf.conf</code> (use above config):<br/> <code>vi /opt/homebrew/etc/telegraf.conf</code></p>

<p>🚧: Don't forget to expore tons of other input and output plugins: <a href="https://docs.influxdata.com/telegraf/v1/plugins/" target="_blank" rel="noopener noreferrer">docs.influxdata.com/telegraf/v1/plugins</a></p>
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4" id="telemetry-1-5">1.5. Start Capture</summary>
<p>Run <code>telegraf</code> (when installed from Homebrew):<br/> <code>/opt/homebrew/opt/telegraf/bin/telegraf -config /opt/homebrew/etc/telegraf.conf</code></p>
</details>

</details>

<hr class="clear-hr">

<details open><summary class="h3">2. Ingestion</summary>
<p></p>
<details open class="text-container"><summary class="h4">2.1. Telemetry Server</summary>

<p>The telemetry server layer is designed to be <u>lightweight</u>. Its primary function is to authenticate incoming requests and publish raw events directly to Message Broker/Kafka. Further processing of these events will be carried out by the stream processing framework.</p>

<p>For our example, the Flask application serves as the telemetry server, acting as the entry point for the requests. It receives the data via a POST request, validates it, and publishes the messages to a Kafka topic.</p>

<p>🌵 <a href="https://opentelemetry.io/docs/collector/" target="_blank" rel="noopener noreferrer">OpenTelemetry</a>: an in-app observability framework to create and manage telemetry data.</p>
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4">2.2. Dependencies</summary>
<ul>
<li><p>Using PIP: <code>pip3 install Flask flask-cors kafka-python</code></p></li>
<b>For Local Kafka Set-up</b> (Or use Docker from next sub-section):
<li><p>Using Homebrew: <code>brew install kafka</code> <br/>Refer: <a href="https://formulae.brew.sh/formula/kafka" target="_blank" rel="noopener noreferrer">Homebrew Kafka</a></p>
<p>Start Zookeeper: <code>zookeeper-server-start /opt/homebrew/etc/kafka/zookeeper.properties</code><br/>
Start Kafka: <code>brew services restart kafka</code></p>
<p>Create Topic: <code>kafka-topics --create --bootstrap-server localhost:9092 --replication-factor 1 --partitions 1 --topic learn</code> <br/>Usage: <a href="https://kafka.apache.org/documentation/#topicconfigs" target="_blank" rel="noopener noreferrer">Kafka CLI</a></p>
</li>
</ul>
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4" id="telemetry-2-3">2.3. Docker Compose</summary>

<p>To set up Kafka using Docker Compose, ensure Docker is installed on your machine by following the instructions on the <a href="https://docs.docker.com/get-docker/" target="_blank" rel="noopener noreferrer">Docker installation</a> page. Once Docker is installed, create a <code>docker-compose.yml</code> for <code>Kafka</code> and <code>Zookeeper</code>:</p>

<pre><code>version: '3.7'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.3.5
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.3.5
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
    image: confluentinc/cp-kafka:7.3.5
    depends_on:
      - kafka
    entrypoint: ["/bin/sh", "-c"]
    command: |
      "
      # blocks until kafka is reachable
      kafka-topics --bootstrap-server kafka:9092 --list

      echo -e 'Creating kafka topics'
      kafka-topics --bootstrap-server kafka:9092 --create --if-not-exists --topic raw-events --replication-factor 1 --partitions 1

      echo -e 'Successfully created the following topics:'
      kafka-topics --bootstrap-server kafka:9092 --list
      "

  schema-registry:
    image: confluentinc/cp-schema-registry:7.3.5
    environment:
      - SCHEMA_REGISTRY_KAFKASTORE_CONNECTION_URL=zookeeper:2181
      - SCHEMA_REGISTRY_HOST_NAME=schema-registry
      - SCHEMA_REGISTRY_LISTENERS=http://schema-registry:8085,http://localhost:8085
    ports:
      - 8085:8085
    depends_on: [zookeeper, kafka]
</code></pre>
<p>Run <code>docker-compose up</code> to start the services (Kafka + Zookeeper).</p>
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4" id="telemetry-2-4">2.4. Start Server</summary>

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
<li><p>Run Flask App (Telemetry Server):<br/> <code>flask run</code></p></li>
<li><p>Ensure <code>telegraf</code> is running (Refer: <a href="#telemetry-1-5">Section 1.5</a>)</p></li>
</ul>
</details>

</details>

<hr class="clear-hr">

<details open><summary class="h3">3. Processing</summary>
<p></p>
<details open class="text-container"><summary class="h4">3.1. Stream Processor</summary>
<p>Key Features to Look for in a Stream Processing Framework:</p>
<ul>
<li><p><b>Scalability and Performance</b>: Scale by adding nodes, efficiently use resources, process data with minimal delay, and handle large volumes</p></li>
<li><p><b>Fault Tolerance and Data Consistency</b>: Ensure fault tolerance with state saving for failure recovery and exactly-once processing.</p></li>
<li><p><b>Ease of Use and Community Support</b>: Provide user-friendly APIs in multiple languages, comprehensive documentation, and active community support.</p></li>
</ul>
<img src="./assets/posts/telemetry/stateful-stream-processing.svg" />
<p class="figure-header">Figure 3: Stateful Stream Processing</p>
<ul>
<li><p><b>Integration and Compatibility</b>: Seamlessly integrate with various data sources and sinks, and be compatible with other tools in your tech stack.</p></li>
<li><p><b>Windowing and Event Time Processing</b>: Support various <a href="https://nightlies.apache.org/flink/flink-docs-release-1.19/docs/dev/datastream/operators/windows/" target="_blank" rel="noopener noreferrer">windowing strategies</a> (tumbling, sliding, session) and manage late-arriving data based on event timestamps.</p></li>
<li><p><b>Security and Monitoring</b>: Include security features like data encryption and robust access controls, and provide tools for monitoring performance and logging.</p></li>
</ul>
<p>Although I have set the context to use Flink for this example;<br/>
☢️ Note: While <a href="https://flink.apache.org/" target="_blank" rel="noopener noreferrer">Apache Flink</a> is a powerful choice for stream processing due to its rich feature set, scalability, and advanced capabilities, it can be overkill for a lot of use cases, particularly those with simpler requirements and/or lower data volumes.</p>

<p>🚧 Open Source Alternatives: <a href="https://kafka.apache.org/documentation/streams/" target="_blank" rel="noopener noreferrer">Apache Kafka Streams</a>, <a href="https://storm.apache.org/" target="_blank" rel="noopener noreferrer">Apache Storm</a>, <a href="https://samza.apache.org/" target="_blank" rel="noopener noreferrer">Apache Samza</a></p>
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4">3.2. Dependencies</summary>
<ul>
<li><p>Install PyFlink Using PIP: <code>pip3 install apache-flink==1.18.1</code><br/>Usage examples: <a href="https://github.com/apache/flink/tree/release-1.19/flink-python/pyflink/examples" target="_blank" rel="noopener noreferrer">flink-python/pyflink/examples</a></p></li>

<b>For Local Flink Set-up:</b> (Or use Docker from next sub-section)
<li><p>Download Flink and extract the archive: <a href="https://www.apache.org/dyn/closer.lua/flink/flink-1.18.1/flink-1.18.1-bin-scala_2.12.tgz" target="_blank" rel="noopener noreferrer">www.apache.org/dyn/closer.lua/flink/flink-1.18.1/flink-1.18.1-bin-scala_2.12.tgz</a><br/>☢️ At the time of writing this post <code>Flink 1.18.1</code> is the latest stable version that supports <a href="https://www.apache.org/dyn/closer.lua/flink/flink-connector-kafka-3.1.0/flink-connector-kafka-3.1.0-src.tgz" target="_blank" rel="noopener noreferrer">kafka connector plugin</a>.</p></li>
<li><p>Download Kafka Connector and extract the archive: <a href="https://www.apache.org/dyn/closer.lua/flink/flink-connector-kafka-3.1.0/flink-connector-kafka-3.1.0-src.tgz" target="_blank" rel="noopener noreferrer">www.apache.org/dyn/closer.lua/flink/flink-connector-kafka-3.1.0/flink-connector-kafka-3.1.0-src.tgz</a><br/>Copy/Move the <code>flink-connector-kafka-3.1.0-1.18.jar</code> to <code>flink-1.18.1/lib</code> (<code>$FLINK_HOME/lib</code>)</p></li>
<li><p>Ensure Flink Path is set <code>export FLINK_HOME=/full-path/flink-1.18.1</code> (add to <code>.bashrc</code>/<code>.zshrc</code>)</p></li>
<li><p>Start Flink Cluster: <code>cd flink-1.18.1 && ./bin/start-cluster.sh</code>
<br/>Flink dashboard at: <a href="http://localhost:8081" target="_blank" rel="noopener noreferrer">localhost:8081</a></p></li>
<li><p>To Stop Flink Cluster: <code>./bin/stop-cluster.sh</code></p></li>
</ul>
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4" id="telemetry-3-3">3.3. Docker Compose</summary>
<ul>
<li><p>Create <code>flink_init/Dockerfile</code> file for Flink and Kafka Connector:</p>
<pre><code>FROM flink:1.18.1-scala_2.12

RUN wget -P /opt/flink/lib https://repo.maven.apache.org/maven2/org/apache/flink/flink-connector-kafka/3.1.0-1.18/flink-connector-kafka-3.1.0-1.18.jar

RUN chown -R flink:flink /opt/flink/lib
</code></pre>
</li>

<li><p>Add Flink to <code>docker-compose.yml</code> (in-addition to Kafka, from <a href="#telemetry-2-3">Section 2.3</a>)</p>
<pre><code>version: '3.8'
services:
  jobmanager:
    build: flink_init/.
    ports:
      - "8081:8081"
    command: jobmanager
    environment:
      - |
        FLINK_PROPERTIES=
        jobmanager.rpc.address: jobmanager

  taskmanager:
    build: flink_init/.
    depends_on:
      - jobmanager
    command: taskmanager
    environment:
      - |
        FLINK_PROPERTIES=
        jobmanager.rpc.address: jobmanager
        taskmanager.numberOfTaskSlots: 2
</code></pre>
</li>
<p>Run <code>docker-compose up</code> to start the services (Kafka + Zookeeper, Flink).</p>
</ul>
</details>

<hr class="sub-hr">

<details class="code-container"><summary class="h4">3.4. Start Cluster</summary>
<p>⚠️ PyFlink Job:</p>
<pre><code></code></pre>
<p>Start all services 🚀:</p>
<ul>
<li><p>Ensure all the services are running (Refer: Section <a href="#telemetry-1-5">1.5</a>, <a href="#telemetry-2-4">2.4</a>, <a href="#telemetry-3-3">3.3</a>)</p></li>
</ul>
</details>

</details>

<hr class="clear-hr">

<details open><summary class="h3">4. Storage and Analysis </summary>
<p></p>
<details open class="text-container"><summary class="h4">4.1. Datastore </summary>
<p>When choosing the right database for telemetry data, it's crucial to consider several factors:</p>
<ul>
<li><p><b>Read and Write Patterns</b>: Understanding the frequency and volume of read and write operations is key. High write and read throughput require different database optimizations and consistencies.</p></li>
<li><p><b>Data Amplification</b>: Be mindful of how the data volume might grow over time (+<a href="https://en.wikipedia.org/wiki/Write_amplification" target="_blank" rel="noopener noreferrer">Write Amplification</a>) and how the database handles this increase without significant performance degradation.</p></li>
<li><p><b>Cost</b>: Evaluate the cost implications, including storage, processing, and any associated services.</p></li>
<li><p><b>Analytics Use Cases</b>: Determine whether the primary need is for real-time analytics, historical data analysis, or both.</p></li>
<li><p><b>Transactions</b>: Consider the nature and complexity of transactions that will be performed. For example: Batch write transactions</p></li>
<li><p><b>Read and Write Consistency</b>: Decide on the level of consistency required for the application. For example, OLTP (Online Transaction Processing) systems prioritize consistency and transaction integrity, while OLAP (Online Analytical Processing) systems are optimized for complex queries and read-heavy workloads.</p></li>
</ul>

<p>🌵 <a href="https://tikv.github.io/deep-dive-tikv/key-value-engine/B-Tree-vs-Log-Structured-Merge-Tree.html" target="_blank" rel="noopener noreferrer">LSM-Tree</a> favors write-intensive applications.</p>

<hr class="hr">

<p>Choosing a data store typically boils down to selecting between OLTP (Online Transaction Processing), OLAP (Online Analytical Processing), or a Hybrid approach, depending on your specific use case requirements</p>
<ul>
<li><p><b>Transactional and High Throughput Needs</b>: For high write throughput and transactional batches (all or nothing), with queries needing wide row fetches and limited indexed queries based on client_id, time stamp, geo-spatial points within the client partition, Cassandra is better suited.</p></li>

<li><p><b>Complex Analytical Queries</b>: For more complex analytical queries, aggregations on specific columns, and machine learning models, data store(s) such as <a href="https://clickhouse.com/" target="_blank" rel="noopener noreferrer">ClickHouse</a> or VictoriaMetrics (emphasis on time-series) is more appropriate. Its optimized columnar storage and powerful query capabilities make it ideal for handling large-scale analytical tasks.</p></li>

<li><p><b>Hybrid Approach</b>: In scenarios requiring both fast write-heavy transactional processing and complex analytics, a common approach is to use Cassandra for real-time data ingestion and storage, and periodically perform ETL (Extract, Transform, Load) or CDC (Change Data Capture) processes to batch insert data into OLAP DB for analytical processing. This leverages the strengths of both databases, ensuring efficient data handling and comprehensive analytical capabilities. Proper indexing and data modeling goes unsaid 🧐</p></li>
</ul>

<hr class="hr">

<p>☢️ Using a HTAP (Hybrid Transactional/Analytical Processing) database that's suitable for both transactional and analytical workloads is worth considering. Example: <a href="https://github.com/pingcap/tidb" target="_blank" rel="noopener noreferrer">TiDB</a></p>

<p>While you get some of the best from both worlds 🌎, you also inherit a few of the worst from each! <br/>Lucky for you, I have first hand experience with it 🤭:</p>
<img class="center-image-60" src="./assets/posts/telemetry/of-both-worlds.png" />

</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">4.2. Temporal and Spatial Index</summary>
<p>⚠️ Work In Progress!</p>

<p>🌵 <a href="https://www.geomesa.org/documentation/stable/index.html" target="_blank" rel="noopener noreferrer">GeoMesa</a>: <a href="https://www.geomesa.org/documentation/stable/user/datastores/index_overview.html" target="_blank" rel="noopener noreferrer">spatio-temporal</a> data persistence on top of popular distributed databases for massive storage of point, line and polygon data.</p>

</details>

<hr class="sub-hr">

<details open class="text-container"><summary class="h4">4.3. Analytics and Alerts</summary>

<p>Typically, analytics are performed as batch queries on bounded datasets of recorded events, requiring reruns to incorporate new data. In contrast, streaming queries ingest real-time event streams, continuously updating results as events are consumed, with outputs either written to an external database or maintained as internal state.</p>

<img src="./assets/posts/telemetry/usecases-analytics.svg" />
<p class="figure-header">Figure 4: Batch Analytics vs Stream Analytics</p>
<div class="table-container">
<table style="width: 800px;">
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
        <td>Backfill can potentially introduce complexity</td>
    </tr>
</table>
</div>

<p>🌵 <a href="https://docs.mindsdb.com/what-is-mindsdb" target="_blank" rel="noopener noreferrer">MindsDB</a>: Connect Data Source, Configure AI Engine, Create AI Tables, Query for predictions and Automate workflows.</p>
</details>

</details>
<p></p>