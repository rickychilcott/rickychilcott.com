---
published: 2026-11-14
layout: post
title: "A Year of House Lights From One File"
tags:
  - ruby
  - gems
  - open-source
  - everlights
  - home-automation
abstract: "I wanted to write our year of EverLights shows down once instead of setting them up night by night, so I built a small Ruby gem that does it. Version 1.0 is out today, and it works through the EverLights cloud now that new bridge firmware has turned off local control."
kind: technical
sitemap: true
---

![The everlights web page: a year of nights drawn as bulbs on light strings, Christmas red and green through December, a warm glow on ordinary nights, flags on the Fourth of July.](/images/everlights-web-calendar.png)

Our lights were on for Halloween a couple of weeks ago, and they looked fantastic. A couple of neighbors mentioned it had been a while since they'd seen them, and asked how long we've had them.

About a year, it turns out. We had EverLights installed in late October 2025: permanent LED lighting along the roofline, controlled from an app. This Halloween rounded out our first full year with them.

## Planning months, not nights

The EverLights app is good at "show this now." Pick a sequence, tap it, the house changes. It has a calendar too, and it works OK, but it's hard to schedule out long stretches with it. I wanted to think about the whole year at once.

What I really wanted was to write the year down once. Christmas season, Christmas Day, Easter, the Fourth of July, a few family birthdays, and a soft warm glow for every night nothing else claims. I wanted every show to start at dusk and turn off at 10 or 10:30, depending on the time of year. Some of those dates move around, like Easter and Thanksgiving. Sunset moves a lot too. In the example config I use for the docs, dusk is 5:07 on December 1st and 9:04 on the Fourth of July, so "start at dusk" really means a different time every night.

That's the kind of thing a small program is good at. So over Halloween weekend I started writing one with Claude Code, and I've kept adding to it since.

## Writing the year down

