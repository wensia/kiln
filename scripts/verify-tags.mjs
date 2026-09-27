#!/usr/bin/env node

import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { installColorTools } from "./lib/color-contrast.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TONES = ["neutral", "teal", "peacock", "blue", "amber", "olive", "rose", "clay"];
const VARIANTS = ["soft", "outline", "status"];
const counters = { contrast: 0, geometry: 0 };
let minimumContrast = Infinity;

// Evaluate in the browser so colors and dimensions come from the actual stylesheet.
// A transparent status inherits its visible surface through every ancestor; treating
// transparent as white would give a false pass/failure in the dark examples.
// Color parsing, compositing, and contrast come from scripts/lib/color-contrast.mjs
// (installed as globalThis.__kilnColor), shared with verify-themes.
function collectTags(elements) {
  const C = globalThis.__kilnColor;
  return elements.map((element) => {
    const style = getComputedStyle(element);
    let disabled = false;
    for (let node = element; node; node = node.parentElement) {
      disabled ||= node.matches(":disabled, [aria-disabled='true']");
    }
    const background = C.surfaceBehind(element, { allowOpacity: disabled });
    const foreground = C.visible(style.color, background);
    const rect = element.getBoundingClientRect();
    return {
      label: element.dataset.probeTag || element.textContent.trim() || element.getAttribute("aria-label"),
      contrast: C.contrast(foreground, background),
      disabled,
      foreground,
      background,
      expectedHeight: Number(element.dataset.expectedHeight) || null,
      height: rect.height,
      radii: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map(parseFloat),
      fontSize: parseFloat(style.fontSize),
    };
  });
}

function assertContrast(results, count = true) {
  assert.ok(results.length, "Contrast check must inspect rendered tags");
  for (const result of results.filter((item) => !item.disabled)) {
    assert.ok(result.contrast >= 4.5, `${result.label}: text contrast ${result.contrast.toFixed(3)} < 4.5:1`);
    if (count) {
      counters.contrast++;
      minimumContrast = Math.min(minimumContrast, result.contrast);
    }
  }
}

