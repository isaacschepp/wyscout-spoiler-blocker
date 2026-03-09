# WyScout Spoiler Blocker

A Chrome extension that hides match scores on [WyScout](https://wyscout.hudl.com) to prevent spoilers when browsing or downloading matches.

## Features

- **Hides all match scores** — scores are replaced with gray blocks across the WyScout interface
- **Double-click to reveal** — double-click any match row to reveal that specific score
- **Toggle on/off** — quickly enable or disable via the extension popup
- **SPA-aware** — automatically handles dynamically loaded content as you navigate

## Install

1. Download the latest `wyscout-spoiler-blocker.zip` from [Releases](https://github.com/isaacschepp/wyscout-spoiler-blocker/releases) and unzip it
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the unzipped folder
5. Navigate to [wyscout.hudl.com](https://wyscout.hudl.com) — scores will be hidden automatically

## Usage

- **Toggle:** Click the extension icon in the toolbar to turn score hiding on or off
- **Reveal individual scores:** Double-click a match row to reveal just that score
- **Double-click again** to re-hide it

## How It Works

The extension injects CSS that makes score elements (`.scoreA`, `.scoreB`, `.delimiter`) transparent with a gray background. A MutationObserver watches for dynamically loaded content since WyScout is a single-page app.
