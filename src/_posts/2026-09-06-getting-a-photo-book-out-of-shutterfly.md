---
published: 2026-09-06
layout: post
title: Getting a Photo Book Out of Shutterfly
tags:
  - ai
  - claude
  - playwright
  - automation
abstract: Shutterfly has no export. Two hours, 16 scripts, and a lesson about failures that don't throw errors.
kind: technical
sitemap: true
---

My sister had designed something in Shutterfly that she needed as a high-resolution PDF. Not another printed copy from Shutterfly — an actual file, in her hands, that she could send to someone else.

Shutterfly doesn't do that. There's no export, no download, no print-to-PDF. The share link she sent me renders exactly one thing: the front cover. Everything past that requires a login, and even then the only place the pages exist is inside Shutterfly's own book builder.

So I handed it to Claude Code and went to do something else.

It took just under two hours and sixteen separate capture scripts before I had pages I trusted. I found that frustrating, and I've been chewing on why, because the work itself wasn't especially hard. What made it slow is that nothing ever failed loudly. Every wrong turn produced a file that looked fine.

## Four ways to be quietly wrong

The builder has a scrolling view that stacks every spread vertically, which seemed like the obvious way in — render them all, grab each canvas element. It captured six spreads out of thirteen and then stopped finding new ones. That view only keeps about six canvas elements alive at a time and recycles them as you scroll, reusing the same DOM ids. The dedupe was keyed on id, so as far as the script knew, it had already seen everything. Six clean spreads, no error, half a book.

Next attempt zoomed in for more resolution and screenshotted the page element directly. The files came back with the Shutterfly toolbar across the top. It turns out that when the element you're screenshotting is bigger than the viewport, Playwright quietly falls back to capturing the whole page. No warning, and the resulting file is *larger*, which makes it look even more like it worked.

Fine — `page.screenshot({ clip })` with a computed rectangle instead. That clip is clamped to the viewport. Zoom past the window size and you get back an image with exactly the dimensions you asked for, containing only the part that happened to fit. Correct-looking file, content sliced off the right edge, no error anywhere. The fix was to zoom one step at a time and step back as soon as the bounding box stopped fitting.

Then came cropping the whitespace, which is where I actually shipped something wrong. `magick -trim` strips a border of uniform colour, so I ran it, got a consistent box across every page, and moved on. The pages still had a pale strip down one edge. The viewer draws a little stack of page edges behind the current sheet — the effect that makes it look like a book — and those faint grey lines are not white. Trim had been dutifully trimming to the edge of the page *behind* the one I wanted.

The eventual fix was to stop looking for the first non-white pixel and look for a sustained run of them. The stack lines are about 25px wide; the page itself is thousands.

## The check I should have written first

What finally made that measurable was a ratio. An 8x11 page has an aspect of about 0.75, so the measuring script prints it:

```
UNION crop: 7092x4687+131+145
  half-page 3546x4687   aspect 0.756  (expect ~0.75)
```

If that number comes back 0.78, I clipped artwork or kept part of the stack. It's a two-line addition and it converts "looks about right" into pass or fail. Had I written it in the first ten minutes it would have caught three of the four problems above immediately.

There's a nice counterexample in here too. The one failure that announced itself took about five minutes to fix. The editor stamps a yellow "Low resolution" badge over any photo it thinks is too small to print well, and it paints that badge onto the canvas, so no amount of CSS will hide it. But I could *see* it. Switched to the builder's Preview mode, which renders the same pages clean, and that was that. The loud failure was the cheap one.

## Knowing the ceiling

One more thing worth finding early: the builder never requests a photo larger than 2000px on its longest side. That's the real limit on detail, which means chasing 430 DPI was partly theatre. Text, shapes and stickers are vector and genuinely sharpen. The photographs were already at their ceiling somewhere around 235 DPI, and everything past that is upscaling.

The final files are ~430 DPI anyway, because the vector elements do benefit and storage is cheap. But I spent real time optimizing a number that was bounded the whole time by something I hadn't checked.

## What actually worked

The thing that moved this forward wasn't a cleverer approach. It was rendering a contact sheet of every page after every attempt and actually looking at it:

```bash
for f in page-*.png; do
  magick "$f" -resize 210x -bordercolor red -border 1 /tmp/t/"$f"
done
```

The red border marks the image edge, so a clipped page is obvious at thumbnail size. That's how I caught the missing spreads, the toolbar, the sliced edges, and the pale strip — none of which were visible in a file listing, and all of which produced files with plausible names and plausible sizes.

I don't think this is really a story about coding agents, though it's tempting to make it one. An agent can't course-correct on output that looks fine — but neither could I, and I was sitting right there. Both of us needed the same thing: something cheap and objective that turns "looks right" into a number. The contact sheet and the aspect ratio did more for this than any amount of additional cleverness.

If you're trying to get your own book out, the runbook and the three scripts are up at [rickychilcott/shutterfly-book-export](https://github.com/rickychilcott/shutterfly-book-export), including a table of the dead ends, which took longer than the path that worked. Fair warning that it depends on current DOM structure and element ids, so it will break the next time Shutterfly ships a redesign.
