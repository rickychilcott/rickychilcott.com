---
published: 2026-02-11
layout: post
title: "Simplifying Causey: Goodbye Sidekiq"
tags:
  - rails
  - sidekiq
  - good-job
  - causey
  - simplification
abstract: "After 7 years and nearly 8 million processed jobs, I removed Sidekiq and Redis from Causey. Here's why, and how the migration to GoodJob went."
kind: technical
sitemap: true
---

![Causey's Sidekiq dashboard showing 7,827,890 processed jobs and 124,097 failed](/images/causey-sidekiq-dashboard.png)

7,827,890 processed. 124,097 failed. Those are the final numbers on Causey's Sidekiq dashboard. After about seven years of faithful service, I shut it down — along with the Redis instance backing it — and replaced both with [GoodJob](https://github.com/bensheldon/good_job) and [Solid Cache](https://github.com/rails/solid_cache).

I love Sidekiq. I love Redis. They're fantastic tools that served Causey incredibly well for a long time. This isn't a story about bad software. It's about right-sizing a stack for what the app actually needs today.

## A little history

[Causey](https://www.causey.app) is a strategic planning tool for nonprofits. It's been through a few names over the years — it started as "One Page Strategic Plan," then became "Mission Met Center," and now it's Causey. Through all of that, Sidekiq and Redis were there. Background jobs for emails, reporting, data exports, recurring tasks — Sidekiq handled all of it without complaint.

Nearly eight million jobs is a lot for what's honestly a pretty low-volume app. Most of those are small recurring tasks that tick away throughout the day. Sidekiq never struggled with any of it.

## Why change?

A few things converged. None of them alone would have been enough, but together they made the case pretty clear.

The most tangible one is cost. I was paying somewhere between $10 and $30 a month for a managed Redis instance, depending on the plan. Not a huge number, but for an app where Redis was only being used for Sidekiq queues and a bit of caching, it felt like paying rent on a room I barely used.

Then there's operational complexity. As a solo developer, I don't necessarily love having multiple services to keep running. Postgres, Redis, the app server, the Sidekiq process — each one is something to monitor, something that can go wrong at 2am, something to think about when upgrading. Dropping Redis means one fewer thing on that list.

I've also been thinking about dependency and security surface area. Every gem, every service, every external dependency is something that needs updates, has potential vulnerabilities, and adds to the mental overhead of maintaining the app. Fewer moving parts means less to worry about.

And honestly, part of this is looking ahead. I've been curious about running Causey on SQLite — partially as an experiment and partially for potentially some ease of deployment. If I ever go down that path, Redis has to go anyway. Might as well start now.

## Why GoodJob instead of Solid Queue

This is the question I get most when I mention this migration. Solid Queue is the Rails default now, it's backed by the Rails team, and it works with SQLite — which would matter if I do that migration someday.

I actually explored Solid Queue first. But Causey runs on Postgres today, and GoodJob is purpose-built for Postgres. It uses `LISTEN/NOTIFY`, advisory locks, all the Postgres-specific features that make it really good at what it does. Solid Queue is designed to work across multiple databases, which is great for flexibility, but means it can't lean into Postgres-specific optimizations the same way.

The GoodJob community and documentation also gave me a lot of confidence. Ben Sheldon has built something really solid there, and the docs made the migration path clear.

I figured that if I do end up moving to SQLite someday, switching from GoodJob to Solid Queue at that point would be pretty straightforward — drain the jobs, swap the gem, deploy. It's the kind of migration you can do in an afternoon. So there was no reason to compromise on what's best for the Postgres setup I have right now.

## Migration day

The actual migration was almost anticlimactic. I put the app in maintenance mode, let the remaining Sidekiq jobs drain, swapped in GoodJob and Solid Cache, and deployed. The whole thing took about seven or eight minutes. For a low-volume app, I felt fine about a few minutes of downtime.

The one surprise came a few days later. Causey has a weekly process that restores a production database backup into the staging environment. I hadn't thought about the fact that this would copy any enqueued GoodJob records right along with it. So staging started trying to run production jobs — sending real emails, hitting real APIs.

The fix was simple: truncate the GoodJob tables after the restore and make sure cron jobs are disabled in the staging environment. But it's the kind of thing you don't think about until it bites you. With Sidekiq, the job data lived in Redis, completely separate from the database, so this was never an issue. When your jobs live in Postgres alongside everything else, you have to remember they're part of the backup too.

## The result

Causey now runs on Postgres and… that's basically it. One database backing the app, the job queue, and the cache. One fewer service to pay for, monitor, and maintain. The GoodJob dashboard is great — honestly comparable to the Sidekiq Web UI that I always loved. Everything just works.

## Simplicity for who?

Eric, my former business partner at Mission Met, would always share this quote attributed to Leonardo da Vinci: "Simplicity is the ultimate sophistication." I think about that a lot.

But I also think "simplicity for who?" is a good question to ask. Removing Redis is simpler for me as an operator — fewer services, fewer bills, fewer things to debug. But it's not inherently simpler for the app. Postgres is now doing more work than it was before. GoodJob has its own set of things to understand. The complexity didn't disappear; it moved.

For my context — a solo developer running a low-volume Rails app — this move makes a lot of sense. If I were running a high-throughput app with thousands of jobs per second, Sidekiq and Redis would still be the right call. The point isn't that one approach is universally better. It's that your stack should match your actual situation, and it's worth revisiting that fit from time to time.

It's also just okay to simplify. The migration was easier than I expected, and the result is an app that's a little cheaper to run, a little easier to maintain, and has a few fewer things that can go wrong. Sometimes that's enough of a reason.

---

_This is the first post in a series about simplifying Causey — reducing dependencies, trimming infrastructure, and generally questioning whether every piece of the stack still earns its place. More to come._
