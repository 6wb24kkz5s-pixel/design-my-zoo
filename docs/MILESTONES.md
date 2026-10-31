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
- Load `src/data/char-and-properties.json`, picture dropdown (alphabetical, no ratings), dragging animals, the fish-in-water rule, basic idle animation.
- **Done when:** all 12 animals can be added and moved, and the koi complains on dry land.

## M6 — Features and materials
- All features from the GDD, material picker with property icons, and material results (draining pools, sinking islands, light through glass shade, falling fabric hut). Roof per enclosure.
- **Done when:** every feature can be placed with every allowed material, and each failure shows its visible result.

## M7 — Needs engine
- Five hearts per animal, side panel, emotes, 👀 visitor meter, 💡 picture checklist, gotcha messages — all driven by `char-and-properties.json`.
- Unit tests for every animal: one fully happy setup, and one broken setup per heart.
- **Done when:** all tests pass, and you can make all 12 animals happy by hand.

## M8 — Art, animation and sound
Split into two iPad checks, because art is a matter of taste and should be seen first.

### M8a — Art
- Original 16×16 pixel sprites (drawn in code, no image files) for every animal, feature, food, ground type, fence, roof and result picture. Items are drawn once and made in every allowed material.
- Clear, bold icons when zoomed out; animal name tags when zoomed in.
- Pictures in the palette, animal drop-down, side panel, hint checklist and material picker.
- `?gallery` on the address shows every picture. `docs/art/sprite-sheet.png` is a picture of them all.
- **Done when:** it looks finished, and still runs smoothly with a full zoo.

### M8b — Life, sound and wording
- Animals stroll up to two squares from where they were put (their saved square never changes), fish swim about inside their pool, birds and insects flap. Big animals and fish move slowly. Reduce Motion in the iPad settings turns all of it off.
- Escape peek: a small animal in a pen with a small gap hops into the gap, shows "I can get out here!", and hops back. It never really leaves.
- Animals are picked up and tapped where they are drawn.
- 🔇/🔊 button in the top bar. Four short sounds (pop, splash, bloop, chime) made by the iPad itself. Off by default; the choice is remembered. The chime plays when an animal becomes happy.
- Tap a palette card to pop the item onto the free spot nearest the middle of the view (a pool square for water-only items), with a short glow. Dragging a card still works. Materials are asked for first, as with a drag.
- `docs/wording-review.md`: a before-and-after list of message wording. **Nothing is applied until approved.**
- **Done when:** the animals feel alive, and it still runs smoothly with a full zoo.

## M9 — Classroom trial
- Test with 3–4 children or colleagues for 20 minutes. Watch for:
  - Where do they get stuck?
  - Do they mis-tap?
  - Do they read the messages?
- Fix what they hit.
- **Done when:** a new user can make one animal happy within 5 minutes without help.
