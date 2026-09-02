# kiln

**English** · [简体中文](./README.zh-CN.md)

A design system for Chinese admin workbenches — the dense, unglamorous screens where the work actually happens.

Every color is a glaze fired in a kiln: **clay** (primary actions and status signals), **teal** (success), **peacock** (info), **amber** (warning). Warm, desaturated, aged, at ease with one another. The mood is a quiet, dense control room — information first, decoration last.

Not a design system for landing pages. One for tools people work in.

---

## Two layers, one glaze

**Workbench** — compact, layered with warm-black shadows, density first. Sidebar, metric strip, toolbar, frozen-column tables, pagination dock, form controls, date panels.

![kiln workbench example page](docs/workbench.png)

**Paper** — the same tokens, reset for whitespace and print. Login, empty states, 404, report covers, release notes, system mail: the surfaces where nobody is working.

![kiln paper-layer example page](docs/paper-login.png)

> Both images are rendered from `examples/*.html` by `npm run screenshots` — never captured by hand. Those same pages are the assertion target of the runtime contract, so the picture, the spec, and the check cannot drift apart.

---

## What this repo is

Three things at once, deliberately:

| | |
|---|---|
| **Source of truth for values** | `tokens/*.css` — consumers `@import tokens/index.css` |
| **Source of truth for rules** | `SKILL.md` + `references/*.md` — read by humans and AI |
| **A Claude Code skill** | the repo root *is* the skill root |

So `git commit` **is** "changing the design system." No sync step, nothing to remember to update on the other side.

```
~/.claude/skills/kiln  ──symlink──>  this repo   (Claude Code)
~/.agents/skills/kiln  ──symlink──>  this repo   (Codex / Droid / opencode)
```

> The spec itself — `SKILL.md`, `references/*.md`, `ADOPTING.md` — is written in Chinese. It is a system *for* Chinese admin interfaces, and its rules lean constantly on Chinese typography, line breaking, and label conventions. The tokens, contracts, and scripts are language-neutral.

---

## Quick start

### Let your AI install it

Don't read this file first. Paste this whole block to Claude Code / Codex / Droid inside your project:

```text
Install the kiln design system (a Chinese admin UI spec). Three steps:

1. If ~/kiln doesn't exist: git clone git@github.com:wensia/kiln.git ~/kiln
2. Create both symlinks — a missing one silently blinds that agent:
   mkdir -p ~/.claude/skills ~/.agents/skills
   ln -s ~/kiln ~/.claude/skills/kiln
   ln -s ~/kiln ~/.agents/skills/kiln
3. Symlinks only register on session restart, so for now read ~/kiln/SKILL.md
   directly, and ~/kiln/references/*.md as needed. From here on, every UI
   decision in this project follows it.

If this is a Tailwind v4 + shadcn project, also follow ~/kiln/ADOPTING.md to
wire in the tokens and both verification gates.
```

Afterwards, one line starts any session:

> **Load the kiln skill first — all UI follows it.**

Put that line in the project's `CLAUDE.md` / `AGENTS.md` as well: a rule catches what an untriggered skill misses.

**Verify it took: ask the agent "what is kiln?"** If it can't answer, the symlink didn't land — and nothing will ever raise an error. The agent will calmly write the entire page from generic taste instead.

### As a token source

```css
/* your index.css */
@import "kiln/tokens/index.css";
```

Or copy `tokens/*.css` over whole. **Never retype the values into a doc or a snippet** — that is how a second source of truth is born.

To land it in a real codebase, follow **[ADOPTING.md](./ADOPTING.md)**: the full path reverse-engineered from one real migration (React + Vite + Tailwind v4 + shadcn, a dozen pages, 20k+ lines), with two copy-paste verification scripts and an inventory of traps the eye cannot catch.

### Verify

```bash
npm run verify           # static: token contract, spec-table mirror, no values in prose
npm run verify:examples  # rendered: runtime contract against examples/workbench.html
npm run verify:paper     # layout: real pixels of examples/paper-login.html
npm run screenshots      # regenerate the images in this README
```

