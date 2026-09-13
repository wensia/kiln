#!/usr/bin/env node
/**
 * kiln — 纸面层（笺）的渲染契约。
 *
 * 工作台的门量的是**结构**：圆角阶梯、控件高度、冻结列跟不跟随。
 * 纸面层的门量的是**版面**：留了多少白、有几个高饱和锚点、纸面上有没有柔光阴影。
 * 前者靠 computed style 就能问出来，后者只能**看真实像素** —— 所以这里截图之后
 * 把图送回浏览器，用 canvas 逐像素统计。零新依赖，playwright 已经够了。
 *
 * 为什么留白要写成会失败的检查，而不是「多留点白」这种建议：留白一旦滑出区间，
 * 页面既不是纸也不是工作台，而是掉进中间态 —— 信息稀疏的工作台。那是所有失败
 * 版本里最难看的一种，且它每次都是一点一点滑过去的，没有任何一次改动看起来像是错的。
 *
 * 用法：npm run verify:paper
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { createReport, printReport } from "./lib/runtime-contract.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROBE = process.argv.includes("--probe"); // 只打印实测值，不判定

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "\n✗ 缺少 playwright —— 版面契约要数真实像素，静态分析替代不了。\n" +
      "  安装：npm i -D playwright && npx playwright install chromium\n"
  );
  process.exit(1);
}

/** 墨占比区间：与纸底色有**可见**差异的像素占比。下限防「空得没有主体」，上限防「缩水的工作台」。
 *
 * 这些数是量出来的，不是定出来的。同一套探测跑过两层示范页：
 *
 *   工作台 1440 → 8.11%     工作台 390 → 7.92%
 *   纸面   1440 → 1.45%     纸面   390 → 5.71%
 *
 * 两件事因此变得明确：
 *  ① 工作台的墨占比几乎不随视口变 —— 窄了就横向滚，密度是它的常量。
 *  ② 纸面的墨占比随视口面积**剧烈**变化：内容像素数基本没动，390 的面积只有
 *     1440 的四分之一，占比就涨了近四倍。
 * 所以单一阈值是错的：它会逼着移动端要么删内容、要么缩字号（撞字号下限）。
 *
 * 分档的依据只有一句：**纸面必须显著低于同视口下的工作台**。桌面取工作台的一半，
 * 移动取一个仍明显低于 7.92% 的数 —— 移动端余量本来就小，这正是规范里那句
 * 「窄视口最容易把连续的大块留白摊成均匀的行距」的量化。 */
const INK_RANGE = {
  desktop: { min: 0.005, max: 0.04 }, // 参照：工作台 8.11%
  mobile: { min: 0.01, max: 0.07 },   // 参照：工作台 7.92%
};

/** 判定「与纸底色可见差异」的通道差阈值（0-255）。
 *  这个数同时是规范里那句「颗粒必须极轻，看不见但感觉得到」的量化：
 *  颗粒重到跨过它，页面就会因为墨太多而失败。 */
const INK_DELTA = 18;

