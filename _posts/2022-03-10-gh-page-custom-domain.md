---
layout: post
title: "Custom domain for GitHub pages"
date: 2022-03-10
tags:
  - Github
author: Adesh Nalpet Adimurthy
feature: assets/featured/gh-llama-2.png
avatar: assets/profile.jpeg
category: Code on the Road 🤖
---

<img src="./assets/featured/gh-llama-2.png" /> 
<p style="text-align: center;">Let's get the website up! — Drama llama.</p>

## Configuration

- Domain (example.com).
- Subdomain (www.example.com).
- HTTPS (Optional but strongly recommended).

At the end of the tutorial, you'll have a set-up, where all requests to example.com will be redirected to [https://www.example.com](https://www.example.com)

## Enable GitHub pages in GitHub settings

- Go to the repository → Settings ⚙️ → Pages
- Select `Source`; Choosing `master`/`main` branch will treat `README.md` as web `index.html` and choosing `/docs` will treat `/docs/README.md` as web `index.html`

<img src="./assets/posts/gh/enable-gh-pages.png" /> 
<p style="text-align: center;">Figure 1: Enable Gh Pages in GitHub Settings</p>

- Theme Choose → Choose theme; Choose one among the default themes or clone your favorite from: [jamstackthemes.dev](https://jamstackthemes.dev/)
- Wait until GitHub publishes the website. Confirmation message: `Your site is ready to be published at example.com`

## Specify custom domain in GitHub settings

- Enter Custom domain: www.example.com

<img src="./assets/posts/gh/gh-custom-domain.png" /> 
<p style="text-align: center;">Figure 2: Set Custom Domain</p>

- Note (recommended to use www.example.com):
  - If the custom domain is example.com, then www.example.com will redirect to example.com
  - If the custom domain is www.example.com, then example.com will redirect to www.example.com.

## Manage DNS

- In the DNS provider's console (GoDaddy in my case), create four `A` records and one `CNAME`.
  - In GoDaddy and a few other DNS providers, you will have to specify `@` in the `name` (Leave in black in AWS Route 53).

- IP addresses for four `A` records: 

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Note: These can change over time, refer to the [documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)

- Create a `CNAME` record to point www.example.com to `<GITHUB-USERNAME>.github.io`

<img src="./assets/posts/gh/godaddy-dns-record.png" /> 
<p style="text-align: center;">Figure 3: Set A and CNAME Record(s)</p>

## Confirm DNS entries

Confirm `CNAME` and `A` records by running `dig www.example.com +nostats +nocomments +nocmd`; It should return the four `185.x.x.x` IP addresses and one `CNAME` with `<GITHUB-USERNAME>.github.io`

Note: This can take between an hour and 3 hours for the DNS entries to resolve/propagate. To verify, on the browser: `https://<GITHUB-USERNAME>.github.io` redirects to `http://www.example.com`

## Enable HTTPS

The `Enable HTTPS` checkbox is clickable if everything goes as expected.

<img src="./assets/posts/gh/gh-custom-domain-2.png" /> 
<p style="text-align: center;">Figure 4: Enable HTTPS</p>

Note:
- The checkbox takes time and is not clickable, and it can take as long as a day at times.
- After you `Enable HTTPS`, once again, it can take between 1 hour to a day.

Github Support is amazing; in case it takes longer than expected, create a ticket: [Github Support](https://support.github.com/tickets/personal)

That's about it! 🚀