function assertGeometry(results) {
  assert.ok(results.length, "Geometry check must inspect rendered tags");
  for (const result of results) {
    assert.ok(Math.abs(result.height - result.expectedHeight) <= 0.1,
      `${result.label}: height ${result.height}, expected ${result.expectedHeight}`);
    assert.ok(result.radii.every((radius) => radius === 4), `${result.label}: all corners must be 4px`);
    assert.equal(result.fontSize, 12, `${result.label}: Tag text must be 12px`);
    counters.geometry++;
  }
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(pathToFileURL(join(ROOT, "examples/tags.html")).href, { waitUntil: "load" });
  await installColorTools(page);
  await page.evaluate(() => document.fonts.ready);
  const read = (selector) => page.locator(selector).evaluateAll(collectTags);

  // Exercise the page's own interactions before installing synthetic coverage.
  const selected = page.locator("[data-select-tag]").first();
  await selected.focus();
  await selected.press("Enter");
  assert.equal(await selected.getAttribute("aria-pressed"), "false", "Enter deselects the tag");
  assert.equal(await page.locator("#selection-summary").textContent(), "已选 0 个分类");
  await selected.press("Space");
  assert.equal(await selected.getAttribute("aria-pressed"), "true", "Space selects the tag");
  assert.equal(await page.locator("#selection-summary").textContent(), "已选 1 个分类");

  for (let remaining = 2; remaining >= 0; remaining--) {
    await page.locator("#removable-tags .tag-remove").first().press("Enter");
    assert.equal(await page.locator("#removable-tags .tag").count(), remaining);
    const focus = await page.evaluate(() => ({
      connected: document.activeElement?.isConnected,
      remove: document.activeElement?.matches("#removable-tags .tag-remove"),
      restore: document.activeElement?.id === "restore-tags",
    }));
    assert.ok(focus.connected && (remaining ? focus.remove : focus.restore), "Removal must move focus to a remaining tag or restore control");
  }
  assert.equal(await page.locator("#remove-summary").textContent(), "暂无标签");
  await page.locator("#restore-tags").press("Enter");
  assert.equal(await page.locator("#removable-tags .tag").count(), 3);
  assert.equal(await page.locator("#remove-summary").textContent(), "3 个标签");
  assert.equal(await page.locator("#restore-tags").isDisabled(), true);
  assert.equal(await page.evaluate(() => document.activeElement === document.querySelector("#removable-tags .tag-remove")), true);
  assertContrast(await read("main .tag, main .badge"));
  const existingTargets = await page.locator("main button.tag, main a.tag, main .tag-removable, main .tag-remove").evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      label: element.getAttribute("aria-label") || element.textContent.trim(),
      height: rect.height,
      width: rect.width,
      remove: element.classList.contains("tag-remove"),
      radii: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map(parseFloat),
    };
  }));
  assert.ok(existingTargets.length, "Interactive page targets must be present");
  for (const target of existingTargets) {
    assert.equal(target.height, 32, `${target.label}: interactive target must be 32px tall`);
    assert.ok(target.radii.every((radius) => radius === 4), `${target.label}: interactive corners must be 4px`);
    if (target.remove) assert.equal(target.width, 32, `${target.label}: remove target must be 32px wide`);
    counters.geometry++;
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  assert.ok(overflow.scrollWidth <= overflow.width + 1, `390px page overflows horizontally: ${overflow.scrollWidth}px`);
  await page.setViewportSize({ width: 1440, height: 1100 });

  // Fixture shapes use only the real .tag/.badge rules and public tokens. Each
  // theme tests all three forms at static, compact, and interactive density.
  await page.evaluate(({ tones, variants }) => {
    const fixture = document.createElement("section");
    fixture.id = "tag-contract-fixture";
    for (const theme of ["light", "dark"]) {
      const surface = document.createElement("div");
      surface.dataset.theme = theme;
      surface.style.cssText = "background:var(--tag-surface);padding:var(--space-4);display:flex;flex-wrap:wrap;gap:var(--space-2)";
      for (const tone of tones) {
        for (const variant of variants) {
          for (const kind of ["tag", "badge", "button"]) {
            const tag = document.createElement(kind === "button" ? "button" : "span");
            tag.className = kind === "badge" ? "badge" : "tag";
            tag.dataset.probeTag = `${theme}/${tone}/${variant}/${kind}`;
            tag.dataset.tone = tone;
            tag.dataset.variant = variant;
            tag.dataset.expectedHeight = String(kind === "button" ? 32 : kind === "badge" ? 20 : 24);
            if (kind === "button") {
              tag.type = "button";
              tag.setAttribute("aria-pressed", "false");
            }
            if (variant === "status") {
              const dot = document.createElement("span");
              dot.className = "tag-dot";
              dot.setAttribute("aria-hidden", "true");
              tag.appendChild(dot);
            }
            const label = document.createElement("span");
            label.className = "tag-label";
            label.textContent = "标签状态";
            tag.appendChild(label);
            surface.appendChild(tag);
          }
        }
      }
      fixture.appendChild(surface);
    }
    document.body.appendChild(fixture);
  }, { tones: TONES, variants: VARIANTS });

  const fixtureSelector = "#tag-contract-fixture [data-probe-tag]";
  const initial = await read(fixtureSelector);
  assert.equal(initial.length, TONES.length * VARIANTS.length * 2 * 3);
  assertContrast(initial);
  assertGeometry(initial);

  const interactive = page.locator("#tag-contract-fixture button");
  for (let index = 0; index < await interactive.count(); index++) {
    const tag = interactive.nth(index);
    await tag.hover();
    await page.waitForTimeout(180); // Real CSS color transition must finish before measuring.
    assertContrast(await tag.evaluateAll(collectTags));
    assertGeometry(await tag.evaluateAll(collectTags));
  }
  await page.mouse.move(0, 0);
  await interactive.evaluateAll((elements) => elements.forEach((element) => element.setAttribute("aria-pressed", "true")));
  await page.waitForTimeout(180);
  const selectedResults = await read("#tag-contract-fixture button");
  assertContrast(selectedResults);
  assertGeometry(selectedResults);

  // Real low-contrast CSS is rejected by the same checker, including color(srgb)
  // foreground and a transparent label over a translucent ancestor surface.
  await page.evaluate(() => {
    const ancestor = document.createElement("div");
    ancestor.id = "tag-contrast-negative";
    ancestor.style.background = "rgb(255, 255, 255)";
    ancestor.innerHTML = '<div style="background:color(srgb 1 1 1 / .5)"><span class="tag" style="color:color(srgb .7 .7 .7);background:transparent">低对比负样本</span></div>';
    document.body.appendChild(ancestor);
  });
  const lowContrast = await read("#tag-contrast-negative .tag");
  assert.throws(() => assertContrast(lowContrast, false), /contrast .* < 4\.5:1/, "Low contrast must fail, not silently skip");
  assert.ok(lowContrast[0].background.slice(0, 3).every((channel) => channel === 1), "Transparent ancestor layers must resolve to white");
  await page.locator("#tag-contrast-negative").evaluate((element) => element.remove());

  console.log(`✓ Tag: ${counters.contrast} contrast checks (min ${minimumContrast.toFixed(2)}:1), ${counters.geometry} size/radius checks; keyboard select, remove/restore focus, 390px overflow, and negative contrast probe passed.`);
} finally {
  await browser.close();
}
