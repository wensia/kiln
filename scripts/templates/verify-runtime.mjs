#!/usr/bin/env node
/**
 * 设计规范的**运行时**契约断言。
 *
 * 为什么需要它：verify-design-tokens.mjs 只能证明「数值来自 Design、没人乱编」，
 * 但它抓不住**组合错误** —— token 全对、类名全对，可嵌套关系错了，效果照样崩。
 * 真实踩过的坑：Tabs 的轨道底色是 `color-mix(muted 40%, transparent)`（半透明），
 * 设计稿里它坐在画布上，我们把它塞进了纯白卡片里，混合结果从「落差 5 色阶」
 * 塌成「落差 2 色阶」—— 代码层面挑不出任何毛病，只有量计算后的颜色才看得出来。
 *
 * 所以这里断言的是**浏览器算出来的最终样式**：
 *   · 圆角阶梯：控件 4px / 卡片 6px / 面板 ≤8px
 *   · 控件高度：默认 36px、紧凑 32px（不得低于 32）
 *   · 每个视口至多一个陶土红填充**动作**（clay 泛滥 = 状态信号失效）；
 *     状态填充（aria-current：侧栏 active、分页当前页）不计入上限
 *   · 白色卡片靠阴影分层，不靠边框
 *   · 中文落到 Noto Sans SC
 *   · 阴影一律暖黑 rgba(54,47,42,·)，禁冷调
 *
 * 用法：
 *   npm run verify:runtime                     # 只跑公开路由（登录页、顾客端页）
 *   E2E_USER=... E2E_PASS=... npm run verify:runtime   # 额外跑 /service 工作台
 *
 * 凭据只从环境变量读，绝不落盘。若本地开发连的是生产库，别在被测页面上做写操作 —— 断言只读 computed style，不点任何写按钮。
 */

import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "http://localhost:5173";  // ★ 你的 dev server
const USER = process.env.E2E_USER;
const PASS = process.env.E2E_PASS;
const TOKEN = process.env.E2E_TOKEN;

const failures = [];
const fail = (page, msg) => failures.push(`[${page}] ${msg}`);
const ok = [];
const pass = (page, msg) => ok.push(`[${page}] ${msg}`);

const px = (v) => Math.round(parseFloat(v) || 0);

/** Tailwind 会给元素挂 `rgba(0,0,0,0) 0px 0px` 这种全透明的 shadow 占位，alpha=0，不是真实阴影 */
const isVisible = (shadow) =>
  (shadow.match(/rgba?\([^)]+\)/g) ?? []).some((c) => {
    const n = c.match(/[\d.]+/g);
    return n && (n.length >= 4 ? parseFloat(n[3]) : 1) > 0;
  });

/** 从一串 box-shadow 里挑出真正可见（alpha>0）的那几层，避开 Tailwind 的透明占位 */
const coldPart = (shadow) =>
  (shadow.split(/,(?![^(]*\))/).map((s) => s.trim()).filter((s) => isVisible(s)).join(", ")) || shadow;

