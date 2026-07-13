# kiln — Components

Use these component rules with `references/tokens.md`. Keep controls compact, stable, and built for repeated operations. Components shipped in the DS bundle (`window.AIDesignSystem_4c1727`): Button, Input, Select, Checkbox, DateRangePicker, Card, Badge, Table, ResourceCard, MetricStat, SidebarNav, SegmentedControl, Tabs. Sections below without a DS component (password input, dialog, sheet, dropdown, toast…) are sanctioned patterns built from the same tokens.

## Button

### Variant decision (run this, don't taste it)

Walk it top-down; **the first row that matches wins**. This exists so "红还是黑" is never an aesthetic judgment call made per-button — it is a property of what the action *is*.

| # | Ask | Variant |
| --- | --- | --- |
| 1 | Does it express a **state** rather than an action? (current page, selected row/item, a filter trigger holding active conditions, active nav/tab) | **clay `primary`** — and it MUST carry `aria-current` / `aria-pressed` / `data-state`. Stateful fills are **exempt** from the one-clay-per-viewport cap. |
| 2 | Is it **high-risk and irreversible**? (删除, 作废, 解绑) | `destructive`, plus destructive labeling, a confirm step, or menu placement |
| 3 | Is it **the single key action of this page or flow**? (the 新建… entry, 开始兑换, the page's reason to exist) | **clay `primary`** — at most **one per viewport** |
| 4 | Is it an **ordinary filled command**? (dialog/sheet confirm, 保存, 生成, secondary submit) | **ink `default`** (`bg-solid`) |
| 5 | Is it a **row-level key action**? (one per table row, and it is what the page is *for* — 认领 on a claim queue, 拨打 on a call queue) | **ink `default`**, `sm` size — **at most one filled button per row, and never clay** |
| 6 | Anything else (toolbar, detail header, secondary/row-secondary actions) | `outline` / `ghost` — must have a **visible surface before hover** |

The red/black split in one line: **clay is a signal and it is scarce; ink is merely weight.** Clay says "this is the one thing" or "this is the state you're in" — repeat it twenty times down a table and it stops saying anything at all. Ink says "this is an action" — it carries no signal, so repeating it per row costs nothing, which is exactly why the row-level key action gets ink and never clay.

A table page whose entire purpose is per-row work (a claim queue, a call list) has **no page-level key action** — nothing matches rows 1–4. That page's only clay is the *stateful* kind (an active filter trigger, the current page in pagination). That is correct. Its visual weight comes from row 5's ink, not from inventing a clay button that has nothing to do.

Base:

- Use the shared button component.
- Default text is 13-14px.
- Radius is 4px.
- **Fills are flat.** No emboss/relief treatments — inner top highlights, darker bevel rims, hard offset press shadows are banned (explored and rejected); depth in this theme lives in surface shadows, never in control bevels.
- Disabled state uses opacity, not hidden controls.

Sizes (the DS Button API set — `sm | default | lg | icon | icon-sm`):

| Size | Height | Use |
| --- | --- | --- |
| `sm` | 32px | Toolbar, inline, dialog secondary, table operation cells |
| `default` | 36px | Default form/page action |
| `lg` | 40px | Important submit or mobile primary |
| `icon-sm` | 32px | Compact tool icon |
| `icon` | 36px | Default icon button |

There is no 24px `xs` size in the DS. When an action is too minor for a 32px `sm` button, render it as a real inline text link instead of inventing a smaller button.

Rules:

- Text action buttons default to `default` size. Use `sm` only for an explicit compact context such as dense table toolbars, dialog secondary rows, table operation cells, inline chip actions, or embedded input adornments; a normal page/detail action such as "添加备注" stays full size.
- Variant semantics come from the DS Button API: `default` = **solid ink** ordinary filled action; `primary` = **clay key action**. Ordinary filled commands — Save, Confirm, Generate, Preview, secondary submits — use the ink/solid treatment (`bg-solid text-solid-foreground`).
- Dialog and sheet footer confirms (确认兑换, 保存, 生成…) are ordinary submits → `default` ink solid. The clay fill belongs to the page/flow entry that opened them (e.g. 开始兑换, 生成兑换码), not to the confirm step; a flow shows clay once. High-risk AlertDialog confirms (删除, 作废, 解绑) use `destructive` instead.
- On scan-heavy table pages the visible set is often「1 个 clay 关键动作 + outline/文字动作」with no ink fill at all — that is correct, not a gap. Ink solids surface in dialogs, editors, form flows, and as the row-level key action (decision table row 5).
- Clay `primary` fills are reserved for **the single key action of a flow** (e.g. the "新建…" entry on a resource-management page) and for buttons that themselves represent an active state or stateful filter — an advanced-filter trigger with active hidden conditions, a selected date endpoint, or a nav/tab active state defined by that component. At most one clay-filled action per viewport.
- In shadcn-style button variants, the `default` filled variant should resolve to solid/ink, with an explicit `primary` variant for the key action and stateful filled controls. Do not leave `default` mapped to `bg-primary`.
- Destructive actions use the destructive token, which currently maps to clay red, but they still need destructive labeling, confirmation, or menu placement. Do not use clay red alone to imply danger.
- Outline, ghost, and text-like actions stay neutral by default. Page, toolbar, detail, edit, follow-up, call, close, and reset actions must still be discoverable before hover; `ghost` should resolve to a neutral soft button with a weak visible surface such as `border-border/70 bg-muted/40 text-foreground`, or the action should use `outline`. Hover may raise contrast with `text-foreground`, a stronger muted background, or a border change; it should not jump to clay red unless the action is truly selected, active, focused, or destructive.
- Do not use transparent `ghost`, `border-transparent`, or primary-colored text to demote a visible action. If the action is too minor for a button, render it as a real inline text link in surrounding copy; if it remains in a toolbar or detail header, give it a stable neutral button surface.
- Text buttons such as Save, Create, Cancel, Generate, and Confirm do not need decorative icons.
- Press feedback: 1px downward shift (`active:translate-y-px`); selection is expressed by color, never scale.
- Pure icon buttons need `aria-label` or `title`.
- Pure icon buttons adjacent to default-height inputs, search inputs, selects, date triggers, or other default toolbar controls use `icon` at 36px. Do not place a 32px `icon-sm` button beside 36px controls in the same group.
- Use `icon-sm` only when the whole group is explicitly compact, such as table operation cells, embedded input adornments, dense secondary toolbars, or close/remove buttons.
- Segmented filter/status tracks are measured by the outer visible track, not the child trigger. In a default workbench toolbar, use a 36px outer track: `1px` border + `p-px` + 32px `sm` triggers. Sibling refresh, today, ordinary outline/text buttons, selects, search triggers, and default icon buttons should also be 36px. Use all-32px controls only when the entire toolbar group is explicitly compact.
- Async actions immediately show loading or disabled state.
- Do not use `truncate` to hide button text problems.
- The Button renders content-sized (`inline-flex`); it does not inherit its container's width. For a full-width button (mobile primary CTA, dialog footer stretch), set `width: 100%` **on the button element itself** — in React via `style`/`className` on the Button; in Design Components via `dc-props` (see platform-mapping.md, the `style` attribute on `<x-import>` sizes only the mount wrapper). Height overrides (e.g. a 44px mobile touch target over `lg` 40px) follow the same rule.

## Filter Trigger Button

Use this pattern for "更多筛选" / advanced filter entry points in table toolbars and list workspaces, especially when the active condition count helps users scan state without opening the sheet. (A clay-filled active state here is sanctioned: the button represents an applied-filter state, which is exactly what `--primary` signals.)

Base:

- Height: 32px.
- Radius: 4px.
- Padding: `px-2.5`.
- Gap: 6px between icon, label, and count.
- Text: 13px / 500.
- Icon: `SlidersHorizontalIcon` or equivalent, 14-16px, inheriting text color.
- Width is content-led; do not stretch it to fill the toolbar.

States:

- No active extra conditions: outline small button, white/background surface, `border-border/80`, muted foreground, hover `border-foreground/25` or `bg-muted/30`.
- One or more active conditions: clay solid button, `bg-primary text-primary-foreground`, hover slightly darker or `bg-primary/90`.
- Focus: keep a clear primary ring without changing size.
- Disabled/loading: keep the count visible if conditions are still applied; disable interaction, not state visibility.

Count badge:

- Show the badge only when count is greater than 0.
- Badge sits at the right edge inside the button, after the label.
- Height: 16px.
- Minimum width: 16px.
- Padding: `px-1`.
- Radius: 3-4px.
- Text: 11px / 600, tabular figures.
- In the active clay button, use a light foreground chip such as `bg-primary-foreground/20 text-primary-foreground`; avoid a separate red outline or a second strong color.
- Keep single-digit and two-digit counts vertically centered and optically balanced.

Counting rules:

- Count applied advanced/hidden conditions represented by the trigger, not ordinary visible search text or date fields that are already readable in the toolbar.
- If visible filter chips mirror the same advanced conditions, the trigger count and chip count must match.
- Clearing filters updates the count and returns the button to the no-active outline state immediately.

QA:

- Check default, hover, focus, disabled/loading, active count 1, active count 2+, and count cleared.
- When checking action buttons, include at least one default-state sample before hover. A visible command must not become discoverable only after mouse movement.
- Verify the button height stays 32px across states and that adding/removing the badge does not shift neighboring controls vertically.
- In narrow toolbars, wrap the whole button as one unit; never split the count badge onto a new line.

## Icon Button

- Use ghost or outline icon buttons.
- Default box: 36px when the button is a normal toolbar/page icon action.
- Compact box: 32px only via `icon-sm`, and only when the surrounding controls are also compact or embedded.
- Default icon: 16px.
- In a mixed toolbar, a pure icon button's outer box must match adjacent default `Input`, `SearchInput`, `SelectTrigger`, or date trigger height and radius. A 32px icon button next to 36px controls is a visual QA failure.
- Hover must not resize the box.
- Do not use icon-only controls for high-risk actions unless they are inside a labeled menu.

## Input

Base:

- Height: 36px.
- Radius: 4px.
- Border: `--input` — inputs are one of the few places a visible border is required.
- Background: `bg-background` / white on cards.
- Shadow: `--shadow-input` (1px ambient + inner top highlight).
- Padding: `px-2.5 py-1`.
- Placeholder: `text-muted-foreground/70`.

States:

- Hover: `border-foreground/25`.
- Focus: `border-primary/70` plus low-noise clay ring (`--ring` / `--shadow-primary-focus`).
- Disabled: `bg-muted/40` and opacity.
- Invalid: destructive border and ring.

Rules:

- Hover/focus must not change padding or height.
- Numeric inputs allow empty and intermediate values during typing.
- Format numeric values on blur when possible.

## Password Input

Every password field includes a show/hide icon button.

Structure:

```tsx
<div className="relative">
  <Input type={visible ? "text" : "password"} className="pr-10" />
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    aria-label={visible ? "隐藏密码" : "显示密码"}
  >
    {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
  </Button>
</div>
```

Specs:

- Input stays 36px high.
- Text reserves right space with `pr-10`.
- Icon button is inside the input at the right, vertically centered.
- Button size: 28-32px, recommended 32px.
- Right offset: 4px.
- Icon size: 16px.
- Button type is `button`.
- Click toggles visibility only, not form submission.

## SMS Code Input

The 发送验证码 action lives **inside the SMS-code input**, right-aligned, as a pure-text primary (clay) action — never a separate button beside the phone field.

- Phone field stands alone at full width; the helper line (请输入手机号 / 验证码已发送) sits under it.
- Code input reserves right space (`padding-right: ~96px`); the action is absolutely positioned at `right: 12px`, vertically centered.
- Action text: 13px / 500, `color: var(--primary)`; hover darkens slightly; no border, no fill, no underline.
- Cooldown state: the same slot shows `Ns` in muted foreground (tabular), non-interactive; width is reserved so the swap never shifts the input text.
- Disabled (phone empty/invalid): muted color, no pointer.

## Date / Time Picker

Use the DS `DateRangePicker` as the core pattern for overview, analytics, payroll, and questionnaire date/time fields.

Trigger:

- Toolbar trigger: outline small button, 32px high, min width about 150px, `justify-start`, `px-2.5`, tabular numbers.
- Condition/form trigger: outline button, 40px high, full field width, radius 6px (documented exception to the 4px control radius for this tall field trigger), `border-border/70`, `bg-background`, `px-3`, `text-sm font-normal`, `shadow-xs`.
- Toolbar trigger may show `CalendarIcon` with `data-icon="inline-start"`.
- Date text format: `YYYY-MM-DD` or `YYYY-MM-DD 至 YYYY-MM-DD`.
- Trigger needs a `title` with the full date range.

Dialog:

- Desktop uses compact dialog content, `sm:max-w-sm`.
- Mobile uses bottom sheet posture: `top-auto bottom-0 translate-y-0 rounded-b-none`.
- Header is only the title, such as `选择日期区间` or `选择结算区间`.

Selection summary:

- Rounded 8px, `border-border/70`, `bg-muted/30`, `px-3 py-2`.
- Label: 11px, leading 4, muted. Text switches between `选择开始日期` and `选择结束日期`.
- Value: 14px, medium, tabular. Shows placeholder or selected range.

Month navigation:

- One row: previous button, month label, next button.
- Arrow buttons: outline icon buttons with labels `上个月` and `下个月`.
- Month label: `YYYY 年 M 月`, 14px / 500.
- Month navigation does not mutate selected dates.

Calendar grid:

- Weekdays: 7-column grid, 4px gap, centered, 12px muted text, order `一 二 三 四 五 六 日`.
- Dates: 7-column grid, 4px gap.
- Date button: 36px high, full column width, 14px / 400, tabular.
- Start/end date: solid clay (selected date endpoints are a sanctioned `--primary` state).
- In-range date: `bg-primary/10 text-primary`, hover `bg-primary/15`.
- Outside current month: `text-muted-foreground/45` unless selected or in range.
- Selected date sets `aria-pressed`.

Interaction:

- First click sets start date, clears end date, and switches to choosing end date.
- Second click sets end date.
- If the second date is earlier than the start date, swap start/end automatically.
- Close the dialog after a complete range is selected.
- Do not ask users to type date strings manually.

## Select

- Default height: 36px.
- Small/inline height: 30-32px.
- Radius: 4px.
- Same input visual language: `--input` border, white surface, quiet trigger.
- Radix/shadcn Select content defaults should use trigger-edge positioning, not selected-item positioning: set `SelectContent` to `position="popper"` with `align="start"` in shared components. Keep `position="item-aligned"` only for explicit native-menu behavior where the selected item must sit over the trigger.
- Popper Select dropdowns should align their left edge to the trigger, use at least `--radix-select-trigger-width`, and keep a real content viewport height. Do not set the viewport height to `--radix-select-trigger-height`, or long option lists will collapse to one-row scroll panes.
- QA Select positioning in dense workbench headers, table toolbars, dialogs, and narrow viewports. Check placeholder state, selected first item, selected middle item, selected last item, hover/focus, and long labels; the dropdown should not jump horizontally or overlap the trigger.
- If options exceed about 8 or need search, use a combobox/dialog instead of a long dropdown.

Clearing a filter select — the X lives in the trigger:

- A select that narrows a list must not use an "全部xxx / 所有xxx / 不限" **option** as its clearing device. The unfiltered state is the trigger's placeholder; the option list carries real values only. An "all" option costs a row in every dropdown, and it makes "nothing selected" and "a value that happens to mean everything" read identically in the trigger.
- Once a value is chosen, the trigger's chevron is **replaced** by a 16px `X` (`text-muted-foreground`, hover `text-foreground`) that returns the select to its placeholder in one click. Chevron and X never coexist — the right slot holds exactly one icon, so the trigger does not change width when a filter becomes active.
- The Radix/shadcn trigger is itself a `<button>`, so the clear affordance **cannot be a nested real button**. Use `<span role="button" aria-label="清空筛选">` and kill the event in `onPointerDown` (`preventDefault` + `stopPropagation`); without that, the same press that clears also opens the dropdown.
- Map the "all" sentinel (`'all'`, `'__all__'`, `undefined` — whatever the page already uses) to an empty value inside the wrapper so the placeholder renders. Business code keeps passing its own sentinel.
- Ship this once as a shared wrapper (`FilterSelect`, taking `value / onChange / options / placeholder / allValue`) rather than wiring a trigger and a clear button per page. Filter selects have no exemptions.
- The same rule governs **multi-select filter triggers** (a popover/command combobox showing "全部渠道 / 已选 3 项"). A "清空选择" row at the top of the option list is the same mistake wearing a different hat: the clear device is hidden one click deep, inside the very list the user opened to *add* conditions. Put the X in the trigger — chevron when nothing is selected, X once anything is — and drop the clear row so there is exactly one way to clear. Because that trigger is usually a real `<button>`, the X is again `span[role="button"]` with the press killed in `onPointerDown` (a popover opens on click, a select on pointerdown — stop both).

Boundary — this rule is about **filters**, not forms:

- In an edit/create form, an option like "暂不选择" / "保持原状态" / "使用默认校区" is a **real value with real semantics** — write nothing, keep the current value, inherit a default. It is not a cleared filter, and replacing it with an X would delete the meaning it carries. Those stay in the option list.
- The test: if empty means "do not narrow the list", clearing belongs in the trigger. If empty means "do not change the data" — or the field is required — it belongs in the option list.

## Field Group

- Use FieldGroup, Field, FieldLabel, and FieldDescription.
- Label: 12-13px / 500.
- Field gap: 12px.
- Description must add decision value.
- Error text stays below the field.

## Badge / Status

- Height: about 20px.
- Text: 11-12px.
- Radius: 4px — avoid pills unless the element is explicitly a tag/chip.
- Variants are the DS Badge API set: `default`, `secondary`, `outline`, `success`, `info`, `warning`, `neutral`. There is no `destructive` Badge variant — express failed/invalid states with `neutral`/`outline` plus destructive-toned text or a dot, and keep clay fills for buttons and signals, not labels.
- Reserve the leading status dot for state signals (收集中, 待复核, 已失效…), not for counts or types.
- Do not show more than three badges in a row.

## Compact Detail Field Group

Use this pattern for short supplemental values inside a detail/key-value table or dense detail sheet, especially imported declaration fields, resource-package suggestions, channel-specific extra fields, and field-by-field comparison states.

Placement:

- Keep the group inside the relevant detail row or immediately below the source/context row.
- Do not append it as a separate card panel after unrelated sections such as notes, timeline, or follow-up history.
- If the values come from a resource package, import batch, external source, or raw declaration, place the group near "source", "resource package", "import", or equivalent context.

Structure:

- One compact strip per short field, not one card per field.
- Strip contents: label, submitted/imported value, optional current value, state badge, and optional small action.
- Default height: 28-32px. Avoid 72px+ cards when the value is only a few words.
- Label cell: muted surface, 12px text, fixed or content-led width, right border.
- Value cell: 13px / 500, truncates with title/tooltip when long.
- Current/conflict value: 12px muted text, inline in the same strip when space allows.
- State: small Badge using semantic variants, such as success for "已一致", info for "可补充", warning/neutral for "待核对".
- Action: a small (`sm`) outline/text action or inline text link at the strip edge, such as "填入" or "采纳"; it must not turn the whole strip into a CTA. (No 24px button size exists in the DS — prefer an inline link when 32px is too heavy.)

Layout:

- Multiple strips wrap as a flex row with 4-8px gaps.
- Each strip uses one thin border and at most a very subtle semantic tint.
- Width is content-led with a sensible max width; do not stretch every short field to equal-width columns across the whole row.
- On narrow screens, wrap whole strips; do not split label, value, badge, and action across unrelated lines.
- Raw declaration data, JSON, or long source rows belong in a low-priority collapsible block under the strips.

QA:

- Measure strip height in browser; normal short-field strips should stay about 28-32px.
- Verify no short value like a name, grade, or school creates a large empty card.
- Check default, conflict, same, empty/fillable, loading/disabled action, long text truncation, and narrow viewport wrapping.
- Confirm the compact group does not compete with the primary detail table, notes, follow-up table, or main action bar.

## Tabs

One global low-noise language: no hover lift, no oversized 700 labels. Two variants, two different active languages.

Button tabs (`variant="button"`) — a **raised segment in a quiet track**, same language as `SegmentedControl`:

- Use for page-level work areas.
- Track: `inline-flex`, 4px gap, 4px padding, control radius, `border-border-visible/50`, background `color-mix(muted 40%, transparent)`.
- List height around 36-40px, trigger height 28px.
- Active state: **white surface** (`--card`) + **`--shadow-card`** + **clay text** (`--primary`), weight at most 500.
- Inactive: muted text, quiet `foreground/3%` hover.

> **The active plate must be `--card` (white), not `--background` (canvas).** The track is a
> semi-transparent muted mix, so on canvas the two differ by only ~2 tonal steps and the active
> segment washes out. White is what lifts. Two upstream bugs were fixed here (2026-07-13): the DS
> `Tabs.jsx` used `--background` for the plate and hard-coded a **cold** `rgba(0,0,0,.06)` shadow —
> both now corrected to match `SegmentedControl`, which was right all along.
>
> Corollary that generalizes: a component whose surface is a **semi-transparent** mix is
> context-dependent. Nesting it inside a white card (instead of on the canvas it was designed for)
> silently destroys its contrast. Code review cannot catch this — only computed-style assertions
> against the rendered page can.

Line tabs (`variant="line"`):

- Use for second-level content divisions.
- Trigger height 40px.
- Active state: short clay underline under muted-to-ink text. **No plate, no shadow, no radius.**

Do not place two button-tab groups in one viewport.

## Table

The scanning and comparison surface. Airy and light by contract: **the row divider is the structure**, a quiet low-contrast header, one info point per cell. Never a heavy newspaper grid, and never wrapped in a card (see DataTableDock).

Vertical grid lines:

- **Default: none.** A table you read row by row (a list of records, a queue, a log) gets horizontal dividers only. Adding column lines to it buys nothing and costs air.
- **Data-dense tables may have them.** Wide tables the user scans *across* — many narrow columns, numbers compared column-to-column, horizontal scrolling — genuinely lose the eye without column guides. This is a real reading mode, not a lapse in taste.
- When they exist, a vertical line must be **markedly lighter than the row divider** — at most ~60% of its visual weight (alpha × width). The row divider stays dominant; the column line is a faint alignment aid the eye can ignore. Equal-weight horizontal and vertical lines is the newspaper grid, and that remains banned: it turns a scanning surface into a spreadsheet and every cell into a box.
- Reference weights from a shipped implementation: row divider `--border` at 70% alpha, column line `--border` at 25% — a 1:2.8 ratio. Header column lines may sit slightly heavier than body ones (35%), since the header is already a distinct surface.
- Structural edges are **not** grid lines and are exempt from the ratio: the frozen-column border, a split-pane seam, a pivot table's group boundary in the header. These are allowed to be as strong as the structure demands (see the frozen-column rules below).

Specs:

- Header height: 40px.
- Header text: 12px / 600, muted foreground, quiet surface (plain or `--muted` at low mix); no heavy fills.
- Row height: 48px baseline (`--table-row-height`); the DS `Table` component renders 52px rows with 16px cell padding — both are sanctioned, do not go below 48px.
- Cell text: 13px.
- Every body row keeps a bottom divider (`--border`), including the final data row; do not remove the last row border with `last:border-0`, `last:border-b-0`, or equivalent CSS.
- Tables in dialogs, sheets, tabs, and table docks use a fixed-height viewport; do not rely on `min-height` while letting row count, empty state, loading state, or filters resize the table.
- Numeric columns are right-aligned and tabular.
- Selection columns are centered and stable.
- Selection checkbox columns use a fixed 40px column by default. Header and body cells use symmetric horizontal padding, usually `px-0` with the checkbox centered by a full-cell flex wrapper such as `absolute inset-0 flex items-center justify-center`; never fix checkbox cells with only `pr-0` or another one-sided padding override.
- The checkbox visual box must have equal left/right offset inside the selection cell. Top/bottom offset must also be optically equal in both header and body rows.
- If `border-collapse` introduces a half-pixel border offset in browser measurements, keep padding symmetric and use a scoped subpixel transform on the centered checkbox layer rather than reintroducing one-sided padding.
- Detail/key-value tables use `align-middle` for ordinary label and value cells. Rows often mix single-line text with badges, select triggers, copy buttons, or inline edit buttons; do not use `align-top` as the default for these cells, or plain text will sit above the optical center. Reserve top alignment for full-width notes, multiline descriptions, logs, and other intentionally tall content rows.

Operation column:

- Default language: **low-weight actions**. **Clay never enters the operation column** — twenty rows would mean twenty clay fills, and clay would stop being a signal anywhere in the product.
- **At most one filled button per row**, and only for the **row-level key action** — the thing the page exists to do (认领 on a claim queue, 拨打 on a call list). It is **ink `default`**, `sm` size (decision table row 5). A table where no single action is *the* action gets no fill at all.
- Everything else in the row stays low-weight: exactly one remaining action → a low-weight text/outline action; **two or more → collapse to a single `MoreHorizontalIcon` / `...` dropdown trigger** — never a row of text links or icon buttons. The row-level key action sits outside that count: the canonical shape is **`[ 主动作 ]` (ink) + `[...]`**.
- Header and body content are horizontally centered by default. If a product has a deliberate frozen far-right operation column, the header and trigger may be right-aligned, but they must still share the same alignment.
- The dropdown trigger uses ghost icon-sm, 32px box, 4px radius, muted text, muted hover background.
- A frozen far-right operation column with only the `...` dropdown trigger should normally be 56px wide: 32px trigger plus symmetric cell padding. Keep width, min-width, and max-width aligned so the table does not distribute spare width into the operation column.
- Menu items are text actions.
- Dangerous actions use destructive menu variant.
- Never show multiple icon buttons side by side in a data table operation column.
- Frozen operation columns need a left border, and a frozen scroll shadow per the rule below.
- The right edge of a frozen operation column should sit flush with the table container edge. If `scrollbar-gutter: stable` creates a blank strip to the right of a right-sticky column, remove that gutter for tables with a right-frozen operation column or compensate in the shared table component; do not hide the gap by widening the action column.
- If the row itself is clickable, the operation cell intercepts click and keydown for the whole cell.

Frozen column background:

- A frozen cell must be **opaque** (the columns scrolling underneath must not show through) **and** must follow its row's state. These two requirements fight each other, and the fight is silent: an opaque background painted once freezes the cell at its resting color, and every row highlight — zebra, hover, selected, row-menu-open — then visibly stops at the frozen edge while the rest of the row lights up.
- So a sticky cell cannot inherit the row background; it has to repaint it. Drive it from **one** rule set keyed on the sticky cells, covering all four states, consuming the same `--table-row-*` tokens the row consumes:

```css
[data-slot="table-row"] > [data-sticky-cell]                          { background: var(--card); }
[data-slot="table-row"]:nth-child(even) > [data-sticky-cell]          { background: var(--table-row-alt); }
[data-slot="table-row"]:hover > [data-sticky-cell],
[data-slot="table-row"]:has([aria-expanded="true"]) > [data-sticky-cell] { background: var(--table-row-hover); }
[data-slot="table-row"][data-state="selected"] > [data-sticky-cell]   { background: var(--table-row-selected); }
```

- **Never put a `bg-*` utility class on a sticky body cell** (`bg-card`, `bg-background`, …). Under Tailwind v4 the utility lands in `@layer utilities`, the rules above live in `@layer base`, and **layer order beats specificity** — a single-class utility silently outranks a `(0,3,0)` `:hover` rule. The cell keeps a valid-looking token, the code review passes, and the row highlight dies at the frozen column. If the sticky background must be expressed in the component, put it in the same layer as the state rules or hoist both out of `@layer`.
- Row-state tokens must mix into `--card`, never into `transparent`: a `color-mix(…, transparent)` row tint is fine on a normal cell (it composites over the table surface) but turns a frozen cell into a window.
- Header sticky cells are the exception: they carry `--table-header` and have no row states, so a utility class there is harmless.

Frozen column scroll shadow:

- A frozen column's shadow is a scroll affordance, not decoration. Show it only while there is hidden content on that side: a left-frozen column casts a right-facing shadow only after the body is scrolled away from the start; a right-frozen column casts a left-facing shadow only while more columns remain to the right. When the table fits with no horizontal overflow, show no shadow at all.
- Do not paint the shadow with `box-shadow` on the `<td>`/`<th>`. These tables use `border-collapse`, and browsers drop cell box-shadows under collapse, so the shadow silently never renders. Draw it with a gradient pseudo-element (`::after`) on the sticky cell instead, positioned just outside the frozen edge (`translateX(±100%)`), `~10px` wide, `pointer-events: none`, fading from `--shadow-sticky-edge` (warm: light `rgba(54,47,42,0.12)`) to transparent.
- Toggle visibility, not size: keep the pseudo-element mounted at `opacity: 0` and transition opacity (~`200ms`) when the edge state flips. Never animate width or re-layout.
- Detect scroll position on the element that actually scrolls horizontally. With the shadcn table wrapper the scrollport is the inner `[data-slot=table-container]`, not the outer bordered container; sticky cells stick to it, so read its `scrollLeft` / `scrollWidth` / `clientWidth` there. Write the resulting edge state as data attributes (e.g. `data-at-start` / `data-at-end`) on a shared ancestor imperatively, so the CSS does the toggling and no React re-render is needed per scroll frame.
- Re-measure on scroll, on container resize (`ResizeObserver`), and whenever rows/columns/loading change, since content width can cross the overflow threshold without the container resizing.
- Keep it subtle. The shadow should hint "you can still scroll" without pulling focus; if it reads as a heavy bar, narrow the width or lower `--shadow-sticky-edge` alpha before anything else.

## DataTable Pagination

Pagination is **one shared global component** — every data table consumes it; never rebuild a per-page variant.

- Height: `--table-pagination-height` (40px). Anything that computes a table's fitted height (a dialog table sized to N rows, for instance) must consume that token rather than re-deriving the strip height from a control height — the two drift the moment the strip's padding changes.
- Pagination sits directly on the canvas with the table — not inside a card. Its vertical insets are **symmetric**: distance from the divider line above the controls = distance from the controls to the work-area bottom (12px each); the shell's bottom gap uses the same value.
- Pagination is fixed to the bottom of the visible screen/work area; it must not move based on row count, filter results, or form/table data volume. Overflowing rows scroll **inside the table viewport** above it.
- Left side shows the total only: 「共 N 条」(tabular). Range strings like 「1–15 / 512」carry no decision value — do not render them.
- Page navigation is minimal: a **3-number window centered on the current page** (`3 [4] 5`) plus the page-jump Select — no 上一页/下一页 buttons and no ellipsis. The neighbor numbers ARE prev/next (one click switches); long jumps go through the「第 x 页」Select. At the boundaries the window clamps to the edge (`[1] 2 3`, `33 34 [35]`); with ≤3 pages render them all.
- Pagination is a tertiary strip — use the compact 32px tier: page-number buttons ~32px (12px tabular text), page-size and page-jump Selects `size="sm"` (32px, still ≥120px wide); the current page is a selected state → clay fill (`bg-primary text-primary-foreground`); other pages use the neutral outline surface. All controls in the strip share the same 32px outer height. Do not go below 32px — the Select trigger cannot render shorter.
  - Page jump is a Select (「第 x 页」options), not static text — it doubles as the current-page indicator.
- Bulk action bar stays in the footer area.
- Current-page selection scope must be explicit.

## Summary / Filter Strip

Use summary strips for aggregated table context and compact reason/filter strips for secondary scan context inside a panel or dialog header.

- Icons are optional, not default. Use an icon only when it materially improves recognition of a state, source, or action group.
- If the label already names the metric, remove the icon. Do not add phone, chart, user, calendar, or similar icons just to decorate a count.
- Prefer one primary value anchor plus compact secondary metrics. Use type size, weight, tabular numbers, dividers, and semantic color instead of per-metric icon chips.
- Neighboring metric, summary, filter, and reason strips in the same visual stack use the same outer width.
- Horizontal content inset is consistent across the stack, usually 12px (`px-3`) in compact dialogs and 16px (`px-4`) in page panels.
- Do not mix `px-2` with `px-3` or `px-4` across adjacent strips unless there is a deliberate nested control group with its own border.
- The first visible label in each strip should align optically; the final value/control should keep matching right padding.
- If a strip scrolls horizontally, keep the same left/right padding on the scroll container rather than moving padding to only the children.
- QA should include checking for decorative `svg`/icon elements inside compact metric or summary strips; keep them only when the icon has a clear scan or interaction purpose.

## Resource Card

Resource cards answer: what it is, status, recent change, next action.

- Minimum height: about 240px.
- Grid: `repeat(auto-fill,minmax(240px,1fr))`.
- Radius: at most 8px.
- Surface: borderless white on `--shadow-card`; hover lifts to `--shadow-card-hover` with a 1px rise and a clay-tinted border — the only sanctioned hover lift in the system.
- Top: scene badge and more menu.
- Middle: title, data count, creator.
- Bottom: status and updated time.
- Desktop hover/focus can replace the status row with neutral Edit / Share / Data actions (buttons ≥36px).
- Main body is informational, not whole-card click.

## Selectable Resource Pack Card

Resource package selectors, such as quota or package pickers, are compact choice controls. They are not KPI cards, marketing cards, or primary action buttons.

- Height: compact and content-led, usually 72-88px for a package name, description, status, and count.
- Layout: title and short description on the left, lightweight checkbox or check icon on the right, counts in a muted metadata row.
- Radius: 6px, or 8px only when matching adjacent panels.
- Default: `border-border/80`, `bg-card`, no shadow or only `shadow-xs`.
- Hover: weak border or muted surface change, such as `border-border-visible` or `bg-muted/20`.
- Focus: visible primary ring without changing size.
- Selected: use one quiet primary signal, preferably `border-primary/45` with `ring-1 ring-primary/20`, while keeping the surface white or at most `bg-primary/[0.03]`.
- Selected check mark: small, 14-16px, primary text color. Do not add a filled red corner, large checkbox block, or CTA-style badge if the card already has a selected border.
- Text: title 13px / 500, metadata 12px muted, counts tabular. Do not raise selected titles above 500 weight.
- Status badges inside the card keep their own semantic variant. A selected package does not turn every badge, count, or label primary.
- Multi-select groups should make selected and unselected cards scan as the same component family; selected cards should read as checked items, not highlighted promotions.
- Avoid thick clay borders, strong red fills, heavy shadows, scale hover, nested card treatment, or combining border + filled badge + colored background for the same selected state.

## Dialog

- Use for create/edit/confirm/small forms.
- In dense workbench pages, do not keep non-essential create/setup forms always visible. Use a clear panel or toolbar action button, then open a focused Dialog for temporary inputs, validation, cancel, and submit.
- Keep inline create forms only when creating is the primary repeated task in that viewport, when users must compare nearby rows while typing, or when the form is part of an explicit table dock or bulk workflow.
- Width: `sm:max-w-md` to large.
- Radius: 6px (`--radius-card`), white surface, `--shadow-popover`.
- Viewport breathing space is part of the shared component, not page code. The frame width should be constrained to `calc(100vw - 2rem)` on mobile and `calc(100vw - 3rem)` on desktop, split-screen, and DevTools-narrow viewports. The same safe gap applies vertically through `max-height`: `calc(100svh - 2rem)` on mobile and `calc(100svh - 3rem)` on desktop.
- Business code may set the semantic maximum width such as `sm:max-w-lg`, `sm:max-w-4xl`, or `sm:max-w-6xl`, but it must not cancel the shared safe width with `w-screen`, `sm:w-full`, or a larger viewport width. True fullscreen workflows should use Sheet or a clearly marked fullscreen exception.
- Header includes title and only useful description.
- Footer buttons align right on desktop.
- Mobile may use bottom sheet posture.
- Data-heavy dialogs such as details, configuration, employee selection, and import previews use a fixed content height. Keep header/footer fixed inside the dialog and scroll the body viewport; tabs, empty/loading states, and data volume must not change the outer dialog height.

### Scroll Body Gutter

- A scrollable dialog body must reserve a scrollbar gutter so the scrollbar never sits on top of inputs, selects, labels, or help text. Overlay scrollbars (macOS, some trackpad modes) float above content, so a few px of right padding is not enough.
- Pattern: bleed the scroll container to the dialog's inner padding edge and re-inset the content, then reserve a stable gutter. With a 16px (`p-4`) dialog padding, the body uses `-mr-4 overflow-y-auto pr-4 [scrollbar-gutter:stable]`: the scrollbar lives in the reclaimed right padding at the dialog edge, the form keeps a full right inset, and the layout does not shift when the scrollbar appears or disappears.
- Keep the form's left inset equal to the header's; do not let the gutter pull the body content out of alignment with the title and footer on the left edge.
- Apply this in the shared dialog/form-dialog component, not per page, so every form dialog inherits the gutter.
- Anti-pattern: a scroll body with only `pr-1`/`pr-2` and no reserved gutter, letting the scrollbar overlap the right edge of fields; or a body whose width visibly jumps when the scrollbar toggles.

## Alert Dialog

Use for delete, unbind, void, payout confirmation, and other high-risk actions.

Include:

- Object name.
- Consequence.
- Recoverability.
- Destructive main action where appropriate.

## Sheet

Use for long workflows and high-density details:

- Payroll generation.
- Payroll detail.
- Long filtering or batch configuration.
- Multi-step preview.

Header stays fixed, content scrolls independently, footer is fixed or clearly at the workflow end.

## Dropdown Menu

- Use shared DropdownMenu.
- White surface, popover shadow, 6px radius.
- Item height: 32-36px.
- Dangerous items use destructive text, not a red-filled row.
- Main workflows should not be hidden in More.

### Item Spacing and Menu Width

- Menu item layout is `icon + label` on one row: icon-to-label gap is 8px (`gap-2`), horizontal item padding is 8px (`px-2`), vertical item padding is 6px (`py-1.5`). With the menu's own 4px content padding (`p-1`) this yields a balanced ~12px inset from the icon/label to the menu edge on both sides.
- Keep leading icons at 16px (`size-4`) and let them inherit item text color; destructive items tint the icon with the row.
- Size the menu to its content with a small floor (`min-w-28`, ~112px). Do not pin the menu to the trigger width (`w-(--radix-dropdown-menu-trigger-width)`): a row-action menu is opened from a 32px `...` icon trigger, so binding to the trigger width then forcing a larger fixed `min-w` strands short labels (e.g. `编辑配置`/`删除配置`) against a wide empty right margin. Content-driven width keeps the left and right insets symmetric.
- Anti-pattern: dropdown items where the icon-to-text gap, the left icon inset, and the right label inset visibly disagree, or where the menu is much wider than its longest label. Fix in the shared `DropdownMenu` component, not per page.

## Toast / Feedback

- Use toast for success, failure, save, delete, status update.
- Do not use browser alert/confirm/prompt.
- Long tasks need visible page state in addition to toast.
- Toast status should be carried by the icon, title, subtle tint, or whole weak border/ring. Do not add a thicker or colored single-side border stripe to a toast unless it is a deliberately documented structural edge.

## Empty / Loading

Loading:

- Use compact skeleton/loading rows.
- Button loading uses short text.

Empty:

- State what is empty.
- Provide the next action or filter adjustment.
- No mascots, illustrations, emoji, or marketing copy.
