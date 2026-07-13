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
    const out = { buttons: [], cards: [], shadows: [], verticalGrids: [], heroHeadings: [], tinyText: [], font: "", clayFills: 0, rowFills: [] };
    const CLAY = "rgb(182, 83, 60)";   // --primary 陶土红：信号，稀缺
    const INK = "rgb(47, 47, 47)";     // --solid 墨黑：普通实心动作的重量，不是信号

    for (const b of document.querySelectorAll("button")) {
      const s = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // 不可见的不算
      // Radix 的 Checkbox / Radio / Switch 渲染成 <button role="checkbox|radio|switch">，
      // 但它们**不是按钮**：勾选框是 16px 见方的选择控件，圆角和 32px 控件下限都不适用于它。
      // 按 tagName 收集就会把它们一起吃进来 —— 只认标签、不认角色，是这个断言的洞。
      const role = b.getAttribute("role");
      if (role === "checkbox" || role === "radio" || role === "switch") continue;
      out.buttons.push({
        text: (b.textContent || "").trim().slice(0, 14),
        radius: s.borderRadius,
        height: s.height,
        bg: s.backgroundColor,
        // tab trigger 是 28px（DS Tabs button 变体规格），不受 32px 控件下限约束
        isTab: b.getAttribute("role") === "tab" || !!b.closest('[role="tablist"]'),
      });
      // clay 有两种合法用途：「流程唯一的关键动作」和「状态/选中/焦点」（判定表第 1、3 行）。
      // 上限 1 只约束**动作**填充 —— 侧栏 active 导航项、分页当前页（aria-current）、
      // 持有激活条件的高级筛选触发器（aria-pressed）都是**状态**填充，规范明确要求它们用
      // clay，计入上限会让任何带侧栏或带筛选器的页面必然超限。
      const stateful = b.getAttribute("aria-current") !== null || b.getAttribute("aria-pressed") === "true";
      if (s.backgroundColor === CLAY && !stateful) {
        out.clayFills++;
      }
    }

    // 表格行内的填充按钮（Button 判定表第 5 行）：
    // clay **永不**进操作列 —— 20 行就是 20 个红，红在整个产品里都不再是信号；
    // 行级主动作用 ink，且每行至多一个填充，其余动作低权重或收进 ... 菜单。
    for (const row of document.querySelectorAll("tbody tr")) {
      const fills = [...row.querySelectorAll("button, a")]
        .filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map((b) => ({
          text: (b.textContent || "").trim().slice(0, 10),
          bg: getComputedStyle(b).backgroundColor,
          stateful: b.getAttribute("aria-current") !== null || b.getAttribute("aria-pressed") === "true",
        }))
        .filter((b) => b.bg === CLAY || b.bg === INK);

      const clay = fills.filter((f) => f.bg === CLAY && !f.stateful);
      if (clay.length || fills.length > 1) {
        out.rowFills.push({ clay: clay.map((f) => f.text), fills: fills.map((f) => f.text) });
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

    // 表格竖向网格线：**不再是有无之争，而是权重之争**。
    // 密集表（多窄列、跨列比数字、要横向滚）画竖线是真实的阅读需要，规范允许；
    // 但行分隔线必须始终是主结构，竖线只能是眼睛可以忽略的对位辅助线 —— 上限是行分隔线
    // 权重（alpha × 宽度）的 60%。横竖同权重 = 报纸网格 = 禁。
    //
    // 只查**数据行**（tbody 的 tr）——指标条(metric strip)的竖线不是表格网格；
    // thead 的竖线是分组表头的结构边界。两者都不受此约束。
    const alphaOf = (c) => {
      if (!c || c === "transparent") return 0;
      // 现代色彩语法把 alpha 放在斜杠后：oklab(.94 .002 .006 / .25)、color(srgb … / .25)
      const slash = c.match(/\/\s*([\d.]+%?)\s*\)/);
      if (slash) return slash[1].endsWith("%") ? parseFloat(slash[1]) / 100 : parseFloat(slash[1]);
      const n = c.match(/[\d.]+/g);
      if (/^(rgba|hsla)/.test(c)) return n && n.length >= 4 ? parseFloat(n[3]) : 1;
      return 1;
    };
    const lineWeight = (color, width) => alphaOf(color) * (parseFloat(width) || 0);

    for (const row of document.querySelectorAll("tbody tr")) {
      const cells = [...row.children].filter((c) => c.getBoundingClientRect().height > 0);
      if (cells.length < 3) continue;

      const rs = getComputedStyle(row);
      const rowWeight = lineWeight(rs.borderBottomColor, rs.borderBottomWidth);

      // 冻结列的边框是**结构边缘**，不是网格线 —— 规范明确豁免，它有权比行分隔线更重。
      const verticals = cells
        .filter((c) => getComputedStyle(c).position !== "sticky")
        .map((c) => {
          const s = getComputedStyle(c);
          return Math.max(
            lineWeight(s.borderLeftColor, s.borderLeftWidth),
            lineWeight(s.borderRightColor, s.borderRightWidth)
          );
        })
        .filter((w) => w > 0);

      // 零星几条竖线是结构分隔（分组边界、分栏），不是网格；过半才算「画了网格」。
      if (verticals.length < cells.length / 2) continue;

      out.verticalGrids.push({
        cls: (row.className || "").toString().slice(0, 55),
        n: verticals.length,
        of: cells.length,
        maxV: Math.max(...verticals),
        rowWeight,
      });
      break; // 一行足以代表整张表
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
    // 字体栈里**写着** Noto Sans SC ≠ 它真的被加载了。
    // 没有 @font-face（例如没装 @fontsource），中文会静默回退到系统字体
    // （macOS 苹方 / Windows 微软雅黑）—— 各平台渲染不一致，而字体栈看起来完全正常。
    out.notoLoaded = [...document.fonts].some((f) => /Noto Sans SC/i.test(f.family));
    return out;
  })();

