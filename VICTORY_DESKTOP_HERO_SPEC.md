# Victory Celebration — Desktop Hero Technical Spec Advisory

**Component:** CoogsNation Victory Celebration hero
**File touched:** `client/src/pages/LandingSimple.tsx`
**Assets added:** `client/public/coog-victory-animated.webp`
**Branch:** Chat-sandbox
**Checkpoint (UTC):** 2026-09-09T05:04:33Z
**Scope:** Desktop only (≥1024px). Mobile and tablet unchanged.

---

## 1. What this change does

Replaces the cropped desktop Victory hero with the full wide composition, animated.

Before: desktop rendered `coog-victory-celebration.gif` (720×480, 1.5:1) inside a
~435px-tall container with `object-fit: cover`. Approximately 49% of the source
frame was visible. The skyline, flag base, and lower artwork were cut off.

After: desktop renders `coog-victory-animated.webp` (2097×750, 2.796:1) in an
800px-tall container, left-anchored. Full lettering, skyline, flag, paw and
HU firework letters are visible, with the fireworks animating.

---

## 2. Asset inventory

| File | Dimensions | Ratio | Frames | Size | Serves |
|---|---|---|---|---|---|
| `coog-victory-celebration.gif` | 720 × 480 | 1.5:1 | 24 | 4.3 MB | < 1024px |
| `coog-victory-animated.webp` | 2097 × 750 | 2.796:1 | 12 | 2.5 MB | ≥ 1024px |
| `coog-victory-desktop.webp` | 2098 × 750 | 2.797:1 | 1 | 444 KB | unused — retained as fallback |

`coog-victory-desktop.webp` is no longer referenced but should not be deleted.
It is the known-good still fallback if the animation needs to be pulled quickly:
change one `srcSet` value and rebuild.

---

## 3. Markup

The bare `<img>` was wrapped in a `<picture>` element. The `<img>` retains its
class and remains the styled element, so all existing `.cn-victory-art` CSS
continues to apply.

```tsx
<picture>
  <source
    media="(min-width: 1024px)"
    srcSet="/coog-victory-animated.webp"
    type="image/webp"
  />
  <img
    src="/coog-victory-celebration.gif"
    alt="Coog Victory Celebration"
    className="cn-victory-art"
  />
</picture>
```

The `<source>` breakpoint (1024px) must stay aligned with the CSS breakpoint
that sets the hero height. If they diverge, one viewport range gets an asset
whose ratio does not match its container, and cropping returns.

---

## 4. CSS

Three declarations were changed, all inside existing `@media` blocks at or
above 1024px.

| Line (approx.) | Block | Before | After |
|---|---|---|---|
| 1482 | `@media(min-width:1024px)` | `height:clamp(390px,46dvh,430px)!important` | `height:800px!important` |
| 1485 | `@media(min-width:1024px)` | `object-position:center 6%!important` | `object-position:left center!important` |
| 1545 | `@media(min-width:1280px)` | `height:clamp(400px,46dvh,440px)!important` | `height:800px!important` |
| 1554 | `@media(min-width:1536px)` | `height:clamp(410px,46dvh,450px)!important` | `height:800px!important` |

### Why `object-position: left center`

At 800px tall and 2.796:1, the image needs ~2237px of width to fill. On a
~1900px viewport, `cover` scales up and trims roughly 170px from each side.
The "COOG" lettering sits hard against the left edge of the artwork, so
center-anchoring clipped it. Left-anchoring moves the entire crop to the right
side of the frame, which contains only fireworks.

---

## 5. Cascade warning — read before any future height change

`.cn-victory-hero` has approximately 17 declarations in this file.
`.cn-victory-art` has 10. `.cn-victory-shade` has 3. There are four separate
`::after` blocks and one `::before`.

**The hero height is set in three separate media blocks (1024, 1280, 1536).**
All three carry `!important` and the later ones win. Changing only one has no
visible effect above its range — this cost significant time during this work.
Any future height change must touch all three.

An earlier attempt used `aspect-ratio: 2098 / 750`. It computed correctly but
never took effect, because `aspect-ratio` only governs when `height` is `auto`,
and the 1280/1536 blocks were still setting an explicit height. The explicit
800px value replaces it and is unambiguous.

---

## 6. Do not re-enable

`.cn-victory-hero::after` is held inert by `display:none!important`. It carries
a background referencing the GIF at `z-index:-2`, which sits **above** the
artwork at `z-index:-3`. Re-enabling it will obscure the lettering — this was
the original defect. Three later media rules still set its `height` (132px,
138px, 142px); those are harmless while `display:none!important` holds.

---

## 7. How the animated asset was produced

Source: seven independently generated 2097×750 stills of the same composition.

Because each still was generated separately, the lettering, flag and skyline
differ measurably between frames (mean absolute difference 16–29 in the title
region). Played raw, the typography visibly wobbles.

Method used: frame 1 was taken as the base plate. The title block, flag/pole
region and the entire lower band (skyline, freeway, treeline, GO COOGS sign)
were composited from that single frame onto all seven, so those elements are
pixel-identical throughout. Only the upper sky varies. The mask was feathered
38px to avoid seams. Frames run forward then reverse (12 total) so the loop has
no hard jump.

Encoded at quality 72, 110ms per frame, infinite loop.

**If this asset is ever regenerated,** the same constraint applies: independently
generated frames must have their static elements frozen from one base frame, or
the text will jitter.

---

## 8. Verification performed

- Desktop at vw 1339 and ~1900: full composition visible, animation playing
- Canonical header score unchanged (`FINAL / HOUSTON 33 / OREGON ST. 20`)
- Sports ticker unchanged
- CoogsNation Community section and cards render correctly below the hero
- Site Controls untouched
- `curl -fsS http://127.0.0.1:5000/healthz` → `{"status":"ok","database":"ok"}`

### Not yet verified

- Mobile and tablet rendering. All edits sit inside `@media(min-width:1024px)`
  blocks and the `<source>` does not match below 1024px, so no change is
  expected — but this has not been visually confirmed on a device.
- Sports regression for false `0-0 FINAL` states.
- Restart persistence.

---

## 9. Rollback

Single-line revert to the known-good still, no CSS changes required:

```bash
cd /home/coogsnation/app
python3 - <<'PY'
import io
p = "client/src/pages/LandingSimple.tsx"
s = io.open(p, encoding="utf-8").read()
s = s.replace('srcSet="/coog-victory-animated.webp"',
              'srcSet="/coog-victory-desktop.webp"')
io.open(p, "w", encoding="utf-8").write(s)
PY
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate app
```

To also revert the height, change `height:800px!important` back to the original
clamps in all three media blocks.

---

## 10. Cleanup before commit

```bash
rm -rf /tmp/vf                    # 24 extracted PNG frames, ~85 MB
rm -rf /tmp/coogs-victory-final   # abandoned worktree built from 04a4903
```

The abandoned worktree has no `.env`, so `docker compose` fails there with
`POSTGRES_USER is missing a value`. It caused repeated confusion during this
session and should be removed.

---

## 11. Commit scope

Stage explicitly. Do not use `git add .`.

```
client/src/pages/LandingSimple.tsx
client/public/coog-victory-animated.webp
```

`coog-victory-desktop.webp` and `coog-victory-celebration.gif` are unchanged.
