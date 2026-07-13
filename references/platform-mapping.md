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
- If an existing shadcn button component maps `ghost` to transparent text with only hover affordance, change it to a neutral soft surface for admin/workbench use, or ban it from page, toolbar, detail, edit, follow-up, call, close, and reset actions. A visible command should have a weak border, subtle muted background, or a deliberate inline-link treatment before hover.
- Repeated class groups become shared components or class constants.
- Do not use naked hex values in business pages.
- Do not copy shadcn internals into business pages.
- Use DataTableDock for table scrolling, frozen columns, and pagination.
- Use shared DropdownMenu for row action menus.

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
- The compiled Select trigger **and Input/Textarea** write their hover border as **solid ink** via inline style (Select does not always reset it) — a direct violation of the no-pure-black-line rule. Neutralize globally per page:

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

The source theme is light-only; dark mode is a port-side extension. If porting to dark mode:

- Do not just invert colors.
- Re-check sidebar, table, dialog, badge, and dropdown contrast.
- Lighten clay red with color mixing so it does not become muddy.
- Shadows lose separation power on dark surfaces; there — and only there — lean on borders and surface steps instead.

## Mini Program / Mobile App

When porting to mobile apps or mini programs:

- Keep semantic colors, type scale, spacing, and component roles.
- Increase high-frequency touch controls to 40-44px.
- Turn tables into cards.
- Replace sidebar with bottom nav or grouped list.
- Convert most dialogs to bottom sheets.
- Reserve bottom safe-area space for fixed primary actions.

## Reuse Guide

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

Adaptation:

- Replace page blueprints when the target domain differs, but keep token/component/layout rules.
- Brand color can replace clay, but recalculate primary subtle, ring, sidebar active, and destructive.
- CRM/ERP projects should preserve table and sidebar rules.
- Content-production projects should preserve resource cards and editor rules.
- Mobile-first projects should prioritize card and bottom sheet patterns.
