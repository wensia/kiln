#!/usr/bin/env node
/**
 * kiln — 主题矩阵运行时检查。
 *
 * scripts/verify.mjs 只认同名 token 最后一次出现的值，不理解作用域：
 * 暗色层是否真的接管、宿主品牌是否在两个作用域都声明、透明 token 叠在
 * 不同底面上是否还够对比度 —— 这些只有渲染后的 computed style 才答得出。
 *
 * 这里打开 examples/themes.html，跑 2 明暗 × 4 品牌 × 4 底面 = 32 个配置，
 * 每个配置读取同一套样本（按钮 / 品牌文字 / 分段 / 输入 / 复选框 / 标签 /
 * 侧栏菜单 / 表格行）的渲染颜色，透明色沿祖先合成后再算对比度。
 * 然后注入负样本（删暗色层、宿主钉死亮色前景、弱化选中标记、删样本），
 * 负样本没被抓到，整个脚本失败。
 *
 * 用法：npm run verify:themes
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { installColorTools } from "./lib/color-contrast.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const THEMES = ["light", "dark"];
const BRANDS = ["clay", "teal", "peacock", "amber"];
const SURFACES = ["canvas", "card", "popover", "fill"];
const SAMPLES = [
  "button-primary", "button-solid", "button-outline",
  "link",
  "segment-track", "segment-active", "segment-inactive",
  "input-value", "input-placeholder", "input-underline",
  "checkbox-unchecked", "checkbox-checked",
  "tag-soft", "tag-outline", "tag-status",
  "menu-current", "menu-item",
  "row-normal", "row-zebra", "row-hover", "row-selected",
];
const HOVER_SAMPLES = ["button-primary", "button-solid", "button-outline", "segment-inactive", "segment-active", "row-hover"];
/** 宿主品牌期望：[fill, on-fill, text] 解析到哪个 palette token（与 themes.html 的宿主 CSS 同源）。 */
const BRAND_EXPECT = {
  light: {
    clay: ["--palette-clay", "--palette-white", "--palette-clay-deep"],
    teal: ["--palette-teal", "--palette-dark-canvas", "--palette-teal-deep"],
    peacock: ["--palette-peacock", "--palette-white", "--palette-peacock"],
    amber: ["--palette-amber", "--palette-dark-canvas", "--palette-amber-deep"],
  },
  dark: {
    clay: ["--palette-dark-clay", "--palette-dark-canvas", "--palette-dark-clay"],
    teal: ["--palette-dark-teal", "--palette-dark-canvas", "--palette-dark-teal"],
    peacock: ["--palette-dark-peacock", "--palette-dark-canvas", "--palette-dark-peacock"],
    amber: ["--palette-dark-amber", "--palette-dark-canvas", "--palette-dark-amber"],
  },
};
/** 品牌入口 → kiln 解析出的角色：必须成套。 */
const BRAND_ROLES = [
  ["--primary", "--kiln-brand-fill"],
  ["--primary-foreground", "--kiln-brand-on-fill"],
  ["--primary-text", "--kiln-brand-text"],
  ["--sidebar-primary", "--kiln-brand-fill"],
  ["--sidebar-primary-foreground", "--kiln-brand-on-fill"],
  ["--ring", "--kiln-brand-text"],
  ["--sidebar-ring", "--kiln-brand-text"],
];
/** 每个样本在 rest 态要解析的 token（与组件 CSS 同源，用来断言「消费的是这个 token」）。 */
const SAMPLE_TOKENS = {
  "button-primary": ["--primary", "--primary-foreground", "--kiln-brand-fill", "--kiln-brand-on-fill", "--solid"],
  "button-solid": ["--solid", "--solid-foreground", "--solid-hover"],
  "button-outline": ["--card", "--foreground"],
  link: ["--primary-text", "--kiln-brand-text"],
  "segment-active": ["--segment-active-bg", "--segment-active-fg", "--segment-active-mark", "--card", "--primary-text"],
  "segment-inactive": ["--segment-hover-bg"],
  "input-placeholder": ["--muted-foreground"],
  "input-underline": ["--control-boundary"],
  "checkbox-unchecked": ["--control-boundary"],
  "checkbox-checked": ["--primary", "--primary-foreground"],
  "menu-current": ["--sidebar-primary", "--sidebar-primary-foreground", "--kiln-brand-on-fill"],
  "row-hover": ["--table-row-hover"],
  "row-selected": ["--table-row-selected"],
};