/** 逐像素统计：在浏览器里跑，参数是 [截图 base64, 阈值]。 */
const measure = async ([b64, delta]) => {
  const img = new Image();
  img.src = "data:image/png;base64," + b64;
  await img.decode();
  const c = new OffscreenCanvas(img.width, img.height);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
  const total = width * height;

  // 纸底色 = 出现次数最多的颜色。比读 CSS 变量可靠：颗粒、抗锯齿都不会改变众数。
  const counts = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let paperKey = 0;
  let best = -1;
  for (const [k, n] of counts) if (n > best) { best = n; paperKey = k; }
  const pr = (paperKey >> 16) & 255, pg = (paperKey >> 8) & 255, pb = paperKey & 255;

  // 墨 = 与纸底色差异跨过阈值的像素；其中饱和度够高的再统计色相，用来数锚点。
  let ink = 0;
  const hueBuckets = new Array(12).fill(0);
  let saturated = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (Math.max(Math.abs(r - pr), Math.abs(g - pg), Math.abs(b - pb)) <= delta) continue;
    ink++;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2 / 255;
    const s = max === min ? 0 : (max - min) / (255 - Math.abs(2 * (max + min) / 2 - 255));
    // 只有真正带色的像素才算锚点候选 —— 墨黑文字的 s 很低，不该被数成一个色相簇。
    if (s < 0.35 || l < 0.12 || l > 0.94) continue;
    saturated++;
    let h;
    if (max === min) h = 0;
    else if (max === r) h = (60 * (g - b)) / (max - min) + (g < b ? 360 : 0);
    else if (max === g) h = (60 * (b - r)) / (max - min) + 120;
    else h = (60 * (r - g)) / (max - min) + 240;
    hueBuckets[Math.floor(h / 30) % 12]++;
  }

  return {
    total,
    inkRatio: ink / total,
    paper: `rgb(${pr}, ${pg}, ${pb})`,
    saturated,
    // 占高饱和像素 10% 以上的色相桶 —— 一个锚点应该只点亮一个（相邻桶合并前的原始值）
    hueBuckets: hueBuckets.map((n, i) => ({ deg: i * 30, n, share: saturated ? n / saturated : 0 })),
  };
};

/** 纸面层专属的 DOM 断言 */
const domFacts = () => {
  const out = { shadows: [], tiny: [], serif: [], font: "" };
  for (const el of document.querySelectorAll("*")) {
    const s = getComputedStyle(el);
    if (s.boxShadow && s.boxShadow !== "none") {
      out.shadows.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || "").toString().slice(0, 40),
        shadow: s.boxShadow.slice(0, 60),
      });
    }
    if (el.children.length || !(el.textContent || "").trim()) continue;
    const r = el.getBoundingClientRect();
    if (!r.height) continue;
    const size = parseFloat(s.fontSize);
    if (size > 0 && size < 11) out.tiny.push({ t: (el.textContent || "").trim().slice(0, 10), size });
    // `sans-serif` 里也含 "serif" —— 直接匹配会把每个元素都判成衬线。先把 sans-serif
    // 从字体栈里剔掉再找。（这条第一版就踩了：7 个叶子元素全被报成衬线。）
    if (/serif/i.test(s.fontFamily.replace(/sans-serif/gi, ""))) {
      out.serif.push({ t: (el.textContent || "").trim().slice(0, 10), size, tag: el.tagName });
    }
  }
  out.font = getComputedStyle(document.body).fontFamily;
  return out;
};

const report = createReport();
const browser = await chromium.launch();

