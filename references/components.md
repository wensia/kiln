# kiln — Components

Use these component rules with `references/tokens.md`. Keep controls compact, stable, and built for repeated operations. Components shipped in the DS bundle (`window.AIDesignSystem_4c1727`): Button, Input, Select, Checkbox, DateRangePicker, Card, Badge, Table, ResourceCard, MetricStat, SidebarNav, SegmentedControl, Tabs. Sections below without a DS component (password input, dialog, sheet, dropdown, toast…) are sanctioned patterns built from the same tokens.

> **Focus policy:** Component focus states and focus-ring QA below assume the default `keyboard` policy from `SKILL.md`. If a product explicitly chooses `pointer-first`, apply its root-level Tab interception and focus-chrome override globally; retain the components' non-Tab keyboard protocols and their selected, active, and menu-highlight states.

## Centered Content Contract

Content centering is a reusable rendered-geometry contract, not a rule owned by a calendar, badge, or any other one component. Apply it whenever the design intent is that visible content sits at the center of an external container: centered text buttons, pure icon buttons, compact page/date/count markers, and centered status markers. Left-aligned triggers and controls whose content is deliberately distributed are outside this contract.

Declare the intent on the rendered elements:

```html
<!-- Pure icon button: discovered automatically. -->
<button aria-label="刷新">
  <svg aria-hidden="true">...</svg>
</button>

<!-- Text, mixed content, and compact markers declare their visible group. -->
<span data-center-content>
  <span data-center-ink>10</span>
</span>
```

- A semantic pure icon `button` or `[role="button"]` is automatically audited when it has no visible text and contains a visible SVG, image, canvas, embedded graphic, or descendant carrying CSS background/mask artwork. Forgetting data attributes must not let an icon button bypass centering QA.
- For centered text buttons, icon-and-label buttons, compact numeric/status markers, and other non-pure-icon shapes, `data-center-content` belongs to the external visual container whose border box supplies the center.
- Mark every visible member of the centered group with `data-center-ink`; multiple targets are measured as one union, so an icon-and-label button can mark both pieces without adding a component-specific rule.
- The mathematical check centers the union of the targets' rendered layout boxes inside the container border box.
- The visible-geometry check uses the actual internal graphic bounds for SVG and the loaded font's rendered text metrics for compact text. A centered SVG viewport with an off-center path, or a centered line box with an off-center glyph, still fails.
- `display:flex`, `place-items:center`, `line-height`, and similar declarations are implementation tools, not proof. Do not claim compliance until the runtime contract measures the rendered page after the primary Noto Sans SC webfont is ready.
- Do not repair a shared failure with a calendar-only selector, a one-off class-name exception, or an unexplained glyph-specific offset. Fix the reusable primitive or its typography, keep the declaration on the real outer/inner elements, and let the same contract cover every consumer.

`kiln/contract/runtime` discovers semantic pure icon buttons and explicit data-attribute declarations without knowing component class names. Missing `data-center-ink` on an explicit declaration, unmeasurable content, a displaced layout box, or displaced visible geometry fails `auditPage` with the measured axis deltas.

## Tooltip / Hover Disclosure

A tooltip is a short, non-interactive recovery or explanation layer. It must add information that the persistent surface cannot currently show; it is not a hover decoration, a navigation preview card, or a second rendering of nearby context.

Allowed uses are deliberately narrow:

- Restore a name removed by compaction, such as a pure icon button or a truly icon-only collapsed rail item. Keep the accessible name even when the tooltip is closed.
- Explain why a disabled control is unavailable and, when useful, what the user must change before it becomes available. The reason belongs in the tooltip, description, or `aria-describedby`; never merely repeat the disabled action's label.
- Reveal the complete value of text that is actually truncated at the current viewport. If the value fits, do not mount or open the tooltip.

Restraint rules:

- If the page name, control label, group, subtitle, badge, status, or value is already persistently visible, do not repeat it in a tooltip or hover popover. A compact rail with labels beneath its icons is label-bearing, not icon-only.
- Do not combine already visible page and group names into a richer-looking hover card. More chrome does not create more information.
- Essential instructions, consequences, and primary state do not belong behind hover. Keep them visible; hover has no reliable equivalent on touch.
- If the floating layer contains actions or interactive detail, it is a popover and must independently pass the element-qualification rule in `SKILL.md`. Do not promote a redundant tooltip into a popover to evade this contract.
- Opening or closing the layer must not resize its trigger, the sidebar, or the surrounding layout.

