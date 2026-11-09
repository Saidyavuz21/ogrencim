import { expect, test } from '@playwright/test';

// Gerçek hesaplarla giriş → panel → çıkış akışı. Yalnızca test hesap bilgileri verilirse çalışır
// (test veritabanında kullanılmalı; veri değiştirmez, yalnızca giriş/çıkış yapar):
//   E2E_TEACHER_EMAIL, E2E_TEACHER_PASSWORD
//   E2E_STUDENT_SCHOOL (okul adı, aramaya yazılacak), E2E_STUDENT_NUMBER, E2E_STUDENT_PIN
const env = process.env;

test.describe('öğretmen', () => {
  test.skip(!env.E2E_TEACHER_EMAIL || !env.E2E_TEACHER_PASSWORD, 'E2E_TEACHER_* tanımlı değil');

  test('giriş yapar, paneli görür, çıkış yapar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Öğretmen', exact: true }).click();
    await page.getByLabel('E-posta adresi').fill(env.E2E_TEACHER_EMAIL!);
    await page.getByLabel('Şifre', { exact: true }).fill(env.E2E_TEACHER_PASSWORD!);
    await page.getByRole('button', { name: /Giriş yap/ }).click();
    await page.waitForURL('**/giris**');
    await expect(page.getByRole('navigation').first()).toBeVisible();
    await page.goto('/giris?sayfa=hesabim');
    await page.getByRole('button', { name: /Çıkış/ }).first().click();
    await expect(page.getByRole('heading', { name: /Öğretmen (hesabı oluştur|girişi)/ })).toBeVisible();
  });
});

test.describe('öğrenci', () => {
  test.skip(!env.E2E_STUDENT_SCHOOL || !env.E2E_STUDENT_NUMBER || !env.E2E_STUDENT_PIN, 'E2E_STUDENT_* tanımlı değil');

  test('okul + numara + PIN ile giriş yapar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox').first().click();
    await page.keyboard.type(env.E2E_STUDENT_SCHOOL!);
    await page.getByRole('option').first().click();
    await page.getByLabel('Öğrenci okul numarası').fill(env.E2E_STUDENT_NUMBER!);
    const pin = env.E2E_STUDENT_PIN!;
    for (let i = 0; i < 4; i++) await page.getByLabel(`PIN ${i + 1}. hane`).fill(pin[i]);
    await page.getByRole('button', { name: /Giriş yap/ }).click();
    await page.waitForURL('**/giris**');
    await expect(page.getByText(/puan/i).first()).toBeVisible();
  });
});
