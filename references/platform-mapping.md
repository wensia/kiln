# kiln — Platform Mapping

Use this file when implementing or porting the design system across platforms.

## React / Tailwind

Prefer semantic tokens:

```tsx
<section className="rounded-lg bg-card text-card-foreground shadow-card">
  <h2 className="text-[var(--text-section-title)] font-semibold">标题</h2>
</section>
```

Rules:

- Use `bg-background`, `bg-card`, `bg-muted`, `border-border`, `text-muted-foreground`, `bg-solid`, `bg-primary`, and status tokens.
- White cards/panels/metric blocks are borderless by default and separate via `shadow-card`; add `border-border` only for inputs, table row dividers, and structural seams.
- Use token-backed sizing where useful: `h-[var(--control-height)]`, `rounded-[var(--radius-control)]`.
- Keep the radius ladder aligned with the source product: controls use 4px, ordinary cards/popovers/dialogs use 6px, and large panels/resource cards use at most 8px.
- In Tailwind implementations, map `rounded-md` to the control radius (4px), `rounded-lg` to the card radius (6px), and `rounded-xl` or larger utilities to the panel cap (8px). Do not use `rounded-2xl` or larger visual language unless it is an explicit device preview or special panel.
- If shadcn or a preset ships fixed slot radii, add shared slot-level overrides for common primitives instead of fixing radius page by page: buttons, inputs, textareas, select triggers, tabs, cards, popovers, dialogs, badges, and dropdown menus should all resolve back to the same 4 / 6 / 8px ladder.
- If an existing shadcn button component maps its `default` variant to `bg-primary`, change `default` to solid/ink and add an explicit `primary` variant for the flow's single key action and for selected/current/active/focus-like filled states. Then audit business code: ordinary Save/Confirm/Generate actions stay default; the one key action per page (e.g. the one "新建…" entry on a management page), selected tabs, active filters, date endpoints, and current-state buttons use `primary`.
- If an existing shadcn button component maps `ghost` to transparent text with only hover affordance, change it to a neutral soft surface for admin/workbench use, or ban it from page, toolbar, detail, edit, follow-up, call, close, and reset actions. A visible standalone command should have a weak border, subtle muted background, or a deliberate inline-link treatment before hover. Do not force that resting surface onto contextual quiet controls defined in `components.md`, including the shell topbar return action and embedded input icons. Use a scoped chrome/quiet variant or modifier: transparent background/border at rest, no resting shadow for shell return chrome, and a muted hover surface; preserve the product's focus policy.
- Map icon sizes by their action group. A detail-header more trigger uses `size="icon"` beside `size="default"` text actions; both consume `--control-height`. Keep `size="icon-sm"` with `--control-height-sm` for explicitly compact groups such as table operation cells, not for every dropdown trigger.
- Repeated class groups become shared components or class constants.
- Do not use naked hex values in business pages.
- Do not copy shadcn internals into business pages.
- Use DataTableDock for table scrolling, frozen columns, and pagination.
- Use shared DropdownMenu for row action menus.

For a detail header, keep menu behavior independent from trigger size and surface:

```tsx
<div className="flex items-center gap-[var(--space-2)]">
  <Button variant="outline" size="default" onClick={sell}>出售</Button>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="更多操作">
        <MoreHorizontal aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>{/* Record actions */}</DropdownMenuContent>
  </DropdownMenu>
</div>
```

The shell return button uses the host's shared chrome treatment from [Icon Button](components.md#shell-navigation-chrome), outside this business-action group. Verify transparent rest styling on the actual shell button and equal outer heights for the detail actions; an icon centered inside a shorter button does not satisfy the height rule.

### Tag / Badge mapping