QA: inspect the default surface first, then hover and keyboard focus where the product focus policy permits. State which of the three allowed purposes the layer serves, verify that the information is absent from the persistent surface, and run the counterfactual deletion test. “The component library provides Tooltip” is not a purpose.

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
- Outline, ghost, and text-like actions stay neutral by default. Page, toolbar, detail, edit, follow-up, call, close, and reset actions must still be discoverable before hover; `ghost` should resolve to a neutral soft button with a weak visible surface such as `border-border/70 bg-muted/40 text-foreground`, or the action should use `outline`. Hover may raise contrast with `text-foreground`, a stronger muted background, or a border change; it should not jump to clay red unless the action is truly selected, active, focused, or destructive. This visible-rest rule governs standalone commands, not the contextual quiet controls explicitly defined by Password Input, table operation menus, Dialog chrome, and DataTable Pagination page numbers.
- Do not use transparent `ghost`, `border-transparent`, or primary-colored text to demote a visible standalone action. If the action is too minor for a button, render it as a real inline text link in surrounding copy; if it remains in a toolbar or detail header, give it a stable neutral button surface. Transparent rest styling is allowed only where the containing component already supplies the boundary and the component spec explicitly defines a quiet control.
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
- Focus rings are a composition contract, not only a component-state contract. An outward ring is clipped when the control is flush with an ancestor that uses `overflow-hidden`, `overflow-clip`, or a scrollport boundary. Give the control at least one ring-width of breathing room or switch that control to an inset ring (Tailwind: `focus-visible:ring-inset`); keep the primary focus signal intact.
- Do not fix a clipped focus ring by removing the ring or by globally changing a structural overflow rule. Inspect the nearest clipping ancestor first, choose the smallest local remedy, then focus the real control and verify that all four edges remain visible. A lint/build pass or an unfocused screenshot does not prove this state.
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
    className="button-quiet absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:bg-muted hover:text-foreground"
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
- This is an embedded adornment, not a standalone command: at rest the button is transparent and borderless. The input border is the containing affordance; adding a second resting rectangle inside it creates competing control chrome.
- Hover may add only a muted surface and foreground contrast. It must not change the button box, input padding, or input border.
- Under the default keyboard focus policy, keep a visible focus indicator that fits inside the input composition; under an explicit pointer-first policy, follow the product-level focus override without removing the show/hide semantics.

QA:

- Check both show and hide icons in default, hover, active, and applicable focus states.
- In computed styles, default `background-color` and `border-color` are transparent; hover uses the shared muted surface. Toggling visibility must not move the icon, text, or input edge.
- Verify the same rule on every password flow that consumes the shared component, including invalid inputs; an error border belongs to the input, never to the embedded icon button.

## SMS Code Input

The 发送验证码 action lives **inside the SMS-code input**, right-aligned, as a pure-text primary (clay) action — never a separate button beside the phone field.

- Phone field stands alone at full width; the helper line (请输入手机号 / 验证码已发送) sits under it.
- Code input reserves right space (`padding-right: ~96px`); the action is absolutely positioned at `right: 12px`, vertically centered.
- Action text: 13px / 500, `color: var(--primary)`; hover darkens slightly; no border, no fill, no underline.
- Cooldown state: the same slot shows `Ns` in muted foreground (tabular), non-interactive; width is reserved so the swap never shifts the input text.
- Disabled (phone empty/invalid): muted color, no pointer.

## File Input

A bare `<input type="file">` is rendered by the browser, not by the design system. Its button, its
未选择任何文件 filler text, its height, radius, border and focus ring all come from the UA stylesheet,
so none of the Input rules above can reach it. **Never expose the native rendering.** Keep the native
element in the DOM for label association and programmatic file setting, hide it visually, and draw the
control yourself.

This control has **two states with different jobs, and therefore two different shapes**. Do not try to
serve both from one 36px row — that is what produces the classic broken file field where a long
filename shoves the browse button out of its own border.

- **Empty — a drop zone.** Its job is to catch a dragged file and offer a click target. It needs a
  landing area, so it is a panel (`--radius-card`), not a control.
- **Selected — a file chip.** Its job is to confirm what was chosen and offer removal. The filename is
  now content, so the shape collapses back to control height and control radius.

Structure:

```tsx
{file ? (
  <div className="file-chip">
    <div className="file-chip-text">
      <span className="file-chip-name">{file.name}</span>
      <span className="file-chip-meta">{kind} · {size}</span>
    </div>
    <Button variant="ghost" size="icon-sm" aria-label="移除已选文件" onClick={clear}><XIcon /></Button>
  </div>
) : (
  <button
    type="button"
    className="file-dropzone"
    aria-label="添加账单文件，可拖放到此处"
    data-dragging={dragging ? "true" : undefined}
    onClick={() => inputRef.current?.click()}
    onDragOver={…} onDragLeave={…} onDrop={…}
  >
    <span className="file-dropzone-main">把账单文件拖到这里，或点击选择</span>
    <span className="file-dropzone-hint">支付宝 .csv / 微信支付 .xlsx</span>
  </button>
)}
<input ref={inputRef} id="…" type="file" className="file-picker-native" tabIndex={-1} … />
```

