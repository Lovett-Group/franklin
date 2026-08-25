# POST Design System

The public design system for **POST Houston** — brand, voice, colour, typography, and the
UI component library.

Live site: enable **GitHub Pages** on this repository (Settings → Pages → Deploy from a
branch → `main` / `root`). Everything here is static HTML; there is no build step to run
on GitHub.

---

## What is in here

This repository holds the **built site only**. It is generated output, committed so that
GitHub Pages can serve it directly.

```
index.html            overview
about.html            what POST is, the name, the history
voice.html            voice and tone, the lexicon, the three audiences
logotype.html         the wordmark, clearspace, placement, repetition
identity.html         Sticks and the Graphic Swap
shapes.html           the 79-shape library AND the Graphic Swap builder - pick a
                      shape to compose a lockup, or grab any shape on its own
swap.html             redirect, kept so the old URL does not 404
color.html            brand colour, destination identities, the two semantic axes
typography.html       the typeface, the digital scale, print preferences
ramps.html            the primitive colour ramps and their anchor steps
tokens.html           the values that ship, read out of the stylesheet
icons.html            the icon set, downloadable
components.html       component index
component-*.html      one page per component (19)
resources.html        how to install and use the CSS
assets/               post-ui.css, components.js, icons.svg, fonts, images
assets/download/      every logo, shape and icon as a standalone .svg,
                      plus a zip per set
```

## Where it comes from

**Do not hand-edit these files.** They are overwritten on every build.

The site is generated from the POST design system repository by:

```
design-system/public/build-public.py
```

which reads:

| input | what it provides |
|---|---|
| `web/dist/*` | the generated tokens, type and component CSS — copied, never retyped |
| `web/recipes.js` | the component markup recipes, shared with the internal guide |
| `web/components.json`, `web/icons.json` | component axes and the icon set |
| `foundation/*.json` + `foundation/assets` | brand colour, logo lockups, shape library |
| `public/brand.json` | the brand guidelines writing (voice, rules, history) |
| `public/components-copy.json` | the public "what is this for" copy per component |
| `public/shape-scale.json` | optical size corrections for individual shapes &mdash; a stopgap for artwork that should be redrawn in Figma |

To rebuild and republish:

```bash
python web/build-tokens.py        # regenerate dist/ from tokens.json
python public/build-public.py     # regenerate public/site/
node   public/check-previews.js   # verify every component preview still renders
```

then copy `public/site/` over this repository's root and commit.

## Two guides, on purpose

There is also an **internal** guide (`design-system/styleguide/`) which carries the
reasoning: why a decision was made, what broke, which measurement settled it. That is the
working document for the people building the system.

This site is the one for everyone else — a tenant's designer, a contract developer, an
agency. It carries the rules and the values, not the arguments behind them. The two share
every generated input, so they cannot disagree about a colour or a component's markup.

## Typefaces

**Neue Haas Grotesk Display** is a licensed Monotype typeface. It is served from POST's
Adobe Fonts kit and is **not** redistributed here — you need your own licence to use it in
your own product. If the kit fails to load, the stylesheet falls back to a metric-matched
local face, so layout keeps its line breaks instead of reflowing.

**JetBrains Mono** is used for code and token names, is licensed under the SIL Open Font
License, and ships in `assets/fonts/` with its licence.

## Marks and assets

The POST name, the logotype and the shape library are POST's own marks. Please ask before
using them outside POST and its tenants.
