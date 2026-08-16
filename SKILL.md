---
name: kiln
description: Use this skill whenever the user asks to design, implement, review, port, or document a Chinese admin / workbench UI — SaaS backends, CRM, ERP, operations dashboards, data tables, sidebar navigation, form controls, date pickers — or the non-workbench surfaces of the same product: login, empty states, 404, report covers, release notes, system email, the product's front door. Also use it when they mention kiln, clay-red workbench styling, a paper/zine-like admin front page, or a reusable design spec. kiln turns a warm ceramic-glaze design language into concrete layout, token, component, and QA decisions across two layers, workbench and paper. Do not use it for selling/marketing composition unless the user explicitly wants this visual language applied.
allowed-tools: [Read, Write, Edit, Glob, Grep]
---

# kiln — 窑

> 陶土成器之所。这套系统的整个色彩体系 —— 陶土红 clay、窑青绿 teal、孔雀蓝 peacock、
> 暖琥珀 amber —— 都是窑里烧出的釉色：暖、低饱和、做旧、彼此和谐。
> 气质是一间安静而密集的控制室：信息价值第一，装饰最后。

Turn the kiln design language into concrete layout, token, component, and QA decisions for Chinese admin / workbench UI. This file holds the intent, craft rules, and workflow; exact values live in `references/` and are loaded on demand (see the Reference Files table below).

> **Where numbers are allowed to live.**
>
> | Layer | Raw values? |
> | --- | --- |
> | `tokens/*.css` | **Yes** — the machine-readable source of truth. |
> | `references/tokens.md` | **Yes**, but it is a *mirror* of those CSS files. Keep a check that fails when the two disagree; a spec table nobody verifies is just prose with numbers in it. |
> | This file, `readme.md`, and every other prose doc | **No.** Name the token, explain the intent, never restate the value. |
>
> Prose drifts from implementation silently. Upstream, the canvas colour was written three different
> ways — `readme.md` said one thing, `SKILL.md` said another, `tokens/colors.css` said a third — and
> whoever built from the drifted prose could only discover it by eye.
>
> A subtler trap: a spec table that gives values for *some* things and not others. If the colour rows
> carry hex but the elevation rows carry only a name and a purpose, whoever implements the shadows has
> no choice but to invent them — and inventing them is indistinguishable from reading them until
> someone renders the page. **Either give the value or point at the token; never leave a gap that
> looks like a spec.**

## Before You Design

Declare this font decision before starting UI work:

