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

// ── 3b. 密度档必须完整，且只管几何 ────────────────────────────
// 同一个病的第二次发作：散文（SKILL.md 的 Density Ladder）讲密度随屏幕类型变，
// 契约（components.md）反复写 "explicitly compact"，token 却只有一档定值 ——
// 于是消费者只能自己发明更小的档位。这里把它变成会失败的检查。
//
//   · 每个 [data-density] 档必须覆盖 :root「Control heights」段的全部 token
//     （漏一个，该档就会静默继承 standard 值，混排出两种高度）
//   · 且不得覆盖该段之外的任何 token
//     （密度档只改控件几何；字号、间距、圆角、图标尺寸不随档变）
const spacingCss = readFileSync(join(cssDir, "spacing.css"), "utf8");
const rootBlock = spacingCss.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
const heightsSection =
  rootBlock.match(/\/\* ---- Control heights ---- \*\/([\s\S]*?)(?=\/\* ----|$)/)?.[1] ?? "";
const heightTokens = new Set(
  [...heightsSection.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1])
);

if (heightTokens.size === 0) {
  fail(
    "密度档基准缺失：tokens/spacing.css 的 :root 里找不到「Control heights」段。" +
      "密度档检查依赖这个段落边界，不要删掉那行注释。"
  );
}

const densityBlocks = [
  ...spacingCss.matchAll(/\[data-density="([a-z-]+)"\]\s*\{([\s\S]*?)\n\}/g),
];
for (const [, tier, body] of densityBlocks) {
  const inTier = new Set(
    [...body.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1])
  );
  for (const t of heightTokens) {
    if (!inTier.has(t)) {
      fail(
        `密度档不完整：[data-density="${tier}"] 没有覆盖 ${t} —— ` +
          `该档会静默继承 standard 值，同一屏混出两种控件高度。`
      );
    }
  }
  for (const t of inTier) {
    if (!heightTokens.has(t)) {
      fail(
        `密度档越界：[data-density="${tier}"] 覆盖了 ${t} —— ` +
          `密度档只改控件几何。字号有可读性下限（中文界面尤甚），` +
          `间距/圆角/图标尺寸是物理像素阶梯，都不随档变。`
      );
    }
  }
}

// 散文提到的档位必须真的存在
const tiers = new Set(densityBlocks.map((m) => m[1]));
const skillMd = readFileSync(join(ROOT, "SKILL.md"), "utf8");
for (const m of skillMd.matchAll(/data-density="([a-z-]+)"/g)) {
  if (!tiers.has(m[1])) {
    fail(
      `散文承诺了不存在的密度档：SKILL.md 提到 data-density="${m[1]}"，` +
        `但 tokens/spacing.css 没有这个档。`
    );
  }
}

// ── 4. 其它散文不得重述 hex ───────────────────────────────────
const PROSE = [
  "SKILL.md",
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

// ── 报告 ─────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ kiln 自检未通过（${failures.length} 项）：\n`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error(`\n真相源：tokens/*.css\n契约：  contract/tokens.json\n`);
  process.exit(1);
}
console.log(
  `✓ kiln 自检通过：${allowed.size} 个 token 全部定义、无自造值；` +
    `规格表与 CSS 一致；散文未重述数值。`
);