/** 暖黑 rgba(54,47,42,·)，或白色高光（顶栏/输入框内高光是规范允许的） */
const isWarmShadow = (s) =>
  /rgba?\(\s*54,\s*47,\s*42/.test(s) || /rgba?\(\s*255,\s*255,\s*255/.test(s);

/** 页面通用契约 —— 在浏览器里跑，返回可断言的事实 */
const collect = () =>
  // eslint-disable-next-line no-undef
  (() => {
    const out = { buttons: [], cards: [], shadows: [], verticalGrids: [], heroHeadings: [], tinyText: [], font: "", clayFills: 0 };
    const CLAY = "rgb(182, 83, 60)";

    for (const b of document.querySelectorAll("button")) {
      const s = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // 不可见的不算
      out.buttons.push({
        text: (b.textContent || "").trim().slice(0, 14),
        radius: s.borderRadius,
        height: s.height,
        bg: s.backgroundColor,
        // tab trigger 是 28px（DS Tabs button 变体规格），不受 32px 控件下限约束
        isTab: b.getAttribute("role") === "tab" || !!b.closest('[role="tablist"]'),
      });
      // clay 有两种合法用途：「流程唯一的关键动作」和「状态/选中/焦点」。
      // 上限 1 只约束前者 —— 侧栏 active 导航项、分页当前页是状态填充（aria-current），
      // 规范明确要求它们用 clay，把它们计入上限会让任何带侧栏的页面必然超限。
      if (s.backgroundColor === CLAY && b.getAttribute("aria-current") === null) {
        out.clayFills++;
      }
    }

    for (const el of document.querySelectorAll("div,section,aside,header")) {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (s.backgroundColor !== "rgb(255, 255, 255)") continue;
      if (r.height < 60 || r.width < 120) continue; // 太小的不算卡片
      out.cards.push({
        cls: (el.className || "").toString().slice(0, 50),
        radius: s.borderRadius,
        borderWidth: s.borderTopWidth,
        shadow: s.boxShadow.slice(0, 60),
      });
    }

    for (const el of document.querySelectorAll("*")) {
      const s = getComputedStyle(el).boxShadow;
      if (s && s !== "none") {
        out.shadows.push({
          shadow: s,
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 60),
        });
      }
    }

    // 表格竖向网格线：规范对 Table 的硬规则是「只有横向行分隔线 —— 无竖向网格」。
    // 只查**表格行**（tr / role=row）—— 指标条(metric strip)用竖线分隔各格是设计稿认可的，
    // 它不是数据表格。断言不区分这两者的话会误伤。
    for (const row of document.querySelectorAll('tr, [role="row"]')) {
      // 只查**数据行**。<thead> 里的竖线是分组表头的结构边界（透视表按服务 colSpan 分组），
      // 规范允许 "table dividers" 这类真实结构边缘；硬规则「只有横向行分隔线」约束的是数据行。
      if (row.closest("thead")) continue;
      const cells = [...row.children].filter((c) => c.getBoundingClientRect().height > 0);
      const withV = cells.filter((c) => {
        const s = getComputedStyle(c);
        return parseFloat(s.borderLeftWidth) > 0 || parseFloat(s.borderRightWidth) > 0;
      });
      // 「网格」= 几乎每个单元格都画竖线。少量竖线是**结构性分隔**（透视表的服务分组边界、
      // 冻结列、分栏），规范明确允许："one-sided borders are allowed only for real structural
      // edges such as frozen columns, split panes, timelines, or table dividers"。
      if (withV.length >= 2 && withV.length >= cells.length - 1) {
        out.verticalGrids.push({
          cls: (row.className || "").toString().slice(0, 55),
          n: withV.length,
          of: cells.length,
        });
      }
    }

    // 字号上限：只查 h1-h3 不够 —— MetricStat 的 28/32px 大数字是个 <span>，
    // 从上一版断言底下整个溜了过去。字号阶梯的天花板是 --text-data (22px)，
    // 且仅限真实数据看板；标题另有更严的 16px 上限。任何可见文本都要落在阶梯内。
    for (const el of document.querySelectorAll("*")) {
      if (el.children.length || !(el.textContent || "").trim()) continue;
      const r = el.getBoundingClientRect();
      if (!r.height) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size > 22) {
        out.heroHeadings.push({
          t: (el.textContent || "").trim().slice(0, 12),
          size,
          isHeading: /^H[1-3]$/.test(el.tagName),
        });
      }
    }
    for (const h of document.querySelectorAll("h1,h2,h3")) {
      const r = h.getBoundingClientRect();
      if (!r.height) continue;
      const size = parseFloat(getComputedStyle(h).fontSize);
      if (size > 16 && size <= 22) {
        out.heroHeadings.push({ t: (h.textContent || "").trim().slice(0, 12), size, isHeading: true });
      }
    }

    // 字号下限：`--text-tiny` = 11px。更小的字在后台里读不了。
    for (const el of document.querySelectorAll("*")) {
      if (el.children.length || !(el.textContent || "").trim()) continue;
      const r = el.getBoundingClientRect();
      if (!r.height) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size > 0 && size < 11) {
        out.tinyText.push({ t: (el.textContent || "").trim().slice(0, 10), size });
      }
    }

    out.font = getComputedStyle(document.body).fontFamily;
    return out;
  })();

