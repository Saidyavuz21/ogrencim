import { expect, test } from '@playwright/test';

// Veriye dokunmayan testler: sayfalar açılıyor mu, giriş formları doğru uyarıları veriyor mu?

test('ana sayfa: giriş kutusu ve roller görünür', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Hoş geldiniz' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Öğrenci', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Öğretmen', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'KVKK aydınlatma metni' })).toBeVisible();
});

test('öğrenci girişi: okul seçilmeden uyarı verir', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Öğrenci okul numarası').fill('123');
  for (let i = 1; i <= 4; i++) await page.getByLabel(`PIN ${i}. hane`).fill(String(i));
  await page.getByRole('button', { name: /Giriş yap/ }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Lütfen önce okulunuzu seçin.');
});

test('öğretmen girişi: yanlış şifrede açık bir hata gösterir', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Öğretmen', exact: true }).click();
  await page.getByLabel('E-posta adresi').fill('olmayan-hesap@test.invalid');
  await page.getByLabel('Şifre', { exact: true }).fill('yanlis-sifre-123');
  await page.getByRole('button', { name: /Giriş yap/ }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(/E-posta veya şifre hatalı|Güvenlik doğrulaması/);
});

test('öğretmen kayıt sayfası açılır', async ({ page }) => {
  await page.goto('/giris');
  await expect(page.getByRole('heading', { name: 'Öğretmen hesabı oluştur' })).toBeVisible();
});

test('yönetim giriş sayfası açılır ve arama motorlarına kapalıdır', async ({ page }) => {
  await page.goto('/yonetim');
  await expect(page.getByRole('heading', { name: 'Yönetim girişi' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('aydınlatma metni ve rıza beyanı açılır', async ({ page }) => {
  await page.goto('/aydinlatma');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Aydınlatma Metni');
  await expect(page.getByRole('heading', { name: 'Veli Açık Rıza Beyanı' })).toBeVisible();
});

test('sayfa yatayda taşmaz (telefon genişliği dahil)', async ({ page }) => {
  for (const path of ['/', '/giris', '/aydinlatma']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} yatayda taşıyor`).toBeLessThanOrEqual(1);
  }
});
