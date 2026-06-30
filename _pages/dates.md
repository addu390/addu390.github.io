---
layout: index
title: By Date
kicker: Index
deck: The newsroom log, in the order posts ran.
permalink: /dates/
content-type: eg
---

<div class="np-index-body-inner">
{% assign postsByMonth = site.posts | group_by_exp: "post", "post.date | date: '%B %Y'" %}
{% for month in postsByMonth %}
<section class="np-ledger">
    <div class="np-section-title" id="{{ month.name | slugify }}">{{ month.name }}</div>
    <ul class="np-ledger-list">
    {% for post in month.items %}
        <li>
            <a class="np-lg-title" href="{{ post.url }}">{{ post.title }}</a>
            <span class="np-lg-dots" aria-hidden="true"></span>
            <span class="np-lg-meta">{{ post.date | date: "%b %-d" }} &middot; {{ post.tags | first | default: "Dispatch" }}</span>
        </li>
    {% endfor %}
    </ul>
</section>
{% endfor %}
</div>
