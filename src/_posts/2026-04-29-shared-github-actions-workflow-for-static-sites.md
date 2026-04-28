---
published: 2026-04-29
layout: post
title: "A Shared GitHub Actions Workflow for My Static Sites"
tags:
  - github-actions
  - bridgetown
  - static-sites
  - indexnow
  - ci-cd
  - devops
abstract: "The deploy workflow I copy-paste across all my Bridgetown sites — daily 6am rebuilds, IndexNow pings after every deploy, HTML minification, and a few small builders that turn a static-site host into something more like a real pipeline."
kind: technical
sitemap: true
---

This is part 2 of a short series on modernizing my static sites and getting them ready for the agentic future. [Part 1 was the Jekyll-to-Bridgetown migration](https://www.rickychilcott.com/blog/why-i-moved-my-static-sites-from-jekyll-to-bridgetown/); this one is about how those sites actually deploy now, and the small handful of builders that took GitHub Pages from "publish a folder" to something that feels closer to a real release pipeline.

Fair warning up front: this isn't a clever trick. It's the deploy workflow I copy-paste across all four of my static sites — [rickychilcott.com](https://www.rickychilcott.com/), [Rakefire](https://www.rakefire.io/), the [Causey](https://www.causey.app/) marketing site, and [get.stokedhq.com](https://get.stokedhq.com/) — and the value isn't in any one piece. It's in the boring fact that all four sites now do the same handful of useful things automatically, and I never have to think about any of it.

## The shape of it

The whole workflow lives in `.github/workflows/pages.yml`. It runs on push to `main`, on a daily cron, or when I trigger it manually. The build job sets up Ruby and Node, installs the `pagefind` binary, runs `bin/bridgetown deploy` with `BRIDGETOWN_ENV=production`, and uploads the output as a Pages artifact. The deploy job picks up the artifact and ships it. Nothing exotic.

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main, master]
  schedule:
    - cron: "0 6 * * *"  # Rebuild daily at 6am UTC
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: "4.0.3"
          bundler-cache: true

      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "npm"

      - name: Install npm dependencies
        run: npm ci

      - name: Install pagefind binary
        run: |
          curl -sL https://github.com/CloudCannon/pagefind/releases/download/v1.4.0/pagefind-v1.4.0-x86_64-unknown-linux-musl.tar.gz | tar xz
          sudo mv pagefind /usr/local/bin/

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Build site
        run: bin/bridgetown deploy
        env:
          BRIDGETOWN_ENV: production

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v5
        with:
          path: output

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

A few specific decisions are worth pulling out, because they're the parts that earn their keep over time.

## Why the daily cron

The single most useful line in that file, for me, is `cron: "0 6 * * *"`. A daily rebuild at 6am UTC.

The reason is mundane but important: I write blog posts in [Obsidian](https://obsidian.md/), in a vault that lives outside any of my site repos. Bridgetown's `obsidian_local_sync` watches that vault and pulls content into the right place at build time. When I write a post and future-date it — which I do all the time, because I'd rather write three posts in a sprint and stagger their publish dates than write one a day on demand — I want the site to publish that post on the date in the front matter, without me having to log in and trigger anything.

The daily cron does exactly that. Every day at 6am UTC, every site rebuilds. Anything whose `published` date has rolled into the past since yesterday's build appears. I push to `main` when I want an immediate deploy; otherwise the cron handles it.

There's a quiet second benefit, too: any drift in dependencies or upstream content gets caught regularly rather than the next time I happen to push. If a build breaks because of something I didn't change, I find out the next morning, not three weeks later when I finally have a typo to fix.

## IndexNow, automatic on every deploy

The next piece is the [IndexNow](https://www.indexnow.org/) ping. IndexNow is a simple protocol — basically "here's a list of URLs that just changed, please reindex them" — supported by Bing, Yandex, and a handful of others. Google doesn't honor it directly, but enough of the rest of the web does that it's worth wiring up if you're already publishing a sitemap.

I use a small Bridgetown builder for this:

```ruby
class Builders::Indexnow < SiteBuilder
  INDEXNOW_KEY = "8ebabf88-616e-4868-8096-59c9abe36a1a"
  INDEXNOW_API = "https://api.indexnow.org/indexnow"
  SITE_HOST = "https://www.rickychilcott.com"

  def build
    hook :site, :post_write do
      next unless should_run?

      urls = collect_urls_from_sitemap
      submit_urls(urls) if urls.any?
    end
  end

  private

  def should_run?
    return true if ENV["INDEXNOW"] == "true"
    return true if Bridgetown.environment == "production"
    false
  end

  def collect_urls_from_sitemap
    sitemap_path = site.in_dest_dir("sitemap.xml")
    return [] unless File.exist?(sitemap_path)

    doc = REXML::Document.new(File.read(sitemap_path))
    doc.elements.collect("urlset/url/loc") { |el| el.text }
  end

  def submit_urls(urls)
    body = {
      host: URI(SITE_HOST).host,
      key: INDEXNOW_KEY,
      keyLocation: "#{SITE_HOST}/#{INDEXNOW_KEY}.txt",
      urlList: urls
    }
    # ...standard Net::HTTP POST to INDEXNOW_API with JSON body
  end
end
```

The key file lives at `src/{INDEXNOW_KEY}.txt` and contains the same key value — that's how IndexNow verifies you actually own the host you're submitting URLs for. I generated the key once with `uuidgen` and committed both ends.

The builder runs on `post_write`, only in production builds, after the sitemap has already been generated. It reads the URL list straight out of `sitemap.xml` and POSTs the whole batch to the IndexNow endpoint. Logs go to the build output. If the API is down, it fails loudly but doesn't break the deploy — that's `rescue => e` doing its job.

This is the kind of thing I'd never bother with as a shell script. As a 50-line Bridgetown builder, it took about ten minutes and now runs forever.

## HTML minification on the way out

Last builder in the deploy path is the HTML minifier, which I shared in the previous post but is worth showing here in context:

```ruby
class Builders::HTMLMinifier < SiteBuilder
  def build
    hook :site, :post_write do
      next if config[:watch]

      compressor = HtmlCompressor::Compressor.new(
        remove_comments: true,
        remove_multi_spaces: true,
        remove_intertag_spaces: false,
        preserve_line_breaks: false
      )

      Dir.glob(File.join(site.dest, "**", "*.html")).each do |file|
        File.write(file, compressor.compress(File.read(file)))
      end
    end
  end
end
```

The savings per page aren't dramatic — a few percent on most pages, more on long ones — but the compounding wins matter. Faster initial paint, smaller pages over the wire to lower-bandwidth clients, less CDN cache to push around. And, since GitHub Pages charges nothing and asks for nothing, the only cost is a few seconds at the end of the build.

The `next if config[:watch]` line is important. In dev I want fast feedback and readable HTML; in production I want every byte squeezed. One conditional, two modes, no second build script.

## Why this isn't a "shared workflow"

Here's where I should be honest about what this is and isn't.

GitHub Actions has a real shared-workflow primitive — `workflow_call`, reusable composite actions, the whole bit. I'm not using it. The workflow I just walked through lives in each of my four site repos as a copy of the same file, and when I change one I copy the change to the others by hand.

There are a few reasons I haven't extracted it. Four sites isn't enough to justify the cost of a shared action — I'd have to publish it somewhere, version it, write tests against it, document the inputs. The differences between sites are real, even if small: one of them needs an `API2PDF_API_KEY` for resume PDF generation, another needs a `GH_PAT` to pull in cross-repo content, another doesn't need any secrets at all. Pushing those differences through a generic interface adds enough complexity that I'd rather just have the file in front of me.

Mostly, though, the deploy workflow isn't really the locus of complexity. The interesting code lives in the Bridgetown builders, where it can be tested locally with `bin/bridgetown build` and where I'd write it anyway. The workflow is just the harness. Keeping it as a copy-paste artifact means I can also tweak it per-site when I need to (different cron times, different build environments) without inventing yet another configuration layer.

If I get to ten sites this calculus changes. At four, the boring approach wins.

## What this gets you

The result is that all four of my sites do the same things, automatically, every day:

- They rebuild every morning, picking up any future-dated posts whose date has rolled around.
- They rebuild instantly when I push to `main`.
- They notify IndexNow about every URL in their sitemap on every deploy.
- They ship minified HTML to the edge.
- They live on a known, recent Ruby and Node, so updating any one site is a matter of bumping a version string.

None of that is impressive in isolation. Together, it means I can stop thinking about the deploy story for any of these sites and spend my time on the things that actually matter — like the agent-readiness work I'm finally going to get to in tomorrow's post.

## What's next

Tomorrow's post is the one I've been quietly the most excited about: making each of these sites legible to AI agents, not just to browsers. Markdown twins of every page. A `/.well-known/agent-skills/` directory you can point an agent at. An `llms.txt`. Content-Signal headers in `robots.txt`. The whole emerging stack of "your site, but for agents" — and the parts I still need to wire up at the Cloudflare edge to make it all work end-to-end.

It's the most fun I've had on a static site in years.

---

_Part 3 of this series — making static sites agent-ready — is up tomorrow._
