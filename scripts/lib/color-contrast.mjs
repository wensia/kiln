/**
 * kiln — 共享颜色工具：解析 computed color、沿祖先合成透明色、相对亮度与对比度。
 *
 * 同一份实现跑在两端：
 *   · Node：`colorTools` 直接调用（算建议值、单元自测）；
 *   · 浏览器：`installColorTools(page)` 把 `createColorTools` 的源码注入页面，
 *     挂到 `globalThis.__kilnColor`，在 evaluate / evaluateAll 回调里使用。
 * 因此 `createColorTools` 必须**自包含**：不引用模块作用域里的任何东西。
 *
 * 合成的边界是显式的：遇到算不准的背景（渐变 / 图片、整体 opacity < 1 的祖先、
 * 合成到根仍不透明度不足、非 sRGB 的 computed 颜色）一律抛出 `Unsupported…` 错误，
 * 绝不默认当成白底 —— 「看不清就当白色」会让暗色里的透明样本假通过。
 */

export function createColorTools() {
  class UnsupportedColorError extends Error {
    constructor(message) {
      super(`Unsupported: ${message}`);
      this.name = "UnsupportedColorError";
      this.unsupported = true;
    }
  }

  const number = (value, scale = 1) => value.endsWith("%")
    ? parseFloat(value) / 100
    : parseFloat(value) / scale;

  const assertFinite = (parts, value) => {
    if (parts.length < 3 || parts.length > 4 || parts.some((part) => !Number.isFinite(parseFloat(part)))) {
      throw new UnsupportedColorError(`invalid computed color channels in ${value}`);
    }
  };

  /** 解析 computed color：rgb()/rgba()/color(srgb …)/transparent/#hex → [r,g,b,a]，通道 0-1。 */
  const parseColor = (value) => {
    const text = String(value).trim();
    if (text === "transparent") return [0, 0, 0, 0];
    const hex = text.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      let digits = hex[1];
      if (digits.length === 3 || digits.length === 4) digits = [...digits].map((d) => d + d).join("");
      if (digits.length !== 6 && digits.length !== 8) throw new UnsupportedColorError(`hex color ${text}`);
      const channels = digits.match(/../g).map((pair) => parseInt(pair, 16) / 255);
      return channels.length === 3 ? [...channels, 1] : channels;
    }
    const srgb = text.match(/^color\(srgb\s+(.+)\)$/i);
    const rgb = text.match(/^rgba?\((.+)\)$/i);
    if (!srgb && !rgb) throw new UnsupportedColorError(`computed color ${text}`);
    const parts = (srgb?.[1] ?? rgb[1]).replace(/,/g, " ").replace(/\//g, " ").trim().split(/\s+/);
    assertFinite(parts, text);
    return [
      number(parts[0], srgb ? 1 : 255),
      number(parts[1], srgb ? 1 : 255),
      number(parts[2], srgb ? 1 : 255),
      parts[3] === undefined ? 1 : number(parts[3]),
    ];
  };

  /** Porter-Duff source-over：foreground 叠在 background 上。 */
  const over = (foreground, background) => {
    const alpha = foreground[3] + background[3] * (1 - foreground[3]);
    if (alpha === 0) return [0, 0, 0, 0];
    return [...foreground.slice(0, 3).map((channel, index) =>
      (channel * foreground[3] + background[index] * background[3] * (1 - foreground[3])) / alpha
    ), alpha];
  };

  /** WCAG 2.x 相对亮度。 */
  const luminance = (color) => color.slice(0, 3)
    .map((channel) => Math.max(0, Math.min(1, channel)))
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);

  const contrast = (a, b) => {
    const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
    return (high + 0.05) / (low + 0.05);
  };

  const toHex = (color) => "#" + color.slice(0, 3)
    .map((channel) => Math.round(Math.max(0, Math.min(1, channel)) * 255).toString(16).padStart(2, "0"))
    .join("");

  /**
   * 浏览器端：元素背后的可见表面 = 从根到 `element`（含自身，除非 includeSelf=false）逐层合成。
   * 用 DOM 祖先链近似绘制层叠：只适用于正常流内的样本，脱离文档流的浮层请把样本放进自己的表面容器。
   *
   * @param {Element} element
   * @param {{ includeSelf?: boolean, allowOpacity?: boolean }} [options]
   *   allowOpacity：禁用态本来就靠 opacity 表达，调用方明确放行时才跳过 opacity 检查。
   */
  const surfaceBehind = (element, { includeSelf = true, allowOpacity = false } = {}) => {
    const chain = [];
    for (let node = includeSelf ? element : element.parentElement; node; node = node.parentElement) chain.unshift(node);
    let surface = [0, 0, 0, 0];
    for (const node of chain) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== "none") {
        throw new UnsupportedColorError(`non-flat background (background-image) on ${describe(node)}`);
      }
      if (!allowOpacity && Number(style.opacity) !== 1) {
        throw new UnsupportedColorError(`group opacity ${style.opacity} on ${describe(node)} cannot be composited as a flat color`);
      }
      if (style.mixBlendMode && style.mixBlendMode !== "normal") {
        throw new UnsupportedColorError(`mix-blend-mode ${style.mixBlendMode} on ${describe(node)}`);
      }
      surface = over(parseColor(style.backgroundColor), surface);
    }
    if (surface[3] < 0.999) {
      throw new UnsupportedColorError(`no opaque surface behind ${describe(element)} (alpha ${surface[3].toFixed(3)}); refusing to assume a white canvas`);
    }
    return surface;
  };

  /** 浏览器端：把一个 computed 颜色字符串叠到给定表面上，得到实际看到的颜色。 */
  const visible = (value, surface) => over(parseColor(value), surface);

  const describe = (node) => {
    if (!node || !node.tagName) return String(node);
    const id = node.id ? `#${node.id}` : "";
    const probe = node.dataset?.sample ? `[data-sample=${node.dataset.sample}]` : "";
    return `${node.tagName.toLowerCase()}${id}${probe}`;
  };

  return { UnsupportedColorError, parseColor, over, luminance, contrast, toHex, surfaceBehind, visible, describe };
}

/** Node 端实例。 */
export const colorTools = createColorTools();

/**
 * 把颜色工具注入页面（当前文档 + 之后每次导航），挂到 globalThis.__kilnColor。
 * 回调里用 `const C = globalThis.__kilnColor;`。
 */
export async function installColorTools(page) {
  const source = `globalThis.__kilnColor = (${createColorTools.toString()})();\nundefined;`;
  await page.addInitScript({ content: source });
  await page.evaluate(source);
}
