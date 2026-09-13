#!/usr/bin/env node
/**
 * 设计规范的**运行时**契约断言 —— 宿主项目模板。
 *
 * 为什么需要它：静态 token 检查只能证明「数值来自设计系统、没人乱编」，
 * 但它抓不住**组合错误** —— token 全对、类名全对，可嵌套关系错了，效果照样崩。
 * 真实踩过的坑：Tabs 的轨道底色是半透明 color-mix，设计稿里它坐在画布上，
 * 我们把它塞进了纯白卡片里，混合结果从「落差 5 色阶」塌成「落差 2 色阶」——
 * 代码层面挑不出任何毛病，只有量出计算后的颜色才看得出来。
 *
 * ── 这个文件里**没有规则** ────────────────────────────────
 * 断言全部来自 kiln 的 `kiln/contract/runtime`。规则写两份必然漂移，
 * 而漂移是这套系统坏掉的唯一方式 —— 所以这里只负责三件宿主才知道的事：
 *   ① 跑哪些页面   ② 怎么登录   ③ 每个页面算哪一档（admin / consumer / landing）
 * 升级 kiln 就升级规则，不需要回来改这个文件。
 *
 * 用法：
 *   npm run verify:runtime                              # 只跑公开路由
 *   E2E_TOKEN=<access_token> npm run verify:runtime     # 额外跑登录后的工作台
 */

import { chromium } from "playwright";
import { auditPage, createReport, printReport } from "kiln/contract/runtime";
// 若项目没有把 kiln 装成依赖，改成相对路径引入这个文件：
//   import { ... } from "../node_modules/kiln/scripts/lib/runtime-contract.mjs";
// 但**不要**把规则复制过来 —— 复制的那一刻它就开始和 kiln 分家了。

const BASE = process.env.E2E_BASE ?? "http://localhost:5173";  // ★ 你的 dev server
const USER = process.env.E2E_USER;
const PASS = process.env.E2E_PASS;
const TOKEN = process.env.E2E_TOKEN;

// ★ 换了品牌主色的项目，把自己的锚点色传进来（见 platform-mapping.md 的
//   Fixed / Variable / Residue：「有且仅有一个锚点」是固定层，「锚点是哪个色」是可变层）。
//   保持 kiln 原色就整段删掉。
// import { KILN_PALETTE } from "kiln/contract/runtime";
// const PALETTE = { ...KILN_PALETTE, clay: "rgb(0, 0, 0)" };

const report = createReport();

const visit = async (ctx, name, path, kind = "admin") => {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await auditPage(page, name, { kind, report });
  await page.close();
};

const browser = await chromium.launch();
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

{
  const ctx = await browser.newContext({ viewport: DESKTOP });
  await visit(ctx, "登录页", "/login", "landing");   // ★ 换成你的登录路由
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: MOBILE });
  await visit(ctx, "顾客端(移动)", "/", "consumer"); // ★ 换成你的顾客端路由
  await ctx.close();
}

if (TOKEN || (USER && PASS)) {
  const ctx = await browser.newContext({ viewport: DESKTOP });

  if (TOKEN) {
    // 首选：直接注入已有的 access token。比走登录表单更安全 —— 短期、可撤销，
    // 且不需要任何人（包括自动化）经手密码。凭据只从环境变量来，不落盘、不进日志。
    const claims = JSON.parse(Buffer.from(TOKEN.split(".")[1], "base64url").toString("utf8"));
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

  // ★ 填上**你项目的每一个页面和每一个 tab**。
  // 断言没走到的地方等于没有规范 —— 一次真实迁移里契约一度「通过」，只因为它
  // 只跑了一个 tab；扩到全部后立刻暴露 79 项违规。契约的覆盖面就是它的上限。
  const TABS = [
    ["首页", "/"],
    // ["数据表", "/records"],
    // ["设置", "/settings?tab=general"],
  ];
  for (const [label, path] of TABS) await visit(ctx, label, path);
  await ctx.close();
} else {
  console.log(
    "· 未提供 E2E_TOKEN（或 E2E_USER/E2E_PASS），跳过登录后的页面。\n" +
      "  要覆盖工作台：E2E_TOKEN=<access_token> npm run verify:runtime\n"
  );
}

await browser.close();
process.exit(printReport(report));