// ── 浏览器端测量库：注入页面，依赖 globalThis.__kilnColor（scripts/lib/color-contrast.mjs） ──
function createThemeProbe() {
  const C = () => globalThis.__kilnColor;
  const VOID = new Set(["INPUT", "IMG", "BR", "HR", "TEXTAREA", "SELECT"]);

  const resolveVar = (element, name) => {
    const host = VOID.has(element.tagName) ? element.parentElement : element;
    const raw = getComputedStyle(host).getPropertyValue(name).trim();
    if (!raw) return { name, missing: true };
    const probe = document.createElement("span");
    probe.style.cssText = `display:none;background-color:var(${name})`;
    host.appendChild(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return { name, raw, color: C().parseColor(value) };
  };

  const safe = (fn) => {
    try { return fn(); } catch (error) { return { error: error.message, unsupported: Boolean(error.unsupported) }; }
  };

  const textOf = (element) => safe(() => {
    const style = getComputedStyle(element);
    const bg = C().surfaceBehind(element);
    const fg = C().visible(style.color, bg);
    return { fg, bg, ratio: C().contrast(fg, bg) };
  });

  const markOf = (element) => safe(() => {
    const plate = C().surfaceBehind(element);
    const marks = [];
    for (const span of element.querySelectorAll(".segment-mark")) {
      const style = getComputedStyle(span);
      const rect = span.getBoundingClientRect();
      const color = C().parseColor(style.backgroundColor);
      marks.push({
        painted: style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && color[3] > 0,
        color: C().visible(style.backgroundColor, plate),
        raw: color,
      });
    }
    for (const pseudo of ["::before", "::after"]) {
      const style = getComputedStyle(element, pseudo);
      if (style.content === "none" || style.display === "none") continue;
      const color = C().parseColor(style.backgroundColor);
      const border = C().parseColor(style.borderBottomColor);
      marks.push({ painted: color[3] > 0 || (border[3] > 0 && parseFloat(style.borderBottomWidth) > 0), color: C().visible(style.backgroundColor, plate), raw: color, pseudo });
    }
    const painted = marks.filter((mark) => mark.painted);
    const best = painted.map((mark) => ({ ...mark, ratio: C().contrast(mark.color, plate) })).sort((a, b) => b.ratio - a.ratio)[0];
    return { slots: marks.length, painted: painted.length, raw: marks[0]?.raw ?? null, ratio: best?.ratio ?? 0, plate };
  });

  const measure = (element, name, tokens = []) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const out = {
      name,
      rect: { width: rect.width, height: rect.height },
      rawColor: safe(() => C().parseColor(style.color)),
      rawBg: safe(() => C().parseColor(style.backgroundColor)),
      tokens: Object.fromEntries(tokens.map((token) => [token, resolveVar(element, token)])),
    };
    if (name.startsWith("row-")) {
      out.text = textOf(element.querySelector("td"));
      out.surface = safe(() => C().surfaceBehind(element));
    } else if (name === "segment-track") {
      out.surface = safe(() => C().surfaceBehind(element));
    } else if (name === "input-placeholder") {
      out.placeholder = safe(() => {
        const bg = C().surfaceBehind(element);
        const raw = C().parseColor(getComputedStyle(element, "::placeholder").color);
        const fg = C().over(raw, bg);
        return { fg, bg, raw, ratio: C().contrast(fg, bg), empty: element.value === "" && Boolean(element.placeholder) };
      });
    } else if (name === "input-underline") {
      out.text = textOf(element);
      out.underline = safe(() => {
        const outer = C().surfaceBehind(element, { includeSelf: false });
        const inner = C().surfaceBehind(element);
        const line = C().visible(style.borderBottomColor, inner);
        return {
          width: parseFloat(style.borderBottomWidth),
          raw: C().parseColor(style.borderBottomColor),
          ratio: Math.min(C().contrast(line, outer), C().contrast(line, inner)),
        };
      });
    } else if (name === "checkbox-unchecked") {
      out.boundary = safe(() => {
        const outer = C().surfaceBehind(element, { includeSelf: false });
        const inner = C().surfaceBehind(element);
        const sides = ["Top", "Right", "Bottom", "Left"].map((side) => ({
          width: parseFloat(style[`border${side}Width`]),
          raw: C().parseColor(style[`border${side}Color`]),
        }));
        const ratios = sides.map((side) => {
          const line = C().over(side.raw, inner);
          return Math.min(C().contrast(line, outer), C().contrast(line, inner));
        });
        return { sides, ratio: Math.min(...ratios) };
      });
    } else if (name === "checkbox-checked") {
      out.tick = safe(() => {
        const plate = C().surfaceBehind(element);
        const path = element.querySelector("path");
        const svgStyle = getComputedStyle(element.querySelector("svg"));
        const stroke = getComputedStyle(path).stroke;
        const raw = C().parseColor(stroke);
        const tick = C().over(raw, plate);
        return { visible: svgStyle.visibility === "visible" && svgStyle.display !== "none", raw, ratio: C().contrast(tick, plate) };
      });
    } else if (name.startsWith("segment-")) {
      out.text = textOf(element);
      out.mark = markOf(element);
    } else {
      out.text = textOf(element);
    }
    if (name === "tag-status") out.parentSurface = safe(() => C().surfaceBehind(element, { includeSelf: false }));
    return out;
  };

  /** 一次读完当前状态：覆盖计数、底面、品牌解析、全部样本的 rest 态。 */
  const collect = ({ surfaces, samples, sampleTokens, brandExpect, brandRoles }) => {
    const root = document.documentElement;
    const result = {
      theme: root.dataset.theme, brand: root.dataset.brand,
      colorScheme: getComputedStyle(root).colorScheme,
      brandInputs: {}, surfaces: {},
    };
    for (const name of [...new Set([...brandExpect, ...brandRoles.flat()])]) result.brandInputs[name] = resolveVar(root, name);
    for (const surface of surfaces) {
      const section = document.querySelectorAll(`[data-surface="${surface}"]`);
      const entry = { count: section.length, coverage: {}, samples: {} };
      result.surfaces[surface] = entry;
      if (section.length !== 1) continue;
      entry.background = safe(() => C().surfaceBehind(section[0]));
      entry.foreground = safe(() => C().parseColor(getComputedStyle(section[0]).color));
      for (const name of samples) {
        const found = section[0].querySelectorAll(`[data-sample="${name}"]`);
        entry.coverage[name] = found.length;
        if (found.length === 1) entry.samples[name] = measure(found[0], name, sampleTokens[name] ?? []);
      }
    }
    return result;
  };

  return { collect, measure, resolveVar };
}

