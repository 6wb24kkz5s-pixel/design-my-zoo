# Design My Zoo — Milestones

Build one milestone at a time. Each ends with an **iPad check**: open the GitHub Pages link in Safari on a real iPad and test the "Done when" line. Commit after each milestone passes.

A good **first playable iteration** is M0–M4 (placeholder squares, no art yet).

---

## M0 — Project setup
- Vite + TypeScript + Phaser 3, Vitest, and a GitHub Pages deploy.
- `.gitignore` in place.
- **Done when:** a blank coloured grid loads on the iPad from the live link.

## M1 — Plot and camera
- 32×24 grid, pinch zoom, two-finger pan, + / – buttons, "See whole zoo", zoom limits.
- **Done when:** you can zoom and pan smoothly, and one finger does nothing yet.

## M2 — Drag and drop
- Bottom palette with tabs (placeholder items), drag to a square, snap, move, bin, undo (last 20 actions), ghost outline for large items, autosave to localStorage.
- "New zoo" button in the menu, with confirmation.
- **Done when:** you can place, move and delete a 1×1 and a 3×3 item, they come back after a page refresh, and "New zoo" clears the plot only after confirming.

## M3 — Paint mode: ground and fences
- Ground and fence tools, painting by dragging, eraser, material picker for fences, clear mode indicator (✋ to return to drag mode).
- **Done when:** you can paint a grass area and a wooden fence ring in a few seconds.

## M4 — Enclosure detection
- Flood fill (up/down/left/right only), detecting enclosures, outline glow, gap detection.
- Unit tests for: a closed square, a single gap, a diagonal gap, and enclosures inside enclosures.
- **Done when:** the tests pass, and breaking one fence piece shows a gap warning.

## M5 — Animals
- Load `src/data/char-and-properties.json`, picture dropdown with stars, 🔊 read-aloud, dragging animals, the fish-in-water rule, basic idle animation.
- **Done when:** all 12 animals can be added and moved, and the koi complains on dry land.

## M6 — Features and materials
- All features from the GDD, material picker with property icons, and material results (draining pools, sinking islands, light through glass shade, falling fabric hut). Roof per enclosure.
- **Done when:** every feature can be placed with every allowed material, and each failure shows its visible result.

## M7 — Needs engine
- Five hearts per animal, side panel, emotes, 👀 visitor meter, 💡 picture checklist, gotcha messages — all driven by `char-and-properties.json`.
- Unit tests for every animal: one fully happy setup, and one broken setup per heart.
- **Done when:** all tests pass, and you can make all 12 animals happy by hand.

## M8 — Art, animation and sound
- Original pixel sprites for everything, wander / swim / flap animations, escape peek, optional sound toggle, a pass on all text wording.
- **Done when:** it looks finished, and still runs smoothly with a full zoo.

## M9 — Classroom trial
- Test with 3–4 children or colleagues for 20 minutes. Watch for:
  - Where do they get stuck?
  - Do they mis-tap?
  - Do they read the messages?
- Fix what they hit.
- **Done when:** a new user can make one animal happy within 5 minutes without help.
