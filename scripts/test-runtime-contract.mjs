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

  // Real browser regression for double-painted row states. A tr and sticky td
  // can have identical computed colors while translucent ordinary td paint
  // makes the visible ordinary cells darker. Raw string comparison misses it.
  const frozenProbe = await context.newPage();
  const frozenBaseCss = `
    body { margin: 24px; background: white; }
    .probe { border-collapse: collapse; width: 600px; background: white; }
    .probe tr { background: rgb(255, 255, 255); }
    .probe td { height: 40px; width: 200px; background: transparent; }
    .probe td.frozen { position: sticky; right: 0; background: inherit; }
    .probe tr:nth-child(even) { background: rgb(248, 246, 242); }
    .probe tr:hover { background: rgb(241, 238, 233); }
    .probe tr:has([aria-expanded="true"]) { background: rgb(237, 235, 231); }
    .probe tr[data-state="selected"], .probe tr[aria-selected="true"] { background: rgb(240, 224, 219); }
  `;
  const frozenRow = (attributes = "", expanded = false) =>
    `<tr ${attributes}><td>普通列</td><td>普通列二</td><td class="frozen"><button type="button" aria-expanded="${expanded}">更多</button></td></tr>`;
  const frozenTable = (rows) => `<table class="probe"><tbody>${rows}</tbody></table>`;
  const frozenCases = [
    {
      name: "single-paint-all-states",
      html: frozenTable(frozenRow() + frozenRow() + frozenRow('data-state="selected"') + frozenRow("", true) + frozenRow('aria-selected="true"', true)),
      css: "",
      expected: null,
    },
    {
      name: "translucent-row-with-opaque-frozen-tint",
      html: frozenTable(frozenRow()),
      css: ".probe tr:hover { background: rgba(241, 238, 233, .4); } .probe tr:hover td.frozen { background: rgb(241, 238, 233); }",
      expected: /hover.+合成背景/,
    },
    {
      name: "equivalent-css-color-notation",
      html: frozenTable(frozenRow()),
      css: ".probe tr:hover td.frozen { background: color(srgb 0.945098 0.933333 0.913725); }",
      expected: null,
    },
    {
      name: "ordinary-cells-double-hover-tint",
      html: frozenTable(frozenRow()),
      css: ".probe tr:hover td:not(.frozen) { background: rgba(47, 47, 47, .08); }",
      expected: /hover.+合成背景/,
    },
    {
      name: "selected-double-tint-beyond-first-row",
      html: frozenTable(frozenRow() + frozenRow() + frozenRow('data-state="selected"')),
      css: '.probe tr[data-state="selected"] td:not(.frozen) { background: rgba(47, 47, 47, .08); }',
      expected: /行3\].+selected.+合成背景/,
    },
    {
      name: "open-menu-double-tint",
      html: frozenTable(frozenRow() + frozenRow("", true)),
      css: '.probe tr:has([aria-expanded="true"]) td:not(.frozen) { background: rgba(47, 47, 47, .08); }',
      expected: /menu-open.+合成背景/,
    },
    {
      name: "selected-hover-precedence-drift",
      html: frozenTable(frozenRow('aria-selected="true"')),
      css: '.probe tr[aria-selected="true"]:hover td.frozen { background: rgb(241, 238, 233); }',
      expected: /hover\/selected.+合成背景/,
    },
    {
      name: "opaque-frozen-paint-required-in-every-state",
      html: frozenTable(frozenRow('data-state="selected"')),
      css: '.probe tr[data-state="selected"] td.frozen { background: rgba(240, 224, 219, .5); }',
      expected: /selected.+半透明/,
    },
    {
      name: "visible-table-after-hidden-table",
      html: `<div hidden>${frozenTable(frozenRow())}</div>${frozenTable(frozenRow())}`,
      css: ".probe tr:hover td:not(.frozen) { background: rgba(47, 47, 47, .08); }",
      expected: /表2.+合成背景/,
    },
    {
      name: "later-visible-table",
      html: frozenTable(frozenRow()) + `<section>${frozenTable(frozenRow())}</section>`,
      css: "section .probe tr:hover td:not(.frozen) { background: rgba(47, 47, 47, .08); }",
      expected: /表2.+合成背景/,
    },
  ];
  for (const sample of frozenCases) {
    await frozenProbe.setContent(`<style>${frozenBaseCss}${sample.css}</style>${sample.html}`);
    await frozenProbe.evaluate(() => {
      window.frozenProbeClicks = 0;
      document.addEventListener("click", () => { window.frozenProbeClicks += 1; });
    });
    const stateBefore = await frozenProbe.locator("tbody").evaluateAll((bodies) => bodies.map((body) => body.innerHTML));
    const result = createReport();
    await auditFrozenColumns(frozenProbe, sample.name, result);
    if (sample.expected) {
      assert.ok(result.failures.some((failure) => sample.expected.test(failure)), `${sample.name} must fail:\n${result.failures.join("\n")}`);
    } else {
      assert.deepEqual(result.failures, [], `${sample.name} must pass:\n${result.failures.join("\n")}`);
      assert.ok(result.ok.length, `${sample.name} must actually inspect a frozen row`);
    }
    assert.equal(await frozenProbe.evaluate(() => window.frozenProbeClicks), 0, "The audit must not click business controls");
    assert.deepEqual(await frozenProbe.locator("tbody").evaluateAll((bodies) => bodies.map((body) => body.innerHTML)), stateBefore, "The audit must preserve existing selection/menu state");
  }
  await frozenProbe.close();
  console.log("✓ runtime frozen composites: one paint, equivalent notation, double tints, state precedence, opacity, and multiple tables");

  // 入口锚定：三种翻车方式各来一个负样本。三条都不碰 class 名和组件名 —— 只有渲染
  // 几何与结构参与断言，正如这条规则本身谈的是位置而不是写法。
  const anchorPositive = createReport();
  await auditPage(page, "anchor-positive", { kind: "admin", report: anchorPositive, skipFont: true });
  assert.ok(
    anchorPositive.ok.some((item) => item.includes("入口已锚定")),
    `示范页的入口锚定应当通过：\n${anchorPositive.failures.join("\n")}`
  );

  // 1) 忘了 self-start：单行时毫无症状，集合涨到折行才把入口一路推下去 ——
  //    所以负样本必须把数据也喂涨，这正是这条规则要抓的「一开始都对」。
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "anchor-probe-style";
    style.textContent = ".anchor-slot { align-self: stretch }";
    document.head.appendChild(style);
    const collection = document.querySelectorAll("[data-anchor-collection]")[1];
    for (let i = 0; i < 24; i++) {
      const tag = document.createElement("span");
      tag.className = "badge";
      tag.dataset.probeTag = "1";
      tag.textContent = `临时${i}`;
      collection.appendChild(tag);
    }
  });
  const drifted = createReport();
  await auditPage(page, "anchor-drift", { kind: "admin", report: drifted, skipFont: true });
  assert.ok(
    drifted.failures.some((failure) => failure.includes("添加员工") && failure.includes("self-start")),
    `被折行集合推下去的入口必须被拒绝：\n${drifted.failures.join("\n")}`
  );
  await page.evaluate(() => {
    document.getElementById("anchor-probe-style")?.remove();
    document.querySelectorAll("[data-probe-tag]").forEach((tag) => tag.remove());
  });

  // 2) 声明了锚点，却仍把入口留在集合的自动流里 —— 换了件外衣，数据一涨照样跑
  await page.evaluate(() => {
    const row = document.querySelectorAll(".anchor-row")[0];
    row.querySelector("[data-anchor-collection]").appendChild(row.querySelector("[data-action-anchor]"));
  });
  const nested = createReport();
  await auditPage(page, "anchor-nested", { kind: "admin", report: nested, skipFont: true });
  assert.ok(
    nested.failures.some((failure) => failure.includes("选择部门") && failure.includes("嵌套")),
    `塞回集合里的入口必须被拒绝：\n${nested.failures.join("\n")}`
  );
  await page.evaluate(() => {
    const row = document.querySelectorAll(".anchor-row")[0];
    const collection = row.querySelector("[data-anchor-collection]");
    row.insertBefore(row.querySelector("[data-action-anchor]"), collection);
  });

  // 3) 单行看不出的那种：某一行的入口偏了，只有把兄弟行摆在一起比才现形
  await page.evaluate(() => {
    document.querySelectorAll("[data-action-anchor]")[0].style.marginLeft = "24px";
  });
  const ragged = createReport();
  await auditPage(page, "anchor-ragged", { kind: "admin", report: ragged, skipFont: true });
  assert.ok(
    ragged.failures.some((failure) => failure.includes("左边缘不齐")),
    `堆叠内左边缘不齐必须被拒绝：\n${ragged.failures.join("\n")}`
  );
  await page.evaluate(() => {
    document.querySelectorAll("[data-action-anchor]")[0].style.marginLeft = "";
  });

  console.log("✓ runtime action anchor: catches vertical drift, nested slots, and ragged stacks");

  // 同排字段控件同高：这条规则是补一次真事故 —— 日期触发器被当成「更高的那一档字段」。
  // 负样本只改渲染高度，不碰 class、不碰 token 名，因为事故当时那两样读起来都是对的。
  const fieldPositive = createReport();
  await auditPage(page, "field-row-positive", { kind: "admin", report: fieldPositive, skipFont: true });
  assert.ok(
    fieldPositive.ok.some((item) => item.includes("同排字段控件外框同高")),
    `示范页同一行的输入框与日期触发器应当同高：\n${fieldPositive.failures.join("\n")}`
  );

  await page.evaluate(() => {
    document.getElementById("f-date").style.height = "40px";
  });
  const tallDate = createReport();
  await auditPage(page, "field-row-tall-date", { kind: "admin", report: tallDate, skipFont: true });
  assert.ok(
    tallDate.failures.some((failure) => failure.includes("同排控件高度不一") && failure.includes("交付日")),
    `比邻座高一档的日期触发器必须被拒绝：\n${tallDate.failures.join("\n")}`
  );
  await page.evaluate(() => {
    document.getElementById("f-date").style.height = "";
  });

  // 豁免不能过界：嵌在输入框边界里的装饰件（密码显隐、清空 X）本来就该比容器矮，
  // 它与容器水平重叠 —— 判据取「重叠」而不是「谁是装饰件」，所以不需要任何声明。
  await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.id = "affix-probe";
    probe.style.cssText = "position:relative;width:240px";
    probe.innerHTML =
      '<input aria-label="探针输入" style="height:36px;width:240px">' +
      '<button aria-label="探针装饰" aria-haspopup="dialog" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);height:28px;width:28px"></button>';
    document.body.appendChild(probe);
  });
  const affix = createReport();
  await auditPage(page, "field-row-affix", { kind: "admin", report: affix, skipFont: true });
  assert.ok(
    !affix.failures.some((failure) => failure.includes("探针装饰")),
    `嵌在控件边界内的装饰件不是同排邻居：\n${affix.failures.join("\n")}`
  );
  await page.evaluate(() => document.getElementById("affix-probe")?.remove());

  console.log("✓ runtime field row: catches the tall date trigger, exempts in-boundary affixes");
  // 汇总条：正样本在宽屏与窄屏（折成两列）都要过；负样本各注回一种知余真实踩过或
  // 最容易写出来的走样。只动渲染样式，不碰 class 名。
  const stripFailures = (report) => report.failures.filter((failure) => failure.includes("汇总条"));
  const stripAudit = async (label) => {
    const report = createReport();
    await auditPage(page, label, { kind: "admin", report, skipFont: true });
    return report;
  };
  const stripProbe = (css) =>
    page.evaluate((text) => {
      let style = document.getElementById("strip-probe-style");
      if (!style) {
        style = document.createElement("style");
        style.id = "strip-probe-style";
        document.head.appendChild(style);
      }
      style.textContent = text;
    }, css);

  const stripWide = await stripAudit("summary-strip-wide");
  assert.deepEqual(stripFailures(stripWide), [], `示范页汇总条宽屏应当通过：\n${stripWide.failures.join("\n")}`);
  assert.ok(stripWide.ok.some((item) => item.includes("条汇总条已检查")), "示范页必须声明 data-summary-strip");

  await page.setViewportSize({ width: 600, height: 900 });
  const stripNarrow = await stripAudit("summary-strip-narrow");
  assert.deepEqual(stripFailures(stripNarrow), [], `示范页汇总条折成两列后应当通过：\n${stripNarrow.failures.join("\n")}`);

  // 1) 折行后首项还挂着 item + item 的左竖线、第二行没有顶线
  await stripProbe(".summary-item + .summary-item { border-left: 1px solid var(--border) !important; } .summary-item { border-top: 0 !important; }");
  const stripHanging = await stripAudit("summary-strip-hanging");
  assert.ok(
    stripFailures(stripHanging).some((failure) => failure.includes("首项却挂着左竖线")),
    `折行首项的悬空竖线必须被拒绝：\n${stripHanging.failures.join("\n")}`
  );
  assert.ok(
    stripFailures(stripHanging).some((failure) => failure.includes("没有顶部分隔线")),
    `折行后缺顶线必须被拒绝：\n${stripHanging.failures.join("\n")}`
  );
  await stripProbe("");
  await page.setViewportSize({ width: 1440, height: 900 });

  // 2) 一项的数值字号单独放大 + 丢掉等宽数字 + 允许折行
  await stripProbe(".summary-item:first-child .summary-value { font-size: var(--text-data); font-variant-numeric: normal; white-space: normal; }");
  const stripValue = await stripAudit("summary-strip-value");
  for (const needle of ["几种字号", "tabular-nums", "允许折行"])
    assert.ok(
      stripFailures(stripValue).some((failure) => failure.includes(needle)),
      `数值走样（${needle}）必须被拒绝：\n${stripValue.failures.join("\n")}`
    );

  // 3) 描边的卡片、各项内距不一、装饰图标
  await stripProbe(".summary-strip { border: 1px solid var(--border); } .summary-item:last-child { padding-inline: var(--space-2); }");
  await page.evaluate(() => {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.id = "strip-probe-icon";
    icon.setAttribute("width", "14");
    icon.setAttribute("height", "14");
    document.querySelector("[data-summary-strip] .summary-label").prepend(icon);
  });
  const stripChrome = await stripAudit("summary-strip-chrome");
  for (const needle of ["自己带了边框", "内边距不一致", "里有图标"])
    assert.ok(
      stripFailures(stripChrome).some((failure) => failure.includes(needle)),
      `汇总条外观走样（${needle}）必须被拒绝：\n${stripChrome.failures.join("\n")}`
    );
  await stripProbe("");
  await page.evaluate(() => document.getElementById("strip-probe-icon")?.remove());

  console.log("✓ runtime summary strip: wide + wrapped pass; hanging dividers, mixed values, and chrome are rejected");
} finally {
  await browser.close();
}