// kind="admin"    ：后台工作台 —— 页面标题上限 16px（--text-page-title 15px），禁 hero。
// kind="consumer" ：顾客端页面 —— 移动端蓝图允许 22-24px 标题。
// kind="landing"  ：登录页 / 品牌门面 —— **不受工作台的标题上限约束**。
//                   规范禁止的是「后台工作页面里的 hero」，不是产品门面本身。
//                   但字号**下限**仍然适用：读不了的字，在哪儿都是读不了。
/** rgba 的 alpha —— 没有第四个分量就是不透明 */
const isOpaque = (color) => {
  const n = (color.match(/[\d.]+/g) ?? []).map(Number);
  return n.length < 4 || n[3] === 1;
};

/**
 * 冻结列背景：必须不透明，且必须跟着行状态走。
 *
 * 为什么它单独跑一趟、而不是并进上面的 collect()：**这条规则只在行 hover 时才现形**。
 * 冻结列涂死一个背景色（`bg-card`）的实现，静息态下和正确实现的像素一模一样 —— 静态
 * 收集 computed style 永远抓不到它。只有鼠标压上去那一刻才看得见：整行亮了，冻结列没亮，
 * 高亮在冻结边缘齐刷刷断掉。
 *
 * 而它偏偏又极容易写错：Tailwind v4 里 `bg-card` 落在 utilities 层，行状态规则通常在
 * base 层，**层序压过特异性** —— utilities 里一个单类工具类，稳稳压死 base 里 (0,3,0) 的
 * :hover 规则。token 全对、类名全对、代码审查挑不出毛病。
 */
