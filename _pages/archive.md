---
layout: index
permalink: /archive
title: The Complete Index
kicker: Index
deck: "Everything ever filed: posts and journal entries, in full."
---

<div class="np-index-body-inner">
{% for collection in site.collections %}
{% if collection.label != "pages" and collection.label != "notes" %}
<section class="np-ledger">
    <div class="np-section-title">From the {{ collection.label | capitalize }}</div>
    <ul class="np-ledger-list">
    {% assign items = site[collection.label] | sort: "date" | reverse %}
    {% for item in items %}
        <li>
            <a class="np-lg-title" href="{{ item.url }}">{{ item.title }}</a>
            <span class="np-lg-dots" aria-hidden="true"></span>
            <span class="np-lg-meta">{{ item.date | date: "%b %-d, %Y" }}</span>
        </li>
    {% endfor %}
    </ul>
</section>
{% endif %}
{% endfor %}

<div class="np-section-title np-index-divider">By Subject</div>
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
</div>
