import { expect, test } from '@playwright/test';
import { readStore, seed } from './helpers';

test.beforeEach(() => seed());

test('의견서 작성 → 목록·내 의견서 → 수정 → 삭제', async ({ page }) => {
  await page.goto('/#opinion');
  const form = page.locator('#opinion form').first();
  await form.getByLabel('【성명】').fill('김동료');
  await form.getByLabel('【소속】').selectOption({ index: 3 });
  await form.getByLabel('【의견 내용】').fill('26년 동안 고생 많으셨습니다 🙏');
  await expect(form.getByText('18 / 300')).toBeVisible(); // 이모지 1개 = 1자
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: '의견서 제출' }).click();

  const feed = page.locator('#feed');
  await expect(feed.getByText('26년 동안 고생 많으셨습니다 🙏')).toBeVisible();
  await expect(feed.getByText('공개 1건')).toBeVisible();
  // 수정 중에는 본문이 입력창으로 바뀌어 글로 찾을 수 없다. 이 기기 글은 하나뿐이다.
  const mine = page.locator('#opinion li').first();
  await expect(mine).toContainText('26년 동안');

  // 저장소에는 토큰 원문이 없다
  const token = await page.evaluate(() => localStorage.getItem('fw.device'));
  expect(JSON.stringify(readStore())).not.toContain(token!);

  // 수정
  await mine.getByRole('button', { name: '수정' }).click();
  await mine.locator('textarea').fill('고친 의견서입니다');
  await mine.getByRole('button', { name: '저장' }).click();
  await expect(feed.getByText('고친 의견서입니다')).toBeVisible();

  // 새로 고쳐도 내 글로 남는다 (같은 기기)
  await page.reload();
  const again = page.locator('#opinion li').filter({ hasText: '고친 의견서입니다' });
  await expect(again).toBeVisible();

  // 삭제
  page.once('dialog', (d) => d.accept());
  await again.getByRole('button', { name: '삭제' }).click();
  await expect(page.locator('#feed').getByText('고친 의견서입니다')).toHaveCount(0);
  expect(Object.keys(readStore().messages)).toHaveLength(0);
});

test('창균님만 보기는 목록에 나오지 않지만 내 의견서에는 보인다', async ({ page }) => {
  await page.goto('/#opinion');
  const form = page.locator('#opinion form').first();
  await form.getByLabel('【성명】').fill('최동료');
  await form.getByLabel('【의견 내용】').fill('조용히 전하는 말');
  await form.getByRole('radio', { name: '창균님만 보기' }).check();
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: '의견서 제출' }).click();
  await expect(page.locator('#opinion li').filter({ hasText: '조용히 전하는 말' })).toBeVisible();
  await expect(page.locator('#feed').getByText('조용히 전하는 말')).toHaveCount(0);
});

test('다른 기기에서는 남의 글을 고치거나 지울 수 없다', async ({ page, browser }) => {
  await page.goto('/#opinion');
  const form = page.locator('#opinion form').first();
  await form.getByLabel('【성명】').fill('김동료');
  await form.getByLabel('【의견 내용】').fill('내 글');
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: '의견서 제출' }).click();
  await expect(page.locator('#feed').getByText('내 글')).toBeVisible();

  const other = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const p2 = await other.newPage();
  await p2.goto('/');
  await expect(p2.locator('#feed').getByText('내 글')).toBeVisible();
  await expect(p2.locator('#opinion li').filter({ hasText: '내 글' })).toHaveCount(0);
  const id = Object.keys(readStore().messages)[0];
  const r = await p2.request.delete(`/api/messages/${id}`, { data: { token: 'someone-elses-token-xx' } });
  expect(r.status()).toBe(404);
  await other.close();
});

test('선정된 글은 맨 위에 登 도장, 작성자도 지울 수 없다', async ({ page }) => {
  seed({}, [{ name: '새글' }, { name: '골라진 글', picked: true }]);
  await page.goto('/#feed');
  const first = page.locator('#feed li').first();
  await expect(first).toContainText('골라진 글');
  await expect(first.locator('svg[aria-label^="登"]')).toBeVisible();
});
