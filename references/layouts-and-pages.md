# kiln — Layouts And Page Blueprints

Use this file for shell layout, navigation, table workspaces, editor layout, overlays, and page-level patterns.

## Desktop Shell

Anatomy:

1. Fixed left sidebar.
2. Top workbar.
3. Main content canvas.

Specs:

- Root fills `100svh`.
- Main content uses `min-h-0 min-w-0 overflow-hidden`.
- Real scrolling belongs to page work areas or table viewports.
- Topbar is 48-56px tall (the DS template uses 56px): translucent white (`--topbar`) + backdrop blur + 1px bottom border + white top highlight (`--shadow-topbar`). Title 15px / 600 with a short clay tick mark.
- The canvas is a single warm near-white plane (`--background`) — no gradients, textures, or decorative backgrounds. White surfaces float on it via shadow, not borders.
- Normal content padding is 16-24px.
- Business pages should not patch layout with one-off large margins.
- The app shell owns the page bottom breathing gap. In React/Tailwind implementations, expose it as a shell token such as `--app-content-bottom-gap` and apply it on the shell content container, not on every route root.
- Page-level data-table/workbench roots inside a padded shell should not add `pb-*`, ad hoc margins, or spacer divs to tune the final card's distance from the browser bottom. The final primary card or panel should inherit the same bottom distance from the shell across pages.

## Page Header Rhythm

Use this when placing a page title directly under the shell topbar or breadcrumb bar.

- The visual gap from the bottom of the topbar/breadcrumb bar to the page title should be about 16-24px total.
- If the shell content container already provides top padding, the page body must not add a second full top padding layer.
- Prefer `pt-0` or an optical `pt-1/pt-2` on the page body when it is nested inside a padded shell container.
- Keep the gap from the page title row to the first business panel at 12-16px for dense admin workbenches.
- Do not let page headers float in a large blank band. Extra vertical space belongs inside scrollable work areas, table docks, or empty states, not above the title.

## Sidebar

Width:

- Expanded: 248-288px (the DS template uses 248px).
- Collapsed: about 48px plus 1px border.

Color:

- Background: `bg-sidebar`.
- Text/icons: `text-sidebar-foreground`.
- Hover: `bg-sidebar-accent`.
- Active: `bg-sidebar-primary` (clay).
- Active foreground: white/canvas.

Brand row:

- Header padding: about 12px horizontal and vertical.
- Logo mark: 32px — the clay rounded square (9px radius) with the canvas-colored clipboard-list glyph (`assets/logo-mark.svg`). Never the source repo's purple favicon.
- Title: 13px / 600.
- Subtitle: 11px, muted sidebar foreground.
- Collapsed state hides brand text and logo container.

Collapse trigger:

- Use SidebarTrigger.
- Visual: ghost icon-sm, 32px box, 4px radius.
- Icon: `PanelLeftIcon`, 16px.
- Expanded label: `折叠侧边栏`.
- Collapsed label: `展开侧边栏`.
- Toggle only changes sidebar state. It does not change route, current nav, or scroll.

Collapse behaviour (shell-owned):

- Collapsing is an explicit user action: the trigger, plus `Ctrl/Cmd + B`.
- Persist the preference (cookie) so a reload keeps the user's choice.
- Never auto-expand on rail hover — the main content would jump sideways every time the pointer crosses the rail.
- The nav component renders whichever state it is handed; open/closed state, persistence, and the shortcut belong to the shell, not to the nav.

Collapsed rail:

A bare icon column is not navigable — a user cannot tell pages apart by icon alone. These are contract, not polish:

