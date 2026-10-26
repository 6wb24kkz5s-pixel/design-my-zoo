# Wording review (for approval)

**Nothing on this page has been applied.** Every message is still exactly as it is in
`src/data/char-and-properties.json`. Tell me which changes to make ("all", "all except 4 and 9", or
"only 1–6") and I will change the data file and nothing else.

The goal: short sentences, common words, one idea per message, and a picture on every message
(the side panel adds the heart's picture when a message has none). Science words stay
("transparent", "strong", "waterproof", "floats") because the children are learning them.

## A. Changes I suggest

| # | Where | Now | Suggested | Why |
|---|-------|-----|-----------|-----|
| 1 | Frog, home | The frog needs water AND land, with a place to hide. | The frog needs water, land and a place to hide. 🐸 | No capital letters for shouting; the list is easier to read. |
| 2 | Crocodile, eats | Shh — the crocodile might eat its neighbours! 🐊 | Shh! The crocodile might eat the animals next to it! 😮 | Dash and "neighbours" are hard for new readers. Matches the style of the other "eats" messages. |
| 3 | Snake, eats | Shh — the snake might eat the frog! 🐍 | Shh! The snake might eat the frog or the salamander! 😮 | Same dash. The snake eats both, but the message names only one. |
| 4 | Frog, safety | The frog can squeeze through the gaps! | The frog can get through the gaps! 🚧 | "Squeeze" is an extra word to learn. Gets the same picture as the escape bubble. |
| 5 | Salamander, safety | The salamander can squeeze through the gaps! | The salamander can get through the gaps! 🚧 | Same. |
| 6 | Snake, safety | The snake can slide through the gaps! | The snake can get through the gaps! 🚧 | Same. |
| 7 | Salamander, home | The salamander likes damp ground and a place to hide. | The salamander likes wet ground and a place to hide. 🌿 | "Damp" is a harder word than "wet". |
| 8 | Hippo, home | The hippo needs a deep pool, land and shade. | The hippo needs a deep pool, land and shade. 🦛 | Same words. Only adds a picture. |
| 9 | Parrot, safety | Can the parrot fly away? Try adding a roof. 🦜 | The parrot can fly away! Add a roof. 🦜 | A statement is clearer than a question. Shorter. |
| 10 | Flamingo, safety | Can the flamingo fly away? Try adding a roof. | The flamingo can fly away! Add a roof. 🦩 | Same as 9. |
| 11 | Beetle, safety | The beetle can fly or crawl out! Use a fabric net roof and no wire mesh. | The beetle can fly or crawl out! Use a fabric net roof. Do not use wire mesh. 🪲 | Splits one long sentence into three short ones. |
| 12 | Dragonfly, safety | The dragonfly can fly out! Use a fabric net roof. | The dragonfly can fly out! Use a fabric net roof. 🪰 | Same words. Only adds a picture. |
| 13 | Goat, home | The goat needs land and a shelter. | The goat needs land and a place to shelter. 🏠 | "A shelter" as a noun is easy to confuse with the Shelter tab. Optional. |
| 14 | Roof, fails | This roof keeps out fresh air! 🌬 Try one with holes. | This roof stops fresh air! 🌬 Try a roof with holes. | Simpler verb ("stops"). Optional. |
| 15 | Fence, fails | This fence is not strong. Animals can push through! 💪 | This fence is not strong. Animals can push it over! 💪 | "Push through" can mean the gaps. Push it over is clearer for strength. Optional. |
| 16 | Floating island, fails | Glug! The island sank. This material does not float. 🛟 | The island sank! This material does not float. 🛟 | "Glug!" is a sound word some children may not know. Optional. |
| 17 | Water bowl, fails | The water soaked away! This material is not waterproof. 💧 | The water went through! This material is not waterproof. 💧 | "Soaked away" is harder than "went through". Optional. |
| 18 | Visitors (none) | Visitors can't see the {animal}. Try a clear fence! | Visitors cannot see the {animal}. Try a transparent fence! 🔍 | No contraction. Uses the word we teach: "transparent", not "clear". |
| 19 | Fence-gap hint | A fence with no big gaps | A fence with no big gaps 🕸️ | Same words. Listed so you can see it was checked. |
| 20 | Enclosure, open | This area is not closed in. Build a fence all the way around. | This area is not closed in. Build a fence all the way around. 🧱 | Same words. Listed so you can see it was checked. |

Items 8, 12, 19 and 20 change nothing except confirming a picture is there; skip them if you like.

## B. Words I checked and would leave alone

- **transparent, strong, waterproof, floats, flexible**: the Science words for this unit.
- **enclosure**: used only in code and in this document, never in a message the children see.
- **hungry, thirsty, safe, happy**: short, common, and match the hearts.
- **"Shh!"**: it works as a picture in words, and children know it.

## C. Things for you to decide (not wording)

1. **"Fabric" vs "Fabric net"**: the roof list says "Fabric net" and every other list says "Fabric".
   They are different materials in the data, so I have left them. Say if you want one name.
2. **Metal mesh vs Metal**: the fence list says "Metal mesh", the item lists say "Metal". Same question.
3. **"stars" in the data file**: each animal still has a `stars` number from the first draft. It is
   not used and nothing shows it. I can delete it, or keep it in case you want it later.
4. **Hippopotamus**: the label is the full word, but the messages say "hippo". Both are fine; the
   long word is on the animal tag and the short one is in the sentence.
