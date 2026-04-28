---
published: 2026-04-28
layout: post
title: "Why I Moved My Static Sites From Jekyll to Bridgetown"
tags:
  - bridgetown
  - jekyll
  - ruby
  - static-sites
  - causey
  - rakefire
  - stoked
abstract: "After years on Jekyll, I migrated all my marketing sites to Bridgetown — for the plugin model, ERB-first templating, Nokogiri-powered HTML hooks, and being on the latest Ruby. Plus a Tailwind refresh and a Rakefire redesign while I was in there."
kind: technical
sitemap: true
---

Over the past several months I've quietly migrated all of my static sites — [rickychilcott.com](https://www.rickychilcott.com/), [Rakefire](https://www.rakefire.io/), the [Causey](https://www.causey.app/) marketing site, and [get.stokedhq.com](https://get.stokedhq.com/) — from Jekyll to Bridgetown. While I was in there, I freshened a few up with Tailwind, snuck in a redesign of [Rakefire](https://www.rakefire.io/), and started laying the groundwork for the thing I'm actually excited about: making these sites legible to AI agents, not just to browsers.

This is the first of a short series about that work.

1. **Why I moved from Jekyll to Bridgetown** (this one)
2. A shared GitHub Actions workflow for static sites
3. Making static sites agent-ready

If the third post is what you're really here for, skip ahead — I won't be offended. But the migration is what made the rest possible, so it's worth a few minutes.

## Jekyll was good

I want to start by saying something honest: Jekyll has been great. It's mature, well-understood, GitHub Pages-native, and runs the Ruby static-site world more or less single-handedly. Every one of these sites started life on Jekyll and shipped happily for years. I'm not writing this post because Jekyll let me down. It didn't.

But over time a few things piled up.

## The version story

The first one was Ruby. I want to be on a current Ruby and a current Node, and I want my static sites to be on those too. That sounds petty, but a lot of the tooling I rely on — gems I bring in for one-off processing, npm-driven Tailwind builds, the GitHub Actions setup steps for both runtimes — moves fastest on the latest releases. Jekyll has historically been conservative about which Rubys it embraces, partly because of the GitHub Pages constraint, partly because change in a project that big is hard. [Bridgetown](https://www.bridgetownrb.com/)'s posture is the opposite: it tracks Ruby and Node releases closely and assumes you want to be there too. My CI today runs on Ruby 4.0.3 and Node 24, and I expect to be on whatever ships next within a week of release.

## A plugin model that doesn't fight you

The bigger one was the plugin model. Jekyll plugins work — I've written my share — but the surface area you get to hook into is narrow, and once your needs go past "register a Liquid filter," things get awkward. Bridgetown's "Builder" pattern is a much friendlier on-ramp. A builder is just a Ruby class that subscribes to lifecycle hooks. Want to do something after the site finishes writing files to disk? `hook :site, :post_write`. Want to act on every resource before it renders? There's a hook for that too. You write the class, drop it in `plugins/builders/`, and it's loaded automatically. No registration boilerplate, no plugin gem, no separate `_config.yml` entry.

Here's an example — the actual builder I use to compress every page in the build output:

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

That's the whole plugin. It runs in production builds (not in dev watch mode, where I want fast feedback over compressed bytes), walks the output, and minifies in place. The same shape — `class < SiteBuilder` plus a hook — covers everything from "ping IndexNow after deploy" to "write a `.well-known/agent-skills/index.json` based on a YAML data file." I'll get into more interesting builders in posts two and three of this series, but the point is: the friction to writing the next one is essentially zero.

## Nokogiri, against the rendered output

The thing that actually sold me, though, was the way Bridgetown lets you treat the rendered HTML as a manipulable tree. There's a Nokogiri-based hook (Bridgetown calls it "Inspectors") that gives you a parsed document for every page after rendering and lets you do this:

```ruby
doc.css("a[href^='http']").each do |link|
  link["target"] = "_blank"
  link["rel"] = "noopener"
end
```

…against every page, as part of the build, with no extra plumbing. CSS selectors against the rendered output. I cannot overstate how much friction this removes for the kinds of small-but-fiddly site-wide transforms that pile up over time. Open external links in a new tab. Add `loading="lazy"` to every `<img>`. Strip nav and footer out of the body before generating a markdown twin of the page. (That last one matters in post three.) On Jekyll, all of those are either Liquid acrobatics or "write a gem and hope." On Bridgetown, they're a five-line block.

The same primitive — a Nokogiri document plus CSS selectors plus the build pipeline — is what made the agent-readiness work in post three feel cheap rather than expensive. If I'd had to build all of it on Jekyll first, I think I would have given up halfway and gone home.

## ERB and components

Bridgetown is also ERB-first. You can use Liquid if you want — Bridgetown still supports it — but the recommended path is ERB, with first-class support for ViewComponent and Bridgetown's own Ruby component system. After spending the last few years writing a lot of ERB and ViewComponent at $work (though I'm using Phlex on side projects), going back to Liquid for my own sites was starting to feel like writing one-handed. Liquid is fine for content authors. For a developer whose static sites are also a place to try out templating ideas, ERB is the better fit. Components are real Ruby objects. You can give them tests. You can refactor them with the tools you already use. You can extract a partial without wondering whether the variable scope will follow you in.

