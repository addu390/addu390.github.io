---
layout: page
permalink: /archive
title: Archive of All Collections
---

<p class="all-posts">This page contains all material in <code>posts</code> and <code>journals</code>.</p>
<p></p>

<div class="all-posts">
<details class="text-container" open><summary class="h3">Everything</summary>
{% for collection in site.collections %}
{% if collection.label != "pages" and collection.label != "notes" %}

  <h3>Entries from {{ collection.label | capitalize }}</h3>
  <ul style="padding: 0 2em 0 1em;">
    {% for item in site[collection.label] %}
      <li class="archives" style="padding-bottom: 0.6em;"><a href="{{ item.url }}">{{ item.title }}</a></li>
    {% endfor %}
  </ul>
  {% endif %}
{% endfor %}
</details>

<hr class="sub-hr">

<details class="text-container"><summary class="h3">By tags</summary>
<div>
    {% for tag in site.tags %}
    <div class="pure-u-1 tags">
        <h3 id="{{ tag | first }}">{{ tag | first | capitalize }}</h3>
        <ul style="padding: 0 2em 0 1em;">
        {% for post in tag.last %}
            <li style="padding-bottom: 0.6em;"><a href="{{post.url}}">{{ post.title }}</a></li>
        {% endfor %}
        </ul>
    </div>
    {% endfor %}
    <br/>
    <br/>
</div>
</details>

<hr class="sub-hr">

<details class="text-container"><summary class="h3">By category</summary>
<main>
    {% for category in site.categories %}
        <div class="pure-u-1 tags">
        <h3 id="{{ category | first }}">{{ category | first  }}</h3>
            <ul style="padding: 0 2em 0 1em;">
            {% for post in category.last %}
                <li id="category-content" style="padding-bottom: 0.6em;"><a href="{{post.url}}">{{ post.title }}</a></li>
            {% endfor %}
            </ul>
        </div>
    {% endfor %}
    <br/>
    <br/>
</main>
</details>
</div>

<hr class="clear-hr">