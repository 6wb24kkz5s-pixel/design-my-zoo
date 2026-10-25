# Design My Zoo — Game Design Document (v1)

## 1. Overview
*Design My Zoo* is a top-down, blocky zoo builder for P3 Science. Students place 12 animals on a large grid, decide which animals live together, and build enclosures for them. While building, they choose materials for fences, pools, huts and roofs. The game shows, through hearts and gentle messages, whether each animal's needs are met and whether each material suits its job.

## 2. Lesson context
- P3 Science worksheet "Design my zoo", Parts 1 and 2 combined in one activity.
- About 20 minutes of play inside a 2-period lesson.
- One iPad per student, in classes of 33–36 with mixed readiness.
- At the end, the teacher calls on students to explain their enclosures. There is no in-game signboard or written answer.

## 3. Learning goals
By the end, students can:
1. Group animals by shared characteristics, and explain the grouping out loud.
2. Identify what an animal needs to stay alive and healthy: food, water, air, a suitable home, and safety.
3. Choose materials for a purpose using their properties: strong, flexible, waterproof, transparent, floats.
4. Explain why a material is suitable or unsuitable, e.g. "Glass, because it is transparent so visitors can see the fish."

## 4. Core loop
**Add an animal → place it → build or paint around it → add features and choose materials → check its hearts → fix → repeat.**

There are no levels and no win screen. Progress is visible as more animals become happy.

## 5. Screen layout (landscape)
- **Top bar:** animal dropdown · undo · "See whole zoo" · sound toggle · menu (New zoo).
- **Centre:** the plot.
- **Bottom palette** with tabs:
  - 🟩 Ground
  - 🧱 Fences
  - 💧 Water
  - 🌳 Plants
  - 🏠 Shelter
  - 🍎 Food
  - 🗑 Bin (drag things here to remove them)
- **Corner:** + / – zoom buttons.
- **Side panel**, which slides in when an animal is tapped: its hearts, the 👀 visitor meter for its enclosure, and a 💡 hint button.

## 6. Plot and camera
- The grid is 32 × 24 squares, with about 48 px squares at 100% zoom.
- Pinch to zoom, and use two fingers to pan.
- The + / – buttons zoom in steps. "See whole zoo" fits the entire plot on screen.
- Zoom is limited: at most zoomed out, the whole plot fits; at most zoomed in, about 6 squares fill the screen height.
- When zoomed out, items show as clear simple icons.
- The plot has a path around the edge for visitors, which is decoration only. The building area sits inside it.

## 7. Placing and editing
- **Drag mode** (default): drag an item from the palette onto a square and it snaps there. Anything already placed can be dragged to a new square. Dropping onto the 🗑 Bin removes it.
- **Paint mode** for ground and fences: tap a ground or fence tool, then drag one finger across squares to paint. The active tool is highlighted. Tap it again, or tap ✋, to return to drag mode.
- An **eraser** tool exists in paint mode.
- Items larger than 1×1 (e.g. a 3×3 pool) show a ghost outline before dropping. Green means it fits; grey means it doesn't.
- Water plants and floating islands can only be placed on pool squares.
- **Undo** keeps the last 20 actions.
- **Autosave** to localStorage on every change. "New zoo" is in the menu and asks for confirmation before clearing.

## 8. Animals
- **The 12 animals:** koi, goldfish, frog, salamander, hippopotamus, goat, crocodile, snake, parrot, flamingo, beetle, dragonfly.
- **The dropdown** shows a picture and name for each animal, in alphabetical order. There are no difficulty ratings, and nothing hints at how the animals are grouped. An animal already in the zoo is ticked.
- Choosing an animal drops it in the middle of the current view, ready to drag. Each animal can be added once. Dropping an animal on the 🗑 Bin takes it out of the zoo, so it can be added again.
- **Fish** must be placed on pool squares. Elsewhere they show a gentle "I need water!" bubble.
- **Animation** (subtle):
  - Idle bob or breathe.
  - Small wanders within 1–2 squares, staying inside their enclosure.
  - Fish swim within pool squares.
  - Birds and insects flap.
  - A happy or sad emote floats above the animal's head when something changes.
- **Animals never actually escape.** If there is a gap, the animal walks to the gap and peeks out, with a warning.

## 9. Ground, features and materials

**Ground (paint):** grass, soil, sand, mud, rocks, fallen leaves.

**Features (drag):**

| Feature | Size | Material choice? |
|---|---|---|
| Deep pool | 3×3 | Yes |
| Shallow pond | 3×2 | Yes |
| Water bowl | 1×1 | Yes |
| Water plants (on a pool) | 1×1 | — |
| Floating island (on a pool) | 1×1 | Yes |
| Mist sprayer | 1×1 | — |
| Tall tree | 1×1 | — |
| Bushes | 1×1 | — |
| Hollow log | 2×1 | — |
| Rock cave | 2×2 | — |
| Hut | 2×2 | Yes |
| Shade cover | 2×2 | Yes |
| Swing | 1×1 | Yes |
| Food items (see below) | 1×1 | — |

**Food items:** fish food, insects, seeds and fruit, shrimp, meat, mice, hay, rotting fruit.

**Fences (paint):** choose a material first. A fence fills one square.

**Roof:** in the Shelter tab, tap **Roof**, pick a material, then tap inside a fenced-in area. The whole enclosure gets a roof, shown as a light tint. An area with a gap can't be roofed. **No roof** takes a roof off the area you tap. Both work like paint mode, with a "✋ Done" sign.

**Changing a material:** tap a placed feature that has a material choice and the picker opens again, with its current material marked.

