import { test, expect } from '@playwright/test';

test('demo sign-up creates a project and preserves the evidence publish gate', async ({ page }) => {
  await page.goto('/sign-up');
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic E2E Operator');
  await page.getByLabel('Email', { exact: true }).fill('operator@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-only-123!');
  await page.getByRole('button', { name: /create account|sign up/i }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goto('/new');
  await page.getByLabel('Project name', { exact: true }).fill('Synthetic contract E2E');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'Synthetic contract E2E' })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'synthetic-contract.txt', mimeType: 'text/plain',
    buffer: Buffer.from('Synthetic contract. The contract value is AED 125000. Delivery is due within 30 days. Late delivery is a risk requiring review.'),
  });
  await expect(page.getByText('synthetic-contract.txt', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^(2 )?Extract$/ }).click();
  await page.getByRole('button', { name: 'Run extraction', exact: true }).click();
  await expect(page.getByText('AI extraction unavailable (model_not_loaded) · using baseline.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^(3 )?Brief$/ }).click();
  await page.getByRole('button', { name: 'Generate brief', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Regenerate', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^(4 )?Publish$/ }).click();
  await expect(page.getByRole('button', { name: 'Publish snapshot', exact: true })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Open published view' })).toHaveCount(0);
});

test('Arabic locale persists across navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /العربية/ }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.goto('/sign-up');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByLabel('البريد الإلكتروني', { exact: true })).toBeVisible();
});