// ── 静态文件服务：负样本要能「删掉」tokens/dark.css，file:// 拦截不了请求 ──
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname)).replace(/^([/\\])+/, "");
  const file = join(ROOT, path);
  if (!file.startsWith(ROOT + sep)) { response.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const BASE = `http://127.0.0.1:${server.address().port}`;
const PAGE_URL = `${BASE}/examples/themes.html`;

// ── Node 端：把测量结果变成断言 ────────────────────────────────
const TOLERANCE = 1.5 / 255;
const sameColor = (a, b) => Array.isArray(a) && Array.isArray(b) && a.every((channel, index) => Math.abs(channel - b[index]) <= TOLERANCE);
const fmt = (ratio) => `${ratio.toFixed(2)}:1`;
const hex = (color) => Array.isArray(color)
  ? "#" + color.slice(0, 3).map((c) => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, "0")).join("") + (color[3] < 1 ? `/${color[3].toFixed(2)}` : "")
  : String(color);
const luminance = (color) => color.slice(0, 3)
  .map((c) => Math.max(0, Math.min(1, c)))
  .map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  .reduce((total, c, i) => total + c * [0.2126, 0.7152, 0.0722][i], 0);

function createRun() {
  return { failures: [], assertions: 0, minText: Infinity, minUi: Infinity, configs: new Set() };
}

function makeChecker(run, config) {
  const fail = (item, message) => run.failures.push({ config, item, message });
  const ok = (condition, item, message) => {
    run.assertions++;
    if (!condition) fail(item, message);
    return condition;
  };
  /** 结果带 error 时记为「未支持」失败，绝不跳过。 */
  const measurable = (value, item) => {
    if (value && !value.error) return true;
    run.assertions++;
    fail(item, value ? `无法测量（${value.error}）` : "无测量结果");
    return false;
  };
  const contrast = (value, item, min, kind = "text") => {
    if (!measurable(value, item)) return;
    const ratio = value.ratio;
    if (kind === "text") run.minText = Math.min(run.minText, ratio);
    else run.minUi = Math.min(run.minUi, ratio);
    ok(ratio >= min, item, `${kind === "text" ? "文字" : "非文字"}对比度 ${fmt(ratio)} < ${min}:1` +
      (value.fg ? `（前景 ${hex(value.fg)} / 背景 ${hex(value.bg)}）` : ""));
  };
  const token = (sample, name) => sample?.tokens?.[name];
  const matches = (actual, sample, name, item, label) => {
    const resolved = token(sample, name);
    if (!resolved || resolved.missing) {
      run.assertions++;
      fail(item, `${label}：${name} 未定义或无效`);
      return;
    }
    if (!measurable(actual, item)) return;
    ok(sameColor(actual, resolved.color), item, `${label} ${hex(actual)} ≠ ${name} ${hex(resolved.color)}`);
  };
  const tokensPair = (sample, a, b, item) => {
    const left = token(sample, a);
    const right = token(sample, b);
    if (!left || left.missing || !right || right.missing) {
      run.assertions++;
      fail(item, `${left?.missing || !left ? a : b} 未定义或无效`);
      return;
    }
    ok(sameColor(left.color, right.color), item, `${a} ${hex(left.color)} 与 ${b} ${hex(right.color)} 不成套`);
  };
  return { fail, ok, measurable, contrast, matches, tokensPair };
}

