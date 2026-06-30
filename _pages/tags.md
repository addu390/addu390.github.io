---
layout: index
title: Subject Index
kicker: Index
deck: "Every dispatch, filed by subject. The back-of-book index."
permalink: /tags/
content-type: eg
---

<div class="np-subject-index">
    {% assign tags = site.tags | sort %}
    {% for tag in tags %}
    <section class="np-subject">
        <h3 class="np-subject-head" id="{{ tag | first | slugify }}">
            <a href="/tags/{{ tag | first | slugify }}">{{ tag | first }}</a>
            <span class="np-subject-count">{{ tag | last | size }}</span>
        </h3>
        <ul class="np-subject-list">
            {% for post in tag.last %}
            <li><a href="{{ post.url }}">{{ post.title }}</a></li>
            {% endfor %}
        </ul>
    </section>
    {% endfor %}
</div>