Keep form and tone as separate inputs in a shared primitive: `variant="soft" | "outline" | "status"`, `tone="neutral" | "teal" | "peacock" | "blue" | "amber" | "olive" | "rose" | "clay"`, and a static default or compact size. The contract is in [Badge / Status / Tag](components.md#badge--status--tag); [`examples/tags.css`](../examples/tags.css) is the plain CSS implementation and [`examples/tags.html`](../examples/tags.html) is the interactive reference.

For plain HTML, load the kiln tokens and the reference stylesheet, then declare form and tone directly:

```html
<span class="tag" data-variant="soft" data-tone="blue">
  <span class="tag-label">线上咨询</span>
</span>
<span class="badge" data-variant="status" data-tone="teal">
  <span class="tag-dot" aria-hidden="true"></span>
  <span class="tag-label">已完成</span>
</span>
```

For Tailwind, map all eight token families in the host's existing theme bridge, or select them through a static map of component-private `--_tag-*` slots. Both approaches reference the same upstream tokens without copying their values. The blue family illustrates the theme-bridge pattern; each other tone receives the same suffix mappings:

```css
@theme inline {
  --color-tag-surface: var(--tag-surface);
  --color-tag-blue-bg: var(--tag-blue-bg);
  --color-tag-blue-border: var(--tag-blue-border);
  --color-tag-blue-fg: var(--tag-blue-fg);
  --color-tag-blue-hover: var(--tag-blue-hover);
}
```

- A soft blue tag consumes `bg-tag-blue-bg border-tag-blue-border text-tag-blue-fg`; outline replaces its background with `bg-tag-surface`. Status uses a transparent surface/border plus the text tone and a `--tag-dot-size` dot. Define class choices in a static tone map so the Tailwind scanner sees every class; do not construct utility names from an unchecked string at runtime.
- Use `h-[var(--tag-height)]` for a static Tag and `h-[var(--tag-height-sm)]` for a compact Badge. Text, weight, leading, font, and radius map to `--text-meta`, `--weight-medium`, `--leading-tight`, `--font-sans`, and `--radius-control`. Interactive and removable compositions use `--control-height-sm`, including the remove button's target box.
- Selection uses `aria-pressed`, the tone's `-hover` surface, its `-fg` border, and a stable check slot. Removal belongs to a separate named button inside a non-button tag container. Preserve the host's focus policy and use its shared ring mapping for `--ring-focus`.
- Carry the dedicated `-fg` token through the shared component instead of substituting `text-success`, `text-warning`, or the base tag hue. Verify normal text at 4.5:1 against the rendered light/dark, hover, and selected surfaces; assess disabled controls separately. The tag dark overrides respond to `.dark` / `[data-theme="dark"]` without supplying a global dark theme.
- Retain established Badge variant names through a shared adapter: `default` / `secondary` / `neutral` → soft neutral; `outline` → outline neutral; `success` → soft teal; `info` → soft peacock; `warning` → soft amber; existing `danger` / `destructive` → soft clay. Preserve business meaning and avoid forcing every existing caller to change. New callers can select form and tone independently.
- Resolve explicit `tone` before the legacy variant's inferred tone, and derive the form independently. Generate one resolved tone's classes so two competing CSS variable sets cannot make cascade order choose the color. Preserve the host's extra aliases, slot/ref/event forwarding, accessibility attributes, and supported class overrides. A CSS pseudo-element may render the decorative status dot when adding a sibling would break an `asChild` single-child slot.
- Size removable compositions in the shared component, including legacy `span` + button callers. An explicit remove slot or a selector scoped to the badge's direct remove button can apply `--control-height-sm` to the container and both target dimensions, neutralize conflicting compact button sizing, and keep the target visible. Put text truncation on the label; do not let the badge's static `overflow-hidden` rule crop the remove target or focus feedback. Keep these rules inside the Tag component rather than styling unrelated containers by element type.
- Plain CSS retains `.badge-success`, `.badge-info`, `.badge-warning`, and `.badge-danger` as compatibility tone aliases. Component-private `--_tag-*` slots select existing tokens; they are not new global design tokens or permission to invent local values.
- Audit semantic callers after updating the shared adapter: old `default` / `secondary` choices may conceal distinct completed, pending, and neutral business states. Put the named mapping in one product presentation helper and reuse it across views; see [Business meaning](components.md#business-meaning). Verify one real consuming page and the installed package, not only the standalone gallery.

### Focus policy mapping

All focus mappings below assume the default `keyboard` policy. When a product explicitly chooses the `managed-navigation` policy from `SKILL.md`, wire it once at the application root instead of adding per-control `tabIndex` patches, blurring controls, or stripping selection state. Three listeners carry the policy: a bubble-phase editor-boundary guard for `Tab`, a capture-phase region key, and a pointer listener that returns to pointer mode.

```ts
const EDITOR = '[contenteditable]:not([contenteditable="false"]), [data-focus-editor]'
const setMode = (mode: "pointer" | "keyboard") => { document.documentElement.dataset.focusMode = mode }

// Bubble phase: editors and components handle Tab first.
document.addEventListener("keydown", event => {
  if (event.key !== "Tab" || event.defaultPrevented) return
  if (event.target instanceof Element && event.target.closest(EDITOR)) event.preventDefault()
  else setMode("keyboard") // native traversal between shell controls
})

// Capture phase: region entry, skipped during IME composition.
document.addEventListener("keydown", event => {
  if (event.key !== "F6" || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
  event.preventDefault()
  setMode("keyboard")
  moveFocusRegion(event.shiftKey ? -1 : 1) // cycles visible [data-focus-region] elements
}, true)

document.addEventListener("pointerdown", () => setMode("pointer"), true)
```

`moveFocusRegion` scopes itself to the topmost open modal (`[role="dialog"][aria-modal="true"]` or the host dialog's content slot) when one exists, and falls back to the modal's focusable elements when it declares no regions. On entry it restores the region's last valid focus, recorded from `focusin`, and otherwise focuses the region's first focusable element. Editors re-enter through their own focus API, such as a ProseMirror `view.focus()`, so the selection survives.

```css
:root:not([data-focus-mode="keyboard"]) {
  --ring: transparent;
  --sidebar-ring: transparent;
  --ring-focus: 0 0 0 0 transparent;
  --shadow-primary-focus: 0 0 0 0 transparent;
}
:root:not([data-focus-mode="keyboard"]) :focus,
:root:not([data-focus-mode="keyboard"]) :focus-visible { outline: none; }

:root[data-focus-mode="keyboard"] :focus-visible:not([contenteditable]:not([contenteditable="false"]), [data-focus-editor]) {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
:root[data-focus-mode="keyboard"] :is([contenteditable]:not([contenteditable="false"]), [data-focus-editor]):focus { outline: none; }
```

Keep the source Kiln tokens unchanged: keyboard mode lets the Kiln ring and `--shadow-primary-focus` values through, and pointer mode is a consumer-root override of focus-only aliases gated by the mode attribute rather than a global `!important`. Zero-length shadows stay valid for consumers that prepend `inset`. Do not suppress `aria-selected`, `aria-current`, `data-state="active"`, or menu highlight states. In keyboard mode, keep the outline from being cropped by `overflow` ancestors, as the ring-composition rule in `SKILL.md` requires.

Platform notes: on macOS, function keys may need `Fn`, and `Ctrl+F6` belongs to the system, so do not depend on it. In a desktop shell such as Tauri, do not add a native menu only to expose the region key, because a custom menu replaces the platform's default Edit menu; document the key in the in-app shortcut help instead.

Verify `F6` / `Shift+F6` cycling in both directions, editor `Tab` commands with focus kept inside the editor, native `Tab` between shell controls, no ring or outline after pointer input, a visible indicator after region entry, containment inside an open modal, and that a clicked text input still accepts text.

### Existing shadcn / Tailwind Migration Checklist

Use this checklist when a project already has many `rounded-*`, `variant="default"`, and local Tailwind utilities:

1. Inspect global CSS/theme variables before editing. Identify the actual mapping for `--radius`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, and any component slot radius tokens.
2. Set the role mapping first, preferably in global tokens: control `4px`, card/popover/dialog `6px`, large panel/resource card `8px`. (The DS bridge: `--radius: 0.375rem`, `--radius-sm/md: 0.25rem`, `--radius-lg: 0.375rem`, `--radius-xl: 0.5rem`.)
3. Make shared primitives consume the role mapping: Button/Input/Textarea/Select/Combobox/SearchInput/Nav item/Badge/Dropdown/Dialog/Popover/Card.
4. Audit utility classes by semantic role:
   - Keep `rounded-md` on controls, nav items, filter chips, compact trigger buttons, and inline action surfaces.
   - Move page headers, metric strips, summary strips, cards, data panels, dialogs, popovers, and import/preview panels to `rounded-lg`.
   - Use `rounded-xl` only for explicitly large panels/resource cards; never use it as a default card radius.
5. Audit filled button color semantics:
   - Ordinary filled command: `bg-solid text-solid-foreground`.
   - The single key action and stateful signals: `bg-primary text-primary-foreground` (at most one clay fill per viewport).
   - Destructive command: destructive variant plus destructive wording/placement/confirmation.
6. Audit weak button semantics:
   - `ghost` is not transparent or hover-only for visible commands.
   - Detail/header actions such as Edit, Follow-up, Call, Close, Reset, Refresh, and toolbar commands have a default-state neutral surface.
   - Local overrides such as `border-transparent`, `text-primary`, or hover-only backgrounds are not used to hide ordinary commands.
   - Embedded input icon controls, such as password visibility toggles, use a scoped quiet modifier: transparent and borderless at rest, muted on hover, with stable dimensions and the active focus policy preserved.
   - Shell topbar return controls use scoped navigation chrome: transparent background and border, no resting shadow, a default icon hit box, and muted hover feedback. Ordinary business-action ghost buttons retain their visible rest surface.
   - Detail-header more triggers match adjacent default text actions through `icon` sizing. Compact table-row sizing stays confined to compact groups.
7. Audit fonts: load the bundled Noto Sans SC webfont (400/500/600) as the primary CJK family with the system stack as fallback; remove competing webfonts.
8. Validate in the browser or with computed styles. Minimum checks: a normal button is 4px and solid/ink, an outline/ghost action is visible at rest, an input/select is 4px, a card/panel/dialog is 6px, cards separate by shadow rather than border, and the key action / active / selected / focus / error state uses primary.
9. If a page still feels inconsistent, sample computed `border-radius`, `background-color`, `border-color`, `font-family`, and dimensions from controls and panels before making more changes. Do not tune by eye alone.

## Design Components (DC / `<x-import>`)

When composing DS bundle components inside a Design Component template:

- The `style` attribute on `<x-import>` positions and sizes the **mount wrapper only** — it is not passed to the component as a prop.
- Components with built-in `w-full` (Input, Select trigger) stretch to the mount automatically; **Button is content-sized** and will hug its label inside a wide mount.
- Pass component-level props (inline style overrides, extra attributes) through `dc-props`, e.g. `dc-props="{{ fullBtn }}"` with `renderVals()` returning `fullBtn = { style: { width: "100%", height: 44 } }`.
- Input adornments (search icon inset) need the padding on the input element itself via `dc-props` (`{ style: { paddingLeft: 34 } }`); padding on the mount pushes the whole field, leaving the icon outside the control's border box.
- The Select trigger hardcodes an internal `min-width: 120px`, and the `style` prop reaches only its outer root — **a Select cannot be sized below 120px** (the trigger will overflow the root and overlap the next flex sibling, even when root and mount are correctly synced). Treat 120px as the Select's minimum: mount `style` width = `dc-props` width = 120+. Wider works (trigger is `width:100%` of the root). When a toolbar row misaligns or overlaps, measure mount vs root vs inner trigger — the three can disagree.
- The Select popup is inline-positioned downward (`top: calc(100% + 4px)`, max-height 280 + internal scroll) and is not viewport-aware. For selects in a bottom-pinned strip (pagination), flip it upward with a scoped functional override — the inline position needs `!important`:

  ```css
  .page-foot .sc-host-x div[role][style*="position: absolute"] {
    top: auto !important;
    bottom: calc(100% + 4px) !important;
  }
  ```

  Scope by a wrapper class on the strip; never override globally (toolbar selects at the top should keep dropping down).
- In the `keyboard` focus policy, the compiled Select trigger **and Input/Textarea** write their hover border as **solid ink** via inline style (Select does not always reset it) — a direct violation of the no-pure-black-line rule. Neutralize globally per page:

  ```css
  .sc-host-x > div > div[role="button"],
  .sc-host-x input,
  .sc-host-x textarea { border-color: var(--input) !important; }
  .sc-host-x > div > div[role="button"]:hover,
  .sc-host-x input:hover,
  .sc-host-x textarea:hover { border-color: color-mix(in srgb, var(--foreground) 25%, transparent) !important; }
  .sc-host-x > div > div[role="button"]:has(+ div[role]),
  .sc-host-x input:focus,
  .sc-host-x textarea:focus { border-color: color-mix(in srgb, var(--primary) 70%, transparent) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent) !important; }
  ```

  (Select triggers are the only `div[role="button"]` inside DS mounts; real Buttons render `<button>` and are unaffected. Click-focus on inputs keeps the clay ring — that is a signal, not a black line.)
- Under `managed-navigation`, keep the hover and open-Select handling above, then append this **after** the keyboard focus rule, scoped to the pointer mode, so pointer-focused fields return to their quiet base surface while keyboard navigation still shows the ring:

  ```css
  .sc-host-x input:focus,
  .sc-host-x textarea:focus {
    border-color: var(--input) !important;
    box-shadow: var(--shadow-input) !important;
  }
  ```

  The open Select trigger remains an open-state signal, not a Tab focus ring.
- Array/object props (Tabs `items`, Select `options`, handlers) come from `renderVals()` holes; keep `hint-size` on every mount.

## Plain CSS / Other Web Projects

Font: import the webfont first (or self-host the equivalent `@font-face` rules):

```css
@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600&display=swap");
```

Token set: **do not re-type the tokens.** Import the source of truth:

```css
@import "kiln/tokens/index.css";
```

That single entry pulls in fonts, colors, typography, spacing, radius, elevation, and base styles.
If the target cannot import from the package, copy `tokens/*.css` verbatim — but copy the *files*,
never re-type the values into a doc or a snippet. A hand-copied token block is a second source of
truth, and it will drift the moment the real one changes. (This file used to carry exactly such a
block; it is gone for that reason.)

Minimum component set:

- App shell with sidebar.
- Button.
- Input.
- Password Input.
- Date / Time Picker.
- Select.
- Badge.
- Tabs.
- Dialog / Sheet.
- DataTableDock.
- Row action menu.
- Resource card.
- Metric card.

## Design Tool Mapping

Create styles/variables for:

- Colors: Canvas, Card, Muted, Ink, Clay, Teal, Peacock, Amber, Border, Input, Sidebar.
- Text: Page title, Section title, Body, Meta, Tiny, Metric — all in Noto Sans SC 400/500/600.
- Effects: Shadow xs, Card, Card hover, Popover (warm black `rgba(54,47,42,·)`).
- Radius: Control 4, Card 6, Panel 8.
- Components: Button, Input, Password Input, Date Picker, Tabs, Badge, Sidebar item, Table row, Row action menu.

Design files should annotate:

- Control height.
- Row height.
- Sidebar width.
- Table min-width.
- Empty/loading/error states.
- Mobile recomposition.

## Dark Mode

kiln ships a dark theme in `tokens/dark.css`, loaded by `tokens/index.css`. Porting dark mode means **wiring the switch**, not inventing colors:

- Put `.dark` (or `[data-theme="dark"]`) on the root element. Tailwind v4 hosts map the `dark:` variant to the same class: `@custom-variant dark (&:is(.dark *));`.
- The host owns the policy — follow system, fixed light, fixed dark. For "follow system", toggle the class from `matchMedia("(prefers-color-scheme: dark)")` and listen for its `change` event; kiln deliberately does not ship a media-query block, so a user's explicit choice always wins.
- Apply the class before first paint (a tiny inline script in `<head>` that reads the stored choice), or dark users see one light frame on every launch.
- Desktop shells (Tauri, Electron) should also set the native window theme so title bar, scrollbars, and system menus match the page.
- Host overrides of kiln semantic tokens must not pin light values. A host `:root { --card: var(--palette-white) }` has the same specificity as the dark selector and loads later, so it silently beats the dark layer. Declare only real deviations, express them through semantic tokens (`color-mix(in srgb, var(--border-visible) 45%, var(--card))`), and re-declare truly light-only values inside the host's own `.dark` block.
- Change the brand through the three brand inputs (`--kiln-brand-fill`, `--kiln-brand-on-fill`, `--kiln-brand-text`), declared once for light and once inside `.dark` with the matching `--palette-dark-*` glaze; never override `--primary`, `--sidebar-primary`, or `--ring` directly. Consume `--primary-text` (not `--primary`) wherever the brand colors text. Switch any host rgb-triplet mirrors together with the inputs. See Brand Inputs in `tokens.md`.
- Hard-coded black overlays and rings vanish on dark surfaces: raise scrim opacity (`dark:bg-black/55`) and swap black hairlines for low-alpha warm white.
- Keep exported artifacts (share images, PDFs, email) on the light theme; they leave the app and should not depend on the viewer's setting.

The color decisions behind the layer — not inverted, glazes lightened in OKLCH, dark text on filled glaze, separation by surface steps plus a hairline — are in [Dark Theme Tokens](tokens.md#dark-theme-tokens). Re-check sidebar, table, dialog, badge, and dropdown contrast in the rendered page after wiring it; token values alone do not prove a composite surface.

## Mini Program / Mobile App

When porting to mobile apps or mini programs:

- Keep semantic colors, type scale, spacing, and component roles.
- Increase high-frequency touch controls to 40-44px.
- Turn tables into cards.
- Replace sidebar with bottom nav or grouped list.
- Convert most dialogs to bottom sheets.
- Reserve bottom safe-area space for fixed primary actions.

## Reuse Guide

### Fixed / Variable / Residue

Split kiln into three layers before copying any of it. A port that skips the split fails in one of two directions: it clones kiln so literally that the target cannot carry its own brand, or it keeps the colors, drops the structure, and ends up warm-tinted but shapeless.

**Fixed — the system itself. Change any of these and the result is no longer kiln:**

- The radius ladder and its role mapping (control / card / panel).
- Separation order: whitespace and soft warm shadow first, border last; white surfaces borderless by default.
- One filled key action per viewport, and no clay fill inside a table row.
- The three-layer hierarchy and the typography budget.
- A type scale with both a floor and a ceiling, with hero type banned from workbench pages.
- Structure carried by layout, grid, and spacing rather than by heavier shadow, larger cards, or more color.
- Both contract gates. A port without them is a screenshot of a design system.

**Variable — the target owns these, and kiln expects them to change:**

- The primary hue. Clay red is kiln's anchor, not the rule; the rule is that there is exactly **one** anchor. Replace it and recalculate primary subtle, ring, sidebar active, and destructive **together** — a brand color swapped into one token and not the other four is the most common way a port starts drifting on its first day.
- Status hue assignments, as long as they stay semantic and stay distinguishable from the anchor.
- The font family, provided the CJK family loads as a webfont on every platform.
- The default density, when the target's job is genuinely lighter or denser than an operations workbench.
- Page blueprints and status vocabulary, which follow the target's domain.

**Residue — kiln's own product history. Do not port these as rules:**

- Blueprints for domains the target does not have: payroll batches, external integration panels, resource packages.
- The specific Chinese labels, example copy, and seeded data used in this skill's examples.
- Component specs for primitives the target does not ship.

Carrying residue across is what turns a design system into a copy of someone else's product. When unsure which pile a rule belongs to, ask whether it would still make sense if the target sold something completely different.

Minimum portable package:

1. Color tokens.
2. Typography (webfont + fallback stack) and line height.
3. Control height, table row height, sidebar width.
4. Button / Input / Password Input / Date Picker / Select / Badge / Tabs / Dialog / Sheet.
5. Sidebar and DataTableDock.
6. Applicable page blueprints.
7. Anti-patterns and QA checklist.

Porting steps:

1. Create CSS variables or design tokens in the target project (include the Noto Sans SC webfont import or self-hosted `@font-face`).
2. Implement base components and states before business pages.
3. Implement shell: sidebar, topbar, content area, mobile nav.
4. Implement DataTableDock and pagination.
5. Validate one representative data table page.
6. Add Dialog, Sheet, form flows, and mobile cards.
7. Add target-project page blueprints and status language.

Domain adaptation, after the Fixed / Variable / Residue split:

- CRM/ERP projects should preserve table and sidebar rules.
- Content-production projects should preserve resource cards and editor rules.
- Mobile-first projects should prioritize card and bottom sheet patterns.
