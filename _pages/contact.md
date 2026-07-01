---
layout: page
title: Contact
kicker: Correspondence
deck: Questions, corrections, or a friendly hello.
permalink: /contact/
author: Adesh Nalpet Adimurthy
date: 2024-06-26
---

<style>
    .ct-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        margin: 24px 0 30px;
    }

    .ct-card {
        display: flex;
        align-items: center;
        gap: 13px;
        border: 1px solid var(--np-hair);
        padding: 15px 16px;
        text-decoration: none !important;
        color: var(--np-ink) !important;
        transition: background .15s ease, border-color .15s ease, transform .15s ease;
    }

    .ct-card:hover {
        background: var(--np-paper-2);
        border-color: var(--np-ink);
        transform: translateY(-2px);
    }

    .ct-badge {
        flex: 0 0 auto;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--np-ink);
        font-family: var(--np-display);
        font-weight: 700;
        font-size: 1.05em;
        color: var(--np-ink);
        transition: background .15s ease, color .15s ease, border-color .15s ease;
    }

    .ct-card:hover .ct-badge {
        background: var(--np-ink);
        border-color: var(--np-ink);
        color: var(--np-paper);
    }

    .ct-meta {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
    }

    .ct-chan {
        font-family: var(--np-text);
        font-size: 0.68em;
        letter-spacing: .14em;
        text-transform: uppercase;
        color: var(--np-soft);
    }

    .ct-handle {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
        font-size: 0.9em;
        color: var(--np-ink);
        word-break: break-all;
    }

    .ct-note {
        border-top: 3px double var(--np-ink);
        padding-top: 16px;
        font-family: var(--np-text);
        font-size: 0.92em;
        color: var(--np-ink);
    }

    .ct-note strong {
        font-family: var(--np-display);
    }

    @media screen and (max-width: 680px) {
        .ct-grid {
            grid-template-columns: 1fr 1fr;
        }
    }

    @media screen and (max-width: 460px) {
        .ct-grid {
            grid-template-columns: 1fr;
        }
    }
</style>

<div class="ct-grid">
    <a class="ct-card" href="mailto:yo@pyblog.xyz">
        <span class="ct-badge">&#64;</span>
        <span class="ct-meta"><span class="ct-chan">Email</span><span class="ct-handle">yo@pyblog.xyz</span></span>
    </a>
    <a class="ct-card" href="https://github.com/addu390" target="_blank" rel="noopener">
        <span class="ct-badge">GH</span>
        <span class="ct-meta"><span class="ct-chan">GitHub</span><span class="ct-handle">@addu390</span></span>
    </a>
    <a class="ct-card" href="https://www.linkedin.com/in/adesh-nalpet-adimurthy" target="_blank" rel="noopener">
        <span class="ct-badge">in</span>
        <span class="ct-meta"><span class="ct-chan">LinkedIn</span><span class="ct-handle">adesh-nalpet</span></span>
    </a>
    <a class="ct-card" href="https://pyblog.medium.com/" target="_blank" rel="noopener">
        <span class="ct-badge">M</span>
        <span class="ct-meta"><span class="ct-chan">Medium</span><span class="ct-handle">@pyblog</span></span>
    </a>
    <a class="ct-card" href="https://substack.com/@pyblog" target="_blank" rel="noopener">
        <span class="ct-badge">S</span>
        <span class="ct-meta"><span class="ct-chan">Substack</span><span class="ct-handle">@pyblog</span></span>
    </a>
    <a class="ct-card" href="https://twitter.com/gooshi_addu" target="_blank" rel="noopener">
        <span class="ct-badge">X</span>
        <span class="ct-meta"><span class="ct-chan">X / Twitter</span><span class="ct-handle">@gooshi_addu</span></span>
    </a>
</div>

<p class="ct-note"><strong>Letters to the Editor.</strong> For a question about a specific article, leave a comment at the foot of the piece. Sign in with GitHub. For re-using or syndicating anything here, the terms live in the <a class="np-contact-link" href="/privacy">Privacy Policy</a>.</p>
