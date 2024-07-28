---
layout: page
title: Organized by Tags
permalink: /tags/
content-type: eg
---

<p></p>
<main class="all-posts text-container">
    {% for tag in site.tags %}
        <div class="pure-u-1 tags">
        <h3 style="margin-top: 0.5em;" id="{{ tag | first }}">#<a href="{{site.url}}/tags/{{ tag | first | slugify }}">{{ tag | first  }}</a></h3>
            <ul style="padding: 0 2em 0 1em;">
            {% for post in tag.last %}
                <li id="category-content" style="padding-bottom: 0.6em;"><a href="{{post.url}}">{{ post.title }}</a></li>
            {% endfor %}
            </ul>
        </div>
    {% endfor %}
</main>
<br/>
