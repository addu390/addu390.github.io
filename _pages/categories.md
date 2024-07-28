---
layout: page
title: Organized by Category
permalink: /categories/
content-type: eg
---

<p></p>
<main class="all-posts text-container">
    {% for category in site.categories %}
        <div class="pure-u-1 tags">
        <h3 style="margin-top: 0.5em;" id="{{ category | first }}">{{ category | first  }}</h3>
            <ul style="padding: 0 2em 0 1em;">
            {% for post in category.last %}
                <li id="category-content" style="padding-bottom: 0.6em;"><a href="{{post.url}}">{{ post.title }}</a></li>
            {% endfor %}
            </ul>
        </div>
    {% endfor %}
</main>
<br/>