const audit = async (name, file, viewport) => {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(join(ROOT, file)).href, { waitUntil: "load" });
  await page.waitForTimeout(1200); // 等 webfont 落地，字形会明显改变墨占比

  const shot = await page.screenshot();
  const m = await page.evaluate(measure, [shot.toString("base64"), INK_DELTA]);
  const dom = await page.evaluate(domFacts);

  const pct = (x) => `${(x * 100).toFixed(2)}%`;

  if (PROBE) {
    console.log(`\n── ${name} (${viewport.width}×${viewport.height}) ──`);
    console.log(`  纸底色      ${m.paper}`);
    console.log(`  墨占比      ${pct(m.inkRatio)}   （留白 ${pct(1 - m.inkRatio)}）`);
    console.log(`  高饱和像素  ${m.saturated}`);
    for (const b of m.hueBuckets.filter((b) => b.share > 0.02)) {
      console.log(`    色相 ${String(b.deg).padStart(3)}° → ${b.n} px (${pct(b.share)})`);
    }
    console.log(`  box-shadow  ${dom.shadows.length} 处`);
    console.log(`  衬线元素    ${dom.serif.length} 处`);
  } else {
    // ── 留白 ────────────────────────────────────────
    const band = viewport.width >= 1024 ? "desktop" : "mobile";
    const { min, max } = INK_RANGE[band];
    if (m.inkRatio < min) {
      report.fail(name, `墨占比 ${pct(m.inkRatio)} 低于下限 ${pct(min)} —— 纸上没有主体，空不等于设计`);
    } else if (m.inkRatio > max) {
      report.fail(
        name,
        `墨占比 ${pct(m.inkRatio)} 超过 ${band} 档上限 ${pct(max)}（留白仅 ${pct(1 - m.inkRatio)}）—— ` +
          `这是「缩水的工作台」，不是一张纸。留白必须是连续的大块，不是摊薄的行距。`
      );
    } else {
      report.pass(
        name,
        `墨占比 ${pct(m.inkRatio)}，留白 ${pct(1 - m.inkRatio)}（${band} 档 ${pct(min)}–${pct(max)}）`
      );
    }

    // ── 锚点唯一 ────────────────────────────────────
    const lit = m.hueBuckets.filter((b) => b.share > 0.1);
    // 相邻桶属于同一片色（抗锯齿会把一个色摊到两个桶里），环形相邻合并后再数。
    const degs = lit.map((b) => b.deg).sort((a, b) => a - b);
    const clusters = degs.reduce((acc, d) => {
      const last = acc[acc.length - 1];
      if (last !== undefined && (d - last === 30 || (last === 0 && d === 330))) return acc;
      return [...acc, d];
    }, []);
    if (clusters.length > 1) {
      report.fail(
        name,
        `高饱和色相有 ${clusters.length} 簇（${clusters.map((d) => d + "°").join("、")}）—— ` +
          `纸面只能有一个锚点。换形态可以，换成两个不行。`
      );
    } else {
      report.pass(name, `高饱和锚点 ${clusters.length} 簇（上限 1）`);
    }

    // ── 纸不浮在纸上面 ──────────────────────────────
    if (dom.shadows.length) {
      const s = dom.shadows[0];
      report.fail(
        name,
        `纸面上有 ${dom.shadows.length} 处 box-shadow（如 <${s.tag} class="${s.cls}"> → ${s.shadow}）—— ` +
          `这一层禁用柔光阴影：纸不会浮在纸上面。层次靠 --paper / --paper-deep 换面、靠线和压痕。`
      );
    } else {
      report.pass(name, "无 box-shadow（纸面不投柔光阴影）");
    }

    // ── 字号下限（两层通用）────────────────────────
    if (dom.tiny.length) {
      report.fail(name, `${dom.tiny.length} 处文字小于 11px：${dom.tiny.slice(0, 3).map((x) => `「${x.t}」${Math.round(x.size)}px`).join("、")}`);
    } else {
      report.pass(name, "字号均 ≥11px");
    }

    // ── 衬线只准出现在 display / title ──────────────
    const TITLE_FLOOR = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.fontSize = "var(--text-title)";
      document.body.appendChild(probe);
      const v = parseFloat(getComputedStyle(probe).fontSize);
      probe.remove();
      return v;
    });
    const strayS = dom.serif.filter((x) => x.size < TITLE_FLOOR);
    if (strayS.length) {
      report.fail(
        name,
        `衬线用在了 ${strayS.length} 处非标题文本（如「${strayS[0].t}」${Math.round(strayS[0].size)}px < ${TITLE_FLOOR}px）—— ` +
          `纸面层的衬线只准出现在 --text-display / --text-title 上，正文与控件仍走 sans。`
      );
    } else if (dom.serif.length) {
      report.pass(name, `衬线仅用于 ${dom.serif.length} 处标题（≥${TITLE_FLOOR}px）`);
    }

    if (!/Noto Sans SC/.test(dom.font)) {
      report.fail(name, `字体栈缺少 Noto Sans SC：${dom.font.slice(0, 50)}`);
    } else {
      report.pass(name, "正文字体栈含 Noto Sans SC");
    }
  }

  await ctx.close();
};

// 纸面页面在窄视口下最容易把「连续的大块留白」摊成均匀的行距，所以两个视口都要量。
await audit("纸面/登录(桌面)", "examples/paper-login.html", { width: 1440, height: 900 });
await audit("纸面/登录(移动)", "examples/paper-login.html", { width: 390, height: 844 });

await browser.close();
if (PROBE) {
  console.log("\n· 探测模式：只打印实测值，未做判定。去掉 --probe 跑真实契约。\n");
  process.exit(0);
}
process.exit(printReport(report, { title: "纸面层版面契约" }));
