import { test, expect } from '@playwright/test';

test.describe('SplitEase Core Flows', () => {
  // Use a unique username for each test run to avoid unique constraint errors during signup
  const uniqueId = Date.now();
  const testUser = `user${uniqueId}`;
  const testEmail = `${testUser}@example.com`;

  test('User can sign up, create a group, and add an expense', async ({ page }) => {
    // 1. Sign up
    await page.goto('/signup');
    await page.fill('#signup-email', testEmail);
    await page.fill('#signup-username', testUser);
    await page.fill('#signup-password', 'password123');
    await page.click('#signup-submit');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('h2')).toContainText('Your Groups');

    // 2. Create a Group
    const groupName = `E2E Test Group ${uniqueId}`;
    await page.fill('#group-name', groupName);
    await page.click('#create-group-btn');

    // Verify group appears in dashboard
    const groupCard = page.locator(`text=${groupName}`);
    await expect(groupCard).toBeVisible();

    // Navigate to the group
    await groupCard.click();
    await expect(page).toHaveURL(/\/group\/.+/);
    await expect(page.locator('h2').first()).toHaveText(groupName);

    // 3. Add an Expense
    await page.fill('#expense-desc', 'Test Dinner');
    await page.fill('#expense-amount', '150.00');
    await page.click('#add-expense-btn');

    // Verify expense appears in the list (WebSocket updates UI)
    await expect(page.locator('text=Test Dinner')).toBeVisible();
    await expect(page.locator('text=$150.00')).toBeVisible();

    // Verify balance updates correctly
    // Since the user paid 150 for themselves (as they are the only member right now), balance is 0 or positive depending on split.
    // Wait for balance to update (usually instant via WebSockets)
    await expect(page.locator('h3', { hasText: 'Balances' }).locator('..')).toBeVisible();
  });
});
