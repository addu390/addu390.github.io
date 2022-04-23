---
layout: page
permalink: /archive
title: Archive of All Collections
---

**Note:** This page contains all materials in `posts` and `notes`.

{% for collection in site.collections %}
{% if collection.label != "pages" and collection.label != "journals" %}

  <h2>Entries from {{ collection.label | capitalize }}</h2>
  <ul>
    {% for item in site[collection.label] %}
      <li class="archives" style="padding-bottom: 0.6em;"><a href="{{ item.url }}">{{ item.title }}</a></li>
    {% endfor %}
  </ul>
  {% endif %}
{% endfor %}