/** 静态（rest）断言：一个明暗 × 品牌状态，覆盖四种底面。 */
function assertState(run, state, rest) {
  const { theme, brand } = state;
  const stateCheck = makeChecker(run, `${theme}/${brand}`);
  stateCheck.ok(rest.theme === theme && rest.brand === brand, "state", `根元素状态 ${rest.theme}/${rest.brand}，期望 ${theme}/${brand}`);
  stateCheck.ok(theme === "dark" ? /dark/.test(rest.colorScheme) : !/dark/.test(rest.colorScheme), "color-scheme", `color-scheme 为「${rest.colorScheme}」`);

  // 品牌入口必须真的切到本品牌，并且解析出的角色成套。
  const [fillName, onFillName, textName] = BRAND_EXPECT[theme][brand];
  const inputs = rest.brandInputs;
  for (const [input, expected] of [["--kiln-brand-fill", fillName], ["--kiln-brand-on-fill", onFillName], ["--kiln-brand-text", textName]]) {
    const actual = inputs[input];
    const target = inputs[expected];
    if (actual?.missing || target?.missing) {
      stateCheck.ok(false, "brand", `${actual?.missing ? input : expected} 未定义或无效`);
      continue;
    }
    stateCheck.ok(sameColor(actual.color, target.color), "brand", `${input} ${hex(actual.color)} 未解析到 ${expected} ${hex(target.color)}`);
  }
  for (const [role, input] of BRAND_ROLES) {
    const left = inputs[role];
    const right = inputs[input];
    if (left?.missing || right?.missing) {
      stateCheck.ok(false, "brand-role", `${left?.missing ? role : input} 未定义或无效`);
      continue;
    }
    stateCheck.ok(sameColor(left.color, right.color), "brand-role", `${role} ${hex(left.color)} 与入口 ${input} ${hex(right.color)} 不成套`);
  }

  // 底面层级：暗色里越靠近用户越亮；亮色里白表面不暗于衬底。
  const bg = Object.fromEntries(SURFACES.map((surface) => [surface, rest.surfaces[surface]?.background]));
  if (SURFACES.every((surface) => bg[surface] && !bg[surface].error)) {
    const [canvas, card, popover] = [bg.canvas, bg.card, bg.popover].map(luminance);
    if (theme === "dark") {
      stateCheck.ok(popover > card && card > canvas, "surface-hierarchy",
        `暗色层级错误：popover ${hex(bg.popover)} > card ${hex(bg.card)} > canvas ${hex(bg.canvas)} 不成立`);
    } else {
      stateCheck.ok(card >= canvas && popover >= canvas, "surface-hierarchy",
        `亮色白表面暗于衬底：card ${hex(bg.card)} / popover ${hex(bg.popover)} / canvas ${hex(bg.canvas)}`);
    }
  } else {
    stateCheck.ok(false, "surface-hierarchy", "底面背景无法测量");
  }

  for (const surface of SURFACES) {
    const entry = rest.surfaces[surface];
    const check = makeChecker(run, `${theme}/${brand}/${surface}`);
    run.configs.add(`${theme}/${brand}/${surface}`);
    if (!check.ok(entry.count === 1, "coverage", `底面 [data-surface=${surface}] 找到 ${entry.count} 个，期望 1`)) continue;
    for (const name of SAMPLES) {
      check.ok(entry.coverage[name] === 1, "coverage", `样本 ${name} 找到 ${entry.coverage[name] ?? 0} 个，期望 1`);
    }
    const s = entry.samples;
    if (check.measurable(entry.background, "surface") && check.measurable(entry.foreground, "surface")) {
      const polarity = luminance(entry.foreground) > luminance(entry.background);
      check.ok(theme === "dark" ? polarity : !polarity, "polarity",
        `${theme === "dark" ? "暗色" : "亮色"}底面极性错误：文字 ${hex(entry.foreground)} / 底 ${hex(entry.background)}`);
    }

    // Button
    for (const name of ["button-primary", "button-solid", "button-outline"]) {
      if (s[name]) check.contrast(s[name].text, `${name}`, 4.5);
    }
    if (s["button-primary"]) {
      const b = s["button-primary"];
      check.matches(b.rawBg, b, "--primary", "button-primary", "填充");
      check.matches(b.rawColor, b, "--primary-foreground", "button-primary", "前景");
      check.tokensPair(b, "--primary", "--kiln-brand-fill", "button-primary");
      check.tokensPair(b, "--primary-foreground", "--kiln-brand-on-fill", "button-primary");
    }
    if (s["button-solid"]) {
      check.matches(s["button-solid"].rawBg, s["button-solid"], "--solid", "button-solid", "填充");
      check.matches(s["button-solid"].rawColor, s["button-solid"], "--solid-foreground", "button-solid", "前景");
    }
    if (s["button-outline"]) {
      check.matches(s["button-outline"].rawBg, s["button-outline"], "--card", "button-outline", "底");
      check.matches(s["button-outline"].rawColor, s["button-outline"], "--foreground", "button-outline", "前景");
    }

    // Brand text
    if (s.link) {
      check.contrast(s.link.text, "link", 4.5);
      check.matches(s.link.rawColor, s.link, "--primary-text", "link", "品牌文字");
      check.tokensPair(s.link, "--primary-text", "--kiln-brand-text", "link");
    }

    // Segment
    const track = s["segment-track"];
    const active = s["segment-active"];
    const inactive = s["segment-inactive"];
    if (active) {
      check.contrast(active.text, "segment-active", 4.5);
      check.matches(active.rawBg, active, "--segment-active-bg", "segment-active", "激活片");
      check.matches(active.rawColor, active, "--segment-active-fg", "segment-active", "激活文字");
      if (check.measurable(active.mark, "segment-active/mark")) {
        check.ok(active.mark.slots > 0, "segment-active/mark", "激活片里没有选中标记槽（span.segment-mark 或伪元素）");
        check.matches(active.mark.raw, active, "--segment-active-mark", "segment-active/mark", "选中标记");
        if (theme === "dark") {
          run.minUi = Math.min(run.minUi, active.mark.ratio);
          check.ok(active.mark.painted > 0 && active.mark.ratio >= 3, "segment-active/mark",
            active.mark.painted ? `暗色选中标记对比度 ${fmt(active.mark.ratio)} < 3:1` : "暗色激活片没有画出选中标记");
        }
      }
      if (track && check.measurable(track.surface, "segment-track") && check.measurable(active.text, "segment-active")) {
        const plate = active.text.bg;
        if (theme === "dark") {
          check.ok(luminance(plate) > luminance(track.surface), "segment-active",
            `暗色激活片 ${hex(plate)} 不比轨道 ${hex(track.surface)} 亮`);
        } else {
          check.matches(active.rawBg, active, "--card", "segment-active", "亮色激活片（规格：白底板）");
          check.matches(active.rawColor, active, "--primary-text", "segment-active", "亮色激活文字（规格：品牌文字）");
          check.ok(luminance(plate) >= luminance(track.surface), "segment-active",
            `亮色激活片 ${hex(plate)} 暗于轨道 ${hex(track.surface)}`);
        }
      }
    }
    if (inactive) {
      check.contrast(inactive.text, "segment-inactive", 4.5);
      if (check.measurable(inactive.mark, "segment-inactive/mark")) {
        check.ok(inactive.mark.painted === 0, "segment-inactive/mark", "未选分段静息时画出了选中标记");
      }
    }

    // Input
    if (s["input-value"]) check.contrast(s["input-value"].text, "input-value", 4.5);
    if (s["input-placeholder"] && check.measurable(s["input-placeholder"].placeholder, "input-placeholder")) {
      check.ok(s["input-placeholder"].placeholder.empty, "input-placeholder", "placeholder 样本必须无值且有 placeholder");
      // 读到的必须是 ::placeholder 自己的颜色（规格 --muted-foreground），不是回退成值文字色。
      check.matches(s["input-placeholder"].placeholder.raw, s["input-placeholder"], "--muted-foreground", "input-placeholder", "placeholder");
      check.contrast(s["input-placeholder"].placeholder, "input-placeholder", 4.5);
    }
    if (s["input-underline"]) {
      const u = s["input-underline"];
      check.contrast(u.text, "input-underline", 4.5);
      if (check.measurable(u.underline, "input-underline/line")) {
        check.ok(u.underline.width >= 1, "input-underline/line", `底线宽 ${u.underline.width}px`);
        check.matches(u.underline.raw, u, "--control-boundary", "input-underline/line", "底线");
        check.contrast(u.underline, "input-underline/line", 3, "ui");
      }
    }

    // Checkbox
    if (s["checkbox-unchecked"]) {
      const c = s["checkbox-unchecked"];
      if (check.measurable(c.boundary, "checkbox-unchecked")) {
        check.ok(c.boundary.sides.every((side) => side.width >= 1), "checkbox-unchecked", "未选框缺少完整轮廓");
        check.matches(c.boundary.sides[0].raw, c, "--control-boundary", "checkbox-unchecked", "未选轮廓");
        check.contrast(c.boundary, "checkbox-unchecked", 3, "ui");
      }
    }
    if (s["checkbox-checked"]) {
      const c = s["checkbox-checked"];
      check.matches(c.rawBg, c, "--primary", "checkbox-checked", "已选底");
      if (check.measurable(c.tick, "checkbox-checked/tick")) {
        check.ok(c.tick.visible, "checkbox-checked/tick", "已选的勾不可见");
        check.matches(c.tick.raw, c, "--primary-foreground", "checkbox-checked/tick", "勾");
        check.contrast(c.tick, "checkbox-checked/tick", 3, "ui");
      }
    }

    // Tag
    for (const name of ["tag-soft", "tag-outline", "tag-status"]) {
      if (s[name]) check.contrast(s[name].text, name, 4.5);
    }
    const status = s["tag-status"];
    if (status && check.measurable(status.text, "tag-status") && check.measurable(status.parentSurface, "tag-status")) {
      // 透明 status 的背景 = 合成后的所在底面，不是白色。
      check.ok(sameColor(status.text.bg, status.parentSurface) && sameColor(status.text.bg, entry.background), "tag-status",
        `透明 status 的合成背景 ${hex(status.text.bg)} 与所在底面 ${hex(entry.background)} 不一致`);
    }

    // Sidebar menu
    if (s["menu-current"]) {
      const m = s["menu-current"];
      check.contrast(m.text, "menu-current", 4.5);
      check.matches(m.rawBg, m, "--sidebar-primary", "menu-current", "当前项底");
      check.matches(m.rawColor, m, "--sidebar-primary-foreground", "menu-current", "当前项文字");
      check.tokensPair(m, "--sidebar-primary-foreground", "--kiln-brand-on-fill", "menu-current");
    }
    if (s["menu-item"]) check.contrast(s["menu-item"].text, "menu-item", 4.5);

    // Table rows
    for (const name of ["row-normal", "row-zebra", "row-hover", "row-selected"]) {
      if (s[name]) check.contrast(s[name].text, name, 4.5);
    }
    if (s["row-normal"] && s["row-zebra"] && check.measurable(s["row-normal"].surface, "row-zebra") && check.measurable(s["row-zebra"].surface, "row-zebra")) {
      check.ok(!sameColor(s["row-normal"].surface, s["row-zebra"].surface), "row-zebra", "斑马行与普通行同色");
    }
    if (s["row-selected"]) check.matches(s["row-selected"].rawBg, s["row-selected"], "--table-row-selected", "row-selected", "选中行底");
  }
}