// kind="admin"：后台工作台，页面标题上限 16px。
// kind="consumer"：顾客端页面，规范的移动端蓝图允许 22-24px 标题（后台上限是 16px）。
async function audit(page, name, url, kind = "admin") {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const d = await page.evaluate(collect);

  for (const b of d.buttons) {
    const r = px(b.radius);
    const h = px(b.height);

    // 圆角：普通控件 4px；tab 两种变体都合法 —— button 变体 4px，line 变体 0（下划线式，无底板）
    if (b.isTab) {
      if (r !== 0 && r !== 4)
        fail(name, `tab「${b.text}」圆角 ${r}px —— button 变体应 4px，line 变体应 0px`);
    } else if (r !== 4) {
      fail(name, `按钮「${b.text}」圆角 ${r}px，控件必须 4px`);
    }

    // 高度：普通控件下限 32px；tab trigger 28px 是 DS Tabs 规格
    const floor = b.isTab ? 28 : 32;
    if (h > 0 && h < floor) fail(name, `按钮「${b.text}」高 ${h}px，下限 ${floor}px`);
  }
  if (d.buttons.length) pass(name, `${d.buttons.length} 个按钮圆角/高度已检查`);

  // ── 每视口至多一个 clay 填充 ───────────────────────
  if (d.clayFills > 1) {
    fail(name, `陶土红填充按钮 ${d.clayFills} 个 —— 每视口至多 1 个，全红 = 没有状态信号`);
  } else {
    pass(name, `陶土红填充 ${d.clayFills} 个（上限 1）`);
  }

  // ── 白卡：靠阴影分层，不靠边框；圆角 6px（面板 ≤8px）──
  for (const c of d.cards) {
    const bw = px(c.borderWidth);
    const r = px(c.radius);
    if (bw > 0 && c.shadow === "none") {
      fail(name, `白卡 .${c.cls} 有 ${bw}px 边框且无阴影 —— 白卡应无边框、靠 shadow-card 浮起`);
    }
    if (r > 8) fail(name, `白卡 .${c.cls} 圆角 ${r}px，超过面板上限 8px`);
  }
  if (d.cards.length) pass(name, `${d.cards.length} 个白色面板分层已检查`);

  // ── 阴影必须暖黑 ───────────────────────────────────
  const cold = d.shadows.filter((x) => isVisible(x.shadow) && !isWarmShadow(x.shadow));
  if (cold.length) {
    for (const c of cold) {
      fail(name, `冷调阴影 <${c.tag} class="${c.cls}"> → ${coldPart(c.shadow)}  —— 阴影一律暖黑 rgba(54,47,42,·)`);
    }
  } else {
    pass(name, `阴影全部暖黑`);
  }

  // ── 表格：只有横向行分隔线，无竖向网格 ──────────────
  for (const g of d.verticalGrids) {
    fail(name, `表格有竖向网格线（${g.n} 个单元格带竖边框）<.${g.cls}> —— 规范：只有横向行分隔线`);
  }
  if (!d.verticalGrids.length) pass(name, "表格无竖向网格线");

  // ── 字号阶梯上限 ───────────────────────────────────
  // 标题：后台 16px（--text-page-title 15），顾客端 24px（移动蓝图 22-24）。
  // 其它文本：一律 ≤22px（--text-data，看板关键数字的上限）。
  for (const h of d.heroHeadings) {
    const cap = h.isHeading ? (kind === "consumer" ? 24 : 16) : kind === "consumer" ? 24 : 22;
    if (h.size > cap) {
      fail(
        name,
        `${h.isHeading ? "标题" : "文本"}「${h.t}」${Math.round(h.size)}px —— 上限 ${cap}px` +
          (h.isHeading ? "（禁 hero 字号）" : "（--text-data 22px 是阶梯天花板）")
      );
    }
  }

  // ── 字号下限 11px ──────────────────────────────────
  if (d.tinyText.length) {
    const sample = d.tinyText.slice(0, 3).map((x) => `「${x.t}」${Math.round(x.size)}px`).join("、");
    fail(name, `${d.tinyText.length} 处文字小于 11px（--text-tiny 下限）：${sample}…`);
  } else {
    pass(name, "字号均 ≥11px");
  }

  // ── 字体 ───────────────────────────────────────────
  if (!/Noto Sans SC/.test(d.font)) {
    fail(name, `字体栈缺少 Noto Sans SC：${d.font.slice(0, 60)}`);
  } else if (/Geist/.test(d.font)) {
    fail(name, `字体栈含 Geist —— 规范禁止竞争性 webfont`);
  } else {
    pass(name, `中文字体走 Noto Sans SC，无竞争 webfont`);
  }

}