Specs — drop zone:

- Minimum height ~88px. A drag target smaller than that is hard to hit; this is one of the few places
  where usability outranks workbench density. Dialogs sit at Focused density, which affords it.
- `1px dashed var(--input)` at `--radius-card`. The dashed edge is the conventional "drop here" signal
  and reads as a temporary boundary rather than a permanent structural one.
- Two lines only: the action line at `--text-body`, and the accepted formats at `--text-meta` in
  `--muted-foreground`. **No upload icon, no cloud glyph, no illustration.** Run the counterfactual
  deletion test: remove the icon and the zone still reads as a drop target, so the icon has not earned
  its place.
- Drag-over is a *state*, not an action: switch the border to solid `--primary` and the fill to
  `--primary-subtle`. Solid-on-hover reads as "let go and it lands here". This is the sanctioned use of
  clay under the active/selected semantics, and it does not count against the one-clay-action budget.
- The whole zone is the click target and is a real `<button>`, so keyboard users get it for free.

Specs — file chip:

- **Lay it out as `grid-template-columns: 1fr auto`, never as a flex row.** The remove button's column
  is sized first and the name column takes what is left, so a long filename can only truncate — it can
  never push the button outside the border. A flex row with `flex: 1` on the name relies on
  `min-width: 0` being right everywhere and fails the moment anything reintroduces intrinsic width.
  Long CJK filenames with timestamps are the normal case here, not the edge case.
- Name column carries `min-width: 0` plus `overflow:hidden; white-space:nowrap; text-overflow:ellipsis`.
- Second line shows file kind and size at `--text-tiny` / `--muted-foreground`, tabular figures. It
  answers "did I pick the right export?" — which is exactly the question a truncated filename raises.
- Height returns to the control ladder: `--radius-control`, `1px solid var(--input)`, `--shadow-input`.
- Remove is an icon-only `ghost` `icon-sm` button with a real `aria-label`. It sits inside a control
  boundary, so it is covered by the quiet-at-rest exception (see Dialog / Password Input).

Specs — the hidden native input (both states):

- Hide it with the clip technique (`position:absolute; width:1px; height:1px; clip:rect(0 0 0 0)`),
  **not** `display:none` or `visibility:hidden`. Those remove it from the accessibility tree and stop
  test runners from calling `setInputFiles` on it.
- Give it `tabIndex={-1}`. It stays reachable through the label and the visible trigger; leaving it
  tabbable creates two stops for one control.
- **Do not add `aria-label` to it** when a `<label htmlFor>` already names it. Two names on one control
  make `getByLabel` resolve to multiple nodes and break every query that targets it.
- **The visible trigger's accessible name must not collide with any other control on the page.** A
  toolbar 「选择文件」 plus an in-dialog 「选择文件」 is a strict-mode violation in tests and an ambiguous
  target for screen-reader users. Name the in-dialog trigger for the act (「添加账单文件」), not the outcome.
- Clear `input.value` when the user removes the file, or re-picking the same file fires no `change`.

QA:

- Check empty, drag-over, selected, long-filename, and disabled states.
- **The long-filename case is the regression test.** Load a real export name (CJK + date range +
  timestamp + extension) and confirm the remove button is fully inside the border and the chip height
  is unchanged. If it was built as a flex row, this is where it fails.
- Drag a file over the zone and confirm the border goes solid clay and the fill goes `--primary-subtle`;
  drag out and confirm it reverts. A drop zone that never changes on drag-over is indistinguishable
  from a dead area.
- Confirm automated tests can still select a file through the label, and that querying the field by its
  label returns exactly one node.

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

Calendar navigation:

- Use one in-place `day → month → year` view stack inside the existing dialog or sheet. Do not open a nested popover or Select for year/month navigation.
- Keep the display cursor separate from the selected range. Header clicks, arrow buttons, keyboard paging, and choosing a year or month update only the visible calendar and its view; they never create, clear, reorder, or clamp a selected endpoint.
- Every view keeps the same three-part header: previous button, center title slot, next button. Arrow buttons use the shared outline icon-button treatment. In day and month views the center title is a real neutral Button with a visible rest surface, not passive text or a hover-only affordance; in year view the ten-year interval is a non-interactive label because there is no higher-level view to open. That label keeps the same center-slot dimensions as the actionable titles so the header never jumps.
- Day, month, and year bodies share one stable content-region height. Switching views must not resize the dialog or bottom sheet; sparse higher-level grids align inside the same footprint as the six-week day grid.