- Tooltip on hover **and** on keyboard focus, in a fixed two-line shape: page name, then group name in low-noise small text. Not a one-line `分组 / 页面` prefix — one shape keeps the spec checkable.
- `aria-label` is the **sole** accessible name, formatted `${分组}：${页面}` (degrades to the page name when there is no group). Do not also render an `sr-only` label — a screen reader would announce the item twice. The icon is `aria-hidden`.
- The group boundary stays visible: a divider plus the group's **full** title. Never slice a short label out of it and never keep a second `shortLabel` field — `教管部→教务` invents a group that does not exist. The marker is `aria-hidden`; the group is already in every item's accessible name.
- Active survives hover and focus: the current item stays clay under the pointer and does not fall back to the hover accent. Active items carry `aria-current="page"`.
- Nothing resizes. Hover, focus, and an open tooltip must not change item height or rail width; the tooltip is a floating layer, so opening it never shifts the main content.
- Known limitation: touch devices have no hover, so a sighted touch user on a collapsed rail has only icons. Screen-reader users still get the `aria-label`. Accept it, or keep the rail expanded on touch — do not rewire the tooltip to fire on tap, which turns every nav item into a two-step interaction.

Navigation item:

- Height: 36px.
- Icon: 18px.
- Text: 14px / 400.
- Gap: 12px.
- Radius: 4px.
- Hover uses weak feedback only (`--sidebar-accent`).
- Active uses solid clay background, canvas/white text and icons, weight 600.
- Collapsed state hides text and centers the 18px icon.
- No "quick create" button inside the rail.

Group label:

- Height: 24px.
- Horizontal padding: 8px.
- Text: 12px / 400.
- Color: `text-sidebar-foreground/45`.
- Hidden in collapsed state.

## Mobile Shell

- Top title plus bottom navigation.
- Content padding: 16px.
- Reserve safe space for bottom navigation.
- Tables become single-column cards.
- Each card shows key fields, status, and explicit actions.
- Dialogs may use bottom sheet posture.

## Toolbar

Desktop:

- Search width: about 320-360px.
- Search, filters, view toggle, and actions are grouped by meaning.
- Primary action sits to the right.
- Low-frequency actions can move into a dropdown.
- Total counts live in pagination, not duplicated in the toolbar.

Mobile:

- Search can span full width.
- Filters/actions may wrap by group.
- Low-priority actions move to menu.

## DataTableDock

Use DataTableDock for desktop data pages.

The dock is a **region on the canvas, not a card**: the table and its pagination sit directly on the page plane — never wrapped in card chrome, never nested in a second panel. The dock contributes the height/scroll contract; separation from surrounding content comes from spacing, the quiet header, and row dividers.

**"Not a card" ≠ "not a surface."** The dock drops the card *chrome* — border, radius, shadow, padding shell — but the table surface itself is still `--card`, and it has to be: the zebra / hover / selected row tokens are all mixed **into** `--card`, and a frozen cell's resting background **is** `--card`. Strip the surface color along with the chrome and every frozen column becomes a white slab floating on the warm canvas — precisely the failure the frozen-column rules in `components.md` exist to prevent. Remove the shell, keep the plane.

Anatomy:

1. Optional toolbar.
2. Table viewport: `flex-1 overflow-auto`.
3. Optional frozen action shadow.
4. Footer pagination and bulk actions — always the shared global pagination component (see components.md), pinned to the work-area bottom.

Rules:

- The outer container fills remaining height.
- The table viewport has a determined height before data arrives; do not let row count, empty state, loading state, or filters resize it.
- Row count must not resize the page.
- Pagination/footer is pinned to the bottom of the visible screen/work area and stays reachable regardless of table/form data volume.
- Only the table viewport scrolls; pagination must not be pushed below rows or float upward when the table is sparse.
- Large tables have min-width and horizontal scroll.
- Frozen action columns show left border and the scroll-affordance shadow (see `components.md`).
- Empty state stays inside the table viewport.

React / Tailwind implementation shape:

- Page roots inside a fixed app shell use `flex h-full min-h-full min-w-0 flex-col` so the table dock receives a real height from the shell.
- The dock container and its content wrapper both pass `min-h-0 flex-1`; do not leave either wrapper at content height.
- The shared DataTable uses a contained/fill mode such as `layout="contained"` plus `className="min-h-0 flex-1"`.
- Toolbar, filter bars, alerts, and summary strips stay `shrink-0`; the table viewport is the only vertical `flex-1` scroll region above the footer.
- Do not fix a sparse table by adding row placeholders, fake minimum row counts, or page-specific `calc()` heights when the shell can provide the height contract.

