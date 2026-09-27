# kiln — Design Tokens

Use these tokens when designing or implementing the kiln workbench visual language. Prefer semantic token names over raw hex values in implementation.

## Typography

### Font Family

The primary family is **Noto Sans SC, bundled as a webfont** via the design system's `tokens/fonts.css` (Google Fonts CDN, weights 400 / 500 / 600). It is used as the CJK family on every platform — macOS/iOS included — so rendering is identical everywhere. Google's CSS subsets by `unicode-range`, so only used glyph ranges download.

The system Chinese font stack below is the **offline / load-time fallback**, kept behind the webfont in the same `--font-sans` token:

```css
-apple-system, "Helvetica Neue", Arial, "Noto Sans SC", "Hiragino Sans GB",
STHeiti, "Microsoft YaHei", "Microsoft JhengHei", "Source Han Sans SC",
"Noto Sans CJK SC", "Source Han Sans CN", "Source Han Sans TC",
"Noto Sans CJK TC", SimSun, sans-serif
```

For fully offline / self-hosted targets: place `noto-sans-sc-{400,500,600}.woff2` locally, replace the CDN `@import` with `@font-face` rules pointing at the local files, and keep the family name `"Noto Sans SC"` so the fallback stack is untouched.

Do not add any other webfont (display faces, serifs, rounded faces) without an explicit brand requirement.

### Type Scale

| Token | Value | Weight | Use |
| --- | --- | --- | --- |
| `--text-page-title` | `15px` | `600` | Page titles, workbench headers (15-16px) |
| `--text-section-title` | `14px` | `600` | Panel titles, section titles |
| `--text-body` | `13px` | `400-500` | Tables, body copy, controls |
| `--text-meta` | `12px` | `400-500` | Labels, help text, table headers, timestamps |
| `--text-tiny` | `11px` | `400` | Very low-priority metadata |
| `--text-data` | `22px` | `600` | KPI numbers, money summaries (real dashboards only) |

### Line Height

| Token | Value | Use |
| --- | --- | --- |
| `--leading-tight` | `1.25` | Titles, buttons, compact labels |
| `--leading-normal` | `1.45` | Default text and tables |
| `--leading-relaxed` | `1.6` | Help text and short empty-state descriptions |

Rules:

- Use tabular figures for numbers, money, pagination, dates, and counts (`--font-feature-tabular: "tnum" 1, "lnum" 1`).
- Keep Chinese letter spacing at `0`.
- Use 13px for table cells and 12px / 600 for table headers.
- Do not make ordinary admin page titles larger than 16px.
- Normal 13-14px text defaults to 400; selected/active stops at 500 — express state with color and indicators, not heavier weight. 600 is for titles and the solid-clay active nav plate.

## Color

### Base Palette

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| White | `--palette-white` | `#FFFFFF` | Main surface: cards, panels, tables, popovers, sidebar, topbar |
| Clay | `--palette-clay` | `#B6533C` | Primary: key action, selected, focus, destructive |
| Canvas | `--palette-canvas` | `#FBFAF8` | Page background (near-white warm) |
| Surface | `--palette-surface` | `#F1EEE9` | Muted feedback surfaces (hover/selected feedback only) |
| Line | `--palette-line` | `#D8D3CC` | Strong border (inputs / necessary separation only) |
| Ink | `--palette-ink` | `#2F2F2F` | Main text, solid button |
| Teal | `--palette-teal` | `#3E8C7D` | Success, valid, positive |
| Peacock | `--palette-peacock` | `#2E6E79` | Info, sync, external integration |
| Amber | `--palette-amber` | `#BE7C32` | Warning, pending, low inventory |

### Semantic Tokens