The migration itself was honestly the boring part of all this. Most of my templates moved from Liquid to ERB more or less mechanically — `{% if %}` becomes `<% if %>`, `{{ var }}` becomes `<%= var %>`, includes turn into `render` calls. Front matter carried over essentially untouched. The interesting stuff started after the migration, once I had Bridgetown's plugin model in hand and could start writing the small builders that turned static-site deployment into something more like a real pipeline.

## Build speed

This one I'll caveat: I haven't run rigorous benchmarks. But anecdotally, Bridgetown builds feel snappier than the equivalent Jekyll setup did, especially on the larger sites with more pages. Dev-watch turnaround is the part I notice most — saving a file and seeing the change land feels closer to instant. I won't claim a number, but I'll say it didn't get worse, and on the bigger sites it got noticeably better - and you have exit hatches to do some unique things in the building steps to speed things up if you'd like or jump to dynamically rendered pages with Roda.

## The Tailwind side trip

While I was already in there, I migrated a couple of the sites from their old CSS to Tailwind. Not all of them — that wasn't worth doing for the sake of it — but a few that needed a visual freshen-up anyway.

Honestly, my Tailwind taste has changed. I've used it a lot more at work in the last year, and I've come around on a lot of what I used to be skeptical about. The constraint of working within a design system, the ability to read a component's styles right next to its markup, the way it nudges you toward responsive thinking by default — all of that has grown on me. I don't think it's the right answer for every project. For marketing-style static sites that I touch every few months, though, it's a really nice fit. Each site got the chance to look a little less like 2018 and a little more like now.

## And a Rakefire redesign, while I was at it

The biggest visual change of the bunch was [Rakefire](https://www.rakefire.io/). I won't get too specific here — the redesign deserves its own moment if it deserves one at all — but the short version: I picked a new accent color, pulled [Causey](https://www.causey.app/) and [Stoked](https://get.stokedhq.com/) up to first-class billing as products on the homepage rather than burying them in a portfolio, and kept enough of the original feel that it still reads as Rakefire. A lot of the old content is still there. The frame around it is what changed.

I'd been wanting to do that for a while. Migrating to Bridgetown and Tailwind on the same site at the same time gave me an excuse, and once I was already touching every template, "while I'm in here" took over. That's how all the best small projects get done, in my experience.

## What's next

Tomorrow's post is the second one in this series: the GitHub Actions workflow I now copy-paste across all of these sites. Daily rebuilds at 6am, automatic IndexNow pings after deploy, HTML minification, the whole deploy story in one YAML file you can lift verbatim. It's not glamorous, but it's the piece that makes everything else feel like infrastructure rather than ceremony.

After that, the part I've been quietly the most excited about: making each site _agent-ready_. That's where Bridgetown's plugin model really earns its keep, and where the agentic-web standards I keep reading about start showing up as actual files in `/.well-known/`.

If you've been on Jekyll for years and have idly wondered whether it's worth looking at Bridgetown: it is. The migration is more boring than you probably fear, and the plugin story alone is worth the price of admission.

---

_This is part 1 of a short series on modernizing my static sites and getting them ready for the agentic future. Part 2 — the shared GitHub Actions workflow — is up tomorrow._
