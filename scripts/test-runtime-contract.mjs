#!/usr/bin/env node

import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import { auditPage, createReport } from "./lib/runtime-contract.mjs";

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
} finally {
  await browser.close();
}
