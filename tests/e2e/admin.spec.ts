import { expect, test } from '@playwright/test';
import { E2E } from '../../playwright.config';
import { adminLogin, iso, readStore, seed } from './helpers';

test.beforeEach(() => seed({}, [{ name: '박선배' }, { name: '이후배' }, { name: '최동료', visibility: 'private' }]));

test('틀린 키는 거부, 맞는 키로 들어가 현황을 본다', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('관리자 키').fill('wrong');
  await page.getByRole('button', { name: '들어가기' }).click();
  await expect(page.getByRole('alert').filter({ hasText: '※' })).toContainText('관리자 키가 맞지 않습니다');

  await page.getByLabel('관리자 키').fill(E2E.adminKey);
  await page.getByRole('button', { name: '들어가기' }).click();
  await expect(page.getByRole('heading', { name: '【현황】' })).toBeVisible();
  await expect(page.getByText('창균님만', { exact: true }).first()).toBeVisible();
  // 비공개 글도 관리자에게는 보인다
  await expect(page.getByText('최동료')).toBeVisible();
});

test('관리자 API는 쿠키 없이 401', async ({ request }) => {
  expect((await request.get('/api/admin/state')).status()).toBe(401);
  expect((await request.put('/api/admin/winner', { data: { name: 'x' } })).status()).toBe(401);
  expect((await request.get('/api/admin/export')).status()).toBe(401);
  expect((await request.get('/admin/print')).status()).toBe(404);
});

test('선정 → 공개 목록 맨 위 登, 우승자 입력 → 심사 공고 결과', async ({ page }) => {
  await adminLogin(page.request);
  await page.goto('/admin');
  const card = page.locator('li').filter({ hasText: '이후배' });
  await card.getByRole('button', { name: '선정', exact: true }).click();
  await expect(card.getByRole('button', { name: '선정 취소' })).toBeVisible();
  await expect(card.getByRole('button', { name: '숨김' })).toBeDisabled();

  await page.getByLabel('우승자 이름').fill('홍길동');
  await page.getByRole('button', { name: '우승자 저장' }).click();
  await expect(page.getByText('지금 카드: 등록 결정:')).toBeVisible();

  await page.goto('/');
  await expect(page.locator('#feed li').first()).toContainText('이후배');
  await expect(page.locator('#exam')).toContainText('홍길동');
});

test('숨김은 공개 목록에서만 빠지고, 인쇄본에서도 빠진다', async ({ page }) => {
  await adminLogin(page.request);
  await page.goto('/admin');
  page.once('dialog', (d) => d.accept());
  await page.locator('li').filter({ hasText: '박선배' }).getByRole('button', { name: '숨김' }).click();
  await expect(page.locator('li').filter({ hasText: '박선배' }).getByRole('button', { name: '숨김 해제' })).toBeVisible();
  expect(Object.values(readStore().messages).find((m) => m.name === '박선배')!.hidden).toBe(true);

  await page.goto('/');
  await expect(page.locator('#feed')).not.toContainText('박선배');
  await page.goto('/admin/print');
  await expect(page.locator('main')).not.toContainText('박선배');
  await expect(page.locator('main')).toContainText('최동료');
});

test('일정 저장 순서 오류는 먹색 ※ 문구로 알린다', async ({ page }) => {
  await adminLogin(page.request);
  await page.goto('/admin');
  await page.getByLabel('D일 (마지막 출근일)').fill('2026-12-19');
  await page.getByLabel('입장 버튼 열림').fill('13:00');
  await page.getByRole('button', { name: '일정 저장' }).click();
  const alert = page.getByRole('alert').filter({ hasText: '※' });
  await expect(alert).toContainText('순서');
  expect(await alert.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(20, 20, 20)');
});

test('CSV 내려받기', async ({ page }) => {
  await adminLogin(page.request);
  const r = await page.request.get('/api/admin/export');
  expect(r.headers()['content-type']).toContain('text/csv');
  const text = (await r.body()).toString('utf8');
  expect(text.charCodeAt(0)).toBe(0xfeff);
  expect(text).toContain('최동료');
});

test('게시 전: 방문자는 안내 한 장, 의견서·연락처 API 403 / 관리자는 전부', async ({ page, browser }) => {
  seed({ publishAt: iso(3_600_000) }, [{ name: '박선배' }]);
  const anon = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const p = await anon.newPage();
  await p.goto('/');
  await expect(p.getByRole('heading', { name: '공고 준비 중' })).toBeVisible();
  expect(await p.content()).not.toContain('박선배');
  expect((await p.request.get('/api/messages')).status()).toBe(403);
  expect((await p.request.get('/api/vcard')).status()).toBe(403);
  await anon.close();

  await adminLogin(page.request);
  await page.goto('/');
  await expect(page.locator('#letter')).toBeVisible();
  await expect(page.locator('#feed')).toContainText('박선배');
  expect((await page.request.get('/api/vcard')).status()).toBe(200);
});
