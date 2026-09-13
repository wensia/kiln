#!/usr/bin/env node
/**
 * kiln — 对**自己的示范页**跑运行时设计契约。
 *
 * 为什么要有这个：SKILL.md 里写着「第二道门不是可选的润色，它是唯一能抓住组合错误的
 * 东西」，而在这个文件出现之前，kiln 只有一份给别人复制的模板（scripts/templates/），
 * 自己从来没有可供断言的渲染目标 —— 一套要求别人验证渲染结果的规范，自己没验证过。
 *
 * examples/workbench.html 就是那个目标：它只消费 tokens/*.css，不含裸色值，
 * 把工作台的主要表面摆齐（侧栏、顶栏、指标条、工具栏、带冻结列的数据表、分页坞、
 * 表单控件），因此规则改了而示范页没跟上，这里会直接失败。
 *
 * 用法：npm run verify:examples
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { auditPage, createReport, printReport } from "./lib/runtime-contract.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "\n✗ 缺少 playwright —— 渲染契约需要真实浏览器算出的样式，静态分析替代不了。\n" +
      "  安装：npm i -D playwright && npx playwright install chromium\n" +
      "  （npm run verify 的静态 token 契约不需要它，仍然可以单独跑。）\n"
  );
  process.exit(1);
}

/** CDN 字体在离线环境下必然加载不上。跳过要**明说**，静默降级的契约不是契约。 */
const fontReachable = await fetch("https://fonts.googleapis.com/css2?family=Noto+Sans+SC", {
  signal: AbortSignal.timeout(4000),
})
  .then((r) => r.ok)
  .catch(() => false);

if (!fontReachable) {
  console.log(
    "· 连不上 fonts.googleapis.com —— 跳过 webfont **加载**断言（字体栈本身仍然检查）。\n" +
      "  联网后重跑才算完整覆盖。\n"
  );
}

const report = createReport();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const url = pathToFileURL(join(ROOT, "examples/workbench.html")).href;
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(fontReachable ? 1200 : 400); // 等 @import 的字体 CSS 落地

await auditPage(page, "示范页/工作台", { kind: "admin", report, skipFont: !fontReachable });

await browser.close();
process.exit(printReport(report, { title: "示范页渲染契约" }));
