---
published: 2026-02-10
layout: post
title: Quick Screenshot to Claude or Cursor
tags:
  - ai
  - claude
  - cursor
  - frontend
abstract: The 30-Second Screenshot Trick That Makes AI Coding Tools Way More Useful
kind: technical
sitemap: true
---
AI coding tools like Claude Code and Cursor can read images. You probably knew that. But _getting_ a screenshot into them is quite annoying. I fumble with Finder, drag-and-drop, or tab completing paths and it's a pain.

Here's what I dreamed of for a few weeks **press a shortcut, select a region, and paste the file path.** That's it. I looked for screenshoting apps, which might do it, but why spend on a subscription.

## The Setup

One Alfred workflow. Two nodes. Done in under a minute.

**Trigger:** Hotkey set to `Cmd+Opt+3`
**Action:** Run this script:

```bash
#!/bin/bash

# Create screenshots directory if it doesn't exist
# change this location to your preference
mkdir -p "$HOME/screenshots"

# Generate filename with timestamp
FILENAME="screenshot-$(date +%Y%m%d-%H%M%S).png"
FILEPATH="$HOME/screenshots/$FILENAME"

# Take interactive screenshot
# If always want full screen, omit the -i
/usr/sbin/screencapture -i "$FILEPATH"

# Check if a file was actually created (user might cancel)
if [ -f "$FILEPATH" ]; then
    # Copy the path to clipboard
    echo -n "$FILEPATH" | pbcopy
fi
```

That's it. If you didn't know, `screencapture` ships on every Mac.

## How It Works

1. Press `Cmd+Opt+3`
2. Draw a selection around whatever you want to capture
3. The screenshot saves to `~/screenshots/` with a timestamp filename
4. The full file path is on your clipboard

Now in Claude Code, just paste. It reads the image and you're off to the races — debugging a UI issue, asking about a design, or showing it an error message you can't copy as text.

Same deal in Cursor: paste the path into chat and the agent picks it up.

Yes, Claude Code has a `Ctrl + v` option (or is it `Option + v`, I can never remember) to paste a image that's in the clipboard, but these aren't universal across CLIs.

## Why This Matters

The friction of getting visual context into AI tools keeps you from using these features. Every time you have to open Finder, navigate to a file, drag it over, or manually type a path — it's time and switching context. It breaks your flow, and will keep you from building the next thing.

With this shortcut, sharing a screenshot is as fast as pasting text. Which means you actually _do it_ instead of trying to describe what you're seeing in words.

## Why Not Just Use the Built-In macOS Screenshot?

macOS screenshots (`Cmd+Shift+4`) save to your Desktop and copy the _image_ to your clipboard, not the _file path_. Plus you have to either swipe it away or wait the 3-5 seconds while it saves to your desktop. CLI tools like Claude Code need a file path. You'd still have to go find the file and copy its path manually.

## Setting It Up in Alfred

1. Open Alfred Preferences → Workflows
2. Create a blank workflow
3. Add a **Hotkey** trigger, set it to `Cmd+Opt+3`
4. Add a **Run Script** action with the script above
5. Connect the hotkey to the script


## Not using Alfred?
You don't need Alfred for this. The core is just a bash script and a way to trigger it globally.

**Raycast:** Create a Script Command with the same bash script. Assign a hotkey in Raycast preferences.

**Hammerspoon:** Bind a hotkey to run the script via `hs.task.new("/bin/bash", nil, {"-c", "/path/to/your/script.sh"}):start()`.

**Automator + System Settings:** Create an Automator Quick Action that runs the shell script, then assign it a keyboard shortcut under System Settings → Keyboard → Keyboard Shortcuts → Services.

**Plain shell script:** Save the script somewhere, make it executable with `chmod +x`, and alias it in your shell to `s`. The script does all the real work — the trigger is just plumbing.

---

_Built with Claude Code, naturally._
