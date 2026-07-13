#!/usr/bin/env node
/**
 * 设计 token 契约校验。
 *
 * 存在的理由：设计规范的散文（SKILL.md / references/*.md）只给 token 的**名字和用途**，
 * 不给数值。一旦有人（尤其是 AI）从散文里「推导」出一个数值，就只能靠肉眼验证对不对 ——
 * 这正是这个项目踩过的坑（--shadow-primary-focus 被推成 `0 0 0 3px`，真值是
 * `0 0 0 1px + 0 10px 24px`；--shadow-topbar 被推成 inset，真值不是）。
 *
 * 这个脚本把「token 必须来自 Design，不能自己编」变成一条会失败的构建检查：
 *
 *   1. 契约里有、本地没定义        → 缺 token，失败
 *   2. 本地定义了、契约里没有       → 自造 token，失败（除非登记在 knownDeviations）
 *   3. 业务代码里出现裸 hex 颜色    → 失败（颜色必须走语义 token）
 *   4. 业务代码里出现写死的像素高度 → 失败（高度必须由 shell/token 提供，见 DataTableDock 规范）
 *
 * 契约来源：node_modules/kiln/contract/tokens.json
 * token 真相源：node_modules/kiln/tokens/*.css —— kiln 包（github.com/wensia/kiln）。
 *              本仓库不再保留手抄副本：那是第二个真相源，必然漂移。
 *              要改数值？去 kiln 改，然后 npm update kiln。
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..");
const REPO = join(FRONTEND, "..");  // 用于打印相对路径

const CONTRACT = join(FRONTEND, "node_modules/kiln/contract/tokens.json");
// token 真相源 = kiln 包（github.com/wensia/kiln），不是本仓库的副本。
// 本地不再保留手抄的 ds-tokens.css —— 那是第二个真相源，必然漂移。
const KILN_TOKENS = join(FRONTEND, "node_modules/kiln/tokens");
const SRC = join(FRONTEND, "src");

const failures = [];
const fail = (msg) => failures.push(msg);

// ── 1 & 2. token 契约 ────────────────────────────────────────────
const contract = JSON.parse(readFileSync(CONTRACT, "utf8"));
const allowed = new Set(contract.tokens);
const known = new Set(Object.keys(contract.knownDeviations ?? {}));

const tokensCss = readdirSync(KILN_TOKENS)
  .filter((f) => f.endsWith(".css") && f !== "index.css" && f !== "fonts.css")
  .map((f) => readFileSync(join(KILN_TOKENS, f), "utf8"))
  .join("\n");
// 匹配定义 `--foo:`，不匹配引用 `var(--foo)` / `var(--foo, x)` —— 引用后面跟的是 `)` 或 `,`，不是 `:`。
// 不要锚定行首：那样单行写法 `:root { --foo: x }` 会整个漏掉（这个洞是负向测试抓出来的）。
// \\. 处理 --space-0\.5 这种 CSS 转义。
const defined = new Set(
  [...tokensCss.matchAll(/(--[a-z0-9\\.-]+)\s*:/gi)].map((m) =>
    m[1].replace(/\\/g, "")
  )
);

for (const t of allowed) {
  if (!defined.has(t)) {
    fail(`缺少 token：${t} —— 契约里有，kiln 的 tokens/*.css 没定义。跑 npm update kiln。`);
  }
}
for (const t of defined) {
  if (!allowed.has(t) && !known.has(t)) {
    fail(
      `自造 token：${t} —— 不在设计系统的合法清单里。` +
        `不要自己编数值，去 kiln 加 token（github.com/wensia/kiln），或登记到 knownDeviations 并说明理由。`
    );
  }
}

// ── 2b. 散文不得与 token 真值漂移 ────────────────────────────────
// references/tokens.md 是给人和 AI 读的速查表，它**重述**了调色板的 hex 值。
// 只要散文里有数值，它就会和 CSS 悄悄分家 —— 上游就是这么坏掉的：
// readme.md 写画布 #F7F4F0、SKILL.md 写 #F6F3EF，而 colors.css 真值是 #FBFAF8。
// 三套值，谁照散文实现谁错，且只能靠肉眼发现。
// 这里把「散文 == CSS」变成一条会失败的检查。
const SKILL_TOKENS_MD = join(FRONTEND, "node_modules/kiln/references/tokens.md");
try {
  const prose = readFileSync(SKILL_TOKENS_MD, "utf8");
  // 匹配表格行： | `--palette-clay` | `#B6533C` | …
  for (const m of prose.matchAll(
    /`(--[a-z0-9-]+)`[^|\n]*\|[^|\n]*?`?(#[0-9a-fA-F]{6})`?/g
  )) {
    const [, token, proseHex] = m;
    const cssMatch = tokensCss.match(
      new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`, "i")
    );
    if (!cssMatch) continue; // 该 token 在 CSS 里不是字面 hex（是 color-mix / var），跳过
    if (cssMatch[1].toLowerCase() !== proseHex.toLowerCase()) {
      fail(
        `散文与 token 漂移：${token} —— tokens.md 写 ${proseHex}，` +
          `kiln 的 CSS 真值 。数值以 CSS 为准，去 kiln 修散文。`
      );
    }
  }
} catch {
  // skill 目录不存在时不阻塞（例如浅克隆）
}

// ── 3 & 4. 业务代码不得写死设计值 ────────────────────────────────
const walk = (dir) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|ts)$/.test(p)) out.push(p);
  }
  return out;
};

const HEX = /#[0-9a-fA-F]{6}\b/;

// Tailwind 调色板裸色：bg-blue-100 / text-green-700 / border-red-500…
// 规范：「不要用 local purple、Tailwind emerald/amber/sky 状态色，或裸 hex」。
// 状态必须走语义 token（success / info / warning / destructive），否则同一个「成功」
// 在不同页面会长成不同的绿。设计系统自己的 token 名不带数字，不会被误伤。
const TW_PALETTE =
  /\b(?:bg|text|border|ring|from|via|to|decoration|outline|shadow|accent|caret|divide)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;

// 写死的固定像素高度：h-[580px]。
// 只查固定高度，不查 min-h/max-h —— 后者是合法的约束（弹窗 max-h、滚动容器上限），
// 规范禁止的是「用页面专属固定高度替代 shell 的高度契约」。
const HARDCODED_HEIGHT = /(?<![a-z-])h-\[\d+px\]/;

// 存量违规按「文件 → 各类计数」记账。新增会让计数超过基线 → 失败。
// 用计数而不是行号：行号会随无关编辑漂移，计数不会。
const BASELINE = join(FRONTEND, "design-debt.json");
const counts = {};
const bump = (rel, kind) => {
  counts[rel] ??= { hex: 0, palette: 0, height: 0 };
  counts[rel][kind]++;
};

for (const file of walk(SRC)) {
  const rel = relative(REPO, file);
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    // 显式豁免：在元素上方写 `design-exempt: <理由>`。
    // 用于真正无法遵守规范的场景（例：跨域 iframe 的内容高度不可知，flex-1 撑不开，必须给显式高度）。
    // 往上看 6 行 —— JSX 属性列表里插不了注释，所以注释只能挂在开标签上方，
    // 而 className 往往落在开标签之后好几行。强制写理由，避免变成静音开关。
    if (lines.slice(Math.max(0, i - 6), i + 1).some((l) => /design-exempt/.test(l))) return;

    if (HEX.test(line)) bump(rel, "hex");
    if (TW_PALETTE.test(line)) bump(rel, "palette");
    if (HARDCODED_HEIGHT.test(line)) bump(rel, "height");
  });
}

const updating = process.argv.includes("--update-baseline");
if (updating) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        _comment:
          "设计债基线：业务代码里尚未清理的裸 hex 颜色与写死像素高度，按文件计数。" +
          "新增违规会让 verify:tokens 失败；清理后跑 `npm run verify:tokens -- --update-baseline` 下调基线。目标是清零。",
        debt: counts,
      },
      null,
      2
    ) + "\n"
  );
  const total = Object.values(counts).reduce((s, c) => s + c.hex + c.palette + c.height, 0);
  console.log(`✓ 已更新设计债基线：${Object.keys(counts).length} 个文件，共 ${total} 项。`);
  process.exit(0);
}

let baseline = {};
try {
  baseline = JSON.parse(readFileSync(BASELINE, "utf8")).debt ?? {};
} catch {
  fail(
    `缺少设计债基线文件 ${relative(REPO, BASELINE)} —— ` +
      `先跑 \`npm run verify:tokens -- --update-baseline\` 记录存量。`
  );
}

const KIND_HINT = {
  hex: "颜色必须走语义 token（bg-primary / text-success…）。",
  palette:
    "禁止 Tailwind 调色板裸色（bg-green-100 / text-red-500…）。状态走语义 token：" +
    "success=teal、info=peacock、warning=amber、destructive=clay。",
  height:
    "规范禁止「页面专属的固定高度」，高度应由 shell 通过 flex-1 + min-h-0 提供（见 DataTableDock）。",
};
const KIND_NAME = { hex: "裸 hex 颜色", palette: "Tailwind 裸色", height: "写死像素高度" };

for (const [rel, c] of Object.entries(counts)) {
  const base = baseline[rel] ?? { hex: 0, palette: 0, height: 0 };
  for (const kind of ["hex", "palette", "height"]) {
    const was = base[kind] ?? 0;
    if (c[kind] > was) {
      fail(
        `${rel}：${KIND_NAME[kind]} ${was} → ${c[kind]}，新增了 ${c[kind] - was} 处。${KIND_HINT[kind]}`
      );
    }
  }
}

// ── 报告 ─────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ 设计契约校验未通过（${failures.length} 项）：\n`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error(
    `\n真相源：node_modules/kiln/tokens/*.css（github.com/wensia/kiln）` +
      `\n契约：  node_modules/kiln/contract/tokens.json\n`
  );
  process.exit(1);
}

const debtTotal = Object.values(counts).reduce((s, c) => s + c.hex + c.palette + c.height, 0);
console.log(
  `✓ 设计契约通过：${allowed.size} 个 token 全部定义且无自造值。` +
    (debtTotal
      ? `\n  存量设计债 ${debtTotal} 项（已记入基线，未新增）。清理后跑 --update-baseline 下调。`
      : "")
);
