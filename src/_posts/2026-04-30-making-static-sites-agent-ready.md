---
published: 2026-04-30
layout: post
title: "Making My Static Sites Agent-Ready"
tags:
  - bridgetown
  - agents
  - llms-txt
  - agent-skills
  - webmcp
  - cloudflare
  - mcp
  - static-sites
abstract: "Markdown twins of every page, /.well-known/agent-skills, llms.txt, an api-catalog, WebMCP on Stoked, and a Cloudflare Transform Rules script that finishes the negotiation at the edge. The full agent-readiness stack across four static sites — and the parts I'm still finishing."
kind: technical
sitemap: true
---

This is part 3 of a short series on modernizing my static sites. [Part 1](https://www.rickychilcott.com/blog/why-i-moved-my-static-sites-from-jekyll-to-bridgetown/) was the Jekyll-to-Bridgetown migration. [Part 2](https://www.rickychilcott.com/blog/a-shared-github-actions-workflow-for-my-static-sites/) was the deploy workflow. This is the one I've been quietly the most excited about: making each site legible to AI agents, not just to browsers.

The premise of all this is unfashionable to argue against in 2026, but I'll state it plainly anyway: the next set of users for my marketing sites are agents. Sometimes they're acting on behalf of a person evaluating Stoked or Causey. Sometimes they're answering a question their human asked, where the answer happens to be on my site. Sometimes they're a search index that prefers structured data over scraped HTML. None of those readers want me to ship them a 200kb HTML page wrapped in JS and ad scripts. They want the content, in a form they can use, with a clear contract about what they can and can't do with it.

The good news is that there's now a small but real stack of standards for advertising exactly that. Most of them are emerging — half-spec, half-convention — but they're all cheap to implement, and they compose nicely. I scored each of my four sites — [rickychilcott.com](https://www.rickychilcott.com/), [Rakefire](https://www.rakefire.io/), [Causey](https://www.causey.app/), and [get.stokedhq.com](https://get.stokedhq.com/) — on [isitagentready.com](https://isitagentready.com/), and over the past few months I've worked them up the leaderboard. Stoked is the furthest along; the others are catching up. Here's what's in the stack.

## The pieces, end to end

There are six artifacts that matter, and one piece of edge configuration that ties them together.

**`robots.txt` with a Content-Signal line.** Plain old `robots.txt`, plus an emerging convention that lets you say what AI systems are allowed to do with your content — train on it, surface it in search, use it as input to a model session. Mine looks like this:

```
User-agent: *
Allow: /

Content-Signal: ai-train=yes, search=yes, ai-input=yes

Sitemap: https://www.rickychilcott.com/sitemap.xml
```

It's a one-liner and it sets the default for everything else.

**`llms.txt`.** A flat, markdown-friendly index of the site's content — pages, posts, projects, and links to agent skills — designed to be what an LLM reads when it lands on your domain and wants to understand what's here. The [llmstxt.org](https://llmstxt.org) convention. I generate mine with an ERB template that walks the Bridgetown collections and emits a sectioned outline (Core pages, Projects, Agent skills, Blog, Optional). Per-resource opt-out is `llms_txt: false` in front matter. The whole thing is one file and rebuilds on every deploy.

**Markdown twins of every page.** This is the part I think is most underrated. For every `.html` Bridgetown writes, a builder writes a sibling `.md` file. For blog posts, the twin is the original markdown source (cleaner than round-tripping). For everything else — landing pages, projects, the resume — the builder strips nav and footer with Nokogiri, then runs the body through `reverse_markdown` to produce a clean markdown rendering. Each page advertises its twin in the head:

```html
<link rel="alternate" type="text/markdown" href="/path/index.md" />
```

So an agent that wants markdown can either negotiate with `Accept: text/markdown` (more on that in a minute) or just pull the `.md` URL directly. Either way, it gets a version of the page that's not buried in layout markup.

**`/.well-known/agent-skills/index.json`.** This one is my favorite. The [Agent Skills Discovery](https://schemas.agentskills.io/discovery/0.2.0/schema.json) RFC defines a `/.well-known/agent-skills/` directory containing an `index.json` and a set of `SKILL.md` files. Each skill is a markdown document that tells an agent what the site can do for it and how. On rickychilcott.com I have four skills: `about`, `hire-collaborate`, `blog-search`, and `projects-portfolio`. The index lists them with names, descriptions, URLs, and SHA-256 digests so a client can verify integrity.

The skills themselves are authored by hand at the repo root in `agent_skills/<name>/SKILL.md`. A small Bridgetown builder copies them to the output directory at build time, hashes each one, and writes the index:

```ruby
class Builders::AgentSkills < SiteBuilder
  def build
    hook :site, :post_write do
      skills = (site.data["agent_skills"]["skills"] || []).map do |s|
        bytes = File.binread("agent_skills/#{s["name"]}/SKILL.md")
        File.binwrite(".well-known/agent-skills/#{s["name"]}/SKILL.md", bytes)
        {
          "name" => s["name"],
          "type" => "skill-md",
          "description" => s["description"],
          "url" => "/.well-known/agent-skills/#{s["name"]}/SKILL.md",
          "digest" => "sha256:#{Digest::SHA256.hexdigest(bytes)}"
        }
      end
      File.write(
        ".well-known/agent-skills/index.json",
        JSON.pretty_generate({"$schema" => SCHEMA_URL, "skills" => skills}) + "\n"
      )
    end
  end
end
```

The skills themselves read like the briefest possible operating manual. My `about` skill is a 50-line markdown file that tells an agent who I am, what stack I use, what I write about, and where to find more. My `hire-collaborate` skill explains the right way to reach me for work. The `blog-search` skill describes how to find posts on a topic. The `projects-portfolio` skill summarizes what I've built. None of them are clever. They're just the FAQ I've answered a hundred times, written down in one place, in a format an agent can read.

**`/.well-known/api-catalog`.** The [RFC 9727](https://www.rfc-editor.org/rfc/rfc9727.html) linkset for advertising APIs. Mine is data-driven from `_data/api_catalog.yml` if present, with a sensible default that points at the agent-skills index:

```json
{
  "linkset": [
    {
      "anchor": "https://www.rickychilcott.com/",
      "service-doc": [
        {
          "href": "https://www.rickychilcott.com/.well-known/agent-skills/index.json",
          "type": "application/json"
        }
      ]
    }
  ]
}
```

Small file, small builder, and another standard place an agent can land.

**WebMCP.** This is the one I only have on Stoked, and the reason Stoked scores higher than the others. [WebMCP](https://webmachinelearning.github.io/webmcp/) is a draft community-group spec that lets a page register tools with a browser-side `navigator.modelContext`, so a model running in the browser (or a browser-controlling agent) can call them. On Stoked, I expose six:

- `get_pricing` — returns the current pricing tiers, overage rates, annual discount, and onboarding costs.
- `list_features` — returns product features, optionally filtered to a category.
- `find_vertical_page` — given a vertical slug like `e-bikes` or `tiny-houses`, returns the right landing page URL and a summary.
- `search_blog` — searches blog posts by query and/or category.
- `book_demo` — opens the demo booking page, optionally prefilled with name, email, company, or vertical.
- `contact_sales` — opens the contact form, optionally prefilled.

The first four are read-only — annotated `{ readOnlyHint: true }` so a respectful agent knows it can call them without asking. `book_demo` and `contact_sales` actually navigate the user, so they're treated as actions. The whole thing is generated at build time from a YAML data file plus the blog index, baked into a single `webmcp.js`, and loaded on every page.

I didn't add WebMCP to the personal site or Rakefire because they don't have the surface area that makes it valuable — there's no demo flow, no pricing API, no contact form worth calling. Causey's marketing site is the next candidate. The pattern transfers cleanly.

## And then the edge

All of those artifacts ship from the build. But two of them — the markdown content negotiation and the discovery `Link` header on `/` — actually require the edge to participate. That's where Cloudflare Transform Rules come in.

I have a script that applies four rules to a zone. One in the request phase, three in the response-headers phase:

1. **URL rewrite (request phase).** When a request comes in with `Accept: text/markdown` and the path doesn't already end in `.md`, rewrite the URL to `/<path>/index.md`. This is what turns the markdown twins into a real content-negotiation story.
2. **Markdown Content-Type (response phase).** Any response whose path ends in `.md` gets `Content-Type: text/markdown; charset=utf-8`. GitHub Pages serves them as `text/plain` by default, which technically works but isn't right.
3. **Discovery Link header on `/` (response phase).** The homepage gets a `Link:` header pointing at `/.well-known/api-catalog` (with `rel="api-catalog"`) and `/.well-known/agent-skills/index.json` (with `rel="https://schemas.agentskills.io/discovery/0.2.0/"`). An agent that does a `HEAD /` finds everything else from there.
4. **API catalog Content-Type (response phase).** `/.well-known/api-catalog` is served as `application/linkset+json` rather than the default JSON.

The script reads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` from the environment, GETs the existing entrypoint ruleset for each phase, removes any rule whose description matches one of the four it manages, and PUTs the merged set back. So it's idempotent — running it twice doesn't double up — and it preserves any unrelated rules you already had.

[The full script is here as a gist.](https://gist.github.com/rickychilcott/7ad7a8aef890321b71d336279af55838) The gist of the gist is this one block, which builds the request-phase rule:

```bash
REQUEST_RULES=$(jq -n --arg host "$HOST" '[
  {
    description: "Markdown for Agents — URL rewrite",
    expression: ("(http.host eq \"" + $host + "\" and any(http.request.headers[\"accept\"][*] contains \"text/markdown\") and not ends_with(http.request.uri.path, \".md\"))"),
    action: "rewrite",
    action_parameters: {
      uri: { path: { expression: "concat(http.request.uri.path, \"index.md\")" } }
    },
    enabled: true
  }
]')
```

Verifying it works is three `curl`s:

```
curl -sI -H 'Accept: text/markdown' https://<host>/ | grep -i content-type
curl -sI https://<host>/ | grep -i ^link
curl -sI https://<host>/.well-known/api-catalog | grep -i content-type
```

## The honest scorecard

[isitagentready.com](https://isitagentready.com) scores sites across five categories: Discoverability, Content Accessibility, Bot Access Control, Protocol Discovery, and Commerce. Here's where each of mine actually sits today.

[**Stoked**](https://get.stokedhq.com/) is the furthest along. Cloudflare Transform Rules are applied. WebMCP is live with six tools. Agent skills, llms.txt, markdown twins, Content-Signal, the api-catalog — all there. The only categories where Stoked doesn't score full marks are the ones it can't, structurally: there's no e-commerce flow yet, so the Commerce category (x402, MPP, UCP, ACP) is empty by definition, and there's no real MCP server endpoint — WebMCP is the in-page equivalent, but a hosted MCP server is a separate thing. Within what it can do, it's done.

[**rickychilcott.com**](https://www.rickychilcott.com/) — this site, the one you're reading — has the build-time artifacts in place as of last week's deploy: robots Content-Signal, four agent skills, llms.txt, markdown twins, api-catalog, the per-page `<link rel="alternate">`. The Cloudflare Transform Rules are pending. Once those land, the score should match Stoked minus WebMCP and Commerce.

[**Causey**](https://www.causey.app/) (the marketing site) and [**Rakefire**](https://www.rakefire.io/) are at roughly the same level as the personal site — agent-ready at the build, edge wiring still to come. WebMCP for Causey is on the short list, since unlike the personal sites it has a real pricing API and demo flow worth exposing.

The thing I want to be honest about is that the score isn't the goal. The goal is that an agent visiting any of these sites can answer questions about my work, find the right page for the question it's been asked, and — on Stoked — actually invoke a tool to make something happen. The score is a useful proxy for whether I've done the small implementation steps; the real test is whether agents in the wild start using any of it. That part takes longer than three blog posts to find out.

## Closing

The thing that surprised me most, doing this work, was how cheap it all was. The Bridgetown plugin model meant every artifact was a 30–80 line builder. The Cloudflare script was an afternoon. The hardest part was reading the specs and figuring out what my sites actually had to say — which is a writing problem, not a code problem.

If you run a static site and you've been wondering whether any of this is worth doing yet: it is, and it's not as much work as you'd think. Start with `llms.txt` and a Content-Signal line in `robots.txt`. Add the markdown twins. Write three or four `SKILL.md` files about who you are and what you do. Wire up Cloudflare or your CDN of choice for the negotiation piece. You'll have done in a weekend what would have taken a small team six months to spec from scratch.

That's the third post. Thanks for reading the series. The next set of posts on this blog will probably go back to Rails, but I'll come back to the agentic-web stuff as it evolves — there's a lot more to write about (real MCP servers, the commerce specs, the long story of how `Accept` headers might finally become useful again). For now, four sites, one stack, and a stack of `/.well-known/` files that didn't exist three months ago. That feels like enough.

---

_Series: [Part 1 — Why I moved from Jekyll to Bridgetown](https://www.rickychilcott.com/blog/why-i-moved-my-static-sites-from-jekyll-to-bridgetown/) · [Part 2 — A shared GitHub Actions workflow](https://www.rickychilcott.com/blog/a-shared-github-actions-workflow-for-my-static-sites/) · Part 3 (this post)._