const browser = await chromium.launch();
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

{
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const p = await ctx.newPage();
  await audit(p, "登录页", `${BASE}/login`);  // ★ 换成你的登录路由
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: MOBILE });
  const p = await ctx.newPage();
  await audit(p, "顾客端(移动)", `${BASE}/`, "consumer");  // ★ 换成你的顾客端路由
  await ctx.close();
}

if (TOKEN || (USER && PASS)) {
  const ctx = await browser.newContext({ viewport: DESKTOP });

  if (TOKEN) {
    // 首选：直接注入已有的 access token。比走登录表单更安全 —— 短期、可撤销，
    // 且不需要任何人（包括自动化）经手密码。凭据只从环境变量来，不落盘、不进日志。
    const claims = JSON.parse(
      Buffer.from(TOKEN.split(".")[1], "base64url").toString("utf8")
    );
    const user = { id: Number(claims.sub), username: claims.username, role: claims.role };
    await ctx.addInitScript(
      ([token, u]) => {
        localStorage.setItem("access_token", token);
        localStorage.setItem(
          "auth-storage",
          JSON.stringify({ state: { isAuthenticated: true, user: u }, version: 0 })
        );
      },
      [TOKEN, user]
    );
  } else {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
    await p.locator("input").first().fill(USER);
    await p.locator('input[type="password"]').fill(PASS);
    await p.locator('button[type="submit"], form button').last().click();
    await p.waitForURL(/\/service/, { timeout: 10000 }).catch(() => {});
    await p.close();
  }

  // 复用同一套断言 —— 不再手写一份，否则规则会漂移（上一版就漏了 isTab）。
  // 必须覆盖**每一个** tab：上一版只跑 ?tab=redeem，于是 service tab 的竖向网格线、
  // hero 标题、10px 小字全部漏网 —— 契约的覆盖面就是它的上限。
  // ★ 填上**你项目的每一个页面和每一个 tab**。
  // 断言没走到的地方等于没有规范 —— 这次迁移里契约一度「通过」，
  // 只因为它只跑了一个 tab；扩到全部后立刻暴露 79 项违规。
  const TABS = [
    ["首页", "/"],
    // ["数据表", "/records"],
    // ["设置", "/settings?tab=general"],
  ];
  for (const [label, path] of TABS) {
    const pg = await ctx.newPage();
    await audit(pg, label, `${BASE}${path}`);
    await pg.close();
  }
  await ctx.close();
} else {
  console.log(
    "· 未提供 E2E_TOKEN（或 E2E_USER/E2E_PASS），跳过 /service 工作台。\n" +
      "  要覆盖工作台：E2E_TOKEN=<access_token> npm run verify:runtime\n"
  );
}

await browser.close();

for (const o of ok) console.log(`  ✓ ${o}`);

if (failures.length) {
  console.error(`\n✗ 运行时设计契约未通过（${failures.length} 项）：\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`\n✓ 运行时设计契约通过。`);