Day view:

- Arrow buttons move one month and are labelled `上个月` and `下个月`.
- The title shows `YYYY 年 M 月`, uses tabular figures, and exposes the displayed value in its accessible name, such as `选择年月，当前 2026 年 8 月`; activating it opens the month view for that displayed year.

Month view:

- Arrow buttons move one year and are labelled `上一年` and `下一年`.
- The title shows `YYYY 年` and exposes the displayed year in its accessible name, such as `选择年份，当前 2026 年`; activating it opens the year view containing that year.
- Render all twelve months as a compact grid of real buttons. The displayed month carries the selected/current state; choosing an enabled month updates the display cursor and returns to day view without selecting a date.

Year view:

- The title shows the active ten-year interval, such as `2020–2029`. Arrow buttons move one decade and are labelled `上一个十年` and `下一个十年`.
- Use a twelve-cell year grid: the ten years in the active interval plus one adjacent year at each edge. Adjacent-interval years stay visually secondary but remain selectable when within bounds.
- The displayed year carries the selected/current state; choosing an enabled year updates the display cursor and returns to month view without selecting a date.
- Month and year cells reuse the date button's radius, typography, hover, focus, disabled, and selected-state language. Do not invent a second control style for the higher-level views.

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
- In day view, `PageUp` / `PageDown` move one month; adding `Shift` moves one year. These shortcuts change only the display cursor, use the same bound checks as the header buttons, and must not scroll the page behind the picker.
- Month and year grids use roving focus: arrow keys move between cells, and `Enter` / `Space` activates the focused cell. After a view transition, focus the displayed enabled month/year or the corresponding enabled date rather than resetting focus to the dialog frame.

Bounds:

- Propagate `minDate` / `maxDate` through every view. A date outside the range is disabled; a month is disabled when it contains no enabled date; a year is disabled when it contains no enabled month.
- Disable a previous/next control when its destination month, year, or decade contains no enabled value. Do not allow navigation into an all-disabled view and do not silently change the selected range to satisfy a bound.

QA:

- Verify direct multi-year jumps, December/January rollover, both directions of decade paging, and selection of the adjacent-interval years.
- Start with an existing complete range, browse through day/month/year views, then return; both endpoints and the selection summary must remain byte-for-byte unchanged until a date button is activated.
- Exercise exact `minDate` / `maxDate` edges, entirely disabled months/years, disabled navigation controls, and a range whose endpoints lie in different years.
- Run the same pointer and keyboard flows in the desktop dialog and mobile bottom sheet, including narrow-height composition. Check title/button accessible names, disabled semantics, roving focus, visible focus rings, and focus restoration after every view transition.

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

Creating a new record from a select — one combobox, not two fields:

