#!/usr/bin/env node

import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import { auditFrozenColumns, auditPage, createReport } from "./lib/runtime-contract.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKBENCH = pathToFileURL(join(ROOT, "examples/workbench.html")).href;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

try {
  const page = await context.newPage();
  await page.goto(WORKBENCH, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(
    await page.locator('button[aria-label="刷新"]').getAttribute("data-center-content"),
    null,
    "纯图标刷新按钮必须在没有 data 属性时仍被自动审计"
  );

  const positive = createReport();
  await auditPage(page, "center-positive", { kind: "admin", report: positive, skipFont: true });
  assert.deepEqual(
    positive.failures.filter((failure) => /data-center|内容未居中|布局盒/.test(failure)),
    [],
    `示范页的通用居中声明应当通过：\n${positive.failures.join("\n")}`
  );
  assert.match(
    positive.ok.find((item) => item.includes("个居中容器")) || "",
    /\d+ 个居中容器.+\d+ 个纯图标按钮自动发现/,
    "示范页必须同时覆盖文字按钮、自动发现的纯图标按钮、紧凑数字和状态标记"
  );

  // 负样本：外容器不动，只把 SVG 内容推向右侧。class、组件名与图标类型
  // 都不参与断言，只有渲染几何会让它失败。
  await page.locator('button[aria-label="刷新"] svg').evaluate((icon) => {
    icon.style.transform = "translateX(2px)";
  });
  const negative = createReport();
  await auditPage(page, "center-negative", { kind: "admin", report: negative, skipFont: true });
  assert.ok(
    negative.failures.some((failure) => failure.includes("刷新") && failure.includes("内容未居中")),
    `偏移的图标必须被运行时契约拒绝：\n${negative.failures.join("\n")}`
  );

  // 显式声明只写一半不能静默略过；纯图标刷新按钮本身则始终由自动发现覆盖。
  await page.locator('button[aria-label="刷新"] svg').evaluate((icon) => {
    icon.style.transform = "";
  });
  await page.locator('button[data-center-content]').filter({ hasText: "保存" }).locator("[data-center-ink]").evaluate((ink) => {
    ink.removeAttribute("data-center-ink");
  });
  const incomplete = createReport();
  await auditPage(page, "center-incomplete", { kind: "admin", report: incomplete, skipFont: true });
  assert.ok(
    incomplete.failures.some((failure) => failure.includes("保存") && failure.includes("没有 data-center-ink")),
    `缺失 ink 目标的声明必须失败：\n${incomplete.failures.join("\n")}`
  );

  console.log("✓ runtime center contract: positive, displaced-ink, and incomplete declarations");

  // 网格格子的豁免：既要豁免得到，也要豁免不过界。两个样本形状只差一层包装 ——
  // 一个 button 是 role=grid 的直接子元素（它就是格子），另一个嵌在格子内部
  // （它是格子里的控件，仍按控件查）。
  await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.id = "grid-probe";
    probe.setAttribute("role", "grid");
    probe.innerHTML =
      '<button type="button" style="border-radius:0;height:72px">格子</button>' +
      '<div role="gridcell"><button type="button" style="border-radius:0;height:32px">格内控件</button></div>';
    document.body.appendChild(probe);
  });
  const grid = createReport();
  await auditPage(page, "grid-cells", { kind: "admin", report: grid, skipFont: true });
  assert.ok(
    !grid.failures.some((failure) => failure.includes("格子」")),
    `网格的直接子按钮就是格子，不受控件圆角约束：\n${grid.failures.join("\n")}`
  );
  assert.ok(
    grid.failures.some((failure) => failure.includes("格内控件") && failure.includes("圆角")),
    `格子内部的按钮仍是控件，圆角 0 必须被拒绝：\n${grid.failures.join("\n")}`
  );
  await page.evaluate(() => document.getElementById("grid-probe")?.remove());

  console.log("✓ runtime grid-cell exemption: cells exempt, controls inside cells still checked");

  // 圆角只在看得见的时候才查：无背景无边框的按钮（移动底栏分栏、纯文字动作）豁免，
  // 一旦它有了表面（哪怕只有 1px 边框），圆角就重新成为一条规则。
  await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.id = "surface-probe";
    probe.innerHTML =
      '<button type="button" style="border:0;background:transparent;border-radius:0;height:56px">无表面</button>' +
      '<button type="button" style="border:1px solid #888;background:transparent;border-radius:0;height:36px">有边框</button>';
    document.body.appendChild(probe);
  });
  const surface = createReport();
  await auditPage(page, "surfaced-radius", { kind: "admin", report: surface, skipFont: true });
  assert.ok(
    !surface.failures.some((failure) => failure.includes("无表面")),
    `既无背景也无边框时圆角不可见，不该记账：\n${surface.failures.join("\n")}`
  );
  assert.ok(
    surface.failures.some((failure) => failure.includes("有边框") && failure.includes("圆角")),
    `有边框就有可见圆角，必须照查：\n${surface.failures.join("\n")}`
  );
  await page.evaluate(() => document.getElementById("surface-probe")?.remove());

  console.log("✓ runtime radius scope: only checked where the corner is actually visible");

  // 行 hover 的两种写法都要认：示范页把背景挂在 <tr> 上，把它改挂到 <td> 上，屏幕上
  // 是同一件事，冻结列审计必须照样跑得动；两处都去掉才算真的没有 hover 态。
  await page.addStyleTag({
    content: "table.data tbody tr:hover { background: transparent !important } " +
      "table.data tbody tr:hover td { background: var(--table-row-hover) !important } " +
      "table.data tbody tr:hover td.op { background: var(--table-row-hover) !important }",
  });
  const cellHover = createReport();
  await auditFrozenColumns(page, "cell-hover", cellHover);
  assert.ok(
    !cellHover.failures.some((failure) => failure.includes("没有背景高亮")),
    `行高亮挂在单元格上也是行高亮：\n${cellHover.failures.join("\n")}`
  );

  await page.addStyleTag({
    content: "table.data tbody tr:hover td, table.data tbody tr:hover td.op { background: transparent !important }",
  });
  const noHover = createReport();
  await auditFrozenColumns(page, "no-hover", noHover);
  assert.ok(
    noHover.failures.some((failure) => failure.includes("没有背景高亮")),
    `行与单元格都不亮时必须失败：\n${noHover.failures.join("\n")}`
  );

  console.log("✓ runtime row hover: accepts tr- or cell-painted highlight, still catches none");
} finally {
  await browser.close();
}
