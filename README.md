# best-cooking-game

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/hungndp/best-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/hungndp/best-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**Sizzle & Serve: Ember & Thyme** — a complete, original cooking game built for make.fun's "Make the best cooking game" bounty ($250). It runs offline in a desktop browser from static files, played with keyboard and mouse. No network requests, no libraries, no build step — just canvas, WebAudio bleeps, and a very busy kitchen.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 and play. Node 22.18 or later.

## How it plays

You are the chef of a kitchen that grows with you. Tickets arrive on the **order board** (left), each naming a dish and a price, with a patience bar draining underneath. Build the dish on one of the plates on the pass: click **ingredient bins** on the counter (or press 1–0) to add ingredients. Raw food — patty, fries, egg, bacon — goes to the **stove** first: click its bin, wait for the burner ring to turn green, then click the burner to plate it. Leave it too long and it **burns** — clear the burner and your combo breaks. When a plate matches a ticket, click the ticket (or press F) to **serve** it and bank the price plus a tip that shrinks as patience drains.

Serve dishes back-to-back without a mistake and the **combo** climbs to ×5. The last 30 seconds of every shift are **rush hour**: orders arrive twice as fast and pay 1.5×.

## Three kitchens (stages)

1. **Rolling Skillet — Food Truck** (120 s, 3 tickets, 4 recipes): Classic Burger, Cheese Fries, Sunny Sandwich, Garden Salad.
2. **Ember & Thyme — Bistro** (150 s, 4 tickets, 8 recipes): unlocks by earning at least 1 star in the truck; adds Bacon Burger, Breakfast Plate, Golden Stack, Loaded Fries.
3. **The Gilded Ladle — Fine Dining** (180 s, 4 tickets, all 12 recipes): unlocks the same way; adds Royal Burger, Chef's Special, Truffle Fries, Grand Platter.

Each shift is scored 0–3 stars on coins earned. Stars feed your **reputation**, unlock the next kitchen, and persist between visits (localStorage), along with your coins and shop purchases.

## The economy: earn it, spend it

Every coin you earn is spendable in the **shop** (S key, or the SHOP button): Turbo Stove (burners 40% faster), Second Burner (a third burner), Golden Pan (+25% tips), Herb Garden and Comfy Stools (customers wait longer), Extra Plate (a fourth plate), Neon Sign (orders arrive faster), Grand Chandelier (+1 star per shift). Purchases persist across shifts — the shop is the meta-progression.

## Daily quests

Three quests per shift, drawn from a pool of nine — serve 6 dishes, earn 250 coins, reach a ×3 combo, finish with no burnt dish, earn 100 coins in tips, and more. Each pays coins the moment it is done, and the no-burn quest pays at the end of a clean shift.

## Controls

- **Mouse:** click bins, plates, burners, tickets, the SERVE button, shop items.
- **1–0:** ingredient bins · **Q/W/E/R:** pick a plate · **F:** serve the selected plate · **T:** trash the selected plate · **P / Esc:** pause · **S:** shop · **M:** mute.

## Screenshots

Four real renders of the game's own code (1280×800), staged by `game/src/shots.js` with `?shot=…&seed=1`:

1. `1-kitchen.jpg` — the kitchen and order board mid-shift
2. `2-counter.jpg` — ingredients on the counter, two dishes on the go
3. `3-assembly.jpg` — a dish one ingredient from done, a burner ready
4. `4-serve.jpg` — the timer running and a plate ready to serve

## Layout

- `game/` — the playable game as static files (`index.html` + `src/*.js`, no dependencies)
- `game/src/config.js` — tuning, 10 ingredients, 12 recipes, 3 stages, 8 shop items, 9 quests
- `game/src/world.js` — orders, plates, burners, combos, coins, quests, shop rules
- `game/src/render.js` — all canvas drawing (kitchen, board, counter, stove, shop, screens)
- `game/src/shots.js` — deterministic screenshot scenes driven by an autopilot
- `game/src/input.js` / `game/src/audio.js` — keyboard + mouse, synthesised WebAudio sounds
- `main.ts` — hands the game in: copies `game/` + `screenshots/` to `/output`, writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

---

<sub>Entered on [make.fun](https://make.fun/?ref=ebjdb2tv&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