| Token | Light Value | Use |
| --- | --- | --- |
| `--background` | `#FBFAF8` | Main workbench canvas |
| `--foreground` | `#2F2F2F` | Primary text |
| `--card` / `--popover` | `#FFFFFF` | Cards, popovers, table surface |
| `--muted` | `#F1EEE9` | Muted feedback, quiet table headers |
| `--muted-foreground` | mixed ink | Secondary text |
| `--primary` | `#B6533C` | The single key action; current/selected state, active filter, focus, error/destructive signal |
| `--primary-subtle` | clay 10% + white | Primary tint |
| `--solid` | `#2F2F2F` | Ordinary filled button |
| `--success` | `#3E8C7D` | Success (`--success-bg` = teal 12% + white) |
| `--info` | `#2E6E79` | Info (`--info-bg` = peacock 12% + white) |
| `--warning` | `#BE7C32` | Warning (`--warning-bg` = amber 13% + white) |
| `--destructive` | `#B6533C` | Delete, invalid, danger (`--destructive-bg` = clay 11% + white) |
| `--border` | `#EFECE7` | Default (faint) border |
| `--border-visible` | `#D8D3CC` | Stronger border |
| `--input` | `#DCD7D0` | Input border |
| `--ring` | `#B6533C` | Focus ring |

### Tag Glaze Tokens

`tokens/tags.css` owns this component palette. The anchors below stay unchanged in light and dark contexts; each tone has its own background, border, foreground, and hover tokens. Tag text uses the derived foreground, not the anchor itself. These tokens do not replace the global status tokens above.

| Tone | Anchor token | Value | Use |
| --- | --- | --- | --- |
| Neutral | `--tag-neutral` | `var(--palette-muted-ink)` | Uncategorized attributes and quiet metadata |
| Teal | `--tag-teal` | `var(--palette-teal)` | Success states or a consistently assigned category |
| Peacock | `--tag-peacock` | `var(--palette-peacock)` | Info states or a consistently assigned category |
| Blue | `--tag-blue` | `#5276A4` | Category identity |
| Amber | `--tag-amber` | `var(--palette-amber)` | Warning states or a consistently assigned category |
| Olive | `--tag-olive` | `#7D8650` | Category identity |
| Rose | `--tag-rose` | `#AF657D` | Category identity |
| Clay | `--tag-clay` | `var(--palette-clay)` | Danger / destructive states or a consistently assigned category |

For each `{tone}` above, the following table mirrors the exact sRGB derivation. `tone` means `var(--tag-{tone})`, `white` means `var(--palette-white)`, `ink` means `var(--palette-ink)`, and `night` means `var(--palette-dark-surface)`. The omitted second percentage is the remainder to 100%, as in CSS `color-mix`.

| Token family | Light value | Dark value | Use |
| --- | --- | --- | --- |
| `--tag-surface` | `var(--palette-white)` | `var(--palette-dark-surface)` | Opaque outline-tag surface |
| `--tag-{tone}-bg` | tone 14% + white | tone 25% + night | Soft default surface |
| `--tag-{tone}-border` | tone 32% + white | tone 50% + night | Whole thin boundary |
| `--tag-{tone}-fg` | tone 58% + ink | tone 42% + white | Readable label, state dot, and selected border |
| `--tag-{tone}-hover` | tone 22% + white | tone 32% + night | Interactive hover and selected surface |

The concrete families are `--tag-neutral-*`, `--tag-teal-*`, `--tag-peacock-*`, `--tag-blue-*`, `--tag-amber-*`, `--tag-olive-*`, `--tag-rose-*`, and `--tag-clay-*`, each with `bg`, `border`, `fg`, and `hover` suffixes. `.dark` and `[data-theme="dark"]` activate the dark derivations together with the global dark theme in `tokens/dark.css` (see Dark Theme Tokens).

