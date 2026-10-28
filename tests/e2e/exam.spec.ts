import { expect, test } from '@playwright/test';
import { iso, seed } from './helpers';

const URL = 'https://ox.example.com/farewell';

test('일정 미정이면 예고 카드만', async ({ page }) => {
  seed();
  await page.goto('/#exam');
  await expect(page.locator('#exam')).toContainText('심사 일자는 추후 공고합니다');
  await expect(page.locator('#exam a[target=_blank]')).toHaveCount(0);
});

test('입장 시각 전에는 주소가 페이지 어디에도 없다', async ({ page }) => {
  seed({ liveOpenAt: iso(3_600_000), liveStartAt: iso(3_900_000), liveUrl: URL });
  await page.goto('/#exam');
  await expect(page.locator('#exam [role=timer]')).toBeVisible();
  expect(await page.content()).not.toContain(URL);
});

test('새로 고침 없이 예고 → 입장으로 바뀌고, 입장 버튼은 새 창', async ({ page }) => {
  seed({ liveOpenAt: iso(4_000), liveStartAt: iso(300_000), liveUrl: URL });
  await page.goto('/#exam');
  const enter = page.locator('#exam').getByRole('link', { name: '심사장 입장' });
  await expect(enter).toHaveCount(0);
  await expect(enter).toBeVisible({ timeout: 12_000 });
  await expect(enter).toHaveAttribute('href', URL);
  await expect(enter).toHaveAttribute('target', '_blank');
});

test('진행 중에는 관전 안내와 입장 버튼', async ({ page }) => {
  seed({ liveOpenAt: iso(-600_000), liveStartAt: iso(-300_000), liveUrl: URL });
  await page.goto('/#exam');
  await expect(page.locator('#exam')).toContainText('관전만 가능합니다');
  await expect(page.locator('#exam').getByRole('link', { name: '심사장 입장' })).toBeVisible();
});

test('폰 시계가 틀려도 서버 시각 기준으로 센다', async ({ page }) => {
  // 서버 기준 입장 1시간 전인데 폰 시계는 하루 빠르다
  seed({ liveOpenAt: iso(3_600_000), liveStartAt: iso(3_900_000), liveUrl: URL });
  await page.clock.install({ time: new Date(Date.now() + 86_400_000) });
  await page.goto('/#exam');
  await expect(page.locator('#exam [role=timer]')).toBeVisible();
  await expect(page.locator('#exam').getByRole('link', { name: '심사장 입장' })).toHaveCount(0);
});
