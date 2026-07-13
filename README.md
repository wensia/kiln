# kiln — 窑

陶土成器之所。中文后台工作台的设计系统。

整个色彩体系都是窑里烧出的釉色：**陶土红**（clay，主色/关键动作/状态信号）、**窑青绿**（teal，成功）、**孔雀蓝**（peacock，信息）、**暖琥珀**（amber，警示）——暖、低饱和、做旧、彼此和谐。气质是一间**安静而密集的控制室**：信息价值第一，装饰最后。

不是营销页的设计系统。是干活的工具的设计系统。

---

## 这个仓库是什么

**它同时是三样东西**，这不是巧合，是刻意的：

| | |
|---|---|
| **数值的真相源** | `tokens/*.css` —— 消费方 `@import tokens/index.css` |
| **规则的真相源** | `SKILL.md` + `references/*.md` —— 人和 AI 读 |
| **一个 Claude Code skill** | 仓库根就是 skill 根 |

所以 **`git commit` 就是「改设计系统」**。没有额外的同步步骤，没有「记得也改一下那边」。

```
~/.agents/skills/kiln  ──symlink──>  这个仓库
```

---

## 数值只能住在一个地方

这套系统坏过一次，坏法值得写下来：

**画布色曾经有三套值。** `readme.md` 写 `#F7F4F0`，`SKILL.md` 写 `#F6F3EF`，`tokens/colors.css` 里是第三个值。照散文实现的人只会得到一个错的颜色，而且**只能靠肉眼发现**。

**更阴险的是「部分给值」。** 规格表给了颜色的 hex，却只给了阴影的名字和用途。于是实现者被迫**发明**阴影——而发明出来的值和查出来的值，在渲染之前长得一模一样。真实代价：六个阴影全错，`--shadow-primary-focus` 被推成 `0 0 0 3px`（真值是 `0 0 0 1px` + 一层 24px 扩散），`--shadow-topbar` 被推成 `inset`（真值不是）。

> **一张「部分给值、部分不给」的规格表，比完全不给值更危险。** 有值的地方你以为都能查到，没值的地方就开始发明。

所以现在的规矩是三层：

| 层 | 能有数值吗 |
|---|---|
| `tokens/*.css` | **是** —— 机器真相源 |
| `references/tokens.md` | **是**，但它是 CSS 的**镜像**，由 `scripts/verify.mjs` 校验一致 |
| `SKILL.md` / 其它散文 | **否** —— 只命名 token，解释为什么 |

`npm run verify` 会让违反这三条的改动**直接失败**。包括：散文里出现 hex、规格表和 CSS 分家、自造 token、契约里的 token 没定义。

---

## 用法

> **要在一个项目里落地？看 [ADOPTING.md](./ADOPTING.md)** —— 从一次真实迁移
> （React + Vite + Tailwind v4 + shadcn，十几个页面、两万多行）反推出来的完整路径，
> 含两个可直接复制的校验脚本，以及一张「哪些坑肉眼根本发现不了」的清单。

### 作为 skill（Claude Code 自动加载）

```bash
ln -s "$(pwd)" ~/.agents/skills/kiln     # 或 ~/.claude/skills/kiln
```

之后 Claude 在做后台 UI 时会自动读 `SKILL.md`，按需加载 `references/`。

### 作为 token 源（产品仓库消费）

```css
/* 你的 index.css */
@import "kiln/tokens/index.css";
```

或者把 `tokens/*.css` **整个文件**复制过去。**永远不要把数值重新敲进文档或代码片段**——那是在造第二个真相源。

### 自检

```bash
node scripts/verify.mjs
```

---

## 落地一个产品时：把规范变成会失败的检查

散文管不住自己，人眼也审不完一整个应用。真正接住规范的是两道门：

**1. token 契约（构建时）** —— 断言每个 token 都有定义、没人自造 token、业务代码里没有裸 hex、没有 Tailwind 调色板裸色（`bg-green-100` / `text-red-500`）、没有页面专属的写死像素高度。

**2. 渲染样式契约（运行时）** —— 驱动真实页面，断言浏览器**算出来**的样式：圆角阶梯、控件高度、每视口至多一个陶土红动作、白卡靠阴影而非边框分层、阴影一律暖黑、字体栈、字号的上下限、表格只有横向分隔线。

**第二道门不是锦上添花，它是唯一能抓住组合错误的东西。** 一个表面是半透明混合的组件（button-tab 的轨道、顶栏）是**上下文相关**的：把它从设计时所在的画布挪进白卡，对比度会无声失效——而 token 和类名看起来全都还是对的。

覆盖**每一个**页面、每一个 tab。断言没走到的地方，等于没有规范。

---

## 同步到 Claude Design 托管项目

网页版的 Design 项目是**另一套副本**，不读本地 git。但 Claude Code 有 `DesignSync` 工具，**可以直接写入**——不需要人肉粘贴。

在仓库里跑：

```
/kiln-sync
```

它会把 `tokens/*.css` 推到托管的 design-system 项目 —— **数值真相源必须统一**。

`references/*.md` 不推（托管项目没有这个目录），`SKILL.md` 也**不整份覆盖**：两边结构不同，
kiln 仓库那份指向 `references/`，托管那份指向它自己的 `components/` / `ui_kits/`。
**kiln 是设计语言，托管的 design-system 项目是这套语言在某个产品上的实例** ——
后者的 `ui_kits/` 装的是那个产品特有的页面。所以托管侧只更新措辞，保留自己的文件索引。

> 注意：普通脚本调不到 `DesignSync`（那是 Claude Code 的内置工具），所以这一步必须由 Claude 执行。git hook 只能提醒，不能代劳。

---

## 结构

```
kiln/
├── SKILL.md                    # skill 入口：意图、工艺规则、工作流、反模式
├── references/
│   ├── tokens.md               # 规格表（CSS 的镜像，机器校验一致）
│   ├── components.md           # 组件规格、状态、QA
│   ├── layouts-and-pages.md    # shell、侧栏（含折叠 rail）、DataTableDock、页面蓝图
│   └── platform-mapping.md     # React/Tailwind、纯 CSS、暗色、小程序、跨项目复用
├── tokens/                     # ★ 数值的唯一真相源
│   ├── index.css               #   单一入口，消费方只 import 这个
│   ├── colors.css  typography.css  spacing.css
│   ├── radius.css  elevation.css   fonts.css  base.css
├── contract/tokens.json        # 合法 token 全集（机器契约）
├── evals/evals.json            # skill 冒烟测试
└── scripts/verify.mjs          # 自检：契约 + 镜像一致 + 散文不含数值
```