Normal tag text must reach at least 4.5:1 against its rendered surface in both themes and in hover/selected states. A transparent `status` variant is checked against its actual ancestor surface. Disabled controls are assessed separately. Stable category assignments and state mappings live in [Badge / Status / Tag](components.md#badge--status--tag); the interactive reference is [examples/tags.html](../examples/tags.html).

### Table Surface Tokens

| Token | Light Value | Use |
| --- | --- | --- |
| `--table-header` | muted 94% + card | Quiet header surface |
| `--table-header-border` | border 86% + card | Header bottom seam |
| `--table-row-alt` | muted 24% + card | Zebra row (even) |
| `--table-row-hover` | muted 72% + card | Row hover |
| `--table-row-selected` | primary 10% + card | Row selected |

The four row-state values are tokens for one reason beyond reuse: **a frozen column has to repaint them itself.** A sticky cell needs its own opaque background (otherwise the columns scrolling underneath show through), so it cannot inherit the row's. It must therefore consume the exact same values the row does, or the highlight visibly stops at the frozen edge. Every value here mixes into `--card` — never into `transparent` — for the same reason. See the frozen-column background rule in `components.md`.

### Sidebar Tokens

| Token | Light Value | Use |
| --- | --- | --- |
| `--sidebar` | `#FFFFFF` | Sidebar background |
| `--sidebar-foreground` | `#2F2F2F` | Sidebar text and icons |
| `--sidebar-primary` | `#B6533C` | Active nav item background |
| `--sidebar-primary-foreground` | `#FFFFFF` | Active nav item text and icons |
| `--sidebar-accent` | surface 70% + white | Hover background |
| `--sidebar-accent-foreground` | `#2F2F2F` | Hover text and icons |
| `--sidebar-border` | `#EFECE7` | Sidebar border |
| `--sidebar-ring` | `#B6533C` | Focus ring |

### Topbar Token

| Token | Light Value | Use |
| --- | --- | --- |
| `--topbar` | white 82% + transparent | Sticky topbar: translucent white + backdrop blur + 1px bottom border + white top highlight |

### Chart Tokens

| Token | Color | Use |
| --- | --- | --- |
| `--chart-1` | clay | Main series |
| `--chart-2` | teal | Valid, success |
| `--chart-3` | peacock | Info, sync |
| `--chart-4` | amber | Warning, pending |
| `--chart-5` | muted ink | Auxiliary series |

### Dark Theme Tokens

`tokens/dark.css` ships the dark theme ("夜窑"): the same vessel fired at night, not an inverted page. It activates on `.dark` or `[data-theme="dark"]` — on the root element or on any local container, because the file re-declares every derived token instead of relying on root-level `var()` recomputation. Deciding **when** to turn it on (a user setting, `prefers-color-scheme`) is the host's job; kiln only supplies the look.

The dark palette is always defined on `:root`, so a host that owns an extra accent can point it at the matching dark glaze.

| Token | Value | Role in dark |
| --- | --- | --- |
| `--palette-dark-canvas` | `#16120F` | Page canvas — the deepest step |
| `--palette-dark-surface` | `#1D1915` | Main surface: cards, panels, tables, sidebar, topbar |
| `--palette-dark-raised` | `#24201C` | Floating layer: popover, dropdown, dialog, toast |
| `--palette-dark-fill` | `#2A2622` | Muted fill: hover, selected, quiet wells |
| `--palette-dark-line` | `#49443F` | Strong border: inputs and necessary dividers |
| `--palette-dark-ink` | `#EBE5DE` | Primary text — warm off-white, never pure white |
| `--palette-dark-muted-ink` | `#A39D97` | Secondary text (6.5:1 on the main surface) |
| `--palette-dark-clay` | `#DE816B` | Clay glaze, lightened in OKLCH |
| `--palette-dark-teal` | `#69B5A5` | Teal glaze, lightened in OKLCH |
| `--palette-dark-peacock` | `#6EB1BD` | Peacock glaze, lightened in OKLCH |
| `--palette-dark-amber` | `#E09E5B` | Amber glaze, lightened in OKLCH |
| `--palette-dark-solid` | `#B4ACA5` | Ordinary solid command fill — one step below ink |
| `--palette-dark-boundary` | `#7D756D` | Control-identifying outline in dark (3:1 on every dark surface step) |

Dark rules:

- **Surfaces step up in lightness toward the user**: canvas < surface < raised; fill is the interaction wash. In the dark, elevation reads as "lighter", not as "more shadow".
- **Glazes are lightened in OKLCH, keeping hue; chroma is only trimmed slightly** (clay drops from about .134 to .120, the other three stay within about .005). Mixing them with white turns clay pink and teal chalky. Every dark glaze reaches at least 5.3:1 on every dark surface step.
- **Filled primary and solid actions flip their foreground to the dark canvas.** A lightened clay plate with white text fails contrast (under 3:1); dark text on it clears 6:1. `--solid` becomes a warm stone one step below ink, so ordinary commands keep their weight without turning into the brightest spot on the page; its hover stays neutral and never picks up the brand hue.
- **Separation moves from shadow to surface steps plus a hairline.** The dark `--shadow-card`, `--shadow-card-hover`, and `--shadow-popover` each open with `0 0 0 1px` of warm off-white at 5–8% alpha, so white-surface-borderless components stay borderless and still separate. The shadow color stays warm black, only deeper.
- `--shadow-input` drops the inner top highlight; on a dark field it reads as a grey bevel.
- `color-scheme: dark` is set in the same selector so native scrollbars and form controls follow.
- Status backgrounds (`--success-bg` and friends) mix the dark glaze 15–16% into the main surface. Table row states keep the light formulas over the dark `--muted` / `--card` / `--primary`.

### Brand Inputs

A host changes its brand through three inputs only. kiln resolves them into the primary roles at each theme boundary (`:root` in `tokens/colors.css`, `.dark` / `[data-theme="dark"]` in `tokens/dark.css`), so every derived role stays paired.

| Input | Light default | Dark default | Resolves into |
| --- | --- | --- | --- |
| `--kiln-brand-fill` | `var(--palette-clay)` | `var(--palette-dark-clay)` | `--primary`, `--sidebar-primary`, `--primary-subtle` |
| `--kiln-brand-on-fill` | `var(--palette-white)` | `var(--palette-dark-canvas)` | `--primary-foreground`, `--sidebar-primary-foreground` |
| `--kiln-brand-text` | `var(--palette-clay-deep)` | `var(--palette-dark-clay)` | `--primary-text`, `--ring`, `--sidebar-ring` |
| `--kiln-brand-fill-hover` | fill 88% + ink | fill 88% + dark solid | `--primary-hover` |

- `--primary` is the **fill**; `--primary-text` is for links, active labels, and small emphasis. Do not set text in `--primary`: a glaze that works as a fill is often too light for small text on its own subtle tint.
- A host brand must be declared in **both** scopes — once for light and once inside `.dark` / `[data-theme="dark"]` — or the light value pins the dark theme. Choose the on-fill per brand: lighter glazes such as teal and amber need a dark on-fill in light mode as well.
- Deep text anchors for light brands: `--palette-clay-deep` (`#9B4C39`), `--palette-teal-deep` (`#326C60`), `--palette-amber-deep` (`#87551F`); each reaches 4.5:1 on white and on its own subtle tint.
- Hover moves **away from the on-fill**: a white on-fill darkens toward ink (the default); a dark on-fill (teal, amber in light) must override `--kiln-brand-fill-hover` to mix toward white, or hover contrast drops below 4.5:1.
- Brand never drives status: `--destructive` stays clay and `--success` / `--warning` keep their glazes whatever the brand is.

### Control Boundary And Segments

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--control-boundary` | `#8B837B` | `var(--palette-dark-boundary)` | Outline that identifies a control: unchecked checkbox / radio, the underline of an unlabeled inline input. At least 3:1 against canvas, surface, and fill. `--input` stays the soft field edge and carries no identification duty. |
| `--segment-track-bg` | muted 40% + transparent | same formula | SegmentedControl / button-tab track |
| `--segment-hover-bg` | foreground 3% + transparent | same formula | Inactive segment hover |
| `--segment-active-bg` | `var(--card)` | foreground 8% + transparent | Active plate — lighter than the track on any container |
| `--segment-active-fg` | `var(--primary-text)` | `var(--foreground)` | Active label |
| `--segment-active-mark` | `transparent` | `var(--primary-text)` | Selection mark (a short bar or check) — required in dark, where plate and hover differ only slightly |
| `--segment-active-shadow` | `var(--shadow-card)` | hairline ring | Active plate separation |

Do not rely on the small lightness step between active and hover to carry selection in dark; the mark and `aria-selected` / `aria-pressed` carry it. An active segment on hover keeps the active plate.

Color rules:

- Use semantic classes such as `bg-background`, `bg-card`, `bg-muted`, `border-border`, `text-muted-foreground`, `bg-solid`, `bg-primary`, `bg-success`, `bg-info`, and `bg-warning`.
- Clay red (`--primary`) carries two jobs, and only these two: **(1) the single key action of a flow** — e.g. the "新建…" entry on a resource-management page, the one clay-filled button in the viewport; **(2) state and signal** — current navigation or tab state, selected state, focus ring, active filter state, date range endpoints, required/error/destructive semantics, and small values or marks that need operational attention.
- Use ink black (`--foreground` / `--solid`) for default content and ordinary filled commands — Save, Confirm, Generate, secondary submits — so clay stays scarce and recognizable.
- At most one clay-filled action per viewport. When a viewport contains both an ordinary submit and a stateful signal, keep the submit ink-solid and reserve clay for the selected/active/focus/error signal. If everything is red, nothing reads as state.
- Beyond the single key action, prefer primary text, a thin whole border/ring, or a subtle tint for selected and active states over clay fills, unless the component spec explicitly calls for `bg-primary` (active nav plate, selected date endpoints).
- Do not use local purple, Tailwind emerald/amber/sky status colors, or naked hex in business UI.
- Apply status color to dots, values, whole thin borders/rings, or subtle tints (`--success-bg` / `--info-bg` / `--warning-bg` / `--destructive-bg`). Tags and badges use the corresponding `--tag-{tone}-bg` / `-border` / `-fg` family so small text gets its own readable foreground. A soft clay danger badge is allowed; avoid heavy row fills or opaque primary tag fills.
- Category tags may use the additional blue, olive, and rose tag tones with stable assignments. These category colors do not change the global success, info, warning, or destructive meanings.
- Do not use status color as a one-sided border accent by thickening or tinting only `border-left`, `border-right`, `border-top`, or `border-bottom`. One-sided borders are allowed only for real structural edges such as frozen columns, split panes, timelines, or table dividers.

## Spacing

| Token | Value | Use |
| --- | --- | --- |
| `--space-0.5` | `2px` | Optical adjustment |
| `--space-1` | `4px` | Tiny gap, state dot |
| `--space-2` | `8px` | Icon + label, compact group |
| `--space-3` | `12px` | Field rhythm, toolbar group |
| `--space-4` | `16px` | Card padding, section gap |
| `--space-6` | `24px` | Main page sections |
| `--space-8` | `32px` | Large blocks, empty states |
| `--space-12` | `48px` | Large canvas context |

Fixed sizes:

| Token | Value | Use |
| --- | --- | --- |
| `--tag-height` | `24px` | Default static Tag |
| `--tag-height-sm` | `20px` | Compact static Tag / Badge |
| `--tag-dot-size` | `6px` | Leading state dot in a status marker |
| `--nav-item-height` | `36px` | Sidebar nav item |
| `--table-row-height` | `48px` | Data table row baseline (the DS `Table` component renders airy 52px rows with 16px cell padding — both are sanctioned; do not go below 48px) |
| `--table-pagination-height` | `40px` | Pagination strip (a tertiary strip: 32px controls plus breathing room). Anything computing a table's fitted height must consume this, not re-derive it from a control height. |
| `--toolbar-control` | `32px` | Compact toolbar control (32-36) |
| `--control-height` | `36px` | Default button, input, select |
| `--control-height-sm` | `32px` | Small button, inline control, selectable/linked/removable Tag and its remove target |
| `--search-width` | `320px` | Default search field width; shrink to fit narrower containers |
| `--field-rhythm` | `12px` | Form field gap (8-12) |

## Radius

| Token | Value | Use |
| --- | --- | --- |
| `--radius-control` | `4px` | Buttons, inputs, nav items, Tags and Badges |
| `--radius-card` | `6px` | Card, popover, dialog |
| `--radius-panel` | `8px` | Large panel, resource card |
| `--radius-pill` | `999px` | Circular state dots and explicitly documented pill exceptions |

Rules:

- Controls use 4px.
- Cards and popovers use 6px.
- Large panels and resource cards use at most 8px.
- Exact 4/6/8 ladder — never derive fractional pixels from a multiplier.
- Tags and status badges use `--radius-control`; the component's tag/chip name alone does not authorize a pill. Its state dot uses `--radius-pill`.
- Avoid radius above 12px except for explicit device previews or special panels.

shadcn bridge (from the DS `tokens/radius.css`): `--radius: 0.375rem`, `--radius-sm/md: 0.25rem`, `--radius-lg: 0.375rem`, `--radius-xl: 0.5rem` — i.e. `rounded-md` → controls 4px, `rounded-lg` → cards 6px, `rounded-xl` → panels 8px.

## Elevation

Separation doctrine: **whitespace + soft warm shadows first; borders only when necessary.** White cards, tables, and metric blocks are borderless and float on the near-white canvas via `--shadow-card`; hover raises to `--shadow-card-hover` (resource cards) instead of changing border color. Faint borders (`--border` `#EFECE7`) appear only where scanning or structure demands: form inputs, table row dividers, sidebar/topbar seams. Shadow color is warm black `rgba(54, 47, 42, ·)` — never cold slate.

Values mirror `tokens/elevation.css`. Keep a check that fails when the two disagree.

> This table used to list only names and purposes while the colour table listed hex. That gap is not
> a small omission — whoever implements the shadows then has to **invent** them, and an invented value
> is indistinguishable from a read one until someone renders the page. (It produced six wrong shadows
> in a real port: `--shadow-primary-focus` was guessed as `0 0 0 3px`, and `--shadow-topbar` was
> guessed as an `inset`.) Either give the value or point at the token; never leave a gap that looks
> like a spec.

| Token | Value | Use |
| --- | --- | --- |
| `--shadow-xs` | `0 1px 2px rgba(54,47,42,.05)` | Low-noise controls and light cards |
| `--shadow-card` | `0 2px 8px rgba(54,47,42,.06), 0 1px 2px rgba(54,47,42,.04)` | Resting separation for white cards / tables / metric blocks. Also the raised active segment of a button-tab / SegmentedControl. |
| `--shadow-card-hover` | `0 6px 18px rgba(54,47,42,.09), 0 2px 5px rgba(54,47,42,.05)` | Resource card hover lift |
| `--shadow-input` | `0 1px 2px rgba(54,47,42,.04), inset 0 1px 0 rgba(255,255,255,.7)` | Input micro-shadow (1px ambient + inner top highlight) |
| `--shadow-primary-focus` | `0 0 0 1px color-mix(in srgb, var(--primary) 18%, transparent), 0 10px 24px color-mix(in srgb, var(--foreground) 8%, transparent)` | Primary focus state |
| `--ring-focus` | `0 0 0 1px var(--primary)` | Bare focus ring |
| `--shadow-popover` | `0 8px 28px rgba(54,47,42,.12), 0 2px 6px rgba(54,47,42,.07)` | Menu, dialog, popover |
| `--shadow-topbar` | `0 1px 0 rgba(255,255,255,.72)` | Topbar top highlight (**not** an inset) |
| `--shadow-sticky-edge` | light `rgba(54,47,42,.12)` · dark `rgba(0,0,0,.45)` | Frozen-column scroll shadow color (a single low-alpha edge color, not a full box-shadow) |

`--shadow-sticky-edge` is a flat color consumed by a gradient, not a `box-shadow` list — a `box-shadow` on a `<td>` is dropped under `border-collapse` and would silently never render. Keep it quiet and **warm**: light `rgba(54, 47, 42, 0.12)`, dark `rgba(0, 0, 0, 0.45)`. It signals "more content this way," so it must read at a glance without competing with the data. See the frozen-column rules in `components.md`.

## Motion

| Use | Duration | Properties |
| --- | --- | --- |
| Hover / focus | `120-150ms` | color, background, border, box-shadow |
| Tab underline / popover | `150-200ms` | color, opacity, small transform, height |
| Sheet / dialog | `200-300ms` | opacity, scale or translate |

Core interface transitions stay in the 120-200ms ease band and act only on background, color, border, shadow, and the tab underline / metric marker. Overlays (sheet/dialog) may extend to 300ms. Avoid spring, bounce, parallax, scroll-jacking, hover scale, glow indicators, and decorative infinite loops.

## Icons

- Use Lucide outline icons, ~1.8px stroke, round caps/joins.
- Sidebar nav icon: 18px.
- Toolbar / inline icon: 14-16px (icon buttons default 16px).
- Menu item icon: 15-16px, muted.
- Brand mark: 32px.
- Icons inherit text color — muted by default, canvas-colored on the active clay nav plate.
- Do not use filled or multicolor UI icons.
- Icons must be functional: navigation identity, control affordance, status recognition, or action discovery.
- Do not use icons as decoration in compact metric, statistic, summary, or filter strips when typography, spacing, dividers, and semantic color already communicate the hierarchy.
- No emoji, no PNG sprite icons, no hand-drawn decorative SVG.