[`everlights`](https://github.com/rickychilcott/everlights) is a Ruby client and CLI for the EverLights v3 bridge, with no dependencies outside Ruby's standard library. It started out talking to the bridge directly on the local network. That changed this week, which I'll get to.

The day-to-day commands are what you'd expect:

```sh
everlights play "Hallows Eve"
everlights set FF0000 00FF00 --effect twinkle=100
everlights off
everlights clear    # hand the lights back to the calendar
```

The part I actually built it for is `everlights sync`. You describe your own sequences and a list of rules in `config/everlights.yml`:

```yaml
location: {lat: 40.0, lon: -83.0}   # dusk is calculated per night from this
horizon_days: 120

sequences:
  My Birthday:
    colors: [FF1E8C, FFC400, 00A8FF, FFFFFF, 9D2BFF, FFC400, 2BFF6A, FFFFFF]
    effects: {chase: 60, twinkle: 180}

schedule:                            # higher in the list wins a shared night
  - name: Christmas Day
    on: Dec 25
    sequences: [Christmas, "Candy Cane Lane:30"]
    end: "01:00"
  - name: Christmas Season
    from: Dec 1
    to: Jan 1
    sequences: [Christmas, Winter]
  - name: Thanksgiving
    on: 4th Thursday of November
    sequences: [Thanksgiving]
  - name: Easter
    on: Easter
    sequences: [Easter]
  - name: Birthday
    on: 2027-03-14
    sequences: [My Birthday]
  - name: Fall Weekends
    every: [Friday, Saturday]
    from: Sep 15
    to: Nov 20
    start: dusk+15
    sequences: [Fall Wave]
```

Then ask it what it would do:

```
$ everlights sync --dry-run
Sequences
  + create  My Birthday: 8 colors
Calendar (next 120 days)
  + create  Christmas Day: 1 night, Dec 25, dusk (17:12)–01:00
  + create  Christmas Season: 31 nights, Dec 1 – Jan 1, dusk (17:07)–23:00
  + create  Thanksgiving: 1 night, Nov 26, dusk (17:09)–23:00
  + create  Birthday: 1 night, Mar 14, dusk (19:37)–23:00
  + create  Fall Weekends: 2 nights, Nov 14 – Nov 20, dusk (17:31)–23:00
Nights taken by a higher rule
    Christmas Season: 1 night to Christmas Day (Dec 25)
```

Each rule becomes one calendar entry on the bridge, and dusk is worked out from your latitude and longitude for every night. Christmas Day sits above Christmas Season in the list, so it takes the 25th, and the plan tells you so. Easter isn't there yet because it's past the 120-day horizon; it'll show up in a later sync. Run `everlights sync` without `--dry-run` and it writes all of that to the bridge.

There are a couple of other ways to say when a show plays. An `ics:` rule plays a show on the day of each event in a calendar feed, like a team's game schedule. And anywhere a color goes, you can write a gradient: `FF7A1E..FF9E3D:4` is four colors blended evenly from the first to the last.

The bridge stores the shows itself, so once they're synced they run with no computer on. Right now I just run sync by hand about once a month. There's a `--check` flag for running it from cron: it changes nothing and exits 2 when the bridge needs a sync.

The thing I was most careful about is that sync only touches what it created. It tracks its own sequences and calendar entries in a little state file, and anything you make in the EverLights app is left alone. The sequences I design in the config show up in the app under Personal, right alongside the built-in ones. If you've already built shows in the app and want them in the file instead, `everlights export` prints them as config. Add that to your file, and `everlights sync --adopt` takes them over.

## And then I built the web page

A YAML file is a fine way to plan a year. It's not a great way to *see* one. Early on I figured I might eventually build a web interface as an alternative to the app for this kind of long-range planning. Less than two weeks later, I did.

`everlights web` starts a page on localhost. The image at the top of this post is that page. Every night ahead is a bulb on a light string, lit with the sequence that plays that night. You can pick out December's red and green, the flag on the Fourth of July, a birthday and Easter in March, and fall weekends in orange. Below the calendar you drag rules up and down to change which one wins, and drag sequences onto rules.

![The plan before Apply: each rule becomes one calendar entry, like "Christmas Season: 31 nights, Dec 1 – Jan 1, dusk (17:07)–23:00".](/images/everlights-web-review.png)

Rule changes save to the config file right away, but nothing goes to the bridge until you hit Apply. Review shows the plan first, the same one the CLI prints, one line per change.

![Designing a sequence in everlights web: eight colors, chase and twinkle effects with strength sliders, and a Preview button.](/images/everlights-web-sequence.png)

To design a sequence, you pick colors and add effects like chase or twinkle with a strength slider. Preview puts it on the house right now, and edits show up on the lights as you make them. Stop the preview or close the page and the lights go back to whatever the calendar says. There's also a Bridge tab with health checks, firmware, and each zone's signal.

One thing to know: when the page saves, it rewrites the YAML, which drops your comments. The first save keeps your original as `everlights.yml.bak`, but comments you add after that won't survive the next save.

## And then the firmware updated

The day after I shipped the web page, I found my bridge had updated itself and stopped answering locally. So that was fun.

EverLights bridges get firmware updates over the air, and they install on their own. The new one, B5010, turns off the bridge's local API. Apart from a basic status check, everything the gem used on the local network now answers with `410 Gone`. I haven't seen anything official about the change, so I won't guess at the reasons. But if your bridge hasn't picked it up yet, I'd expect it to eventually.

So 1.0, out today, adds `everlights login`. It signs in with the same account you use in the EverLights app and reaches your bridge through the same cloud service the app uses. It keeps a token, never your password. On my bridge, sequences, the calendar, `sync --dry-run` and `--check` all work through it, and the web page loads its plan through it. Scheduled shows still live on the bridge, so they play whether or not your computer is on. The gem only goes through the cloud when you check on or change them. If your bridge is still on older firmware, the local API works just like before.

I should say clearly: this is unofficial. It's not affiliated with or endorsed by EverLights, and the cloud service it talks to is theirs, not a public API. It's one homeowner's side project.

## Trying it

You'll need Ruby 3.1 or newer and your EverLights account.

```sh
gem install everlights
everlights login you@example.com   # asks for your password
everlights init                    # writes config/everlights.yml
# uncomment location: in it and add your latitude and longitude
everlights sync --dry-run
```

On a bridge still on older firmware, skip the login and `export EVERLIGHTS_HOST=` your bridge's IP instead.

`init` writes a starter config with the US holidays filled in: New Year's Eve, Valentine's Day, St. Patrick's Day, Easter, Halloween, Thanksgiving, Christmas and more, all using the built-in sequences. It leaves your location commented out on purpose, because a wrong location quietly gives you wrong dusk times, so sync stops and tells you to add it. It's mid-November, which is about when a lot of us are setting up Christmas, so this is a pretty good week to try a dry run and see what your season looks like.

The repo also ships an agent skill (`skills/everlights/SKILL.md`) that teaches Claude Code to drive the CLI. It checks with you before changing anything on the lights, and it's told never to ask for or handle your password.

## What's next

Next I want to run `everlights web` on a little server in our house so it's always reachable, with a weekly sync built in instead of me remembering to run it. I plan to keep supporting this. I'm proud of what this little tool can do, and honestly of how easy it was to build.

## Other people's evenings

I'm not the first to do this, and I leaned on people who got here before me. [weswitt/everlights3](https://github.com/weswitt/everlights3) has an OpenAPI spec that mapped out the bridge's endpoints, which saved me a lot of guessing. [theOrakle/everlightsv3](https://github.com/theOrakle/everlightsv3) is a Home Assistant integration for the v3 bridge's local API. [borski/everlightsv3_cloud](https://github.com/borski/everlightsv3_cloud) is a Home Assistant integration that worked out the cloud side, which is what 1.0 builds on. And Home Assistant has had an [EverLights integration](https://www.home-assistant.io/integrations/everlights) for the older v2 bridge for a while.

I think that says something nice about EverLights. People like the product enough to spend their own evenings making it a little better.

If you try it, I'd love to hear how it goes. There are still a few open questions in the README, like what each effect's 0–255 strength actually does and how the bridge handles overlapping calendar entries. If you know, issues and pull requests are very welcome.

For our part, the calendar is filled in for months ahead. I don't have to remember to set anything up, and the house looks right every night.
