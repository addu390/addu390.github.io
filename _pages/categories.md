---
layout: page
title: Organized by Category
permalink: /categories/
content-type: eg
---

<main class="all-posts">
    {% for category in site.categories %}
        <div class="pure-u-1 tags">
        <h3 id="{{ category | first }}">{{ category | first  }}</h3>
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
