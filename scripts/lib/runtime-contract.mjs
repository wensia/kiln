/**
 * kiln — 运行时设计契约的**断言核心**。
 *
 * 为什么单独一个文件：这套断言有两个调用方 ——
 *   · scripts/verify-examples.mjs   跑 examples/ 里的示范页（kiln 自己吃自己的狗粮）
 *   · scripts/templates/verify-runtime.mjs  被复制进宿主项目，跑真实业务路由
 * 规则写两份就会漂移，而漂移正是这套系统坏掉的唯一方式。模板只负责「跑哪些页面、
 * 怎么登录」，规则一律从这里来。
 *
 * 为什么需要它（而不是只有静态 token 检查）：verify.mjs 只能证明「数值来自契约、
 * 没人乱编」，它抓不住**组合错误** —— token 全对、类名全对，嵌套关系错了，效果照样崩。
 * 真实踩过的坑：Tabs 的轨道底色是半透明 color-mix，设计稿里它坐在画布上，实现把它
 * 塞进了纯白卡片里，混合结果从「落差 5 色阶」塌成「落差 2 色阶」—— 代码层面挑不出
 * 任何毛病，只有量出计算后的颜色才看得见。
 */

/** 视觉锚点的默认取值 —— kiln 是陶土红 + 墨黑。
 *  Port 出去的项目换了主色，把自己的值传进 auditPage，规则本身不用改
 *  （见 references/platform-mapping.md 的 Fixed / Variable / Residue：
 *   「有且仅有一个锚点」是固定层，「锚点是哪个色」是可变层）。 */
export const KILN_PALETTE = {
  clay: "rgb(182, 83, 60)", // --primary：信号，稀缺
  ink: "rgb(47, 47, 47)",   // --solid：普通实心动作的重量，不是信号
};

/**
 * 居中契约的误差是运行时实现值，只在这里定义。
 * 布局盒应当更严；可见墨迹需容纳字体 hinting 和小数像素。
 */
export const CENTER_CONTRACT = Object.freeze({
  layoutTolerance: 0.5,
  inkTolerance: 0.75,
});

export const px = (v) => Math.round(parseFloat(v) || 0);

/** Tailwind 会给元素挂 `rgba(0,0,0,0) 0px 0px` 这种全透明的 shadow 占位，alpha=0，不是真实阴影 */
export const isVisible = (shadow) =>
  (shadow.match(/rgba?\([^)]+\)/g) ?? []).some((c) => {
    const n = c.match(/[\d.]+/g);
    return n && (n.length >= 4 ? parseFloat(n[3]) : 1) > 0;
  });

/** 从一串 box-shadow 里挑出真正可见（alpha>0）的那几层，避开 Tailwind 的透明占位 */
export const coldPart = (shadow) =>
  shadow
    .split(/,(?![^(]*\))/)
    .map((s) => s.trim())
    .filter((s) => isVisible(s))
    .join(", ") || shadow;

