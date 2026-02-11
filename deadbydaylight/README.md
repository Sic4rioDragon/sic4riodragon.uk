# Dead by Daylight — Collection Pages

A small static site to track my **Dead by Daylight** collection with:
- Killer + Survivor grids
- Search + favorites
- Click-to-open modal with loadouts + clip embeds
- Deep links that open a character directly (`?k=` for killers, `?s=` for survivors)
- Optional perk icons pulled from snoggles' perk emoji repo

## Pages
- **Killers:** `/deadbydaylight/`
- **Survivors:** `/deadbydaylight/survivors.html`

### Switching pages
Click the icons in the title:
- **Yui icon** → Survivors
- **Huntress icon** → Killers

## Data files
### Killers
`/deadbydaylight/killers.json`

Each killer entry supports:
- `id` (string) — unique
- `name` (string)
- `img` (string) — portrait path
- `prestige` (number)
- `owned` (boolean)

Optional:
- `favLoadout`: `{ perks: [], addons: [], offering?: "", notes?: "" }`
- `clips`: `[ { title?: "", url: "" } ]`
- `main`: true/false (optional highlight flag if enabled in CSS/JS)

### Survivors
`/deadbydaylight/survivors.json`

Each survivor supports:
- `id`, `name`, `img`, `owned`
Optional:
- `favLoadout`: `{ perks: [], addons: [], notes?: "" }` (addons can be used for items/add-ons)
- `clips`: `[ { title?: "", url: "" } ]`
- `main`: true/false (optional highlight flag if enabled)

## Favorites (local-only)
Favorites are stored in the browser via `localStorage`:
- Killers: `dbd_favs_v1`
- Survivors: `dbd_survivor_favs_v1`

## Deep links
- Killers open with: `/deadbydaylight/?k=huntress`
- Survivors open with: `/deadbydaylight/survivors.html?s=yui`

Ctrl/Cmd-click a card to open the deep link in a new tab.

## Clips (embeds)
The modal auto-embeds:
- **Medal** links (supported)
- **YouTube** links (supported)
Other links show as plain clickable URLs.

## Perk icons (optional)
Perk icons load from:
https://raw.githubusercontent.com/snoggles/dbd-perk-emoji/main/images/input/

Perks can be stored as:
- Plain string: `"Lethal Pursuer"`
- Or object: `{ "name": "Lethal Pursuer", "icon": "Lethal Pursuer.png" }`

The killers page includes an automatic filename resolver for most perks:
- Apostrophe `'` becomes `_` (example: `We'll Make It` → `We_ll Make It.png`)
- Colons `:` are removed (example: `Hex: Ruin` → `Hex Ruin.png`)
Plus a small alias list for weird names like BBQ.

## Assets
- Placeholder: `/deadbydaylight/assets/img/placeholder.webp`
- Icons used in title:
  - `/deadbydaylight/assets/img/yui.png`
  - `/deadbydaylight/assets/img/huntress.png`

Hosted as a static site (GitHub Pages / any static host).
