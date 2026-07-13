# 在一个项目里落地 kiln

这份指南是从一次真实迁移里反推出来的（一个已有的 React + Vite + Tailwind v4 + shadcn/ui 的后台，
十几个页面、两万多行）。踩过的坑都写在这里了——**它们全都不是「照着规范做」能避开的**，
所以最后一节的两道校验门不是可选项。

---

## 一、装 token（5 分钟）

```bash
npm i github:wensia/kiln
```

```css
/* 你的 index.css */
@import "kiln/tokens/index.css";
```

**字体单独选**，入口不替你决定：

```bash
# 国内项目：自托管（Google Fonts CDN 不通，硬引会阻塞首屏）
npm i @fontsource/noto-sans-sc
```
```ts
// main.tsx —— 只要 400/500/600 三个字重，规范只用这三个
import '@fontsource/noto-sans-sc/400.css'
import '@fontsource/noto-sans-sc/500.css'
import '@fontsource/noto-sans-sc/600.css'
```

海外项目可以直接 `@import "kiln/tokens/fonts.css"`（走 Google CDN）。

> **移除所有竞争性 webfont。** 规范只允许 Noto Sans SC 一个。拉丁字母走系统 SF/Helvetica，
> 等宽走 SF Mono 系统栈——`--font-sans` 和 `--font-mono` 已经安排好了。
> （真实教训：项目里挂着 Geist Sans + Geist Mono + DM Mono，而 `tailwind.config.js` 把
> Geist 排在字体栈第一位，于是中文渲染一直不是规范说的那样，谁也没发现。）

---

## 二、映射给 Tailwind（Tailwind v4）

kiln 给的是 CSS 变量。要让 `bg-primary` / `shadow-card` / `rounded-lg` 这些工具类可用，
在 `@theme inline` 里做一层映射——**只映射，不定义数值**：

```css
@import "tailwindcss";
@import "kiln/tokens/index.css";

@theme inline {
  /* 圆角：控件 4 / 卡片 6 / 面板 8。精确值，不从倍数派生 */
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);   /* rounded-md → 4px 控件 */
  --radius-lg: var(--radius-lg);   /* rounded-lg → 6px 卡片 */
  --radius-xl: var(--radius-xl);   /* rounded-xl → 8px 面板 */

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-primary: var(--primary);            /* 陶土红：关键动作 + 状态信号 */
  --color-primary-foreground: var(--primary-foreground);
  --color-solid: var(--solid);                /* 墨色：普通实心命令 */
  --color-solid-foreground: var(--solid-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-success: var(--success);
  --color-success-bg: var(--success-bg);
  --color-info: var(--info);
  --color-warning: var(--warning);
  --color-destructive: var(--destructive);
  --color-destructive-bg: var(--destructive-bg);
  --color-border: var(--border);
  --color-border-visible: var(--border-visible);
  --color-input: var(--input);
  --color-ring: var(--ring);
  /* …sidebar / chart / topbar 同理 */

  /* 分层靠阴影，全部暖黑 */
  --shadow-xs: var(--shadow-xs);
  --shadow-card: var(--shadow-card);
  --shadow-card-hover: var(--shadow-card-hover);
  --shadow-input: var(--shadow-input);
  --shadow-popover: var(--shadow-popover);
}
```

> `@theme inline` 模式下这些变量不会被输出到 `:root`，只用来生成工具类，
> 所以 `--shadow-card: var(--shadow-card)` **不是**循环引用。

**清掉 Tailwind v3 的遗留配置。** 如果 `tailwind.config.js` 里还有 `theme.extend.colors`、
`borderRadius`、`fontFamily`，删掉——它们会和 `@theme` 打架。
（真实教训：那份 config 里的颜色写成 `hsl(var(--border))`，而变量值是 `oklch(...)`，
`hsl(oklch(...))` 是**无效 CSS**——这套颜色定义一直是坏的，没人发现，因为 `@theme` 恰好接住了。）

---

## 三、改 shadcn 组件（**别只改 token 就收工**）

这是最容易被跳过、也最致命的一步。token 换了但组件没改，会得到一个**比原来更糟**的结果。

### Button —— 最关键

shadcn 出厂的 `default` 变体映射到 `bg-primary`。一旦 `--primary` 变成陶土红，
**全站所有主按钮立刻变红**——直接违反「每视口至多一个 clay」。

```tsx
variant: {
  // 普通实心命令（保存/确认/生成/次级提交）—— 墨色，不是陶土红
  default: "bg-solid text-solid-foreground hover:bg-solid/90",
  // 流程唯一的关键动作，以及代表激活/选中状态的填充控件。每视口至多一个
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "border border-input bg-background hover:border-foreground/25 hover:bg-muted/40",
  // ghost 保持透明只给「嵌入式」场景：输入框内的图标、表格操作列的 ... 触发器
  ghost: "hover:bg-accent hover:text-accent-foreground",
}
size: { default: "h-9", sm: "h-8", lg: "h-10", icon: "h-9 w-9", "icon-sm": "h-8 w-8" }
```
基础类去掉 `shadow`（按钮是平铺填充，不做浮雕），加 `active:translate-y-px`。

> 陶土红属于**打开流程的入口**（「批量生成兑换码」），不属于弹窗里的**确认步骤**——
> 那是普通提交，走墨色。一个流程只出现一次 clay。

### 阴影：shadcn 出厂组件**全部**带冷调阴影

`Input` / `Select` / `Dialog` / `Popover` / `Toast` / `Card` 用的都是 Tailwind 默认的
`rgba(0,0,0,.1)`，而规范硬性要求暖黑 `rgba(54,47,42,·)`。**8 个组件全中，肉眼一个都看不出来。**

