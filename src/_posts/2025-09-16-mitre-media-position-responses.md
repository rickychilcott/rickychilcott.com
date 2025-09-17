---
published: 2025-09-16
layout: post
title: Mitre Media Rails Engineer Position
tags:
  - career
  - media
  - responses
abstract: My responses to questions for a Mitre Media position, sharing my thoughts and experiences relevant to the role.
kind: professional
sitemap: "false"
hidden: "true"
---
I'm sharing my responses to questions for a Mitre Media position. This post contains my thoughts and experiences that are relevant to the role.

# The Role
I’m interested in this role because I’ve had a long-standing passion for personal finance, financial advice, and investing. I’ve been engaged with the [FIRE movement](https://www.investopedia.com/terms/f/financial-independence-retire-early-fire.asp) for well over a decade. Along the way, I’ve been a regular listener of [ChooseFI](https://www.choosefi.com/), a dedicated reader of [Mr. Money Mustache](https://www.mrmoneymustache.com/) and [Mad Fientist](https://www.madfientist.com/), and an active user of tools like [Boldin](https://www.boldin.com/).  

I also follow [Money for the Rest of Us](https://moneyfortherestofus.com/), and their recent expansion into investment newsletters has sparked my curiosity about the financial publishing and news industry as a whole.  

What excites me most about this position is the opportunity to work with a team committed to delivering **reliable, accurate, and actionable financial information**—content that helps readers make better-informed investment decisions and build financial confidence.  

My resume is available at [my website](https://www.rickychilcott.com/resume) and you can view my [github](https://github.com/rickychilcott).

# Pre-screening Questions

## Q1: Reflect on a moment in your career when you felt most proud of how you influenced a team's dynamic (without detailing the project's technical aspects). 

**What specific action or mindset did you bring to that moment, and why do you think it would resonate with an engineering team striving for innovation and collaboration? Keep your response concise (150-200 words).**

About two and a half years ago, while serving as Co-founder/CTO of Mission Met, I led my team through a pivotal brand and product decision. Our product's name, Mission Met Center, was too closely tied to the parent company, creating hesitation among outside consultants. I saw this as more than a naming issue—it was a chance to expand the product's reach.

My role became rallying the team (engineering, marketing, UX, support, and internal stakeholders) around a vision that extended beyond serving just the parent business. I facilitated open discussions, acknowledged differing views, and kept us focused on the bigger goal: enabling nonprofit consulting firms to confidently use our platform.

The process wasn't easy—my co-founder resisted the change and the team worried about the work ahead. But by aligning everyone around the opportunity, ensuring their voices were heard, and framing the change as a step toward growth, we adopted the new name, Causey. That moment reinforced my belief that leadership is about building clarity and momentum through collaborative discussion and deliberate action—an approach that resonates with engineering teams striving for innovation and trust.

## Q2: Rate your understanding out of 10 for each of the below technologies (where 10 indicates expert-level mastery of core concepts, mechanics, and internals)

**For each technology, justify your rating by explaining a key concept, mechanism, or feature in depth—focusing on how it works under the hood, potential pitfalls or edge cases, and how to address them as well as where this was encountered in your programming experience (could be work or side-project). Use hypothetical examples, code snippets, queries, or diagrams where applicable to illustrate your understanding rather than describing what it was that you were building.**

### JavaScript - 7/10
I generally keep my JavaScript as minimal glue code with the UI and have leaned into CableReady and Hotwire-based approaches for updating the UI. Where it's needed, I prefer to write a small Stimulus controller to sprinkle in JS.

In this example, I wrote a stimulus controller that formats times in html like this to a local timezone:

```html
<meta name="app:date-format" content="%b %-d, %Y" data-turbo-track="reload">
<meta name="app:time-format" content="%-I:%M %p" data-turbo-track="reload">

<time
  datetime="2025-09-16T14:30:00Z"
  data-controller="pretty-date"
  data-pretty-date-time-value="2025-09-16T14:30:00Z">
</time>
```

This will output the server-side time in the default time, and then provide the data to update.

It will support ISO8601 times and ISO8601 dates and reads the format possibilities from a few locations.

```javascript
// controllers/pretty_date_controller.js
import { Controller } from "@hotwired/stimulus"
import { getMeta } from "../lib/meta_helpers"
import { isTime, iso8601Parse } from "../lib/date_helpers"
import strftime from "strftime"


export default class extends Controller {
  static values = {
    time: String,           // e.g., "2025-09-16" or "14:30" or ISO datetime
    dateFormat: String,     // optional, e.g., "%b %-d, %Y"
    timeFormat: String      // optional, e.g., "%-I:%M %p"
  }

  initialize() {
    this._render = this._render.bind(this)
  }

  connect() {
    this._render()
  }

  // Re-render when values change
  timeValueChanged()       { this._render() }
  dateFormatValueChanged() { this._render() }
  timeFormatValueChanged() { this._render() }

  _render() {
    if (!this.hasTimeValue || !this.timeValue) return

    const date = this._parse(this.timeValue)
    if (Number.isNaN(date?.valueOf())) return

    const fmt = this._formatFor(this.timeValue)
    const next = strftime(fmt, date)

    if (this.element.textContent !== next) {
      this.element.textContent = next
    }
  }

  _formatFor(v) {
    // Prefer values, then MetaVars, then sane defaults
    if (isTime(v)) {
      return (this.hasTimeFormatValue && this.timeFormatValue)
        || getMeta("app:time-format")
        || "%-I:%M %p"
    }
    return (this.hasDateFormatValue && this.dateFormatValue)
      || getMeta("app:date-format")
      || "%Y-%m-%d"
  }

  _parse(v) {
    if (isTime(v)) {
      // Accept "HH:MM" or full ISO; ensure local time semantics
      const d = new Date(v)
      if (!Number.isNaN(d.valueOf())) return d
      const [h, m = "0"] = String(v).split(":")
      const now = new Date()
      now.setHours(+h || 0, +m || 0, 0, 0)
      return now
    }
    // Date-only strings: use helper that preserves local date (no UTC shift)
    return iso8601Parse(v)
  }
}
```

This controller, while having simple functionality, is rather more complex when being production-ready and supporting a few different time formats (dates, times, and datetimes) along with different locations for setting the format. Additionally, if the value (time value or format) changes for any reason, this will update.

I pulled this from a production application that we wrote, to find something trivial in some ways and also to show some of absurdity of what implementing some functionality in javascript that is really just solved very simply server side (in Ruby):

```erb
<time>
  <%%= DateTime.parse("2025-09-16T14:30:00Z").to_formatted_s(:long) %>
</time>
```

I'd personally rather roundtrip from the server and do a hard refresh then pass down a few changes to the client and have the stimulus controller handle everything.

That said, this controller is very fully featured because I chose to:

1. Upon `initialize`, bind the `_render` function's context to `this` which ensures we can call the function in any location and not lose the `this` of the controller.
2. I utilize Stimulus's many callbacks for changing of any of the values to trigger a `_render`
3. Have several fallbacks for deriving from the correct format: from `<meta />` tags, from the html itself, and a sensible default.
### SQL queries - 5 / 10

I rated myself a little lower on this one because as a Rails dev, I really try to lean into using Active Record as much possible. To me, the Rails ORM is really one of the things that made it rise to prominence, and it's generally super powerful. But of course, there are limitations to what the ORM provides out of the box.

Where necessary, wrapping more complicated queries in AR scopes to keep things maintainable. Alternatively, where possible, extract query objects to implement very complex logic.

For [Causey](https://www.causey.app) we have an OrganizationSettings model that has many features that can be enabled/disabled based on their settings. Since we use PostgresSQL we store these in a JSON column instead of a unique column for each setting. This is mostly because we often need to look this up once at the beginning of a request (for a given organization) and then show/hide certain features on the screen for the request.

This looks like:
```ruby
create_table "organization_settings", force: :cascade do |t|
  t.jsonb "settings", default: {}, null: false
  t.integer "owner_id", null: false
  t.datetime "created_at", precision: nil, null: false
  t.datetime "updated_at", precision: nil, null: false
  t.string "owner_type", null: false
  t.index ["owner_type", "owner_id"], name: "index_organization_settings_on_owner"
end
```

Note that `OrganizationSettings` is owned by a polymorphic owner. It's typically an `Organization` but sometimes a `Partner`

We often don't query against a particular setting. One instance looks like:

```ruby
OrganizationSetting:0x0000000168a7ca88
  id: 2,
  settings:
  {"show_logo" => true,
  "allow_tags" => false,
  "enable_links" => true,
  "enable_notes" => true,
  "primary_color" => "",
  "tertiary_color" => "",
  "secondary_color" => "",
  "enable_strategies" => false,
  "allow_filter_items" => false,
  "enable_attachments" => true,
  "hide_metrics_subapp" => false,
  "hide_reports_subapp" => false,
  "hide_toolbox_subapp" => false,
  "tease_metrics_subapp" => false,
  "always_show_full_name" => false,
  "hide_documents_subapp" => false,
  "hide_discussion_subapp" => false,
  "goal_champion_count_max" => 2,
  "plan_champion_count_max" => 2,
  "allow_metric_pdf_download" => false,
  "allow_report_pdf_download" => false,
  "metric_champion_count_max" => 2,
  "allow_goal_request_mailers" => false,
  "allow_gpu_recency_filtering" => false,
  "strategy_champion_count_max" => 2,
  "allow_metric_request_mailers" => false,
  "focus_area_champion_count_max" => 2,
  "allow_goal_timeframe_filtering" => false,
  "show_email_address_for_members" => true,
  "skip_concierge_onboarding_offer" => false,
  "allow_goal_progress_update_to_team_members" => true,
  "allow_metric_measurement_update_to_advisors" => false,
  "allow_metric_measurement_update_to_champions" => true},
owner_id: 3,
created_at: "2018-06-26 13:52:01.831358000 +0000",
updated_at: "2025-01-28 23:37:23.416383000 +0000",
deleted_at: nil,
owner_type: "Organization">
```

And we use it like
```ruby
organization = Organization.first
settings = organization.settings
settings.show_logo? #=> true
settings.enable_link? #=> true
...
```

But occasionally, we want to find all organizations that have a certain feature on. Let's say we need to notify all organizations that have `show_logo` on and have a logo:

```ruby
Organization
  .joins(:setting)
  .joins(:logo_attachment) # ensures presence of logo
  .where("organization_settings.settings ->> ? = ?", "show_logo", "true")
```

This works, but lacks clarity about exactly what we're querying for. Postgres' `->>`, and `->` are cryptic. So we've implemented a generic scope:

```ruby
class OrganizationSetting < ApplicationRecord
  scope :setting_equals, ->(key, val = true) {
    where("settings ->> ? = ?", key.to_s, val.to_s)
  }
end
```
Which now allows:

```ruby
Organization
  .joins(:setting)
  .joins(:logo_attachment) # ensures presence of logo
  .merge(OrganizationSetting.setting_equals(:show_logo, true))
```


It might even be nicer to allow for: `OrganizationSetting.setting_equals(show_logo: true, enable_link: true)`

By writing it as:

```ruby
class OrganizationSetting < ApplicationRecord
  scope :setting_equals, ->(**kwargs) {
    raise ArgumentError, "Provide at least one setting" if kwargs.empty?

    where("settings @> ?", kwargs.to_json)
  }
end
```
### database optimization - 5 / 10

I also gave myself a lower answer on this one because there is a lot more to learn regarding database optimization. I'd love to pick up a copy of [# High Performance PostgreSQL for Rails](https://pragprog.com/titles/aapsql/high-performance-postgresql-for-rails/) and implement the concepts in this book on real-world data and troubleshoot. I imagine I would learn something on nearly every page, and so I assume I've got basic and intermediate fundamentals, but gaps in my knowledge. 

I have experience looking at Postgres Explain/Analyze results and reading to better understand performance wins or issues that we've run into

Piggybacking off the previous answer (SQL queries). There are some settings where we don't need to ad-hoc query off of one setting; there are emails that are automated and go out each week, which are controlled by the `allow_metric_request_mailers` and `allow_goal_request_mailers` settings.

This actual system is not very big (less than 2,000 rows) and it's not a problem -- this query takes less than 10ms

```shell
OrganizationSetting.setting_equals(allow_goal_request_mailers: true).explain
  OrganizationSetting Load (1.0ms)  SELECT
    "organization_settings" . *
  FROM
    "organization_settings"
  WHERE
    "organization_settings"."deleted_at" IS NULL
    AND (
      settings @ > $1
    )  [[nil, "{\"allow_goal_request_mailers\":true}"]]
=>
EXPLAIN SELECT "organization_settings".* FROM "organization_settings" WHERE "organization_settings"."deleted_at" IS NULL AND (settings @> $1) [[nil, "{\"allow_goal_request_mailers\":true}"]]
                                            QUERY PLAN
--------------------------------------------------------------------------------------------------
 Seq Scan on organization_settings  (cost=0.00..113.47 rows=1 width=906)
   Filter: ((deleted_at IS NULL) AND (settings @> '{"allow_goal_request_mailers": true}'::jsonb))
```
If there were lots of OrganizationSettings:

`200_000.times { OrganizationSetting.create(owner: Organization.first) }`

Things would take a bit longer:

```shell
OrganizationSetting.setting_equals(allow_goal_request_mailers: true).explain
  OrganizationSetting Load (116.6ms)  SELECT
    "organization_settings" . *
  FROM
    "organization_settings"
  WHERE
    "organization_settings"."deleted_at" IS NULL
    AND (
      settings @ > $1
    )  [[nil, "{\"allow_goal_request_mailers\":true}"]]
=>
EXPLAIN SELECT "organization_settings".* FROM "organization_settings" WHERE "organization_settings"."deleted_at" IS NULL AND (settings @> $1) [[nil, "{\"allow_goal_request_mailers\":true}"]]
                                               QUERY PLAN
--------------------------------------------------------------------------------------------------------
 Gather  (cost=1000.00..20955.71 rows=753 width=710)
   Workers Planned: 2
   ->  Parallel Seq Scan on organization_settings  (cost=0.00..19880.41 rows=314 width=710)
         Filter: ((deleted_at IS NULL) AND (settings @> '{"allow_goal_request_mailers": true}'::jsonb))
```

A sequential scan (even parallelized) isn't optimal.

Let's try to add a `gin` index which will basically index all of the keys/values of the jsonb column so it should be able to avoid scanning the whole table.

```ruby
ActiveRecord::Base.connection.execute(<<-SQL)
  CREATE INDEX idx_org_settings_settings_gin
  ON organization_settings
  USING gin (settings);
SQL
# AKA
add_index :organization_settings, :settings, using: :gin, name: :idx_org_settings_settings_gin
```

And the results are interesting...

```shell
OrganizationSetting.setting_equals(allow_goal_request_mailers: true).explain
  OrganizationSetting Load (322.6ms)  SELECT
    "organization_settings" . *
  FROM
    "organization_settings"
  WHERE
    "organization_settings"."deleted_at" IS NULL
    AND (
      settings @ > $1
    )  [[nil, "{\"allow_goal_request_mailers\":true}"]]
=>
EXPLAIN SELECT "organization_settings".* FROM "organization_settings" WHERE "organization_settings"."deleted_at" IS NULL AND (settings @> $1) [[nil, "{\"allow_goal_request_mailers\":true}"]]
                                          QUERY PLAN
-----------------------------------------------------------------------------------------------
 Bitmap Heap Scan on organization_settings  (cost=49.93..2578.94 rows=753 width=710)
   Recheck Cond: (settings @> '{"allow_goal_request_mailers": true}'::jsonb)
   Filter: (deleted_at IS NULL)
   ->  Bitmap Index Scan on idx_org_settings_settings_gin  (cost=0.00..49.74 rows=754 width=0)
         Index Cond: (settings @> '{"allow_goal_request_mailers": true}'::jsonb)
(5 rows)
```

Slower? Without the gin index, it's ~ 100 ms and now with the index it's 300 ms. But after running `ActiveRecord::Base.connection.execute("ANALYZE organization_settings;")` we're back to about the same ~100ms.

Maybe we don't have enough data. Let's try 3,000,000 rows?

Postgres is impressive:

```shell
OrganizationSetting.setting_equals(allow_goal_request_mailers: true).explain
  OrganizationSetting Load (184.8ms)  SELECT
    "organization_settings" . *
  FROM
    "organization_settings"
  WHERE
    "organization_settings"."deleted_at" IS NULL
    AND (
      settings - > > $1 = $2
    )  [[nil, "{allow_goal_request_mailers: true}"], [nil, "true"]]
=>
EXPLAIN SELECT "organization_settings".* FROM "organization_settings" WHERE "organization_settings"."deleted_at" IS NULL AND (settings ->> $1 = $2) [[nil, "{allow_goal_request_mailers: true}"], [nil, "true"]]
                                                      QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------
 Gather  (cost=1000.00..68968.99 rows=15037 width=100)
   Workers Planned: 2
   ->  Parallel Seq Scan on organization_settings  (cost=0.00..66465.29 rows=6265 width=100)
         Filter: ((deleted_at IS NULL) AND ((settings ->> '{allow_goal_request_mailers: true}'::text) = 'true'::text))
```
Still not much slower. But how can we speed this up, if we must?

We'll need to add an expression index on that particular field and the specifics of the query.

```ruby
ActiveRecord::Base.connection.execute(<<~SQL)
  CREATE INDEX CONCURRENTLY idx_org_settings_allow_mailers_true
    ON organization_settings (((settings->>'allow_goal_request_mailers')::boolean))
    WHERE deleted_at IS NULL;
SQL
```

And now try with a query that will 
```ruby
OrganizationSetting
    .where("(settings->>'allow_goal_request_mailers')::boolean IS TRUE")
    .count
```

Less than 10 ms! 

```shell
OrganizationSetting
.where("(settings->>'allow_goal_request_mailers')::boolean IS TRUE").explain
  OrganizationSetting Load (0.9ms)  SELECT
    "organization_settings" . *
  FROM
    "organization_settings"
  WHERE
    "organization_settings"."deleted_at" IS NULL
    AND (
      (
        settings - > > 'allow_goal_request_mailers'
      ) : : BOOLEAN IS TRUE
    )
=>
EXPLAIN SELECT "organization_settings".* FROM "organization_settings" WHERE "organization_settings"."deleted_at" IS NULL AND ((settings->>'allow_goal_request_mailers')::boolean IS TRUE)
                                                         QUERY PLAN
----------------------------------------------------------------------------------------------------------------------------
 Index Scan using idx_org_settings_allow_mailers_true on organization_settings  (cost=0.43..55297.85 rows=1506824 width=98)
   Index Cond: (((settings ->> 'allow_goal_request_mailers'::text))::boolean = true)
(2 rows)
```

No sequential scans, and the index is used.

**What's the moral here?**

The final solution, with a really large dataset was for sure to use an expression index. In most cases, I would either leave it unoptimized with an index or lean into the gin index and roll with that for as long as possible.

Additionally, a jsonb column has some typecasting issues that may slow down queries unless you're careful.

**What would have been a better use of time?**

While we were finding counts throughout the writeup -- results are easily 10-20X longer to return all of the data. That could be improved by just selecting the columns that we care about. In this case, we'd just want to `select(:owner_type, :owner_id)` to resolve the association and that would have been far less data across the wire.

### CSS - 5 / 10

I have more than passable knowledge of CSS. I've been working with it for decades, but it keeps changing, and design is something I'd rather outsource as much as possible.

I often lean on established frameworks such as [Bootstrap](https://getbootstrap.com/) and [Preline](https://preline.co/). I find these tools incredibly valuable for rapidly creating responsive, accessible, and well-structured interfaces without getting bogged down in CSS boilerplate. While I can write custom CSS when needed, I prefer to build on top of a solid foundation and then extend it thoughtfully—striking a balance between speed and maintainability.

Something I've been exploring recently, and I haven’t reached a conclusion, because I see the merits of all of the approaches, is utility CSS vs a framework vs your own tags. I'm thinking about this particularly in the context of AI code generation.

**Utility: Preline**
When using the Utility framework (Tailwind, in this case), using the Preline components library, an alert is quite easy. Copy and paste the following.
```html
<div class="mt-2 bg-gray-800 text-sm text-white rounded-lg p-4 dark:bg-white dark:text-neutral-800" role="alert" tabindex="-1" aria-labelledby="hs-solid-color-dark-label">
  <span id="hs-solid-color-dark-label" class="font-bold">Dark</span> alert! You should check in on some of those fields below.
</div>
```

**Framework: Bootstrap**
In the case of Bootstrap, it's also quite easy:
```html
<div class="alert alert-dark" role="alert">
  A simple dark alert—check it out!
</div>
```

**Framework: DIY**
If you build your own framework, which I've explored, you could get it down to something like:
```html
<mm-alert dark size="sm" role="alert">
  A simple dark alert—check it out!
</mm-alert>
```

Where the CSS might look something like:

```css
/* ---- Tokens -------- */
:root {
  --mm-radius: 0.5rem;
  --mm-pad-y: 0.75rem;
  --mm-pad-x: 1rem;
  --mm-fs: 0.95rem;

  /* Info (default) */
  --mm-info-bg: #eaf4ff;
  --mm-info-fg: #0b3d62;
  --mm-info-border: #b6d9ff;

  /* Dark */
  --mm-dark-bg: #1f2937;
  --mm-dark-fg: #f9fafb;
  --mm-dark-border: #374151;
}

/* ---- Component ---------------------------------------------------------- */
mm-alert {
  position: relative;
  display: block;

  /* logical props for better i18n */
  padding-block: var(--mm-pad-y);
  padding-inline: var(--mm-pad-x);

  border: 1px solid transparent;
  border-radius: var(--mm-radius);
  font-size: var(--mm-fs);
  line-height: 1.45;

  background: var(--mm-info-bg);
  color: var(--mm-info-fg);
  border-color: var(--mm-info-border);

  /* Variants */
  &[dark] {
    background: var(--mm-dark-bg);
    color: var(--mm-dark-fg);
    border-color: var(--mm-dark-border);
  }

  /* Sizes */
  &[size="sm"] {
    --mm-pad-y: 0.5rem;
    --mm-pad-x: 0.75rem;
    --mm-fs: 0.875rem;
  }

  &[size="lg"] {
    --mm-pad-y: 1rem;
    --mm-pad-x: 1.25rem;
    --mm-fs: 1rem;
  }
}
```

And then if you need padding, margin, responsive flexbox, or responsive grid, etc. use utility classes from Tailwind or DIY your own utility classes.

**Why do I think this is the best?**

There are a few reasons.

1. It forces you to think more in components and have the html, css, and your view layers of your app 
2. You are more likely to reuse UI elements throughout your applications.
3. While Tailwind is arguably one of the most ubiquitous frameworks, and us has been trained on the most, the possibility of hallucinating unnecessary or problematic CSS rules is highly likely.
4. Utility-only CSS, like Tailwind is hard to keep organized and consistent across projects
5. Pure frameworks like Bootstrap give you a lot out of the box, but customizing and overriding things isn't really a first-class citizen in most cases, so you're fighting it all the time.
6. Upgrading Frameworks can be tedious and highly error-prone.

**Where does this fall down?**
1. If your apps have very different looks and feels, creating your own UI components is not going to be something you'll tackle.
2. It's a lot to get going up front, and if you have a lot of legacy systems and little buy-in from leadership or the development team, you're going to make things worse.
3. Designers and more junior team members will struggle with creating their own tags and understanding how the system works.

This is not a hill I'm willing to die on, but I'd love to discuss and understand the implications and moving toward this path over time.
### Ruby - 8 / 10

I've used and been learning using ruby since 2003 or 2004 or so. My favorite bit is using blocks to clean up code, iteration, and concepts. I recently needed to build a way of generating markdown in a file that then was converted to a DocX file format (using [pandoc](https://pandoc.org/)). 

Sidenote: we also needed to interject some docx styles into the document, and [ruby-docx](https://github.com/ruby-docx/docx) was extended and merged back to the community to support styling.

I was heavily inspired by Phlex (see answer about Rails) and wanted to write a minimal markdown generator inspired by that for this purpose. So I could write something like:

```ruby
class Example < Markdownable

  def template
    h1 do
      plain "Hello World"
    end

    p do
      plain "Lorem Ipsum is simply dummy text of the printing..."
    end
    
    p do
      strikethrough "strikethrough text"
      newline
      italic "italic text"
      newline
      bold "bold text"
      newline
      link_to "https://www.google.com", "Google"
    end
  end
end

puts Example.new
```

And the output:

```ruby
# HelloWorld

Lorem Ipsum is simply dummy text of the printing...

~~strikethrough text~~
__italic text__
**bold text**
[Google](https://www.google.com)
```

You can see the whole example and run it at [https://gist.github.com/rickychilcott/96505171f3d83d80dfd7dd7328cbb41b]. Note: Ruby 3.2+ is needed; I used Ruby 3.4.

What I love is being able to pass content as an argument, a block as a string, or a block as a buffer, and it works any way.

```ruby
bold("hi")
bold do
 "hi"
end
bold do
  plain "hi"
end
```
All of these are equivalent. **Why is this good?**

1. It minimizes developer (or AI) surprise when some things work and others don't.
2. It allows for extendability in the future
3. It doesn't currently, but could allow for clarity of deeply nested content. I'm actually working on this right now to support the following:
   
```ruby
unordered_list([1,2,3]) do |outer_item|
  plain outer_item
  unordered_list([4,5,6]) do |inner_item|
    plain "#{outer_item}.#{inner_item}"
  end
end
```

The challenge here, in the case of markdown, is knowing where what indent rules are in place and magically passing them to the caller.

What are the downsides to this?
1. There are multiple ways to call content. AI may especially get tripped up and may not know that all are equivalent
2. the code to implement this nesting isn't straightforward
3. the DSL may feel a little magical, and it is in a sense, but it's also quite powerful.

### Rails - 8 / 10

I've been developing in Rails since 2010 or so. In the beginning, there were Rails partials, in ERB.

```erb
<# app/views/products/index.html.erb #>
<%%= render partial: "product", collection: @products, as: :product %>
<%%# or even #>
<%%= render @products %>

<# app/views/products/_product.html.erb #>
<%% cache ["v2", product, product.updated_at.to_i] do %>
  <article id="<%%= dom_id(product) %>">
    <h3><%%= product.name %></h3>
    <p><%%= number_to_currency(product.price_cents / 100.0) %></p>
  </article>
<%% end %>
```

And then we got tired of typing so many ERB tags( i.e., `<%%= %>`) parts, so we switched to HAML. And it was better for developers:

```haml
-# app/views/products/index.html.haml
= render partial: "product", collection: @products, as: :product
-# or simply:
= render @products

-# app/views/products/_product.html.haml
- cache ["v2", product, product.updated_at.to_i] do
  %article{id: dom_id(product)}
    %h3= product.name
    %p= number_to_currency(product.price_cents / 100.0)
```

But it wasn't necessarily better for designers and more junior engineers who were familiar with HTML and Ruby separately, who struggled. Plus, the indentation stuff, for me, was too restrictive and annoying. Finally, Rails partial lookup is sometimes magical, sometimes TOO magical, and **often** slow for complex pages. There has to be a better way!

**Enter ViewComponent**

```erb
<%%# app/views/products/index.html.erb %>
<%%= render ProductComponent.with_collection(@products) %>
```

```ruby
# app/components/product_component.rb
class ProductComponent < ViewComponent::Base
  def initialize(product:)
    @product = product
  end

  def call
    content_tag :article, id: dom_id(@product) do
      safe_join([
        content_tag(:h3, @product.name),
        content_tag(:p, number_to_currency(@product.price_cents / 100.0))
      ])
    end
  end
end
```

Alternatively, you could drop the `#call` method in the component, and implement in ERB.
```erb
<%%# app/components/product_component.html.erb %>
<%% cache ["v2", @product, @product.updated_at.to_i] do %>
  <article id="<%%= dom_id(@product) %>">
    <h3><%%= @product.name %></h3>
    <p><%%= number_to_currency(@product.price_cents / 100.0) %></p>
  </article>
<%% end %>
```

Was this better? I'd say yes. [ViewComponent](https://github.com/ViewComponent/view_component) provided a place to compute content in a way that was co-located with the view code and components are ideal in encapsulating view logic and concepts.

But it still felt a little off. Use of `content_tag` was very difficult to skim, and editing multiple files is not ideal. There are workarounds, but you lose syntax highlighting.

Got anything else?

**Yes, Phlex!**
[https://www.phlex.fun/] will keep everything in Ruby-land.

```ruby
# app/components/views/product.rb
class Views::Product < Phlex::HTML
  include Rails.application.routes.url_helpers
  include ActionView::Helpers::NumberHelper
  include ActionView::RecordIdentifier # for dom_id
    
  def initialize(product:)
    @product = product
  end

  def view_template
    article(id: dom_id(@product)) do
      h3 { @product.name }
      p  { number_to_currency(@product.price_cents / 100.0) }
    end
  end
end

# app/components/views/products.rb
class Views::Products < Phlex::HTML
  def initialize(products:)
    @products = products
  end

  def view_template
    if @products.blank?
      render empty_products
    else
      @products.each do |product|
        render Views::Product.new(product:)
      end
    end
  end
  
  private
  
  def empty_products
    section(class: "empty") do
      h3 { "No products found" }
      p  { "Try adjusting your filters or adding a product." }
    end
  end
end
```


```erb
<%%# app/views/products/index.html.erb %>
<%%= render Views::Products.new(products: @products) %>
```

Why I like this approach:

* **Ruby everywhere** - all `html` tags are really just method calls. No template parsing, "partial lookup" is really just class name resolution. Use composability for wins.
* **Attributes DSL:** Symbols as keys; underscores → dashes; `data:`/`aria:` hashes merge cleanly.
* **Safety-first**: Phlex escapes everything by default, but you can opt-out with `raw`

Gotchas? Not a ton. I have run into some odd rendering issues (pre-Phlex V2) which would sometimes cause a rendering error in certain contexts. It will still take some getting used to by juniors and designers, but it's not as big of a lift as HAML, and the performance wins, composability, and linting are big benefits.

Additionally, I've found code-gen with OpenAIs Codex and Phlex has been good once you feed it some good examples.