- When a form field means "pick an existing record or create one on the spot" (contact, customer, tag), use a single **creatable select**: a text input combobox whose dropdown both filters existing options and offers creation. Do not split it into a select holding a "新建…" sentinel option plus a conditional name input below — that is two controls for one decision, the sentinel costs a row in every dropdown, and the pair forces a second label ("联系人名称") for what is the same value.
- The input shows the selected option's label, or the free text when creating. Typing filters options by case-insensitive substring and appends one create row (`新建"<text>"`, muted with a small plus icon) whenever the trimmed text has no exact label match; an exact match suppresses the create row so the existing record is chosen instead of duplicated.
- Picking an option fills the input with its label and clears the free text; typing after a selection switches back to create mode (the selection clears, the edited text becomes the pending new name). Validation treats "selected id" and "trimmed non-empty text" as the two valid states of the same field.
- Keyboard: ArrowUp/ArrowDown open the popup and move the highlight, Enter chooses the highlighted row, Escape closes the popup only — never the surrounding dialog. Radix layers dismiss on a **document capture-phase** Escape listener, so a React `onKeyDown` + `stopPropagation` on the input is too late; register the popup's own Escape handler on `document` with `{ capture: true }` from the component's effect (child effects register before the layer's) and `preventDefault()` there.
- The popup reuses the select dropdown's visual language exactly — card radius, popover shadow, item padding/highlight, check indicator on the selected option — anchored to the input's left edge at full trigger width. With zero options and no query, still render the listbox with a muted hint row so the control never looks broken.
- Ship this once as a shared component (e.g. `CreatableSelect`, taking `value / text / onSelect / onTextChange / options`) rather than per-page wiring. Where the backend cannot create from that flow (an edit form that only accepts an existing id), keep the plain Select — do not offer creation the submit path would silently drop.

## Field Group

- Use FieldGroup, Field, FieldLabel, and FieldDescription.
- Label: 12-13px / 500.
- Field gap: 12px.
- Description must add decision value.
- Error text stays below the field.

## Field Width

`Input` and `SelectTrigger` ship with `width: 100%`. That is an implementation default, **not a layout intent** — the mount decides the width, and a form column is not automatically the right width for every field inside it.

Size the control by the payload it can hold, not by the space available:

| Payload | Width (Tailwind) |
| --- | --- |
| Numeric, short code, duration, port, percentage — 2-4 chars | `max-w-28`–`max-w-32` |
| Short text — slug, person name, phone | `max-w-xs`–`max-w-sm` |
| Medium — title, email, a select over named records | `max-w-sm`–`max-w-md` |
| Long free text — URL, path, description, search | full width |

- Small fields sit **side by side in a grid**; they do not each claim a row.
- A label-plus-Switch row is the same rule at its limit. A switch's payload is one bit, so the row caps its own width (`max-w-md`) and never stretches `justify-between` across the container. Uncapped on a wide screen, the label lands at the far left and the switch at the far right with hundreds of px of nothing between them — proximity is destroyed, and the eye must cross the viewport to learn which switch it is about to flip.
- Do not lengthen a placeholder to justify a box the real values never fill. If the placeholder is the widest thing the field will ever hold, the field is too wide and the placeholder is probably restating the description.

Why this misleads rather than merely looking loose: **a control's width is a claim about its content.** Users size their expectation by the box before they read the label, so a 1400px input that accepts three digits reads as a text area mysteriously refusing longer input — and it strands the caret and the spinner arrows hundreds of px apart.

The test: type the longest legitimate value into the field. **If the box is still mostly empty, it is too wide.**

Anti-pattern: every field in a form column inheriting that column's full width regardless of payload; a full-width numeric input; a settings toggle stretched edge to edge.

## Mutually Exclusive Options

Two options that cannot both be true (claim it / write it off, keep in pool / release to pool, schedule / mark unreachable) form **one relationship**. Both ends must express it **the same way**.

- **Both ends stay visible and get disabled.** Never disable one end and *hide* the other. A hidden control cannot say why it left, and the user is not told the two things were ever related — they just see a gap where a choice used to be.
- **A disabled control must say why it is disabled**, in the place the user is already looking (tooltip, description line, `aria-describedby`). "Disabled and silent" is a dead end: the user knows they cannot proceed and does not know what to undo. Swap the affordance's description for the reason while it is disabled — the reason is more useful than restating what the action does.
- **Never let a control disappear as a side effect of another control's state.** Layout that reflows on every toggle costs the user their spatial memory of a form they use hundreds of times a day.

Why this is a rule and not a preference — a real failure it caused:

> A follow-up form had 「认领线索」and 「作废资源」as mutually exclusive checkboxes: ticking 作废 **disabled** 认领, ticking 认领 **hid** 作废. Later a refactor removed 认领 entirely for one channel. **Nobody noticed for two days** — because in that form, a checkbox that isn't there is *the normal state*. Advisors called leads they could no longer claim; the work was silently discarded 3 days later by an expiry job. Had both ends merely been disabled, "认领 is gone" would have been visible on day one.

Hiding does not just hurt this interaction. **It destroys the signal that would have told you the feature broke.**

The test: if a control can vanish because of another control, ask whether the user can tell the difference between *"it disappeared"* and *"it was never here"*. If they cannot — and they cannot — disable it instead.

Boundary — this is about **mutually exclusive options within one decision**, not about conditional fields:

- A field that only exists once a branch is chosen (「作废原因」under 作废, 「下次跟进时间」under 可持续跟进) **should** appear and disappear: it has no meaning in the other branch, and showing it disabled would imply the user could fill it in if they undid something else. Reveal those.
- The line: if the option is a **peer choice** in the same decision, disable it. If it is a **dependent detail** of a choice already made, reveal it.

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

Surface:

- **The row is the surface, not the container.** `--card` belongs on `[data-slot=table-row]`; the scroll frame carries no background at all. Paint the frame instead and a fitted dock's empty area — everything below the last row, where there is no data — is white as well: you removed the card and kept a card-shaped slab. With the surface on the row, rows are white and anything that is not a row is canvas.
- It also keeps the four row states honest. Zebra, hover, selected, and every frozen cell's background all mix into `--card` and all paint per row; one surface, one owner. A container-level background is a second owner that nothing can override.
- The frame's only edge is its `border-b` — the viewport's closing line, which doubles as the divider above the pagination strip. That is a structural edge, not card chrome.

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
- Everything else in the row collapses into a single `MoreHorizontalIcon` / `...` dropdown trigger — **whatever the count, including exactly one**. Never a text link, an outline button, or a row of icon buttons in the operation column. The row-level key action sits outside that count: the canonical shape is **`[ 主动作 ]` (ink) + `[...]`**.
  > **One action is not an exception.** This rule used to read "one → a low-weight text/outline action; two or more → `...`", and the single-action branch is what broke pages: a text button carries its label's width into a column sized for a 32px trigger, so a frozen operation column clips it (`编辑调用目…`) while every token and class name still looks correct. A column whose width depends on the longest Chinese action label has no stable width at all. Sizing the column to the label instead is the other half of the trap — that is the oversized operation column this file already forbids. The trigger is fixed-width; the label lives in the menu, where it can be as long as it needs to be.
- Header and body content are horizontally centered by default. If a product has a deliberate frozen far-right operation column, the header and trigger may be right-aligned, but they must still share the same alignment.
- The dropdown trigger uses **quiet ghost** icon-sm: 32px box, 4px radius, muted icon color. At rest it is **transparent — no background fill, no border**; hover shows only a muted background (`--muted`). The standard ghost variant (which carries a visible border and tinted surface per the ghost-visibility rule) is wrong here: inside a table row it creates a grey rectangle per row that fights the zebra and hover row states. If the shared ghost button has a visible rest surface, expose a `quiet` modifier that strips the border and background for table/timeline triggers.
- A frozen far-right operation column with only the `...` dropdown trigger should normally be 56px wide: 32px trigger plus symmetric cell padding. Keep width, min-width, and max-width aligned so the table does not distribute spare width into the operation column.
- Menu items are text actions.
- Dangerous actions use destructive menu variant.
- Never show icon buttons side by side in a data table operation column, and never show a bare text/outline action there even when the row has only one — it goes in the `...` menu.
- Frozen operation columns need a left border, and a frozen scroll shadow per the rule below.
- The right edge of a frozen operation column should sit flush with the table container edge. If `scrollbar-gutter: stable` creates a blank strip to the right of a right-sticky column, remove that gutter for tables with a right-frozen operation column or compensate in the shared table component; do not hide the gap by widening the action column.
- If the row itself is clickable, the operation cell intercepts click and keydown for the whole cell.

Loading and empty:

- Loading renders **skeleton rows inside the real table** — same header, same columns, same widths — not a spinner in place of the table and not an empty body under a header. The column structure has to be final before the data lands, or the table visibly re-lays itself out the moment it arrives. Cap the skeletons at ~8 rows: a page size of 100 does not need 100 of them.
- The empty state lives **inside the scroll frame, under a header that stays**. The table and its columns remain; the empty block sits below them behind a top divider. An empty state that replaces the whole table deletes the columns the user was just reading, and 「no results」 then looks indistinguishable from 「page broken」.
- When pagination is enabled, its strip stays **mounted and disabled** during loading, never unmounted. Removing it changes the dock's height, so every fetch would shift the table's bottom edge.

Scroll frame and sticky layering:

- **One frame owns both axes.** The table's scrollport must be a single element that scrolls horizontally *and* vertically: the `ref`, the `overflow-auto`, and the `data-at-start` / `data-at-end` edge attributes all live on it, and any inner scroll wrapper the table primitive ships with is neutralized (for shadcn: `[&_[data-slot=table-container]]:overflow-visible`). Split the axes across two elements — vertical on the outer, horizontal on the inner — and the sticky header sticks to the wrong scrollport: it silently stops sticking, and the rows scroll under nothing.
- A frozen column's sticky offset is the sum of the widths of the frozen columns before it (plus the selection column when present). So **a frozen column needs an explicit width** — one sized by its content cannot be positioned, and the frame has no way to tell you.
- **z-index here is a contract, not a guess.** Three layers, and the crossing cell must outrank both: frozen body cells `z-20` < sticky header cells `z-30` < the cell that is *both* header and frozen — the selection/first-column corner — `z-50`. Leave the `<thead>` / `TableHeader` element itself neutral (`static z-auto`) and let the individual cells carry stickiness; a stacking context on the header row traps that corner cell underneath the body's frozen column, and the corner is exactly where the two overlaps meet.
- `overscroll-behavior: none` on the frame. Without it, scrolling a wide table to its horizontal edge hands the momentum to the page and the whole workbench slides sideways.

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
- Detect scroll position on **the frame that owns both axes** (see above) — the same element the sticky cells stick to. Read its `scrollLeft` / `scrollWidth` / `clientWidth` and write the edge state back onto it as data attributes (`data-at-start` / `data-at-end`) imperatively, so the CSS does the toggling and no React re-render happens per scroll frame. Do not measure one element and flag another: if the primitive still has a live inner scroll wrapper, the numbers you read and the cells you shadow belong to different scrollports.
- Re-measure on scroll, on container resize (`ResizeObserver`), and whenever rows/columns/loading change, since content width can cross the overflow threshold without the container resizing.
- Keep it subtle. The shadow should hint "you can still scroll" without pulling focus; if it reads as a heavy bar, narrow the width or lower `--shadow-sticky-edge` alpha before anything else.

## DataTable Pagination

Pagination is **one shared global component** — every paginated data table consumes it; never rebuild a per-page variant. Every table still uses DataTableDock. A genuinely short, fixed list may opt into `showPagination={false}`; that configuration is fixed for the table, never inferred from current row count, loading, or filters. For a non-selectable table with no footer actions, this mode omits the footer strip and `--table-pagination-height` from fitted-height calculations, keeps the viewport's closing border, and lets the viewport consume the freed space without changing the dock's outer height. A table that supports bulk actions keeps the fixed footer slot even when page controls are off: the slot shows the total at rest and hosts the contextual bulk group after selection, so selection never adds height or shifts the viewport.

- Height: `--table-pagination-height` (40px), and **the strip's own vertical padding is zero**. The strip is an invisible 40px slot — no background, no border of its own — holding 32px controls centered in it, which leaves exactly 4px above and below. That 4px is arithmetic, not a design choice: 40 minus 32, halved.
- **Spacing never lives on the strip.** The moment you pad the strip to make it breathe, its height stops being the token — a dialog table that sizes itself to N rows then computes one height while the strip renders another, and the table is permanently a few pixels short with nothing on screen to explain why. Put every gap *outside* the strip:
  - The **divider above** is the table viewport's own `border-b`. One line does two jobs: it closes the viewport (including the empty area below the last row in a fitted dock) and separates the table from the pagination. No margin between them — the line sits directly on the strip.
  - The **breathing room below** is the shell's bottom gap (12px), not the strip's padding. A page's bottom gap may be narrower than its top: the bottom of a work area usually holds nothing but this strip, and extra space there just pushes the last row of real content upward.
  - The fitted height is `--table-head-height + N × --table-row-height + 1px viewport border + --table-pagination-height`. Every term is a token or a real border. A raw pixel or a control height in that expression means a permanently wrong table.
- Horizontal insets align the strip with the table it belongs to: the total on the left sits on the same indent as the cells' horizontal padding, and the rightmost control's right edge lines up with the right edge of the last column's content. A strip whose text is flush against the canvas edge while the table is indented reads as two unrelated components.
- The 40px single-row strip is the **desktop** shape (total on the left, controls on the right). Below the `md` breakpoint the strip stacks — total on one line, controls on the next — and **drops the fixed height**. Forcing 40px on a narrow viewport either clips the controls or makes them scroll sideways.
  - The seven-slot window does not fit there either. A narrow viewport keeps **only the current page**, pushes the two arrows to the strip's outer edges, and states the span as `‹ 5 / 62 ›`. With no sibling numbers to be selected *against*, the clay fill stops being a signal and becomes decoration, so the current page reverts to plain text at that breakpoint. This is the same scarcity rule the anti-pattern list applies to actions, read for state.
- Pagination sits directly on the canvas with the table — not inside a card, and with no surface of its own. The white plane ends at the last row; the strip is on the canvas.
- Pagination is fixed to the bottom of the visible screen/work area; it must not move based on row count, filter results, or form/table data volume. Overflowing rows scroll **inside the table viewport** above it.
- Left side shows the total: 「共 N 条」(tabular). When the table is selectable **and M > 0**, the selection count rides in the same line (「共 N 条，已选 M 条」) — that strip is the only place the running selection total is stated. At M = 0 render only 「共 N 条」. Range strings like 「1–15 / 512」carry no decision value — do not render them.
  - The total is `white-space: nowrap` and does not flex. Between a narrow container and a full control group it will otherwise break mid-phrase, stacking 「共 / 268 / 条」into three lines and silently pushing the strip past its token height — the failure looks like a spacing bug and is actually a height-contract breach.
- Page navigation is a **fixed seven-slot window** — first page · gap · current page with one neighbour on each side · gap · last page (`1 … 4 [5] 6 … 62`) — flanked by **上一页 / 下一页 arrows pinned to the strip's two ends**. Seven slots is a constant, so the strip's width does not change as the user pages through it and nothing beside it shifts sideways. With ≤7 pages render them all and no gap appears; where a gap would elide exactly one page, render that page instead — an ellipsis must not cost more room than what it hides.
  - **The arrows are the whole point.** kiln used to argue that the neighbour numbers *are* prev/next, and cut the arrows as unearned. That was wrong, and the reason is mechanical: the window scrolls with the current page, so the number you just clicked is replaced by a different number. The one action users repeat is then the only one whose target moves. Measured across five consecutive next-page clicks, the old three-number window put the target in two places spanning 40px; a pinned arrow spans 0. Arrows disable at the boundaries — they never disappear, or the strip's width would change after all.
  - The first and last slots are **anchors, not shortcuts**. They exist to tell the user how far the collection runs. A window without them shows page 5 of something the user has no way to size.
  - Gaps are **static** (`…`, not a control). Click-to-jump-five-pages, as AntD does it, is undiscoverable and fails the counterfactual deletion test.
  - There is **no page-jump Select and no jump-to-page input**. Enumerating every page in a Select is the trap the previous spec set: a 624-page table renders 624 options, which is slower than paging to the page by hand. Precise long jumps are a filtering job, not a pagination job.
- Pagination is a tertiary strip — use the compact 32px tier: page-number buttons ~32px (12px tabular text), the page-size Select `size="sm"` (32px, still ≥120px wide); the current page is a selected state → clay fill (`bg-primary text-primary-foreground`); **every other page number is `quiet`** — transparent and borderless at rest, muted surface on hover. All controls in the strip share the same 32px outer height. Do not go below 32px — the Select trigger cannot render shorter.
  - Page numbers are a sanctioned **`quiet` exception** (see Interaction Is Quiet in `SKILL.md`). The others are quiet because a container already frames them; these are quiet because **a digit is its own affordance**. Seven outlined boxes in a row read as a toolbar, not as a page index. The prev/next arrows are *not* exempt — they are icon-only, so they keep the outline surface.
  - The page-size Select (`每页 N 条`, 20 / 50 / 100) is **optional per table**: render it only where changing density is a real job. Changing it returns to page 1. Leaving the user on page 30 of a list that just became 6 pages long is a bug, not a rounding error.
- Bulk actions stay inside the existing footer strip; a bulk-capable table always reserves that fixed slot, even with `showPagination={false}`. They do not create a second row or change the footer/dock height. On desktop they sit before the pagination controls when those controls exist. On narrow layouts collapse them into one compact bulk-action menu if both groups cannot fit, rather than stacking a new bar and shifting the viewport.
- The bulk action group is contextual: mount it only when at least one item is selected. With zero selected items, show neither disabled bulk actions nor an `已选 0 条` placeholder; the ordinary pagination/footer remains in place. Keep row and header selection controls available so users can enter the bulk-selection state.
- Selection scope must be explicit, and it has **two halves that do not match on purpose**: the header checkbox acts on **the current page only** (it selects or clears this page's rows), while the count in the strip is the **cross-page running total** — leaving a page does not drop what you picked there. Both behaviors are right; what breaks trust is showing one and meaning the other, so the count must be visible whenever at least one selection exists.

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
- The header close control is window chrome, not a page action. Render it as a quiet `icon-sm` button: transparent at rest with no border or resting background, a muted surface on hover, and the product's focus ring on keyboard focus. The visible-at-rest rule for `ghost`/close actions applies to page, toolbar, and detail surfaces, not to dialog/sheet header chrome.
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
- Leading icons are optional, but their grammar is **menu-wide**: every actionable item in one opened menu has a leading icon, or none of them do. Never mix an icon-bearing Edit row with a text-only Enable/Disable row; the missing icon reads as accidental indentation, not lower priority. Conditional labels and branches still count as the same item, so every rendered branch must preserve the chosen icon grammar. Destructive items are not an exception.

### Item Spacing and Menu Width

- Choose either `icon + label` or label-only for the whole menu. When icons are present, keep icon and label on one row: icon-to-label gap is 8px (`gap-2`), horizontal item padding is 8px (`px-2`), vertical item padding is 6px (`py-1.5`). With the menu's own 4px content padding (`p-1`) this yields a balanced ~12px inset from the icon/label to the menu edge on both sides.
- Keep leading icons at 16px (`size-4`) and let them inherit item text color; destructive items tint the icon with the row.
- Size the menu to its content with a small floor (`min-w-28`, ~112px). Do not pin the menu to the trigger width (`w-(--radix-dropdown-menu-trigger-width)`): a row-action menu is opened from a 32px `...` icon trigger, so binding to the trigger width then forcing a larger fixed `min-w` strands short labels (e.g. `编辑配置`/`删除配置`) against a wide empty right margin. Content-driven width keeps the left and right insets symmetric.
- Anti-pattern: mixed icon and text-only items in the same menu; dropdown items where the icon-to-text gap, the left icon inset, and the right label inset visibly disagree; or a menu much wider than its longest label. Fix shared spacing in the `DropdownMenu` component, and fix icon completeness in the menu's action definitions rather than hiding the mismatch with per-item padding.

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