| 组件 | 换成 |
|---|---|
| Input / Select trigger / NumberInput / PhoneInput | `shadow-input` |
| Dialog / Popover / Select content / Toast / DropdownMenu | `shadow-popover` |
| Card / GlassCard | `shadow-card` |

### Card

```tsx
// 白卡无边框，靠暖黑阴影浮在画布上。边框只留给输入框、表格行分隔、结构缝
"rounded-lg bg-card text-card-foreground shadow-card"
```

### Checkbox

出厂是 `border border-primary`——`--primary` 一变红，**所有复选框静止态就是红边框**。
改成 `border-input`，选中时才 `data-[state=checked]:border-primary bg-primary`。

### 要补的组件

| 组件 | 要点 |
|---|---|
| **Badge** | 7 变体：default / secondary / outline / success / info / warning / neutral。**没有 destructive**——失效态用 neutral/outline + 危险色文字 |
| **Pagination** | **一个全局共享组件**。无上一页/下一页按钮（相邻页码本身就是上下页），3 页码窗口 + 「第 x 页」Select，当前页 clay 填充。不渲染「1–15 / 512」这种范围串 |
| **DropdownMenu** | 行操作 ≥2 个必须收进单个 `...` 触发器。宽度由内容决定，别绑 trigger 宽度 |

---

## 四、装两道校验门（**这一节才是重点**）

散文管不住自己，人眼也审不完一整个应用。**这次迁移里，没有任何一个真 bug 是靠读代码发现的。**

`scripts/templates/` 里有两个可直接复制的脚本。

### 门 1：token 契约（构建时）

```bash
cp node_modules/kiln/scripts/templates/verify-tokens.mjs scripts/
```
接进 `build`，让它绕不过去：
```json
"build": "node scripts/verify-tokens.mjs && tsc -b && vite build"
```

它拦四类：
- 契约里的 token 没定义（没同步 kiln）
- **自造 token**（自己编了一个数值）
- 业务代码里的**裸 hex** 和 **Tailwind 调色板裸色**（`bg-green-100` / `text-red-500`）
- 页面专属的**写死像素高度**（`h-[580px]`）

> 存量太多？用 `--update-baseline` 记账，**新增即失败**，然后慢慢清零。

### 门 2：渲染样式契约（运行时）

```bash
cp node_modules/kiln/scripts/templates/verify-runtime.mjs scripts/
npm i -D playwright
```

它驱动真实页面，断言浏览器**算出来**的样式：圆角阶梯、控件高度、每视口至多一个 clay 动作、
白卡靠阴影而非边框、阴影一律暖黑、字体栈、字号的上下限、表格只有横向分隔线。

**这道门是唯一能抓住组合错误的东西。**

> **为什么？** 一个表面是**半透明混合**的组件（button-tab 的轨道、顶栏）是**上下文相关**的。
> 设计稿里它坐在画布上；把它塞进白卡，对比度会从「落差 9 个色阶」塌成「落差 2 个色阶」——
> 而 token 全对、类名全对、代码审查挑不出任何毛病。**只有量出来的颜色能看出来。**

页面分三类，标题上限不同：`admin`（工作台，16px）、`consumer`（顾客端，22–24px）、
`landing`（登录页 / 品牌门面，**不设上限**——规范禁止的是「工作页面里的 hero」，不是产品门面本身）。
但**字号下限在三类里都适用**：读不了的字，在哪儿都是读不了。

**覆盖每一个页面、每一个 tab。** 这次迁移里，契约一度「通过」，但那是假象——它只跑了一个 tab。
一扩到全部，立刻暴露 79 项违规。**断言没走到的地方，等于没有规范。**

---

## 五、给 AI 用（Claude Code）

```bash
ln -s "$(pwd)/node_modules/kiln" ~/.agents/skills/kiln
# 或 clone kiln 仓库后 ln -s 过去
```

之后 Claude 做后台 UI 时会自动读 `SKILL.md`，按需加载 `references/`。

---

## 六、非 Tailwind 项目

直接 `@import "kiln/tokens/index.css"`，然后按 `references/platform-mapping.md` 里的
最小组件集实现（Button / Input / Password Input / Date Picker / Select / Badge / Tabs /
Dialog / Sheet / DataTableDock / 行操作菜单 / 资源卡 / 指标卡）。

小程序 / 移动端：保留语义色、字号阶梯、组件角色；高频触控控件放大到 40–44px；
表格变卡片；侧栏换底部导航；对话框多数改成底部 sheet。

暗色模式：kiln 是 light-only。要做暗色**不要简单反色**——重新检查侧栏、表格、弹窗、徽章的
对比度；陶土红要用 color-mix 提亮，否则发浑；**阴影在深色表面上失去分离力，那里（且只有那里）
才该改用边框和表面色阶**。

---

## 七、这次迁移真实踩过的坑

按「肉眼能不能发现」排序：

| 坑 | 肉眼能发现吗 |
|---|---|
| shadcn 8 个组件全带冷调阴影 | **不能** |
| 半透明的 tab 轨道被塞进白卡，激活态糊掉 | 只能看出「不对劲」，看不出为什么 |
| 从散文推导阴影数值，6 个全错 | **不能**（推错的值和查对的值长得一样） |
| `metric-value` / `service-meta` 这类**从未定义过的死类名** | **不能**（它静默地什么也不做） |
| 表格竖向网格线 | 能，但要知道规范禁止 |
| 32px 的 hero 指标数字 | 能 |
| 手搓的 PREV/NEXT 分页 | 能，但没人觉得是问题 |

**前四项占了 bug 的绝大多数，而它们全都需要机器才能抓到。** 这就是第四节存在的理由。
