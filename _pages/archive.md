---
layout: page
permalink: /archive
title: Archive of All Collections
---

**Note:** This page contains all material in `posts` and `journals`.

<details><summary class="h3" id="all-posts">Everything</summary>
{% for collection in site.collections %}
{% if collection.label != "pages" and collection.label != "notes" %}

  <h2>Entries from {{ collection.label | capitalize }}</h2>
  <ul>
    {% for item in site[collection.label] %}
      <li class="archives" style="padding-bottom: 0.6em;"><a href="{{ item.url }}">{{ item.title }}</a></li>
    {% endfor %}
  </ul>
  {% endif %}
{% endfor %}
</details>

<hr class="hr">

<details><summary class="h3" id="all-posts">By tags</summary>
<div>
    {% for tag in site.tags %}
    <div class="pure-u-1 tags">
        <h2 id="{{ tag | first }}">{{ tag | first | capitalize }}</h2>
        <ul>
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

<hr class="hr">

<details><summary class="h3" id="all-posts">By category</summary>
<main>
    {% for category in site.categories %}
        <div class="pure-u-1 tags">
        <h2 id="{{ category | first }}">{{ category | first  }}</h2>
            <ul>
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

<hr class="clear-hr">