**Water-only items:** water plants, floating islands, shrimp and fish food only go on pool and pond squares, and travel with a pool when it is moved or binned.

**Material picker:** whenever a feature needs a material, big cards pop up (when a new feature is dropped where it fits). Each shows a picture, the name, and property icons: 💪 strong · 🌀 flexible · 💧 waterproof · 🔍 transparent · 🛟 floats. A crossed-out icon means the material does *not* have that property. Properties set to `null` in the data file are not shown. Tapping a card selects it.

**Materials and where they are offered:**

| Material | Fence | Pool | Bowl | Hut | Shade | Island | Swing | Roof |
|---|---|---|---|---|---|---|---|---|
| Glass | ✓ | ✓ | | | ✓ | | | ✓ |
| Metal | | | ✓ | | | ✓ | ✓ | |
| Metal wire mesh | ✓ | | | | | | | ✓ |
| Wood | ✓ | | | ✓ | ✓ | ✓ | ✓ | |
| Concrete | ✓ | ✓ | | ✓ | | ✓ | | |
| Clear plastic | ✓ | ✓ | ✓ | | | ✓ | | ✓ |
| Fabric | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | |
| Fabric net | | | | | | | | ✓ |

**What each feature needs from its material:**

| Feature | Material must be | If not |
|---|---|---|
| Fence | Strong | Animals can push through |
| Pool, pond, water bowl | Waterproof | Water leaks out and it stays empty |
| Hut | Strong | Wind and rain break it, so no shelter |
| Shade cover | **Not** transparent | Sunlight comes through, so no shade |
| Floating island | Floats | It sinks |
| Swing | Strong | It can't hold your weight, so it breaks |
| Roof | Lets air through | Animals can't get fresh air |

**Teaching note:** metal wire mesh is *not* marked transparent. Visitors see through its gaps, not through the metal itself.

All of this is defined in `src/data/char-and-properties.json`, not in code.

## 10. Enclosures
- An **enclosure** is any area of squares fully surrounded by fence squares.
- It is detected by flood fill using up/down/left/right moves only, so a diagonal gap counts as a gap.
- When an animal is tapped, its enclosure outline glows.
- If an animal is not inside a closed fence, it shows "I can get out here!" and walks to the nearest gap.
- Fish inside a pool count as safe even without a fence.
- Every check in section 11 looks at what is **inside the same enclosure** as the animal.

## 11. Needs hearts and visitor meter

**Five hearts per animal:**

| Heart | Full when |
|---|---|
| 🍎 Food | Its food is in the enclosure |
| 💧 Water | Its water source is in the enclosure, and that source passes its material check (waterproof) |
| 🌬 Air | No roof, or a roof that lets air through. Fish must be in water. |
| 🏡 Home | Its ground and features from the data file are present |
| 🛡 Safety | The fence is closed and every fence piece is strong. Small animals: no wire mesh, because they slip through the gaps. Flying animals need a roof; small flying animals need a fabric net roof, since wire mesh gaps are too big. No animal shares with something that would eat it. |

The **👀 visitor meter** is shown per enclosure:
- **Great view:** any fence piece is glass or clear plastic, or the fish's pool is glass or clear plastic.
- **Okay view:** wire mesh only, since visitors look through the gaps.
- **Can't see:** everything else.

An animal is **happy** when all five hearts are full. The visitor meter is shown separately and does not affect happiness.

## 12. Feedback and gotchas
- All messages come from `char-and-properties.json`. Each is short, uses an icon, and suggests what to try.
- Examples:
  - "The pool is empty! 💧 Fabric is not waterproof."
  - "Can the parrot fly away? 🦜 Try adding a roof."
  - "This roof keeps out fresh air! 🌬"
  - "Shh — the crocodile might eat its neighbours! 🐊"
- When a material doesn't suit a feature, a visible result happens and a message pops up:
  - A fabric pool drains.
  - A metal island sinks.
  - Light shines through a glass shade cover.
  - A fabric hut falls down.

## 13. Mixed-readiness supports
- The **💡 hint button** shows that animal's needs as a picture checklist that ticks itself as needs are met. Stronger students can ignore it.
- **There is always a next step:** fast students keep adding animals and improving their visitor views.

## 14. Art, animation and sound
- Original pixel art: 16×16 sprites scaled ×3, crisp with no blur, bright and friendly.
- Ground tiles have a subtle blocky texture.
- Animations are short loops of 2–4 frames.
- Use a clear, readable font (not a hard-to-read pixel font).
- Sound effects are off by default (pops for placing, splashes for water).

## 15. Language and accessibility
- Vocabulary for 9–10 year olds, with "transparent" used consistently.
- Every message has an icon.
- Tap targets are at least 48 px.
- Colour is never the only signal: icons and shapes are always included.

## 16. Technical constraints
- Static site built with Vite, TypeScript and Phaser 3, hosted on GitHub Pages.
- Must load in under 5 seconds on school Wi-Fi. Once loaded, it keeps working if Wi-Fi drops.
- Target is 60 fps on a base iPad (9th/10th gen) with all 12 animals and about 150 placed items.
- No data leaves the device.

## 17. Out of scope for v1
Signboards, levels, multiplayer, logins, scores, timers or screen freezing, a class gallery, and a separate 3D view.

## 18. Open questions
1. Check the foods and the "flying beetle" against textbook pages 71–72 and the TLG.
2. Should the "who eats who" warning be on by default?
3. Should there be a "Save picture" button to export the whole zoo as an image? Students could use iPad screenshots instead.