const auditFrozenColumns = async (page, name) => {
  const rows = page.locator("tbody tr");
  if ((await rows.count()) === 0) return; // 本页没有数据表

  const row = rows.first();
  const cells = row.locator("td");
  const cellCount = await cells.count();

  // 冻结单元格 = 算出来 position:sticky —— 不认 class、不认 data 属性命名，只认浏览器的结论
  const sticky = [];
  for (let i = 0; i < cellCount; i += 1) {
    if ((await cells.nth(i).evaluate((el) => getComputedStyle(el).position)) === "sticky") sticky.push(i);
  }
  if (!sticky.length) return; // 这张表没有冻结列

  const bgOf = (loc) => loc.evaluate((el) => getComputedStyle(el).backgroundColor);

  // ① 静息态：冻结单元格必须不透明，否则横向滚动时下层的列会从底下透出来
  for (const i of sticky) {
    const bg = await bgOf(cells.nth(i));
    if (!isOpaque(bg)) fail(name, `冻结列第 ${i + 1} 格背景 ${bg} 半透明 —— 横向滚动时下层列会透出来`);
  }

  // ② hover 态：行亮起来，冻结列必须跟着亮（此时 <tr> 自己有非透明背景，可直接对拍）
  await row.hover();
  await page.waitForTimeout(250); // 等 transition-colors 走完
  const rowBg = await bgOf(row);

  if (!isOpaque(rowBg)) {
    fail(name, `hover 数据行没有背景高亮（<tr> 仍是 ${rowBg}）—— 表格必须有行 hover 态`);
    return;
  }

  for (const i of sticky) {
    const bg = await bgOf(cells.nth(i));
    if (bg !== rowBg) {
      fail(
        name,
        `hover 时冻结列第 ${i + 1} 格是 ${bg}，同行是 ${rowBg} —— 行高亮走到冻结列就断了。` +
          `多半是给 sticky cell 加了 bg-* 工具类：utilities 层压过了 base 层的行状态规则。`
      );
    }
  }
  pass(name, `冻结列 ${sticky.length} 格：不透明且跟随行 hover`);
};

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

  // ── 表格行内：clay 禁入，每行至多一个 ink 主动作 ────
  const clayRows = d.rowFills.filter((r) => r.clay.length);
  const multiFillRows = d.rowFills.filter((r) => r.fills.length > 1);
  if (clayRows.length) {
    fail(
      name,
      `表格行内有 clay 填充按钮（${clayRows.length} 行，如「${clayRows[0].clay.join("、")}」）—— ` +
        `clay 永不进操作列：20 行 20 个红，红在整个产品里都不再是信号。行级主动作用 ink。`
    );
  } else if (multiFillRows.length) {
    fail(
      name,
      `表格行内有 ${multiFillRows[0].fills.length} 个填充按钮（「${multiFillRows[0].fills.join("、")}」，${multiFillRows.length} 行）—— ` +
        `每行至多一个填充动作（行级主动作），其余低权重或收进 ... 菜单。`
    );
  } else {
    pass(name, `表格行内：无 clay 填充，每行至多一个 ink 主动作`);
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

  // ── 表格：行分隔线是主结构，竖线（若有）必须明显更淡 ──
  const GRID_RATIO = 0.6;
  for (const g of d.verticalGrids) {
    const ratio = g.rowWeight > 0 ? g.maxV / g.rowWeight : Infinity;
    if (g.rowWeight <= 0) {
      fail(name, `表格画了竖向网格线，却没有行分隔线 <.${g.cls}> —— 行分隔线才是表格的结构，不能反过来`);
    } else if (ratio > GRID_RATIO) {
      fail(
        name,
        `竖向网格线太重：竖线权重 ${g.maxV.toFixed(2)}，行分隔线 ${g.rowWeight.toFixed(2)}（比值 ${ratio.toFixed(2)}，` +
          `上限 ${GRID_RATIO}）—— 横竖同权重就是报纸网格。竖线只能是可忽略的对位辅助线。`
      );
    } else {
      pass(name, `竖向网格线存在但明显淡于行分隔线（比值 ${ratio.toFixed(2)} ≤ ${GRID_RATIO}）`);
    }
  }
  if (!d.verticalGrids.length) pass(name, "表格无竖向网格线（默认档）");

  // ── 字号阶梯上限 ───────────────────────────────────
  // 标题：后台 16px（--text-page-title 15），顾客端 24px（移动蓝图 22-24）。
  // 其它文本：一律 ≤22px（--text-data，看板关键数字的上限）。
  for (const h of d.heroHeadings) {
    const cap = kind === "landing"
      ? Infinity
      : h.isHeading
        ? (kind === "consumer" ? 24 : 16)
        : kind === "consumer" ? 24 : 22;
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
  } else if (!d.notoLoaded) {
    // 这条曾经漏掉：只查字体栈，不查是否真的加载 —— 于是一个从没装过
    // @fontsource 的项目也能「通过」，而它的中文其实一直在用系统字体。
    fail(
      name,
      `Noto Sans SC 在字体栈里，但**没有加载 webfont** —— 中文会回退到系统字体，` +
        `各平台渲染不一致。装 @fontsource/noto-sans-sc（400/500/600），或 @import kiln/tokens/fonts.css。`
    );
  } else {
    pass(name, `Noto Sans SC 已加载，无竞争 webfont`);
  }

  // ── 分页条带：高度只能来自 --table-pagination-height ──
  // 真实踩过：条带高度用 padding 拼出来，于是它和 token 分家了 —— 定高表格按 token 算行数，
  // 条带按 padding 长，两边差几像素没人知道，且改一次 padding 就再分家一次。
  // 高度归 token，padding 归零，控件靠 items-center 自己居中。
  const pager = await page.evaluate(() => {
    const bar = [...document.querySelectorAll("div")].find(
      (d) => /^共 /.test((d.textContent || "").trim()) && d.querySelector("nav")
    );
    if (!bar) return null;
    const probe = document.createElement("div");
    probe.style.height = "var(--table-pagination-height)";
    document.body.appendChild(probe);
    const tokenH = Math.round(probe.getBoundingClientRect().height);
    probe.remove();
    return {
      height: Math.round(bar.getBoundingClientRect().height),
      tokenH,
      pt: getComputedStyle(bar).paddingTop,
      pb: getComputedStyle(bar).paddingBottom,
    };
  });
  if (pager) {
    if (Math.abs(pager.height - pager.tokenH) > 1) {
      fail(
        name,
        `分页条带 ${pager.height}px，--table-pagination-height 是 ${pager.tokenH}px` +
          `（padding ${pager.pt}/${pager.pb}）—— 高度必须来自 token，不要用 padding 拼。`
      );
    } else {
      pass(name, `分页条带 ${pager.height}px = --table-pagination-height`);
    }
  }

  // ── 冻结列：不透明 + 跟随行状态（需要交互，放在静态收集之后）──
  await auditFrozenColumns(page, name);
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