/** hover 断言：真实鼠标悬停后重新测量。 */
async function assertHover(run, page, state, rest) {
  const { theme, brand } = state;
  for (const surface of SURFACES) {
    const check = makeChecker(run, `${theme}/${brand}/${surface}`);
    const samples = rest.surfaces[surface]?.samples ?? {};
    for (const name of HOVER_SAMPLES) {
      const before = samples[name];
      if (!before) continue; // 覆盖断言已经记失败
      const locator = page.locator(`[data-surface="${surface}"] [data-sample="${name}"]`);
      await locator.hover();
      const after = await locator.evaluate((element, args) => globalThis.__kilnThemeProbe.measure(element, ...args),
        [name, SAMPLE_TOKENS[name] ?? []]);
      const item = `${name}:hover`;
      if (name.startsWith("button-")) {
        check.contrast(after.text, item, 4.5);
        check.ok(Math.abs(after.rect.width - before.rect.width) < 0.01 && Math.abs(after.rect.height - before.rect.height) < 0.01, item,
          `hover 改变了尺寸：${before.rect.width}×${before.rect.height} → ${after.rect.width}×${after.rect.height}`);
        if (check.measurable(after.rawColor, item) && check.measurable(before.rawColor, item)) {
          check.ok(sameColor(after.rawColor, before.rawColor), item, `hover 换了前景 ${hex(before.rawColor)} → ${hex(after.rawColor)}，填充与前景不再成套`);
        }
        if (check.measurable(after.rawBg, item) && check.measurable(before.rawBg, item)) {
          check.ok(!sameColor(after.rawBg, before.rawBg), item, "hover 没有任何填充反馈");
        }
        if (name === "button-solid") check.matches(after.rawBg, after, "--solid-hover", item, "hover 填充");
      } else if (name === "segment-inactive") {
        check.contrast(after.text, item, 4.5);
        check.matches(after.rawBg, after, "--segment-hover-bg", item, "hover 底");
        if (check.measurable(after.mark, `${item}/mark`)) {
          check.ok(after.mark.painted === 0, `${item}/mark`, "未选分段 hover 时出现了选中标记");
        }
      } else if (name === "segment-active") {
        check.contrast(after.text, item, 4.5);
        if (check.measurable(after.rawBg, item) && check.measurable(before.rawBg, item)) {
          check.ok(sameColor(after.rawBg, before.rawBg), item, `active:hover 丢了激活片 ${hex(before.rawBg)} → ${hex(after.rawBg)}`);
        }
        check.matches(after.rawBg, after, "--segment-active-bg", item, "active:hover 底");
        if (theme === "dark" && check.measurable(after.mark, `${item}/mark`)) {
          run.minUi = Math.min(run.minUi, after.mark.ratio);
          check.ok(after.mark.painted > 0 && after.mark.ratio >= 3, `${item}/mark`,
            after.mark.painted ? `active:hover 选中标记对比度 ${fmt(after.mark.ratio)} < 3:1` : "active:hover 丢了选中标记");
        }
      } else if (name === "row-hover") {
        check.contrast(after.text, item, 4.5);
        check.matches(after.rawBg, after, "--table-row-hover", item, "hover 行底");
        if (check.measurable(after.surface, item) && check.measurable(before.surface, item)) {
          check.ok(!sameColor(after.surface, before.surface), item, "行 hover 没有背景变化");
        }
      }
    }
  }
  await page.mouse.move(0, 0);
}

