# Wilt

A solo, turn-based puzzle game about planting on a schedule and harvesting blooms in synchronized clusters.

**Pitch:** Plant seeds that bloom on a timer; blooms last two turns; harvest them in connected groups for multiplied points — or watch them wilt into husks that bury your garden.

## Play

Open `index.html` in a browser. No build step, no dependencies.

```bash
# or serve it locally
python3 -m http.server 8000
```

## Rules

- 6×6 board, 40 turns, one action per turn: **plant**, **harvest**, or **pass**.
- Seeds come from a weighted bag into a hand of 3:

| Seed | Blooms after | Base value |
|---|---|---|
| 🌼 Quick | 2 turns | 1 |
| 🌸 Standard | 3 turns | 3 |
| 🪻 Slow | 5 turns | 7 |

- Plants age every turn. On reaching their bloom time they **bloom for 2 turns**, then wilt into a **husk** that permanently blocks the cell.
- **Harvest reaps every bloom on the board at once.** Each orthogonally-connected group scores *(sum of base values) × (group size)* — so the game is engineering many blooms to fire on the same turn, side by side.
- Harvested groups of 3+ also clear husks adjacent to the group (the relief valve).

## Controls

- Click a seed card (or press `1`/`2`/`3`), then click an empty cell to plant.
- `H` or the Harvest button to harvest; `P`/`Space` or the Pass button to pass.

## Tuning

All the knobs live in the `CONFIG` object at the top of `game.js`: board size, run length, bloom duration, seed timings/values/weights, and the husk-clear threshold.
