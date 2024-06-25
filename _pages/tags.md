---
layout: page
title: Organized by Tags
permalink: /tags/
content-type: eg
---

<main class="all-posts">
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
</main>