async function auditStates(page, states) {
  const run = createRun();
  for (const state of states) {
    await page.evaluate((next) => window.kilnThemes.set(next), state);
    const rest = await page.evaluate((args) => globalThis.__kilnThemeProbe.collect(args), {
      surfaces: SURFACES,
      samples: SAMPLES,
      sampleTokens: SAMPLE_TOKENS,
      brandExpect: [...new Set(Object.values(BRAND_EXPECT).flatMap((brands) => Object.values(brands).flat()))],
      brandRoles: BRAND_ROLES,
    });
    assertState(run, state, rest);
    await assertHover(run, page, state, rest);
  }
  return run;
}

const ALL_STATES = THEMES.flatMap((theme) => BRANDS.map((brand) => ({ theme, brand })));
const DARK_STATES = ALL_STATES.filter((state) => state.theme === "dark");

async function openPage(context, query = "") {
  const page = await context.newPage();
  await page.addInitScript({ content: `globalThis.__kilnThemeProbe = (${createThemeProbe.toString()})();` });
  await installColorTools(page);
  await page.goto(PAGE_URL + query, { waitUntil: "load" });
  const ready = await page.evaluate(() => Boolean(globalThis.__kilnThemeProbe && globalThis.__kilnColor && window.kilnThemes));
  if (!ready) throw new Error("themes.html 缺少 kilnThemes 或测量库未注入");
  return page;
}