/** 暖黑 rgba(54,47,42,·)，或白色高光（顶栏/输入框内高光是规范允许的） */
export const isWarmShadow = (s) =>
  /rgba?\(\s*54,\s*47,\s*42/.test(s) || /rgba?\(\s*255,\s*255,\s*255/.test(s);

/** rgba 的 alpha —— 没有第四个分量就是不透明 */
export const isOpaque = (color) => {
  const n = (color.match(/[\d.]+/g) ?? []).map(Number);
  return n.length < 4 || n[3] === 1;
};

/** 收集器：调用方各自维护自己的失败/通过清单 */
export const createReport = () => {
  const failures = [];
  const ok = [];
  return {
    failures,
    ok,
    fail: (page, msg) => failures.push(`[${page}] ${msg}`),
    pass: (page, msg) => ok.push(`[${page}] ${msg}`),
  };
};

/** 页面通用契约 —— 在浏览器里跑，返回可断言的事实 */
export const collect = (palette) =>
  // eslint-disable-next-line no-undef
  (() => {
    const out = {
      buttons: [], cards: [], shadows: [], verticalGrids: [],
      heroHeadings: [], tinyText: [], font: "", clayFills: 0, rowFills: [],
      centeredContent: [], segmentedTracks: [],
      titleAuthority: { total: 0, visible: [], texts: [], echoes: [] },
    };
    const CLAY = palette.clay;
    const INK = palette.ink;

    for (const b of document.querySelectorAll("button")) {
      const s = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // 不可见的不算
      // Radix 的 Checkbox / Radio / Switch 渲染成 <button role="checkbox|radio|switch">，
      // 但它们**不是按钮**：勾选框是 16px 见方的选择控件，圆角和 32px 控件下限都不适用于它。
      // 按 tagName 收集就会把它们一起吃进来 —— 只认标签、不认角色，是这个断言的洞。
      const role = b.getAttribute("role");
      if (role === "checkbox" || role === "radio" || role === "switch") continue;
      // 网格的格子是同一个洞的另一半：可点的日历格子、月份格、年份格都渲染成 <button>，
      // 但它铺满一格、与邻格共享网格线，圆角 4px 会把整张网格切成碎片 —— 控件圆角这条
      // 规则本来就不是给它写的。判据取「谁是格子」而不是「谁在网格里」：格子是 grid/row
      // 的直接子元素，或自报 gridcell；表格操作列里的按钮嵌在单元格内部，不受影响。
      const parentRole = b.parentElement?.getAttribute("role");
      if (role === "gridcell" || parentRole === "grid" || parentRole === "row") continue;
      out.buttons.push({
        text: (b.textContent || "").trim().slice(0, 14),
        radius: s.borderRadius,
        height: s.height,
        bg: s.backgroundColor,
        // 圆角要不要查，取决于它看不看得见 —— 见 auditPage 里的 surfaced 判定
        borderWidth: s.borderTopWidth,
        // tab trigger 比普通控件矮一档（components.md：Tabs button 变体 = --control-height-sm，
        // line 变体另有高度），不受 32px 控件下限约束
        isTab: b.getAttribute("role") === "tab" || !!b.closest('[role="tablist"]'),
      });
      // clay 有两种合法用途：「流程唯一的关键动作」和「状态/选中/焦点」（判定表第 1、3 行）。
      // 上限 1 只约束**动作**填充 —— 侧栏 active 导航项、分页当前页（aria-current）、
      // 持有激活条件的高级筛选触发器（aria-pressed）都是**状态**填充，规范明确要求它们用
      // clay，计入上限会让任何带侧栏或带筛选器的页面必然超限。
      const stateful =
        b.getAttribute("aria-current") !== null || b.getAttribute("aria-pressed") === "true";
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
          stateful:
            b.getAttribute("aria-current") !== null || b.getAttribute("aria-pressed") === "true",
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

    // 字号上限：只查 h1-h3 不够 —— MetricStat 的大数字是个 <span>，
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

    // 分段轨道（components.md：Tabs button 变体）：可见外框就是控件本身，只比触发器
    // 高 4px（1px 边框 + 1px 内衬，上下各一）。内衬给到 4px 就撑出 38px 的轨道，而
    // 38px 挨着 36px 的按钮正是 SKILL.md 点名的反模式 —— 差 2px，肉眼只看得出这排
    // 没对齐，看不出错在哪一边。这条断言与产品选哪一档控件高无关，查的是差值。
    // 同一条规格有两种写法：Tabs 的 tablist/tab，和 SegmentedControl 的 group + aria-pressed。
    // 只查前者，后者就是规范里没被访问过的那一半 —— 也就是实际上没被规定。
    for (const list of document.querySelectorAll('[role="tablist"], [role="group"]')) {
      const listRect = list.getBoundingClientRect();
      if (!(listRect.height > 0)) continue;
      const style = getComputedStyle(list);
      // line 变体没有底板（无背景无边框），它不是"轨道"，不受这条约束
      const plated =
        style.borderBottomWidth !== style.borderTopWidth ? false : parseFloat(style.borderTopWidth) > 0;
      if (!plated) continue;
      const triggers = [...list.querySelectorAll('[role="tab"], [aria-pressed]')]
        .map((t) => t.getBoundingClientRect().height)
        .filter((h) => h > 0);
      if (!triggers.length) continue;
      out.segmentedTracks.push({
        track: listRect.height,
        trigger: Math.max(...triggers),
        label: (list.getAttribute("aria-label") || list.textContent || "").trim().slice(0, 12),
      });
    }

    // 标题权威（layouts-and-pages.md：Title Authority）：一条路由恰好一个 h1。
    // 0 个 = 没有权威 —— 顶栏标题槽里放个加粗 <span> 看起来没差，读屏软件却落进一个
    // 永不自报门户的页面；≥2 个 = 顶栏和 body 各拿一个，用户连着读到两遍页面名。
    // 同名的 h2/h3 是同一个病的换装版本：标题带删了，eyebrow 留着。
    const headings = [...document.querySelectorAll("h1")].map((h) => {
      const r = h.getBoundingClientRect();
      return { t: (h.textContent || "").trim().slice(0, 24), visible: r.width > 1 && r.height > 1 };
    });
    out.titleAuthority = {
      total: headings.length,
      visible: headings.filter((h) => h.visible).map((h) => h.t),
      texts: headings.map((h) => h.t),
      echoes: [...document.querySelectorAll("h2,h3")]
        .filter((h) => {
          const r = h.getBoundingClientRect();
          if (!(r.width > 1 && r.height > 1)) return false;
          const text = (h.textContent || "").trim();
          return text.length > 0 && headings.some((h1) => h1.t === text.slice(0, 24));
        })
        .map((h) => (h.textContent || "").trim().slice(0, 24)),
    };

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

    // ── 容器内容居中：布局盒 + 可见墨迹 ───────────────────────
    //
    // 这条故意不认 .btn / .icon / .badge 等 class：只要一个外容器的
    // 设计意图是「内容居中」，就在容器上声明 data-center-content，并把
    // 一个或多个真正可见的目标标为 data-center-ink。文字按字体实际上/下
    // 界量，SVG 按内部图形 bbox 量；所以「写了 align-items:center」不能代替这一关。
    const unionRects = (rects) => {
      const visible = rects.filter(
        (r) => r && Number.isFinite(r.left) && Number.isFinite(r.top) && r.right > r.left && r.bottom > r.top
      );
      if (!visible.length) return null;
      return {
        left: Math.min(...visible.map((r) => r.left)),
        right: Math.max(...visible.map((r) => r.right)),
        top: Math.min(...visible.map((r) => r.top)),
        bottom: Math.max(...visible.map((r) => r.bottom)),
      };
    };

    const rectOf = (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });

    const svgInkRect = (svg) => {
      try {
        const box = svg.getBBox();
        const matrix = svg.getScreenCTM();
        if (!matrix || box.width <= 0 || box.height <= 0) return null;
        const points = [
          [box.x, box.y],
          [box.x + box.width, box.y],
          [box.x, box.y + box.height],
          [box.x + box.width, box.y + box.height],
        ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
        return {
          left: Math.min(...points.map((p) => p.x)),
          right: Math.max(...points.map((p) => p.x)),
          top: Math.min(...points.map((p) => p.y)),
          bottom: Math.max(...points.map((p) => p.y)),
        };
      } catch {
        return null;
      }
    };

    const textInkRects = (target) => {
      const rects = [];
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const raw = node.data || "";
        const start = raw.search(/\S/);
        if (start < 0) continue;
        const end = raw.search(/\s*$/);
        if (end <= start) continue;

        // 嵌套的 ink 目标由它自己统计，不在父目标里重复计算。
        const owner = node.parentElement?.closest("[data-center-ink]");
        if (owner !== target || node.parentElement?.closest("svg")) continue;

        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        const lineRects = [...range.getClientRects()];
        if (!lineRects.length) continue;

        // 紧凑控件不应换行。真换行时保留浏览器给出的可见行盒；单行时再用
        // Canvas 字体度量收紧垂直墨迹，抓住 line-height 造成的偏移。
        if (!context || lineRects.length !== 1) {
          rects.push(...lineRects.map(rectOf));
          continue;
        }

        const rangeRect = lineRects[0];
        const style = getComputedStyle(node.parentElement);
        context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        context.direction = style.direction;
        context.textAlign = "start";
        const metrics = context.measureText(raw.slice(start, end));
        const fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
        if (!fontHeight || !metrics.actualBoundingBoxAscent) {
          rects.push(rectOf(rangeRect));
          continue;
        }

        const scaleY = rangeRect.height / fontHeight;
        const baseline = rangeRect.top + metrics.fontBoundingBoxAscent * scaleY;
        rects.push({
          // 水平使用排版 advance box；单字 bearing 是字体设计，不应驱动逐字 translateX。
          left: rangeRect.left,
          right: rangeRect.right,
          top: baseline - metrics.actualBoundingBoxAscent * scaleY,
          bottom: baseline + metrics.actualBoundingBoxDescent * scaleY,
        });
      }
      return rects;
    };

    const isRendered = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        parseFloat(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const isVisuallyHiddenText = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const clipped =
        style.overflow === "hidden" ||
        style.overflow === "clip" ||
        style.clip !== "auto" ||
        style.clipPath !== "none";
      return clipped && rect.width <= 1 && rect.height <= 1;
    };

    const hasVisibleText = (host) => {
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!(node.data || "").trim() || node.parentElement?.closest("svg")) continue;
        const parent = node.parentElement;
        if (!parent || !isRendered(parent) || isVisuallyHiddenText(parent)) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        if ([...range.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0)) return true;
      }
      return false;
    };

    const graphicTargets = (host) =>
      [...host.querySelectorAll("*")].filter((element) => {
        if (element.closest('button,[role="button"]') !== host || !isRendered(element)) return false;
        const tag = element.tagName.toLowerCase();
        if (["svg", "img", "canvas", "video", "object", "embed"].includes(tag)) return true;
        const style = getComputedStyle(element);
        const hasImage = (value) => Boolean(value && value !== "none");
        return (
          hasImage(style.backgroundImage) ||
          hasImage(style.maskImage) ||
          hasImage(style.webkitMaskImage)
        );
      });

    const explicitHosts = [...document.querySelectorAll("[data-center-content]")].map((host) => ({
      host,
      autoDetected: false,
      targets: [...host.querySelectorAll("[data-center-ink]")].filter(
        (target) =>
          target.closest("[data-center-content]") === host &&
          !target.parentElement?.closest("[data-center-ink]")
      ),
    }));
    const explicitSet = new Set(explicitHosts.map(({ host }) => host));

    const autoHosts = [...document.querySelectorAll('button,[role="button"]')]
      .filter((host) => {
        if (explicitSet.has(host)) return false;
        const role = host.getAttribute("role");
        const semanticButton = role === "button" || (host.tagName === "BUTTON" && !role);
        return semanticButton && isRendered(host) && !hasVisibleText(host);
      })
      .map((host) => ({ host, autoDetected: true, targets: graphicTargets(host) }))
      .filter(({ targets }) => targets.length > 0);

    for (const { host, autoDetected, targets } of [...explicitHosts, ...autoHosts]) {
      const hostRect = host.getBoundingClientRect();
      if (hostRect.width <= 0 || hostRect.height <= 0) continue;

      const label =
        host.getAttribute("aria-label") ||
        host.getAttribute("title") ||
        (host.textContent || "").trim().replace(/\s+/g, " ").slice(0, 18) ||
        host.tagName.toLowerCase();

      if (!targets.length) {
        out.centeredContent.push({ label, tag: host.tagName.toLowerCase(), missingInk: true, autoDetected });
        continue;
      }

      const layoutRect = unionRects(targets.map((target) => rectOf(target.getBoundingClientRect())));
      const inkRects = [];
      for (const target of targets) {
        const svgs = target.matches("svg")
          ? [target]
          : [...target.querySelectorAll("svg")].filter((svg) => !svg.parentElement?.closest("svg"));
        inkRects.push(...svgs.map(svgInkRect).filter(Boolean));
        inkRects.push(...textInkRects(target));

        if (!svgs.length && !(target.textContent || "").trim()) {
          // CSS 画出的点/块、img/canvas 等无文字目标，其元素盒就是可见几何。
          inkRects.push(rectOf(target.getBoundingClientRect()));
        }
      }
      const inkRect = unionRects(inkRects);

      if (!layoutRect || !inkRect) {
        out.centeredContent.push({
          label,
          tag: host.tagName.toLowerCase(),
          missingGeometry: true,
          autoDetected,
        });
        continue;
      }

      const hostX = (hostRect.left + hostRect.right) / 2;
      const hostY = (hostRect.top + hostRect.bottom) / 2;
      out.centeredContent.push({
        label,
        tag: host.tagName.toLowerCase(),
        layoutDx: (layoutRect.left + layoutRect.right) / 2 - hostX,
        layoutDy: (layoutRect.top + layoutRect.bottom) / 2 - hostY,
        inkDx: (inkRect.left + inkRect.right) / 2 - hostX,
        inkDy: (inkRect.top + inkRect.bottom) / 2 - hostY,
        autoDetected,
      });
    }
    // ── 过度滚动橡皮筋（SKILL.md：Interaction Is Quiet）───────────
    // 文档层无条件要求 none —— macOS WKWebView（Tauri 桌面壳）的整页橡皮筋从这来。
    // 滚动容器只查「真的在滚」的轴：给滚不动的轴也写 none 会吞掉祖先的滚动链，
    // 所以按轴分开断言。
    out.overscroll = { doc: [], scrollers: [], okCount: 0 };
    for (const el of [document.documentElement, document.body]) {
      const s = getComputedStyle(el);
      out.overscroll.doc.push({
        tag: el.tagName.toLowerCase(),
        x: s.overscrollBehaviorX,
        y: s.overscrollBehaviorY,
      });
    }
    for (const el of document.querySelectorAll("*")) {
      if (el === document.documentElement || el === document.body) continue;
      const s = getComputedStyle(el);
      const scrollsY = /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
      const scrollsX = /(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1;
      if (!scrollsY && !scrollsX) continue;
      const badY = scrollsY && s.overscrollBehaviorY !== "none";
      const badX = scrollsX && s.overscrollBehaviorX !== "none";
      if (badY || badX) {
        const label =
          typeof el.className === "string" && el.className.trim()
            ? el.className.trim().split(/\s+/).slice(0, 3).join(".")
            : el.tagName.toLowerCase();
        out.overscroll.scrollers.push({ label: label.slice(0, 60), badY, badX });
      } else {
        out.overscroll.okCount++;
      }
    }

    return out;
  })();

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
export const auditFrozenColumns = async (page, name, report) => {
  const { fail, pass } = report;
  const rows = page.locator("tbody tr");
  if ((await rows.count()) === 0) return; // 本页没有数据表

  // 窄视口下桌面表格通常是 display:none（行仍在 DOM 里），移动端另有一套卡片列表。
  // 对隐藏的行做 hover 只会挂在那里等到超时 —— 它不是违规，是这一档根本没有这张表。
  const row = rows.first();
  if (!(await row.isVisible())) return;
  const cells = row.locator("td");
  const cellCount = await cells.count();

  // 冻结单元格 = 算出来 position:sticky —— 不认 class、不认 data 属性命名，只认浏览器的结论
  const sticky = [];
  for (let i = 0; i < cellCount; i += 1) {
    if ((await cells.nth(i).evaluate((el) => getComputedStyle(el).position)) === "sticky") sticky.push(i);
  }
  if (!sticky.length) return; // 这张表没有冻结列

  const bgOf = (loc) => loc.evaluate((el) => getComputedStyle(el).backgroundColor);

  // 报「通过」必须以本轮**没有**失败为前提。上一版无条件 pass，于是同一次运行里
  // 冻结列既报 ✓ 又报 ✗ —— 一个自相矛盾的报告，读的人只会挑自己想信的那条。
  let broken = false;

  // ① 静息态：冻结单元格必须不透明，否则横向滚动时下层的列会从底下透出来
  for (const i of sticky) {
    const bg = await bgOf(cells.nth(i));
    if (!isOpaque(bg)) {
      broken = true;
      fail(name, `冻结列第 ${i + 1} 格背景 ${bg} 半透明 —— 横向滚动时下层列会透出来`);
    }
  }

  // ② hover 态：行亮起来，冻结列必须跟着亮。
  //
  // 基准取「同行普通单元格算出来的背景」，不是 <tr> 的背景 —— 行高亮有两种写法，屏幕上
  // 是同一件事：挂在 <tr> 上，或挂在每个 <td> 上（冻结单元格必须不透明，不少实现索性把
  // 背景都给了单元格）。只认 <tr> 会把后一种误判成「没有行 hover 态」，而真正该查的
  // 冻结列对拍，因为这里的 return 根本没机会跑 —— 一条误报顺带盖掉一条真断言。
  await row.hover();
  await page.waitForTimeout(250); // 等 transition-colors 走完
  const plainIndex = [...Array(cellCount).keys()].find((i) => !sticky.includes(i));
  let rowBg = await bgOf(row);
  if (!isOpaque(rowBg) && plainIndex !== undefined) rowBg = await bgOf(cells.nth(plainIndex));

  if (!isOpaque(rowBg)) {
    fail(name, `hover 数据行没有背景高亮（行与普通单元格都是 ${rowBg}）—— 表格必须有行 hover 态`);
    return;
  }

  for (const i of sticky) {
    const bg = await bgOf(cells.nth(i));
    if (bg !== rowBg) {
      broken = true;
      fail(
        name,
        `hover 时冻结列第 ${i + 1} 格是 ${bg}，同行是 ${rowBg} —— 行高亮走到冻结列就断了。` +
          `多半是给 sticky cell 加了 bg-* 工具类：utilities 层压过了 base 层的行状态规则。`
      );
    }
  }
  if (!broken) pass(name, `冻结列 ${sticky.length} 格：不透明且跟随行 hover`);
};

/**
 * 对一个已经打开的页面跑整套契约。
 *
 * kind="admin"    ：后台工作台 —— 页面标题上限 16px（--text-page-title 15px），禁 hero。
 * kind="consumer" ：顾客端页面 —— 移动端蓝图允许 22-24px 标题。
 * kind="landing"  ：登录页 / 品牌门面 —— **不受工作台的标题上限约束**。
 *                   规范禁止的是「后台工作页面里的 hero」，不是产品门面本身。
 *                   但字号**下限**仍然适用：读不了的字，在哪儿都是读不了。
 *
 * skipFont：离线环境下 CDN 字体必然加载不上，此时跳过字体断言并由调用方明确声明跳过了。
 *           默认 false —— 静默降级的契约不是契约。
 */
export async function auditPage(page, name, { kind = "admin", report, palette = KILN_PALETTE, skipFont = false } = {}) {
  const { fail, pass } = report;
  const d = await page.evaluate(collect, palette);

  for (const b of d.buttons) {
    const r = px(b.radius);
    const h = px(b.height);

    // 圆角只在**看得见**的时候才是一条规则。既没有背景也没有边框的按钮 —— 移动底栏
    // 的分栏、纯文字动作 —— 圆角写 0 还是 4，渲染出来一模一样，查它等于查一个不存在
    // 的属性，只会给每个带底栏的页面记一笔假账。（真正的 ghost 控件按规范 rest 态就得
    // 有可见表面，所以这条豁免不会放过它们。）
    const surfaced = !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(b.bg) || px(b.borderWidth) > 0;
    if (!surfaced) {
      // 圆角不查，高度照查：触摸目标和有没有表面无关。
    } else if (b.isTab) {
      // tab 两种变体都合法 —— button 变体 4px，line 变体 0（下划线式，无底板）
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

  // ── 声明式内容居中：数学布局盒 + 可见墨迹 ────────────────
  let centeredBroken = false;
  for (const c of d.centeredContent) {
    if (c.missingInk) {
      centeredBroken = true;
      fail(
        name,
        `<${c.tag}>「${c.label}」声明了 data-center-content，但没有 data-center-ink 目标`
      );
      continue;
    }
    if (c.missingGeometry) {
      centeredBroken = true;
      fail(
        name,
        `<${c.tag}>「${c.label}」的${
          c.autoDetected ? "自动发现图形" : " data-center-ink"
        }不可见或无法测量`
      );
      continue;
    }

    const layoutOff =
      Math.abs(c.layoutDx) > CENTER_CONTRACT.layoutTolerance ||
      Math.abs(c.layoutDy) > CENTER_CONTRACT.layoutTolerance;
    const inkOff =
      Math.abs(c.inkDx) > CENTER_CONTRACT.inkTolerance ||
      Math.abs(c.inkDy) > CENTER_CONTRACT.inkTolerance;

    if (layoutOff || inkOff) {
      centeredBroken = true;
      fail(
        name,
        `<${c.tag}>「${c.label}」内容未居中：` +
          `布局盒 Δx ${c.layoutDx.toFixed(2)}px / Δy ${c.layoutDy.toFixed(2)}px，` +
          `可见墨迹 Δx ${c.inkDx.toFixed(2)}px / Δy ${c.inkDy.toFixed(2)}px。` +
          `不要用 align-items/place-items 的声明代替渲染几何验收。`
      );
    }
  }
  if (d.centeredContent.length && !centeredBroken) {
    const autoCount = d.centeredContent.filter((c) => c.autoDetected).length;
    pass(
      name,
      `${d.centeredContent.length} 个居中容器：布局盒与可见墨迹已检查` +
        (autoCount ? `（${autoCount} 个纯图标按钮自动发现）` : "")
    );
  }

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

  // ── 分段轨道：外框只比触发器高 4px ──────────────────
  for (const track of d.segmentedTracks || []) {
    const gap = px(track.track) - px(track.trigger);
    if (gap !== 4) {
      fail(
        name,
        `分段轨道「${track.label}」外框 ${px(track.track)}px、触发器 ${px(track.trigger)}px，` +
          `差 ${gap}px —— 只能差 4px（1px 边框 + 1px 内衬，上下各一），否则轨道对不上同排控件`
      );
    }
  }
  if (d.segmentedTracks?.length) {
    pass(name, `${d.segmentedTracks.length} 条分段轨道外框已检查`);
  }

  // ── 标题权威唯一 ───────────────────────────────────
  const authority = d.titleAuthority || { total: 0, visible: [], texts: [], echoes: [] };
  if (authority.total === 0) {
    fail(name, "整页没有 h1 —— 路由没有标题权威（顶栏那行加粗文本不是标题）");
  } else if (authority.total > 1) {
    fail(
      name,
      `${authority.total} 个 h1（${authority.texts.join(" / ")}）—— 一条路由只能有一个标题权威`
    );
  } else if (authority.visible.length > 1) {
    fail(name, `${authority.visible.length} 个可见 h1 —— 顶栏与 body 同时在报页面名`);
  } else {
    pass(name, `标题权威唯一${authority.visible.length ? `：${authority.visible[0]}` : "（sr-only 兜底）"}`);
  }
  for (const echo of authority.echoes) {
    fail(name, `「${echo}」既是 h1 又作为 h2/h3 重复出现 —— 第二个标题带换了个标签`);
  }

  // ── 字号阶梯上限 ───────────────────────────────────
  // 标题：后台 16px（--text-page-title 15），顾客端 24px（移动蓝图 22-24）。
  // 其它文本：一律 ≤22px（--text-data，看板关键数字的上限）。
  for (const h of d.heroHeadings) {
    const cap =
      kind === "landing"
        ? Infinity
        : h.isHeading
          ? kind === "consumer" ? 24 : 16
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
  } else if (skipFont) {
    pass(name, `字体栈含 Noto Sans SC（webfont 加载断言已跳过）`);
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

  // ── 分页导航的形状：箭头钉两端 + 七槽上限 + 页码 quiet ──
  // 真实踩过：曾经的规范砍掉了上一页/下一页，理由是「相邻数字就是上下页」。
  // 但窗口是跟着当前页滚的 —— 你刚点过的那个位置，下一秒换成了别的数字，
  // 于是全组控件里唯一高频的动作，成了唯一落点会动的动作。
  // 实测连点五次「下一页」：三格窗口的落点横跨 40px，钉住的箭头横跨 0。
  const pagerShape = await page.evaluate(() => {
    const nav = [...document.querySelectorAll("nav")].find((n) =>
      /分页|pagination/i.test(n.getAttribute("aria-label") || "")
    );
    if (!nav) return null;
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const label = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim();
    // 页码可能被一层 span 包着（窄屏要整体隐藏），所以按后代找页码，按 children 判两端
    const kids = [...nav.children].filter(visible);
    const numbers = [...nav.querySelectorAll("button")].filter(
      (b) => visible(b) && /^\d+$/.test((b.textContent || "").trim())
    );
    const gaps = [...nav.querySelectorAll("*")].filter(
      (el) => !el.children.length && /^…+$/.test((el.textContent || "").trim()) && visible(el)
    ).length;
    const current = numbers.find((b) => b.getAttribute("aria-current") === "page");
    const transparent = (c) => c === "transparent" || /^rgba\(0, 0, 0, 0\)$/.test(c);
    return {
      headIsPrev: Boolean(kids[0] && kids[0].tagName === "BUTTON" && /上一页|prev/i.test(label(kids[0]))),
      tailIsNext: Boolean(
        kids.at(-1) && kids.at(-1).tagName === "BUTTON" && /下一页|next/i.test(label(kids.at(-1)))
      ),
      head: kids[0] ? label(kids[0]).slice(0, 12) : "(空)",
      tail: kids.at(-1) ? label(kids.at(-1)).slice(0, 12) : "(空)",
      slots: numbers.length + gaps,
      hasCurrent: Boolean(current),
      loud: numbers
        .filter((b) => b !== current)
        .map((b) => {
          const s = getComputedStyle(b);
          return { text: (b.textContent || "").trim(), bg: s.backgroundColor, bw: s.borderTopWidth, bc: s.borderTopColor };
        })
        .filter((n) => !transparent(n.bg) || (parseFloat(n.bw) > 0 && !transparent(n.bc))),
    };
  });
  if (pagerShape) {
    if (!pagerShape.headIsPrev || !pagerShape.tailIsNext) {
      fail(
        name,
        `分页导航两端是「${pagerShape.head}」/「${pagerShape.tail}」，不是钉住的上一页/下一页箭头 —— ` +
          `页码窗口会跟着当前页滚动，没有箭头就没有任何一个落点是稳定的，连续翻页每次都要重新瞄准。`
      );
    } else if (pagerShape.slots > 7) {
      fail(
        name,
        `分页窗口 ${pagerShape.slots} 个槽位 —— 上限 7（首页 · 省略 · 当前页±1 · 省略 · 末页）。` +
          `槽位是定值，条带宽度才不会随页码变化，它左边的控件才不会左右晃。`
      );
    } else if (!pagerShape.hasCurrent) {
      fail(name, `分页窗口没有 aria-current="page" —— 当前页既是选中态信号，也是无障碍的落脚点。`);
    } else if (pagerShape.loud.length) {
      fail(
        name,
        `分页页码「${pagerShape.loud.map((n) => n.text).join("、")}」静止时有底色或边框 —— ` +
          `非当前页码用 quiet：数字自证可点，七个方框并排会读成工具栏。箭头是图标，才留 outline。`
      );
    } else {
      pass(name, `分页导航：箭头钉两端，${pagerShape.slots} 槽位（上限 7），非当前页码 quiet`);
    }
  }

  // ── 过度滚动橡皮筋：全局禁用（SKILL.md：Interaction Is Quiet）────
  {
    let bounceBroken = false;
    for (const docEl of d.overscroll.doc) {
      if (docEl.x !== "none" || docEl.y !== "none") {
        bounceBroken = true;
        fail(
          name,
          `<${docEl.tag}> overscroll-behavior 为 ${docEl.x}/${docEl.y} —— 文档层必须 none，` +
            `否则桌面壳（macOS WKWebView）过度滚动会出整页橡皮筋回弹`
        );
      }
    }
    for (const sc of d.overscroll.scrollers) {
      bounceBroken = true;
      const axes = [sc.badY ? "y" : "", sc.badX ? "x" : ""].filter(Boolean).join("+");
      fail(
        name,
        `滚动容器「${sc.label}」的 ${axes} 轴在滚动却没设 overscroll-behavior: none —— ` +
          `到边界会自己回弹，并把滚动链传给文档层`
      );
    }
    if (!bounceBroken) {
      pass(name, `橡皮筋已全局禁用：文档层 + ${d.overscroll.okCount} 个滚动容器`);
    }
  }

  // ── 冻结列：不透明 + 跟随行状态（需要交互，放在静态收集之后）──
  await auditFrozenColumns(page, name, report);
}

/** 统一的收尾输出。返回进程退出码，由调用方决定怎么退出。 */
export function printReport(report, { title = "运行时设计契约" } = {}) {
  for (const o of report.ok) console.log(`  ✓ ${o}`);
  if (report.failures.length) {
    console.error(`\n✗ ${title}未通过（${report.failures.length} 项）：\n`);
    for (const f of report.failures) console.error(`  · ${f}`);
    return 1;
  }
  console.log(`\n✓ ${title}通过。`);
  return 0;
}
