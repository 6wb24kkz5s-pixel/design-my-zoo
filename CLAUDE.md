# Design My Zoo — project instructions

## What this is
A top-down, blocky (Minecraft-inspired, but fully original art) zoo-building game
for Primary 3 Science in Singapore. Each student uses their own iPad for a
20-minute activity. Students place 12 animals on a large grid, build enclosures
with fences, and add features (pools, huts, food, etc.) made from materials they
choose. The game checks whether each animal's needs are met and whether the
materials suit the job, and gives gentle feedback.

Full spec: docs/GDD.md · Build order: docs/MILESTONES.md
Science content: src/data/char-and-properties.json

## Tech
- Vite + TypeScript + Phaser 3. Static site, no backend, no server, no API keys.
- Hosted on GitHub Pages.
- Must run smoothly in Safari on iPad (iPadOS 17+), touch only. No keyboard or mouse assumed.
- Game UI (top bar, palette, dropdowns, panels) is HTML/CSS overlaid on the Phaser canvas.
- Save progress to localStorage only.

## Hard rules
- All science content (animals, needs, foods, materials, properties, hint messages)
  lives in src/data/char-and-properties.json. Never hard-code science facts in game logic.
- Material properties used: strong, flexible, waterproof, transparent, floats.
  Always say "transparent", never "see-through".
- Language for 9-year-olds: short sentences, common words, every message paired with
  an icon or picture. Several students are still building English vocabulary.
- Feedback is gentle and specific ("The goldfish needs water! 💧"). No red crosses,
  no "wrong", no scores or rankings.
- No logins, no names, no personal data, no analytics, no network calls after load.
- No timers, no screen freezing, no class gallery.
- Original art only. Do not use Minecraft's name, textures, fonts, characters or sounds.
- Sound effects off by default.
- Touch rules: one finger = place / drag / paint; two fingers = pan and pinch-zoom.
  Tap targets at least 48×48 px.
- The iPad is the main device. A computer also works, with no keyboard controls: left button = place / drag / paint,
  trackpad pinch = zoom at the pointer, two-finger trackpad scroll or mouse wheel = pan,
  middle or right button (or left on empty ground) drag = pan. Scrolling never zooms.

## Working style
- Build one milestone at a time from docs/MILESTONES.md. Stop at the end of each
  milestone so it can be tested on a real iPad.
- Keep the rules engine (enclosure detection, needs checks) as plain TypeScript
  functions with Vitest unit tests, separate from Phaser rendering.
- Use placeholder coloured squares until the Art milestone.
- When a science fact is unclear, ask — don't guess.