const browser = await chromium.launch();
const problems = [];
let main;
const negatives = [];
const unsupported = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await openPage(context);

  // URL 参数切换（其余状态用 JS 切，省去 32 次导航）。
  const viaUrl = await openPage(context, "?theme=dark&brand=amber");
  const urlState = await viaUrl.evaluate(() => ({ theme: document.documentElement.dataset.theme, brand: document.documentElement.dataset.brand }));
  if (urlState.theme !== "dark" || urlState.brand !== "amber") problems.push(`URL 参数切换失败：得到 ${urlState.theme}/${urlState.brand}`);
  await viaUrl.close();

  main = await auditStates(page, ALL_STATES);

  // ── 负样本：每一个都必须让检查器报错 ─────────────────────────
  const negative = async (label, states, { setup, teardown, expect }) => {
    await setup();
    const run = await auditStates(page, states);
    await teardown();
    const hits = run.failures.filter((failure) => expect.test(`${failure.item} ${failure.message}`));
    negatives.push({ label, caught: hits.length > 0, total: run.failures.length, hits: hits.length, sample: hits[0] ?? run.failures[0] });
  };
  const inject = (css) => page.evaluate((text) => {
    const style = document.createElement("style");
    style.dataset.negative = "";
    style.textContent = text;
    document.head.appendChild(style); // 排在所有样式之后
  }, css);
  const clear = () => page.evaluate(() => document.querySelectorAll("style[data-negative]").forEach((style) => style.remove()));

  await negative("删掉暗色层（tokens/dark.css 请求返回空）", DARK_STATES, {
    setup: async () => {
      await page.route("**/tokens/dark.css", (route) => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
      await page.reload({ waitUntil: "load" });
    },
    teardown: async () => {
      await page.unroute("**/tokens/dark.css");
      await page.reload({ waitUntil: "load" });
    },
    expect: /surface-hierarchy|对比度|color-scheme/,
  });
  await negative("暗色关键 token 覆写回亮色值", DARK_STATES, {
    setup: () => inject(`.dark, [data-theme="dark"] {
      --background: var(--palette-canvas); --foreground: var(--palette-ink);
      --card: var(--palette-white); --card-foreground: var(--palette-ink);
      --popover: var(--palette-white); --popover-foreground: var(--palette-ink);
      --muted: var(--palette-surface); --muted-foreground: var(--palette-muted-ink);
    }`),
    teardown: clear,
    expect: /surface-hierarchy|polarity|对比度/,
  });
  await negative("宿主在 :root 钉死亮色 --primary-foreground（同优先级、排在后面）", ALL_STATES, {
    setup: () => inject(":root { --primary-foreground: var(--palette-white); }"),
    teardown: clear,
    expect: /button-primary .*(不成套|对比度|前景)|checkbox-checked\/tick/,
  });
  await negative("暗色 --segment-active-mark 弱化为透明", DARK_STATES, {
    setup: () => inject('.dark, [data-theme="dark"] { --segment-active-mark: transparent; }'),
    teardown: clear,
    expect: /segment-active(:hover)?\/mark/,
  });
  await negative("删除一个样本元素（popover 底面的未选复选框）", [{ theme: "dark", brand: "teal" }], {
    setup: () => page.locator('[data-surface="popover"] [data-sample="checkbox-unchecked"]').evaluate((element) => element.closest("label").remove()),
    teardown: () => page.reload({ waitUntil: "load" }),
    expect: /coverage .*checkbox-unchecked 找到 0 个/,
  });

  // ── 算不准的背景必须明确报「未支持」，不能当白底 ──────────────
  const probeUnsupported = async (label, html, setup = "") => {
    const outcome = await page.evaluate(({ html, setup }) => {
      const host = document.createElement("div");
      host.id = "unsupported-probe";
      host.innerHTML = html;
      document.body.appendChild(host);
      if (setup === "transparent-root") {
        document.documentElement.style.background = "transparent";
        document.body.style.background = "transparent";
      }
      try {
        globalThis.__kilnColor.surfaceBehind(host.querySelector("[data-target]"));
        return { threw: false };
      } catch (error) {
        return { threw: true, unsupported: Boolean(error.unsupported), message: error.message };
      } finally {
        host.remove();
        document.documentElement.style.background = "";
        document.body.style.background = "";
      }
    }, { html, setup });
    unsupported.push({ label, ...outcome });
  };
  await probeUnsupported("渐变背景", '<div style="background:linear-gradient(red,blue)"><span data-target>x</span></div>');
  await probeUnsupported("整体 opacity < 1 的祖先", '<div style="opacity:.6;background:var(--card)"><span data-target>x</span></div>');
  await probeUnsupported("合成到根仍透明", '<div><span data-target>x</span></div>', "transparent-root");
} finally {
  await browser.close();
  server.close();
}

