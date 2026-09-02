#!/usr/bin/env node
/**
 * kiln — 从示范页生成 README 里的示例图。
 *
 * 为什么要有这个脚本，而不是手工截图往仓库里塞几张 PNG：
 * 手截的图是**第二个真相源**。示范页改了、规则改了，图不会跟着变，而 README 是
 * 新人看的第一样东西 —— 于是仓库首页会长期展示一套已经不存在的样子，
 * 且没有任何检查会发现它。这正是这套系统栽过的那类跟头（画布色曾经有三套值）。
 *
 * 所以图和渲染契约共用同一个渲染目标：examples/*.html。改了示范页就重跑
 * `npm run screenshots`，图必然跟上。
 *
 * 用法：npm run screenshots
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs");

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "\n✗ 缺少 playwright。安装：npm i -D playwright && npx playwright install chromium\n"
  );
  process.exit(1);
}

/** 与 verify-examples.mjs 同一个判断：CDN 字体连不上就明说，不静默降级。 */
const fontReachable = await fetch("https://fonts.googleapis.com/css2?family=Noto+Sans+SC", {
  signal: AbortSignal.timeout(4000),
})
  .then((r) => r.ok)
  .catch(() => false);

if (!fontReachable) {
  console.log(
    "· 连不上 fonts.googleapis.com —— 截图里的中文会落到系统字体栈，不是规范指定的\n" +
      "  Noto Sans SC。要发布到 README 的图请在联网环境下重跑。\n"
  );
}

const SHOTS = [
  {
    file: "examples/workbench.html",
    out: "workbench.png",
    viewport: { width: 1440, height: 900 },
    fullPage: true,
    label: "工作台层 · 1440",
  },
  {
    file: "examples/paper-login.html",
    out: "paper-login.png",
    viewport: { width: 1440, height: 900 },
    fullPage: false,
    label: "纸面层 · 1440",
  },
  // 没有 390 的截图，是因为 examples/workbench.html 在 390 下版面是塌的
  // （侧栏不折叠占掉半屏、指标卡文字竖排、表格被挤到只剩操作列）。
  // verify-paper.mjs 在 390 下跑过它，但只数墨占比 —— 数得出「墨够不够」，
  // 数不出「版面还成不成立」。示范页补上窄视口之前，这里不该有图：
  // README 展示一张塌掉的页面，比不展示更坏。
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const shot of SHOTS) {
  const ctx = await browser.newContext({
    viewport: shot.viewport,
    deviceScaleFactor: 2, // README 在 retina 上看，1x 的字会糊
  });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(join(ROOT, shot.file)).href, { waitUntil: "load" });
  await page.waitForTimeout(fontReachable ? 1200 : 400);
  await page.screenshot({ path: join(OUT, shot.out), fullPage: shot.fullPage });
  await ctx.close();
  console.log(`✓ docs/${shot.out}  ${shot.label}`);
}

await browser.close();
console.log("\n示例图已重新生成。README 引用的是 docs/ 下这几个文件。\n");
