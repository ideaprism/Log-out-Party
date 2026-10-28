import { expect, test } from '@playwright/test';
// lib/content는 server-only라 테스트 러너에서 못 읽는다. 원본 JSON을 직접 본다.
import copy from '../../content/copy.json';
import { scrollThrough, seed } from './helpers';

/* 아트 디렉션·배치 규칙 중 화면에서만 확인되는 것 (CLAUDE.md) */

test.beforeEach(() => seed({}, [{ name: '박선배', picked: true }, { name: '이후배' }]));

test('375×812에서 표지가 한 화면을 넘지 않고, 어느 쪽도 가로로 넘치지 않는다', async ({ page }) => {
  await page.goto('/');
  const cover = await page.locator('#cover').boundingBox();
  expect(cover!.height).toBeLessThanOrEqual(812 + 1);
  await scrollThrough(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('본문 글자는 17px 이상', async ({ page }) => {
  await page.goto('/');
  const sizes = await page.$$eval('#letter .reveal p, #ending .reveal p:not([aria-hidden])', (ps) => ps.map((p) => parseFloat(getComputedStyle(p).fontSize)));
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(17);
});

test('빨강은 登 도장에만 — 그 밖의 글자·면·선·SVG에 붉은 계열이 없다', async ({ page }) => {
  await page.goto('/');
  await scrollThrough(page);
  const { outside, inSeal } = await page.evaluate(() => {
    const reddish = (c: string) => {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
      if (!m || (m[4] !== undefined && +m[4] === 0)) return false;
      const [r, g, b] = [+m[1] / 255, +m[2] / 255, +m[3] / 255];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      const d = max - min;
      if (d < 0.12) return false; // 무채색
      const s = d / (1 - Math.abs(2 * l - 1));
      let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
      return s > 0.3 && (h < 40 || h > 320); // 빨강·주황·분홍
    };
    const props = ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'outlineColor', 'fill', 'stroke', 'textDecorationColor'] as const;
    const outside: string[] = [];
    let inSeal = 0;
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      const cs = getComputedStyle(el);
      const hit = props.filter((p) => reddish(cs[p] as string));
      if (!hit.length) continue;
      if (el.closest('svg[aria-label^="登"]')) inSeal++;
      else outside.push(`${el.tagName}.${el.className} ${hit.join(',')}`);
    }
    return { outside, inSeal };
  });
  expect(outside).toEqual([]);
  expect(inSeal).toBeGreaterThan(0); // 도장은 실제로 찍혀 있다
});

test('엔딩은 ①자유 실시 → ②IdeaPrism → ③스티브 창스(자칭), 각각 화면에 한 번', async ({ page }) => {
  await page.goto('/');
  const text = await page.locator('main').innerText();
  const count = (s: string) => text.split(s).length - 1;
  expect(count('IdeaPrism')).toBe(1);
  expect(count('스티브 창스')).toBe(1);
  const free = text.indexOf(copy.ending.freeUse);
  expect(free).toBeGreaterThan(-1);
  expect(free).toBeLessThan(text.indexOf('IdeaPrism'));
  expect(text.indexOf('IdeaPrism')).toBeLessThan(text.indexOf('스티브 창스'));
  // 표지·메타·OG 설명에도 없다
  await expect(page).toHaveTitle(copy.meta.title);
  expect(await page.locator('#cover').innerText()).not.toContain('IdeaPrism');
  const og = await page.locator('meta[property^="og:"]').evaluateAll((ms) => ms.map((m) => m.getAttribute('content')).join(' '));
  expect(og).not.toMatch(/ideaprism/i);
});

test('스크립트가 막혀도 글이 보인다', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto('/');
  const p = page.locator('#letter .reveal p').first();
  await expect(p).toBeVisible();
  expect(await p.evaluate((el) => getComputedStyle(el.closest('.reveal')!).opacity)).toBe('1');
  await ctx.close();
});

test('모션 줄이기면 페이드 없이 바로 보인다', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto('/');
  // 화면 밖 섹션도 스크롤 전부터 불투명
  expect(await page.locator('#ending .reveal').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await ctx.close();
});

test('PC에서는 가운데 480px 고정 폭', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const box = await page.locator('#letter').boundingBox();
  expect(box!.width).toBe(480);
  expect(Math.abs(box!.x + box!.width / 2 - 640)).toBeLessThanOrEqual(1);
});

test('링크 미리보기 — 절대 주소의 1200×630 PNG', async ({ page, request }) => {
  await page.goto('/');
  const src = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(src).toMatch(/^http:\/\/localhost:3100\/opengraph-image/);
  const r = await request.get(src!);
  expect(r.headers()['content-type']).toBe('image/png');
  const png = await r.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});
