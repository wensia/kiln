#!/usr/bin/env node
/**
 * kiln — 自检。
 *
 * 这套设计系统坏过一次，坏法是**文档和实现悄悄分家**：
 *   · 画布色在 readme 里写 #F7F4F0、在 SKILL.md 里写 #F6F3EF、在 colors.css 里是 #FBFAF8 —— 三套值。
 *   · 规格表给了颜色的 hex，却只给了阴影的名字和用途 —— 于是实现者被迫**发明**阴影，
 *     发明出来的值和查出来的值在渲染之前长得一模一样。真实代价：六个阴影全错。
 *
 * 所以这里把「散文不得与 token 漂移」变成一条会失败的检查：
 *
 *   1. contract/tokens.json 里的 token，tokens/*.css 必须全部定义（缺一个就是没同步）
 *   2. tokens/*.css 里不得有契约外的自造 token
 *   3. references/tokens.md 是 CSS 的**镜像** —— 它重述的每个数值都必须与 CSS 一致
 *   4. 其它散文（SKILL.md / components.md / layouts-and-pages.md / platform-mapping.md）
 *      **不得重述** hex 值：它们只该命名 token
 *   5. tokens/index.css 必须 @import dark.css（与 tags.css），且暗色层排在亮色层之后
 *   6. tokens/*.css 与 examples/ 里每个 var(--x) 引用都必须有定义（带 fallback 与外部前缀除外）
 *
 * 这里只做静态契约，不模拟级联；作用域是否真的生效由 npm run verify:themes 在渲染后断言。
 *
 * 用法：node scripts/verify.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const fail = (m) => failures.push(m);

// ── 读入所有 token CSS ────────────────────────────────────────
const cssDir = join(ROOT, "tokens");
const css = readdirSync(cssDir)
  .filter((f) => f.endsWith(".css") && f !== "index.css")
  .map((f) => readFileSync(join(cssDir, f), "utf8"))
  .join("\n");

// 定义 `--foo:`，不匹配引用 `var(--foo)`（引用后面跟 `)` 或 `,`，不是 `:`）
const defined = new Map();
for (const m of css.matchAll(/(--[a-z0-9\\.-]+)\s*:\s*([^;]+);/gi)) {
  defined.set(m[1].replace(/\\/g, ""), m[2].trim());
}

// ── 1 & 2. 契约 ──────────────────────────────────────────────
const contract = JSON.parse(readFileSync(join(ROOT, "contract/tokens.json"), "utf8"));
const allowed = new Set(contract.tokens);
const known = new Set(Object.keys(contract.knownDeviations ?? {}));

for (const t of allowed) {
  if (!defined.has(t)) fail(`缺少 token：${t} —— 契约里有，tokens/*.css 没定义。`);
}
for (const t of defined.keys()) {
  if (!allowed.has(t) && !known.has(t)) {
    fail(`自造 token：${t} —— 不在契约清单里。要新数值就往契约和 CSS 里加，别在散文里编。`);
  }
}

// ── 3. 规格表必须是 CSS 的镜像 ────────────────────────────────
const specTable = readFileSync(join(ROOT, "references/tokens.md"), "utf8");
for (const m of specTable.matchAll(
  /`(--[a-z0-9-]+)`[^|\n]*\|[^|\n]*?`?(#[0-9a-fA-F]{6})`?/g
)) {
  const [, token, proseHex] = m;
  const cssVal = defined.get(token);
  if (!cssVal) continue;
  const cssHex = cssVal.match(/#[0-9a-fA-F]{6}/)?.[0];
  if (!cssHex) continue; // CSS 里是 var() / color-mix()，不是字面 hex
  if (cssHex.toLowerCase() !== proseHex.toLowerCase()) {
    fail(
      `规格表与 CSS 漂移：${token} —— references/tokens.md 写 ${proseHex}，` +
        `tokens/*.css 真值 ${cssHex}。数值以 CSS 为准。`
    );
  }
}

// ── 4. 其它散文不得重述 hex ───────────────────────────────────
// README 长期不在这张表里 —— 而画布色那次事故，第一套错值正是写在 readme 里的。
// 首页是最多人读、最少人校的散文；双语之后它还变成了两份，各自都能漂。
const PROSE = [
  "SKILL.md",
  "README.md",
  "README.zh-CN.md",
  "references/components.md",
  "references/layouts-and-pages.md",
  "references/platform-mapping.md",
];
// 允许在「反面教材」里引用坏值：带 ✗ / 不要 / never / drift 等上下文的行豁免
const isCounterExample = (line) =>
  /✗|不要|禁止|never|Never|drift|漂移|写死|guessed|invent|曾|used to|反模式|anti-pattern/.test(line);

for (const file of PROSE) {
  const text = readFileSync(join(ROOT, file), "utf8");
  text.split("\n").forEach((line, i) => {
    if (isCounterExample(line)) return;
    const hex = line.match(/#[0-9a-fA-F]{6}\b/);
    if (hex) {
      fail(
        `散文重述数值：${file}:${i + 1} 出现 ${hex[0]} —— ` +
          `散文只命名 token，数值归 tokens/*.css。散文里的数值必然漂移。`
      );
    }
  });
}

// ── 5. 入口必须接上暗色层与标签层 ─────────────────────────────
// dark.css / tags.css 单独存在不等于生效：入口漏 import，暗色选择器根本不会出现在页面里，
// 而 1-3 条只看「定义过没有」，会照样通过。顺序也是契约：暗色层与亮色层同为单类选择器，
// 靠排在 colors.css / elevation.css 之后胜出（见 tokens/index.css 注释）。
// 这里不模拟级联 —— 作用域是否真的接管，由 npm run verify:themes 在渲染后断言。
const entry = readFileSync(join(cssDir, "index.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const imports = [...entry.matchAll(/@import\s+(?:url\()?\s*["']\.\/([^"')]+)["']/g)].map((m) => m[1]);
const cssFiles = new Set(readdirSync(cssDir).filter((f) => f.endsWith(".css")));
for (const required of ["dark.css", "tags.css"]) {
  if (required === "tags.css" && !cssFiles.has(required)) continue;
  if (!imports.includes(required)) {
    fail(`入口漏接：tokens/index.css 没有 @import "./${required}" —— 文件存在但对消费方不生效。`);
  }
}
if (imports.includes("dark.css")) {
  for (const light of ["colors.css", "elevation.css"]) {
    if (imports.includes(light) && imports.lastIndexOf(light) > imports.lastIndexOf("dark.css")) {
      fail(`入口顺序：tokens/index.css 里 ${light} 排在 dark.css 之后 —— 同优先级下亮色值会盖掉暗色层。`);
    }
  }
}

// ── 6. var() 引用必须有定义 ──────────────────────────────────
// 引用一个不存在的 token，浏览器不会报错：整条声明在计算期失效，颜色静默回退成继承值或初始值。
// 带 fallback 的 var(--x, …) 自己兜了底，放行；示范页可以引用本文件内自定义的私有属性。
// 白名单（外部前缀，由宿主或工具链注入，kiln 不定义）：
const EXTERNAL_PREFIXES = [
  "--tw-", // Tailwind 运行时变量（ring / shadow 组合），由 Tailwind 生成
];
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "");
const tokenDefs = new Set();
for (const f of cssFiles) {
  for (const m of stripComments(readFileSync(join(cssDir, f), "utf8")).matchAll(/(--[a-zA-Z0-9_\\.-]+)\s*:/g)) {
    tokenDefs.add(m[1].replace(/\\/g, ""));
  }
}
const REFERENCE_SOURCES = [
  ...[...cssFiles].map((f) => `tokens/${f}`),
  ...readdirSync(join(ROOT, "examples"))
    .filter((f) => f.endsWith(".css") || f.endsWith(".html"))
    .map((f) => `examples/${f}`),
];
let referenceCount = 0;
for (const file of REFERENCE_SOURCES) {
  const text = stripComments(readFileSync(join(ROOT, file), "utf8"));
  const local = file.startsWith("examples/")
    ? new Set([...text.matchAll(/(--[a-zA-Z0-9_\\.-]+)\s*:/g)].map((m) => m[1].replace(/\\/g, "")))
    : new Set();
  for (const m of text.matchAll(/var\(\s*(--[a-zA-Z0-9_\\.-]+)\s*(,)?/g)) {
    referenceCount++;
    const name = m[1].replace(/\\/g, "");
    if (m[2] || tokenDefs.has(name) || local.has(name)) continue;
    if (EXTERNAL_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;
    fail(`悬空引用：${file} 引用 var(${name})，但 tokens/*.css 与本文件都没有定义它 —— 这条声明会在计算期静默失效。`);
  }
}

// ── 报告 ─────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ kiln 自检未通过（${failures.length} 项）：\n`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error(`\n真相源：tokens/*.css\n契约：  contract/tokens.json\n`);
  process.exit(1);
}
console.log(
  `✓ kiln 自检通过：${allowed.size} 个 token 全部定义、无自造值；` +
    `规格表与 CSS 一致；散文未重述数值；入口接上 dark/tags；${referenceCount} 处 var() 引用均有定义。`
);
