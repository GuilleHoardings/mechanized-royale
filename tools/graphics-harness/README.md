# Graphics harness

Offline renderer for the game's procedural (vector) art.

The battle screen can draw everything two ways:

- **texture mode** — PNGs from `assets/` (used when the texture exists)
- **graphics mode** — `GraphicsManager` drawing shapes at runtime

Graphics mode is hard to check in a headless environment: it needs a running
browser, a visible tab and `requestAnimationFrame`, none of which work reliably
in CI or in an agent sandbox. This harness renders the **real**
`GraphicsManager` with a small Phaser shim onto a `@napi-rs/canvas` surface, so
the actual game code runs and the result can be inspected as a PNG.

Nothing here is loaded by the game itself — it is a development tool only.

## Usage

```sh
npm install --prefix tools/graphics-harness      # once
node tools/graphics-harness/render-gallery.js    # render sheets
node tools/graphics-harness/render-gallery.js --check   # render + assert
node tools/graphics-harness/scene-smoke.js       # headless DeckScene test
node tools/graphics-harness/targeting-smoke.js   # headless AI target-priority test
```

`--check` also verifies, and exits non-zero on failure:

- every unit, tower, building and card icon is drawn inside a sane size range
  (units ~8–80 x 60 px, towers ~40–120 x 140 px, card art ≤ 85 x 85 px, …)
- each procedural card icon is visually centred on its icon box (±1.5 px),
  which catches barrel-length changes that silently push art off-centre
- card icons are normalised to the same 80x60 box as the image-based cards, so
  small units read clearly in the battle hand on phones
- deck rules in `GameHelpers.sanitizeDeck()` produce 8 unique, known cards from
  the default deck, legacy `player.tanks` saves, junk input and overlong input
- air targeting follows `GameHelpers.canTarget()`: tanks cannot hit aircraft,
  the Wirbelwind cannot hit ground, and towers can hit both
- unit lifetimes follow `GameHelpers.healthDecayPerMs()`: the Wirbelwind drains
  its full HP over its 50 s lifetime, while normal tanks never decay

## Scene smoke test

`scene-smoke.js` runs the real `DeckScene` against stub Phaser systems and
simulates taps (select, remove, add, save, reset). It renders nothing, but it
catches wiring mistakes that a screenshot would not: stale deck state, disabled
save buttons, duplicate cards, and save/migration regressions.

```sh
npm run smoke --prefix tools/graphics-harness   # or: node tools/graphics-harness/scene-smoke.js
npm test --prefix tools/graphics-harness         # art checks + scene smoke + targeting
```

## Targeting smoke test

`targeting-smoke.js` runs the real `AIController.updateTankAI()` against a stub
scene and checks which entity a unit locks on to. It covers the priority rule
that the **closest legal target wins**: a nearer tower is never skipped for a
farther deployed building such as a Wirbelwind or V1 Launcher, even when that
building is damaged or slowly decaying. It also keeps the intentional exceptions
(troops may pull aggro, and the King Tower stays protected while a lane tower
stands).

```sh
npm run targeting --prefix tools/graphics-harness   # or: node tools/graphics-harness/targeting-smoke.js
```

## Output

PNGs are written to `out/` (git-ignored):

| file | contents |
| --- | --- |
| `units.png` | every frontline unit, player and enemy, on a contact sheet |
| `towers.png` | King/Princess towers, both teams, base + turret |
| `buildings.png` | V1 launcher, both teams |
| `cards.png` | all procedural card icons at card scale |
| `battlefield-1x.png` | mock battlefield at true in-game scale (20 px tiles) |
| `battlefield-2x.png` | same, at 2× for detail review |

Units are drawn with barrels pointing right (+x); the battlefield mock rotates
them into their lane.

## Files

- `render-gallery.js` — builds the sheets, draws labels, runs `--check`
- `targeting-smoke.js` — real `AIController` target-priority checks against a
  stub scene (closest legal target wins; King Tower immunity; troop aggro)
- `phaser-shim.js` — `MockScene`, `Graphics`, `Container`; records draw ops and
  replays them on a Canvas2D context. `boundsOf()` walks the display tree to
  measure drawn content, including per-child offsets.
- `load-game.js` — loads `constants.js`, `entities.js`, `unit-metrics.js` and
  `GraphicsManager.js` into one Node VM context, so the game's real data and
  drawing code are used (no copies to keep in sync).

## Notes

- The shim's texture manager always reports textures as missing, which forces
  the procedural branches. Texture mode is therefore not covered here; that art
  is validated by `tools/normalize-units.ps1` and `src/data/unit-metrics.js`.
- Phaser's `Graphics` has no `getBounds()`, so card centring and size
  normalisation use the measured `CARD_ART_METRICS` table in
  `GraphicsManager.js`. If you change card art, re-run `--check` and update the
  `offset`, `width` and `height` values.
- Add a new unit/building to `entities.js` and it appears automatically; the
  bound limits in `runChecks()` may need widening for unusually large art.
