---
published: 2026-02-14
layout: post
title: Silencing Claude Code Sounds During Meetings
tags:
  - ai
  - claude
  - macos
  - hooks
abstract: A tiny bash script that detects if you're in a meeting and skips Claude Code notification sounds. Six lines, no external dependencies.
kind: technical
sitemap: true
---

I was on a call with a potential customer early last week — one of those first conversations where you're walking through the product and trying to build trust — and right in the middle of my pitch, my laptop let out a loud, the unmistakable sad trombone. Wah-waaah. Like a game show buzzer for a wrong answer.

It was Claude Code. I'd left it running in another terminal. It hit an error on a tool call, and the `PostToolUseFailure` hook I'd set up did exactly what I'd told it to do: play `wah-wah.mp3`. The customer laughed about it, but I wanted to crawl under my desk.

I have Claude Code hooked up to play different sounds for different events — a ding when a task completes, a drum fill when it stops, a drum roll for notifications, and yes, the sad trombone when something fails. When I'm working solo this is genuinely useful. I kick off a task, switch to something else, and my ears tell me what happened without checking. But I'd never thought about what happens when I'm on a call until I was on one.

My first thought was that I could just remember to mute my system audio before meetings. But then I wouldn't be able to hear who I'm speaking with. I've seen other approaches where it checks for the presence of a file and only plays when the file isn't there. But, I know myself, and "just remember" is not a system. I wanted something that would figure it out automatically.

## Poking around macOS

macOS tracks which apps are using audio and video devices through something called power assertions. You can see them by running `pmset -g assertions` in a terminal. When Zoom grabs your mic, an `audio-in` assertion shows up. When something uses the camera, you get `cameracaptured`.

I actually started with `ioreg`, which can detect the built-in FaceTime camera directly. It works, but it's slower (~60ms vs ~17ms for `pmset`) and only sees the built-in camera. Not great if you're using an external webcam.

I thought about checking for camera usage too, but that turned out to be unreliable. I noticed WhatsApp had been holding a `cameracaptured` assertion for over 47 hours on my machine — presumably from a video call days earlier that never properly released. If I keyed off that, my sounds would be suppressed all the time for no reason.

The mic is the reliable signal. If any app has an active `audio-in` claim, I'm almost certainly on a call.

## The script

```bash
#!/bin/bash
# Play a sound only if not in a meeting (camera or mic active)

# Check if any mic is active
if pmset -g assertions 2>/dev/null | grep -q "audio-in"; then
  exit 0
fi

afplay "$1" &
```

That's it. Mine lives at `~/.claude/play-if-not-using-mic.sh`. It checks `pmset` for any active mic assertion. If one exists, it exits silently. If not, it plays whatever sound file you pass as an argument. The `&` at the end lets `afplay` run in the background so the hook doesn't block Claude Code.

## Wiring it into Claude Code

Claude Code has a [hooks system](https://docs.anthropic.com/en/docs/claude-code/hooks) that lets you run shell commands on various events. Instead of calling `afplay` directly, each hook now calls the wrapper script. Here's the relevant part of my `~/.claude/settings.json`:

```json
{
  "hooks": {
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/play-if-not-using-mic.sh ~/.claude/sounds/ding.mp3",
            "async": true
          }
        ]
      }
    ],
    "PostToolUseFailure": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/play-if-not-using-mic.sh ~/.claude/sounds/wah-wah.mp3",
            "async": true
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/play-if-not-using-mic.sh ~/.claude/sounds/drum-fill.mp3",
            "async": true
          }
        ]
      }
    ],
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/play-if-not-using-mic.sh ~/.claude/sounds/drum-roll.mp3",
            "async": true
          }
        ]
      }
    ]
  }
}
```

The `async: true` means Claude Code doesn't wait for the sound to finish before continuing its work.

## Muting doesn't help (and that's fine)

One thing I discovered: when you mute yourself in Zoom (or Meet, or Teams), the app doesn't actually release the microphone. It holds the mic for the entire call and just discards the audio input on its end. So `pmset` still shows `audio-in` even when you're muted.

I thought about whether this was a problem — maybe I'd want sounds when I'm muted? 

But no. The sad trombone incident happened while I was unmuted, sure, but even if I'd been muted, I don't want a drum fill going off while someone else is talking. I also have ran into issues where I'm using [superwhisper](https://superwhisper.com/) to queue up another action for Claude and then it goes off.

Suppressing sounds for the entire duration of a call or when the mic is in use is exactly what I want.

## The fix after the fix

So now when I'm on a call and Claude Code finishes a task or hits an error, nothing happens. Silence. And when I'm working solo, all my sounds are right there like before. The whole thing is six lines of bash and one macOS built-in. No sad trombones for this guy anymore.

---

_Built with Claude Code, naturally._