- The primary family is **Noto Sans SC, bundled as a webfont** (Google Fonts CDN, weights 400 / 500 / 600, loaded via the design system's `tokens/fonts.css`). It is the CJK family on **every platform — macOS/iOS included** — so rendering is identical everywhere.
- The system Chinese font stack in `references/tokens.md` is the **offline / load-time fallback only**, not the primary strategy.
- For fully offline / self-hosted targets, drop the Noto Sans SC `.woff2` files (400/500/600) into the project and point `@font-face` at them instead of the CDN import; keep the same family name so the fallback stack is untouched.
- Do not introduce any **other** webfont (display faces, serifs, rounded faces) unless the target product explicitly needs a brand font — and then document loading, fallback, and layout impact.

## Reference Files

Read this file first for intent and workflow, then load only what your mode requires (see Request Modes below). Do not preload all references.

| File | Read it when | What's inside |
| --- | --- | --- |
| `references/tokens.md` | Choosing color, type, spacing, radius, elevation, motion, or icons | Exact type, color, spacing, radius, shadow, motion, and icon tokens |
| `references/components.md` | Building buttons, inputs, password fields, date/time pickers, selects, badges, tabs, tables, pagination, resource cards, dialogs, sheets, dropdowns, feedback, or empty/loading states | Per-component specs, states, and QA |
| `references/layouts-and-pages.md` | Designing shells, sidebar (including the collapsed rail), toolbar, data table docks, editor layouts, overlays, or specific page types | Desktop/mobile shell, navigation, DataTableDock, editor shell, overlays, page blueprints |
| `references/platform-mapping.md` | Porting to React/Tailwind, plain CSS, design tools, dark mode, mini programs, or another project | Implementation and cross-project reuse mapping |
| `references/paper.md` | Designing login, empty states, 404, report covers, release notes, system email, or the product's front door | The paper layer: what it inherits, what it inverts, page blueprints, and its own contract |

## Request Modes

Route the request before reading anything else. These four modes take different inputs, load different references, and end on different definitions of done. Running the design workflow against an audit request is the most common way this skill produces confident, useless output.

| Mode | Trigger | Load | Deliverable |
| --- | --- | --- | --- |
| **Design** | A new page, flow, or component with no existing implementation | `tokens.md`, `components.md`, `layouts-and-pages.md` | Blueprint: shell, density, hierarchy, tokens, components, states, QA list |
| **Migrate** | An existing shadcn / Tailwind / admin project adopting kiln globally | All four references, then the Migration Gate below | Ordered migration steps, acceptance criteria, and both contract gates wired |
| **Audit** | A surface that already claims to be kiln, or a "this looks off, why" request | `components.md` plus the reference owning that surface | Evidence-based, ranked violation list, each finding citing the rule it breaks |
| **Port** | Deriving another product, brand, or platform from kiln | `platform-mapping.md`, `tokens.md` | Fixed / variable / residue split, then the mapped implementation |
| **Paper** | A surface in the product that carries no repeated work: login, empty state, 404, report cover, release notes, system email, front door | `paper.md`, `tokens.md` | Sheet composition: one subject, the whitespace budget, the single anchor, print material |

When a request spans modes — "switch us to kiln and redesign the records page" — run them in sequence and say which one you are in. Do not fold audit findings into a redesign: the user loses the ability to tell what was broken from what was merely changed.

### Design

1. Identify the page type and the primary user job.
2. Choose density before composing controls.
3. Apply the three-layer hierarchy.
4. Pick tokens from `references/tokens.md`.
5. Build with components from `references/components.md`.
6. Use shell and page structure from `references/layouts-and-pages.md`.
7. Check Anti-Patterns before finishing.
8. Verify text fit, table scrolling, focus states, action grouping, mobile recomposition, and computed token/radius/color output when relevant.

### Migrate

Run the Existing shadcn / Tailwind Migration Gate below, map implementation through `references/platform-mapping.md`, and finish by wiring both gates from Make the spec machine-checkable. A migration that cannot fail has not been verified, only asserted.

### Audit

1. **Collect evidence before judging.** Read what is actually rendered — the live page, a screenshot, or the component source — and record control heights, radii, fill colors, border usage, and copy. An audit that opens with a verdict is a preference, not a finding.
2. **Sort what you found into three piles.** Only the first is yours to report:
   - **Violation** — it breaks a rule this skill owns.
   - **Local decision** — the host product's own brand, domain, or business choice that kiln does not govern. Leave it alone; adopting kiln is not surrendering every decision to it.
   - **Residue** — an artifact of this one screen (placeholder copy, seeded data, a half-built feature) that must not be generalized into a rule for the product.
3. **Rank by blast radius, not by how much it bothers the eye.** A shared component variant outranks a page blueprint, which outranks one screen. A wrong shared `ghost` mapping is worth more than five drifting content insets.
4. **Cite the rule.** Every finding names the file and rule it breaks, so the fix is checkable and the finding is arguable. An uncited finding is taste.
5. Do not claim visual QA passed from lint or build alone.

### Port

1. Split the system before copying it — see Fixed / Variable / Residue in `references/platform-mapping.md`. Skipping the split produces one of two failures: a clone that cannot carry the target's own brand, or a dilution that keeps kiln's colors and loses its structure.
2. Map implementation through `references/platform-mapping.md`.
3. Re-run both contract gates inside the target project, against the target's own token file.

### Paper

1. Confirm the surface really carries no repeated work. A login page with a live data table on it is a workbench page wearing paper clothes — split it before styling it.
2. Load `references/paper.md`, and load `tokens/paper.css` **in addition to** `tokens/index.css`. Paper tokens are a second, explicit layer; a workbench page must not have them.
3. Decide the one subject before anything else. Everything else on the sheet is its footnote.
4. Spend the whitespace budget as continuous blocks, not as loosened line-height.
5. Place exactly one high-saturation anchor. It may change form — a block, a rule, a stamp, one red character — but never change count.
6. Use print material only: grain, rule, crease. No soft shadow — paper does not float on paper.
7. Verify with `npm run verify:paper` at both a desktop and a mobile viewport. The mobile band is the tight one, and that is not an artifact of the measurement: a narrow viewport is where a sheet quietly turns back into a shrunken workbench.

## Existing shadcn / Tailwind Migration Gate

When applying this design system to an existing shadcn, Tailwind, SaaS admin, CRM, ERP, or operations workbench project, do not stop at copying colors or setting `--radius`.

Required reference load:

- Always read `references/tokens.md`, `references/components.md`, and `references/platform-mapping.md` together.
- Read `references/layouts-and-pages.md` when shell, navigation, table docks, dialogs, sheets, or page rhythm are involved.

Required implementation checks:

- Keep `--radius` at the chosen global base, but map actual Tailwind utilities by role: `rounded-md` is the control radius (`4px`), `rounded-lg` is the card/popover/dialog radius (`6px`), and `rounded-xl` or larger is reserved for large panels up to `8px`.
- Audit existing `rounded-md` usage instead of replacing it blindly: buttons, inputs, select triggers, nav items, filter chips, and compact controls stay `rounded-md`; cards, page headers, metric strips, summary panels, dialogs, popovers, and data panels move to `rounded-lg` unless the target component has a stronger local convention.
- Ordinary filled actions use the ink/solid treatment (`bg-solid text-solid-foreground`). Clay red (`bg-primary`) is reserved for **the single key action of a flow** (e.g. the "新建…" entry on a resource-management page) and for active/current/selected/filter/focus/error/destructive semantics. If the host button component has only a `default` filled variant, make `default` solid and add an explicit `primary` variant for the key action and stateful filled controls. At most one clay-filled action per viewport — if everything is red, nothing reads as state. Which button gets which fill is **not a judgment call**: run the variant decision table in `components.md` (Button → Variant decision), first match wins.
- Do not claim the migration is complete after lint or build alone when the user asks about visual consistency. Inspect at least one representative live page or computed-style snapshot and verify: button/input/select radius `4px`, card/panel/dialog radius `6px`, ordinary filled action uses solid, and the key action / active / selected / focus / error state uses primary.

### Make the spec machine-checkable

Prose cannot enforce itself, and a human eye cannot audit a whole app. In a real port, wire two gates:

1. **Token contract** (build-time). Assert that every token the design system declares is defined, that nobody invented a token, and that business code contains no raw hex, no Tailwind palette colors (`bg-green-100`, `text-red-500`…), and no page-specific hard-coded pixel heights. Values must come from the design system, not from someone's reading of a paragraph.
2. **Rendered-style contract** (runtime). Drive the real pages and assert the browser's computed styles: the radius ladder, control heights, centered layout and visible-ink geometry for declared content groups, automatic centering coverage for semantic pure icon `button` / `[role="button"]` controls even when their author forgot the declaration, at most one clay-filled action per viewport, no clay and at most one fill inside a table row, white cards separated by shadow rather than border, warm-black shadows only, the font stack, the type-scale floor and ceiling, vertical grid lines markedly lighter than the row divider, and frozen columns that follow the row's highlight (this one requires actually hovering — a static computed-style sweep cannot see it).

kiln ships both, and runs them on itself: `scripts/verify.mjs` is the token contract, and `npm run verify:examples` drives `examples/workbench.html` — a page built only from `tokens/*.css` — through the rendered-style contract. Use that page as the reference for what these rules actually look like when followed, and as proof that they are implementable rather than merely stated.

The assertions themselves live in one place, `scripts/lib/runtime-contract.mjs`, exported as `kiln/contract/runtime`. The host template in `scripts/templates/` only declares which routes to visit and how to log in. Do not copy the rules into a project — the copy starts drifting from kiln the moment it is made, which is the same failure mode as restating a token value in prose.

The second gate is not optional polish — it is the **only** thing that catches composition errors. A component whose surface is a semi-transparent mix (a button-tab track, the topbar) is context-dependent: nest it in a white card instead of the canvas it was designed for and its contrast quietly collapses, while the tokens and the class names all still look correct. Cover **every** page and every tab; whatever the assertions do not visit is, in practice, unspecified.

## Product Position

kiln has two layers, and every rule in this file belongs to one of them.

**Workbench layer** — production tools. Whatever product adopts it, the UI should feel like a work surface:

- Compact, readable, and built for repeated operational use.
- Strong at scanning, comparing, filtering, editing, and auditing data.
- Quiet visual hierarchy with stable table, form, and navigation behavior.
- Reusable design decisions captured as tokens, components, and page blueprints.

Avoid marketing composition, oversized hero sections, decorative illustration, gratuitous gradients, and card-heavy section stacking.

**Paper layer** (`references/paper.md`) — everything in the same product that is *not* a workbench: login, empty states, 404, report covers, release notes, system email, the product's own front door. These surfaces used to be out of scope, so every product sourced them from somewhere else, and the style broke at the door between the login page and the first data table.

The paper layer inherits the glaze palette, the single-anchor rule, and the anti-decoration list unchanged. It inverts density, material, and the type ceiling: the ban is on **selling composition**, not on the product having a front door. Which layer a surface belongs to has one test — does it carry work the user repeats? Yes is workbench, no is paper.

The two layers load separately (`tokens/index.css` vs `tokens/paper.css`) so that their contracts stay sharp. Merge them and the workbench inherits a display type scale while paper inherits a 22px ceiling, which disarms both.

## Design Philosophy

### Workbench First

Design screens around the user's current job — whatever that job is in the host product. If an element does not help scan, decide, or act, remove or demote it.

### Structure Is Visual

Use shell layout, grid, spacing, table structure, whitespace, soft warm shadows, tabs, and semantic state to build hierarchy. Do not compensate with heavier shadows, larger cards, or more color.

Separation is **whitespace + soft warm shadow first, border last**. White surfaces (cards, tables, metric blocks) are borderless by default and float on the near-white canvas via `--shadow-card`; borders appear only where structurally necessary — form inputs, table row dividers, sidebar/topbar seams.

Container weight should increase only when the job needs it:

1. Spacing and alignment.
2. Divider (structural seams only).
3. Muted surface.
4. Borderless white card with `--shadow-card`.
5. Dialog, sheet, or popover.

A thin visible border is not a generic rung on this ladder — reserve it for inputs, row dividers, and real structural edges.

### Color Is Signal

The default canvas is warm near-white, the main surface is white, and the primary signal is clay red. Teal, peacock, and amber are semantic status colors. Color should encode state, focus, or the key action, not decorate the page.

Do not encode state by strengthening or tinting only one side of a border. Use icons, badges, whole-border/ring states, subtle tint, or text color instead. Reserve one-sided borders for real structural boundaries such as frozen table edges, split panes, or timeline rails.

### Chinese Admin Precision

Chinese admin UI should stay compact and precise:

- Body and table text: 13-14px.
- Page titles: 15-16px.
- Normal text: 400 weight.
- Active or selected text: usually 500, with rare 600 for strong active states (active nav plate, titles).
- Numbers, dates, money, and pagination use tabular figures.

The type scale has both a floor and a ceiling. Nothing goes below `--text-tiny`; nothing goes above `--text-data`, and that ceiling belongs to real dashboard numbers only. A 32px metric or a 40px page title is a hero, and this is not a landing page.

### Every Element Must Earn Its Place

Every visible element in a workbench needs a task reason. This applies equally to components, copy, icons, badges, cards, dividers, decorative marks, and hover layers. An element qualifies only when it helps the user:

- identify or scan the object they are working with;
- make a decision or perform an action;
- understand a state, consequence, or next step;
- recover information deliberately hidden by a compact layout; or
- prevent a likely error.

Run the **counterfactual deletion test** before adding or approving it: remove the element and repeat the task. If task capability, state visibility, decision quality, consequence understanding, and error prevention are all unchanged, the element has not earned a place. Delete it; if it carries real but tertiary value, demote it into existing nearby context instead of creating another component or layer to host it.

An empty component slot, spare whitespace, a component-library default, or the fact that an element is easy to render is never a qualification. Do not add a subtitle because the card API accepts one, an icon because the metric looks bare, a badge because a status variant exists, a divider because two blocks happen to be adjacent, or a tooltip because a trigger already has hover state.

Workbench copy follows the same gate: it should help the user decide, act, or understand a state. Do not add filler text just because a component has a subtitle slot.

No emoji, and no decorative Unicode glyphs as content.

Avoid explanatory copy that only describes implementation, data plumbing, or obvious screen structure, such as:

- "真实读取最近 100 条记录。"
- "外部系统记录，最近 20 条。"
- "这里展示当前记录的相关信息。"

Use helper text only when it changes user behavior or prevents a real mistake:

- Empty states: explain why there is no data and what can happen next.
- Error states: identify what failed and whether retrying is useful.
- Destructive, paid, external, or irreversible actions: state the consequence.
- Ambiguous metrics: clarify the time window, denominator, or source only when users would otherwise misread the number.

If a title, badge count, table columns, empty state, or visible control already communicates the meaning, delete the subtitle.

### Reusable Before Bespoke

When a visual decision appears more than once, turn it into one of these:

- Token.
- Shared component.
- Component variant.
- Page blueprint.
- Skill reference rule.

Avoid one-page visual patches that cannot travel.

Pagination is the canonical case: it is **one** shared global component that every paginated data table consumes. A pager hand-rolled inside some panel is not a local convenience, it is a second source of truth that will drift. Every data table still uses DataTableDock; a genuinely short, fixed list may explicitly disable page controls without replacing the dock or inventing another footer.

## Craft Rules

### Three-Layer Hierarchy

Every screen should have at most three layers:

| Layer | What | How |
| --- | --- | --- |
| Primary | Main task or main data | Position, density, current state, one clear action |
| Secondary | Filters, context, supporting actions | Normal text, weak surfaces, quiet controls |
| Tertiary | Metadata, timestamps, counts, low-frequency tools | 11-12px, muted color, edge placement |

If two regions compete, demote one by reducing color, size, contrast, or proximity.

### Density Ladder

Choose density by screen type:

- Dense: data tables, bulk actions, pagination, inline editing.
- Standard: resource management, settings, connection setup.
- Spacious: overview metrics, empty states, editor canvas.
- Focused: dialogs, sheets, confirmation flows.

### Typography Budget

Per page, stay near:

- One page title size.
- One body/table size.
- One metadata size.
- One metric size.
- Two or three weights.

When tempted to add a new size, try spacing, opacity, or placement first.

### Interaction Is Quiet

Interaction states should be visible and stable:

- Transitions run about 120-200ms ease and act on background, color, border, shadow, and the tab underline / metric marker — see the Motion table in `references/tokens.md`.
- Hover changes background, border, or text color. The **only** sanctioned hover lift is the resource card: shadow rises to `--shadow-card-hover` plus a 1px rise; nothing else lifts or scales.
- Declare one focus policy per product before implementation:
  - **`keyboard` (default):** retain native `Tab` / `Shift+Tab` traversal and a clear `:focus-visible` ring.
  - **`pointer-first` (explicit product opt-in):** have the application root install one `document` capture-phase `keydown` handler. For `event.key === "Tab"` (covering both `Tab` and `Shift+Tab`), call `preventDefault()` and `stopPropagation()` so neither the browser nor a component library can move focus. Suppress shared `:focus` / `:focus-visible` outline and ring styles at the root rather than patching individual controls. Pointer/click focus for typing and text selection remains available; preserve component-specific `Arrow`, `Enter`, `Space`, `PageUp`, and `PageDown` protocols and all selected/active/menu-highlight states. Verify that `Tab` and `Shift+Tab` leave `document.activeElement` unchanged and that programmatic focus has no outline or ring. This opt-in supersedes ordinary visible-focus-ring QA in this skill and its references.
- Loading disables repeat actions and uses short Chinese progress text.
- Text action buttons use the shared full-size/default button unless the layout has an explicit compact requirement such as a dense toolbar, table operation cell, inline chip, or embedded input adornment.
- `ghost` and other weak button variants must still be visible at rest in admin/workbench UI. If an action is important enough to render as a button, its default state needs a discoverable neutral surface such as a weak border, subtle muted background, or established inline-link styling. Do not make page, toolbar, detail, edit, follow-up, call, or close actions rely on hover-only affordance. Some contextual controls stay quiet (transparent and borderless at rest): overlay chrome such as dialog/sheet header close controls; icon-only controls embedded inside an input boundary such as password visibility toggles; table operation menu triggers; and the non-current page numbers in a pagination strip. The first three are discoverable because a container already frames them and the icon carries the meaning; the last because a digit in a row of digits is its own affordance, and outlining all seven would read as a toolbar. Hover may add a muted surface, and the active focus policy still applies. See Dialog, Password Input, and DataTable Pagination in `references/components.md`.
- Pure icon buttons next to default-height inputs, search inputs, selects, or date triggers must use the same 36px outer box and control radius. Use 32px `icon-sm` only when the whole control group is compact or embedded.
- Adjacent controls in the same toolbar row must share the same visible outer height. Measure segmented filters and button groups by the outer track, not by the child trigger: a default toolbar segmented track is 36px outside (`1px` border + `p-px` + 32px triggers), and sibling refresh/action/select/search controls must also be 36px unless the whole toolbar is explicitly compact.
- In a workbench viewport, do not show two same-semantics refresh/sync/reload controls at different levels. Keep one authority, usually the page or toolbar action. If a nested panel truly needs its own refresh, label it with a distinct object and make the scope visually and textually explicit; icon-only duplicates are not acceptable.
- Hover and focus must not change control dimensions.
- In the `keyboard` focus policy, a visible focus ring must also survive composition. When an input, select, or button sits flush against an ancestor with `overflow-hidden`, `overflow-clip`, or a scrollport edge, do not let an outward ring be cropped: add a ring-width gutter or use an inset focus ring locally. Do not remove the ring, and do not weaken structural overflow just to hide the symptom. Verify all four ring edges on the rendered page, not only the component in isolation.
- Pagination in table workspaces stays pinned to the bottom of the visible work area, independent of table/form data volume.
- The app shell owns the page bottom breathing gap. Data-table and workbench route roots should not add one-off `pb-*`, margins, or spacer divs to tune the final panel's distance from the browser bottom.
- Dialog content workspaces for detail, configuration, selector, import preview, and other data-heavy flows use a fixed height; header/footer stay fixed and only the body viewport scrolls.
- Dialog and AlertDialog frames keep viewport breathing space when width or height is constrained: use shared safe margins instead of letting business `w-full`, `w-screen`, or large `max-w-*` classes touch the browser edges.
- Data tables use a fixed-height viewport in dialogs, sheets, tabs, and table docks; data volume, loading, empty states, filters, and tab changes must not resize the table.
- Data table body rows keep visible bottom dividers, including the final data row.
- Frozen far-right operation columns stay content-sized, not spacer-sized. A single `...` dropdown trigger normally needs only a 56px column: 32px trigger plus symmetric cell padding. Do not use an oversized operation column or a reserved scrollbar gutter to create right-side breathing room; the sticky cell's right edge should close against the table container edge.
- Adjacent metric, summary, filter, and reason strips inside the same panel or dialog header must share the same outer width and horizontal content inset. Do not mix one strip at `px-2` with neighboring strips at `px-3` or `px-4`; align the first visible label and preserve matching right padding before claiming visual QA passed.
- Avoid bounce, scale hover, scroll-jacking, decorative animation, and layout shifts.

### Data-Dense Variety

Use different forms for different data jobs:

- Metric card for a small number of core KPIs.
- Summary strip for aggregated table context.
- Data table for comparison and operations.
- Ranking list for top-N.
- Heatmap for date/person density.
- Financial card for payroll batches.

Do not turn every datum into a statistic card.

Short supplemental fields, imported declaration values, and field-by-field comparison states should not become mini cards when each item contains only a few words. Keep them close to the source/detail table row and render them as compact inline field groups: label, value, state badge, and optional small action in one stable strip.

Metric and summary strips should earn every visible glyph. If an icon only repeats the label, decorates a number, or consumes space without improving recognition of state, source, or action, remove it and let typography, alignment, dividers, and semantic color carry the hierarchy.

## Output Contract

In Design and Migrate modes, make these decisions concrete (Audit and Port have their own deliverable shapes — see Request Modes):

- Shell: desktop workbench, mobile shell, editor shell, dialog, sheet, or connection panel.
- Page pattern: overview, resource management, data table, editor, payroll, external integration, or mobile card list.
- Tokens: background, foreground, primary, status colors, spacing, radius, typography, shadows.
- Implementation mapping: Tailwind radius roles, shadcn variants, shared component overrides, and which local utilities/classes must be changed.
- Components: button, input, password input, date/time picker, select, badge, tabs, table, dialog, sheet, dropdown, toast, empty/loading state.
- States: default, hover, focus, disabled, loading, empty, error, mobile, and narrow-height.
- QA: which viewports and interactions must be checked.

## Anti-Patterns

This list is also the Audit mode checklist: each entry is a finding you can cite.

Avoid:

- Components, copy, icons, badges, cards, dividers, decorative marks, or hover layers that fail the counterfactual deletion test — especially elements added only to fill a slot or blank area, repeat nearby information, or expose a component-library feature. If removing it changes no task capability, state visibility, decision, consequence understanding, or error prevention, remove or demote it.
- Purple-dominant themes, decorative gradients, floating blobs, or arbitrary stock backgrounds.
- Cards inside cards, especially around data tables; data tables and their pagination wrapped in card chrome.
- Heavy or cold (slate/blue-tinted) shadows; shadow color stays warm black `rgba(54,47,42,·)`. **Never hard-code a shadow inside a component — always consume an elevation token.**
- Restating a hex, shadow, or pixel value in prose when a token already owns it. Prose drifts; the token does not.
- Borders as the default separation device where whitespace + `--shadow-card` should carry the layering.
- Local hex colors in business UI, and Tailwind palette colors (`bg-green-100`, `text-red-500`, `text-neutral-600`…) used as status colors. Status goes through the semantic tokens, or the same "success" ends up a different green on every page.
- Hero type in an admin page: a page title above 16px, or a metric above `--text-data`.
- Class names that no stylesheet defines. A dead class silently does nothing, and the value you believed it carried was never applied to anything.
- One-sided border accents such as thicker or colored `border-left`, `border-right`, `border-top`, or `border-bottom` used as a generic status signal. Unless it marks a real structural edge, it reads as artificial; use icon, badge, whole-border/ring, subtle tint, or text color instead.
- Solid pure-ink (`--solid`) 1px borders as hover/active/open feedback on controls. 非必要不用纯黑实线：hover stays soft (`border-foreground/25`), open/focus uses the clay-tinted border + soft ring; strong dark lines are reserved for real structural edges.
- Embossed / 3D button treatments — inner top highlights, bevel rim borders, offset press shadows, pill-relief CTAs. 项目只用平铺填充；depth belongs to surface shadows, not control bevels.
- More than one clay-filled action in a viewport; clay used to make ordinary commands louder. (State fills — the active nav plate, the current page in pagination — are signals, not actions, and do not count against that budget.)
- **Any clay fill inside a table row**, or more than one filled button in a row. A row-level key action is ink, exactly one per row; clay repeated down twenty rows destroys the signal everywhere in the product. Conversely, a table page whose work is entirely per-row and which therefore has *no* clay is fine — do not invent a page-level clay button to fill the void.
- Resource package selection cards with thick primary borders, clay-filled corners, CTA-style selected badges, heavy shadows, or strong tinted backgrounds. Selected package cards should stay quiet: one thin selected signal plus a small check indicator is enough.
- Short field comparison or imported declaration values displayed as large grid cards with only a label, a few Chinese characters, and a status badge. Use compact inline field groups inside the relevant detail row instead.
- Any **non-key** action rendered directly in a data table operation column — icon buttons side by side, or a bare text/outline button. Secondary row actions go in one `...` dropdown trigger **regardless of count, one included**; a label rendered in the cell makes the column's width depend on the longest Chinese action name, which either clips the button or bloats the column. The one sanctioned direct action is the ink-filled row-level key action defined in `references/components.md`; it sits beside, not inside, that menu.
- Mixed leading-icon grammar inside one dropdown menu — for example, an Edit item with a pencil icon beside a text-only Enable/Disable item. Icons are optional, but one opened menu must use them on every actionable item or on none; conditional and destructive rows do not create exceptions.
- A 32px icon-only button sitting beside 36px inputs, search boxes, selects, or date triggers in the same toolbar. Match the default control height, or make the entire group explicitly compact.
- A 38px segmented/filter track (`32px` child controls plus `p-0.5` and a border) sitting beside a 32px or 36px sibling button. The track's visible outer box is the control, so set the track to the toolbar height and adjust padding before claiming sibling controls are aligned.
- Duplicate refresh/sync/reload controls in the same viewport, especially a page-level text refresh plus a nested icon-only refresh whose scope is not obvious.
- Transparent or hover-only `ghost` buttons for visible page/detail actions such as edit, follow-up, call, close, reset, or toolbar commands. Use a neutral soft/outline surface at rest instead. (Exempt and quiet by design: dialog/sheet header close chrome, icon-only controls embedded inside an input boundary, table operation menu triggers, and non-current pagination page numbers. A pagination strip's prev/next arrows are not exempt — being icon-only, they keep the outline surface.)
- An "全部xxx / 不限" option used as the way to clear a filter select. Clearing lives in the trigger: placeholder = unfiltered, and choosing a value swaps the chevron for an X (`span[role=button]`, not a nested `<button>`). An edit form's "暂不选择 / 保持原状态" is the opposite case — that is a real value, not a filter clear, and it stays an option.
- Form fields that inherit their column's full width regardless of payload — a full-width numeric input, a settings toggle stretched edge to edge, a placeholder padded out to justify the box. A control's width is a claim about its content; size it to the longest legitimate value (see Field Width in `references/components.md`).
- Password fields without a show/hide button.
- Date strings typed manually when a date picker is expected.
- Huge explanatory copy that repeats visible controls; emoji or decorative Unicode as content.
- Filler subtitles that describe implementation details, data source mechanics, or fetch limits instead of helping the user decide or act.
- A standalone record-detail route with a second body header band that only repeats shell context — an eyebrow/breadcrumb plus a generic “详情” title — or owns a duplicate body back button. Put the single visible back action in the global topbar, let the primary record surface own the entity name/status/business metadata, and keep only one visible title/context authority plus one shell/body top-gap owner. See `references/layouts-and-pages.md`.
- Table pages that resize with row count instead of using a stable scroll dock.
- Page-level data-table or workbench roots that add ad hoc bottom padding, margins, or spacer divs instead of inheriting the shell's bottom gap token.
- Pagination that moves up, down, or disappears based on table/form data count instead of staying fixed at the screen/workspace bottom. A pager rebuilt by hand anywhere in the app instead of consuming the shared component — the shared one already carries prev/next arrows, so what is banned is the second implementation, never the arrows.
- A page-number window that scrolls without pinned prev/next arrows, or that enumerates every page in a Select. Both make the repeated action — one page forward — the one control whose position or cost grows with the collection. See DataTable Pagination in `references/components.md`.
- Data-heavy dialogs whose outer height changes when switching tabs, loading data, showing empty states, or changing row count.
- Dialog or AlertDialog frames that touch the viewport edge in split-screen, DevTools, mobile, or narrow-height contexts; ordinary dialogs must keep shared left/right and top/bottom breathing space, while true fullscreen workflows should use a Sheet or an explicit fullscreen exception.
- Data tables that use only `min-height` and let row count or empty/loading content resize the table instead of a fixed viewport.
- Data tables whose final data row loses its bottom divider through `last:border-0` or equivalent overrides.
- Vertical grid lines carrying the same visual weight as the row divider — the newspaper grid. The row divider is the structure; a column line, where a data-dense table earns one, must be markedly lighter (≤60% of its weight) or absent entirely. (Structural edges — a frozen column edge, a pivot table's group boundary in the header — are edges, not a grid, and are exempt.)
- Stacked metric/filter/reason strips whose left or right content inset visibly drifts between rows.
- Decorative icons in metric cards, statistic strips, summary strips, or filter strips when the label and value already communicate the meaning.
- Oversized frozen operation columns or right-sticky action cells that stop short of the table container edge, leaving a blank gutter to their right.
- Operation columns that do not intercept row click/key events.
- Frozen-column shadows painted as a `box-shadow` on the cell (silently dropped under `border-collapse`) or shown permanently regardless of scroll position, instead of a gradient pseudo-element that only appears while hidden content remains on that side.
- Claiming visual QA passed after only lint/build when the user asked for page-level verification.

## Testing Guidance

This skill includes `evals/evals.json` with smoke prompts. For a full skill-creator loop, run those prompts with and without the skill and compare whether the output:

- Uses the correct tokens and component patterns.
- Avoids marketing-page composition.
- Applies table, sidebar, form, date picker, and action menu rules accurately.
- Produces reusable design guidance rather than one-off styling.