## Editor Shell

Questionnaire editor desktop layout:

- Left palette/outline: about 244px.
- Center canvas: primary scroll region.
- Right inspector: about 328px.
- Editor topbar replaces the normal global navigation content.
- Side panels remain fixed within viewport and scroll internally.
- The center canvas is the main scroll area.

## Overlays

| Layer | Use | Spec |
| --- | --- | --- |
| Popover / Dropdown | Short menu, filters, more actions | White surface, popover shadow, card radius (6px) |
| Dialog | Create, edit, confirm, small forms | `sm:max-w-md/lg`, shared 16px mobile and 24px desktop viewport breathing gap, mobile can bottom-align |
| AlertDialog | Delete, unbind, void, irreversible action | Clear consequence and destructive action |
| Sheet | Long workflow, full detail, payroll generation | Full or near-full height, independent scroll |

Avoid nested overlays unless the workflow clearly requires it.

Data-heavy overlays:

- Detail, configuration, selector, import preview, and audit overlays use a fixed outer height on desktop, capped by the visible viewport.
- Header, tabs, and footer stay fixed within the overlay frame.
- The body pane owns scrolling with `min-h-0` and `overflow-auto`.
- Switching tabs or moving between loading, empty, and populated states must not change the overlay's outer height.

## Page Blueprints

These are **generic** shapes. The concrete pages of any given product (its resource types, its
workflows, its domain language) belong to that product's own design-system instance, not to kiln.
Replace the blueprints when the domain differs; keep the token / component / layout rules.

### Overview

1. Date presets, then the date range picker.
2. A small number of KPI metrics — borderless white surface on `--shadow-card`, `--text-meta` labels,
   `--text-data` tabular numbers. Only real dashboard numbers get the `--text-data` treatment.
3. Trend or ranking, then the most recent records.

### Resource Management

- Card/folder view by default when the resource is visual or has a lifecycle; list view is a user choice.
- Toolbar: search, view switch, and the single clay key action (e.g. "新建…").
- Cards answer: what it is, its status, its recent change, and the next action.
- Delete moves to trash. Disable/enable is lifecycle, not deletion.

### Data Table

- Desktop uses the DataTableDock; mobile recomposes into cards.
- Toolbar: search, filters, refresh. Total counts live in the pagination, not duplicated above.
- Frozen far-right operation column with a single `...` menu when a row has two or more actions.
- Multi-select defaults to current-page scope, and the scope must be stated.

### Detail / Editor

- Left outline or palette, center canvas as the primary scroll region, right inspector.
- The editor topbar replaces the global navigation content.
- The inspector configures; it does not duplicate body editing.

### Settings / Integration

- Top panel: connection state, last check, last sync, errors, and the sync actions.
- Credentials use the Password Input. Bind / unbind / import go through a Dialog.
- Show only what is useful in the current viewport; do not dump raw payloads into the page.

### Consumer-Facing Flow (mobile)

A consumer flow (intro → steps → result / unlock) uses the same theme, mobile-recomposed:

- Intro: brand row, title (larger than admin, still within the consumer cap), a tabular meta row with
  hairline dividers, a white detail card, and one clay CTA at a 44px touch height.
- Step page: a thin clay progress track plus a tabular `n / N` counter; one white card per screen;
  options are selectable rows (≥56px touch) using the quiet selected signal — a thin primary border,
  a 1px primary ring, a very subtle tint, and a small clay check. Back = outline, Next = ink solid.
  Clay appears only at start and submit.
- Result page: a success mark on `--success-bg`, a teaser card, then the action card. Same language as
  the rest of the system — the consumer surface is not a separate design.

### Mobile Cards

Each mobile card answers:

- Who/what is this record?
- What is the current state?
- Which 2-4 fields matter?
- What can the user do next?

Do not force every desktop column into a mobile card.