---

## Values live in exactly one place

This system broke once, and the shape of the break is worth keeping.

The canvas color had **three** different values at the same time — one in the readme, one in `SKILL.md`, a third in `colors.css`. Anyone implementing from prose got a wrong color, and only the eye could catch it.

Worse was **partial specification**. The table gave values for colors but only names and intent for shadows, so implementers had to *invent* the shadows — and an invented value is indistinguishable from a looked-up one until it renders. Six shadows, all wrong.

> A spec that gives values for some things and not others is **more** dangerous than one that gives none. Where values exist you assume you can look them up; where they don't, you start inventing.

Hence three tiers:

| Tier | May carry values |
|---|---|
| `tokens/*.css` | **yes** — the machine source of truth |
| `references/tokens.md` | **yes**, but only as a *mirror* of the CSS, checked by `scripts/verify.mjs` |
| `SKILL.md`, this README, all other prose | **no** — name the token, explain the why |

`npm run verify` fails on any violation, and a pre-commit hook runs it.

> Hosted Claude Design projects are an optional *downstream*: useful for showing components to non-engineers, never a source of truth. Distribution is git and npm.

---

## Two gates, because prose cannot hold itself

In that migration, **not one real bug was found by reading code.**

**1. Token contract (build time)** — every contract token defined, nothing invented, no raw hex in product code, no Tailwind palette literals (`bg-green-100`), no factory shadows (`shadow-sm` and friends are cold black), no page-specific hardcoded heights.

**2. Rendered-style contract (runtime)** — drives real pages and asserts what the browser *computed*: the radius ladder, control heights, at most one clay action per viewport, white cards layered by shadow rather than border, every shadow warm-black, the font stack, type-size bounds, tables ruled horizontally only.

**The second gate is the only thing that catches composition errors.** A translucent surface is context-dependent: move it off the canvas it was designed on and into a white card, and its contrast quietly collapses — while every token and every class name still looks correct.

Cover every page and every tab. **An assertion that never runs is worse than no assertion** — it makes you believe something is protected.

---

## Layout

```
kiln/
├── SKILL.md                     # skill entry: routing, intent, craft rules, anti-patterns
├── references/
│   ├── tokens.md                # spec table (a mirror of the CSS, machine-checked)
│   ├── components.md            # component specs, states, QA
│   ├── layouts-and-pages.md     # shell, sidebar (incl. collapsed rail), DataTableDock, blueprints
│   ├── platform-mapping.md      # React/Tailwind, plain CSS, dark mode, mini-program, reuse
│   └── paper.md                 # ★ paper layer: login / empty / 404 / covers / release notes / mail
├── tokens/                      # ★ the only source of truth for values
│   ├── index.css                #   workbench entry — the one file consumers import
│   ├── colors.css  typography.css  spacing.css
│   ├── radius.css  elevation.css   fonts.css  base.css
│   └── paper.css                #   paper layer: NOT pulled in by index.css; load it explicitly
├── contract/tokens.json         # the legal token set (workbench and paper listed separately)
├── evals/evals.json             # skill smoke tests
├── examples/
│   ├── workbench.html           #   workbench demo: target of the runtime contract and README images
│   └── paper-login.html         #   paper demo: target of the layout contract
├── docs/                        # README images — generated by npm run screenshots, never hand-edited
└── scripts/
    ├── verify.mjs               # static: contract + mirror + no values in prose
    ├── verify-examples.mjs      # workbench: structural assertions (computed style)
    ├── verify-paper.mjs         # paper: layout assertions (ink ratio and hue clusters, by pixel)
    ├── screenshots.mjs          # renders the README images from the demo pages
    ├── lib/runtime-contract.mjs # ★ the single source of rendered assertions (demos + host template)
    └── templates/               # host-project templates: they name pages, the rules come from lib
```