// ── 报告 ───────────────────────────────────────────────────────
const uncaught = negatives.filter((item) => !item.caught);
const unflagged = unsupported.filter((item) => !item.threw || !item.unsupported);
const expectedConfigs = THEMES.length * BRANDS.length * SURFACES.length;
if (main.configs.size !== expectedConfigs) problems.push(`只覆盖了 ${main.configs.size} 个配置，期望 ${expectedConfigs}`);

if (main.failures.length || uncaught.length || unflagged.length || problems.length) {
  console.error(`\n✗ 主题矩阵未通过：`);
  if (main.failures.length) {
    const byConfig = new Map();
    for (const failure of main.failures) {
      if (!byConfig.has(failure.config)) byConfig.set(failure.config, []);
      byConfig.get(failure.config).push(failure);
    }
    console.error(`\n  矩阵断言失败 ${main.failures.length} 项（共 ${main.assertions} 项），涉及 ${byConfig.size} 个配置：`);
    for (const [config, failures] of byConfig) {
      console.error(`   · ${config}`);
      for (const failure of failures) console.error(`       ${failure.item}：${failure.message}`);
    }
  }
  for (const item of uncaught) console.error(`\n  负样本没被抓到：${item.label}（共报 ${item.total} 项，无一命中预期）`);
  for (const item of unflagged) console.error(`\n  未支持的背景没有明确报错：${item.label}${item.threw ? `（报了普通错误：${item.message}）` : "（被静默合成）"}`);
  for (const problem of problems) console.error(`\n  ${problem}`);
  if (!uncaught.length && negatives.length) console.error(`\n  负样本 ${negatives.length} 个全部被抓到。`);
  console.error("");
  process.exit(1);
}

console.log(
  `✓ Themes: ${main.configs.size} configs (2 themes × 4 brands × 4 surfaces), ${main.assertions} assertions ` +
  `(min text ${fmt(main.minText)}, min non-text ${fmt(main.minUi)}); URL switch, ` +
  `${negatives.length} negative probes (${negatives.map((item) => item.hits).join("/")} hits), ` +
  `${unsupported.length} unsupported-surface probes passed.`
);
