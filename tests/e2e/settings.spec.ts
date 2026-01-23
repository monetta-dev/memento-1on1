import { test, expect } from '@playwright/test';

test.describe('Settings Page Integrations', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to settings page
    await page.goto('/settings');
  });

  test('Settings page loads with integration cards', async ({ page }) => {
    // 1. Check page title
    await expect(page).toHaveTitle(/Memento 1on1/);
    await expect(page.getByText('Settings')).toBeVisible();
    
    // 2. Check Integrations card (exact match for card title)
    await expect(page.getByText('Integrations', { exact: true })).toBeVisible();
    
    // 3. Check for Google Calendar integration
    await expect(page.getByText('Google Calendar Integration')).toBeVisible();
    await expect(page.getByText('Automatically schedule next 1on1 sessions and sync with your calendar.')).toBeVisible();
    
    // 4. Check for LINE integration  
    await expect(page.getByText('LINE Integration')).toBeVisible();
    await expect(page.getByText('Send reminders and notifications via LINE.')).toBeVisible();
    
    // 5. Check for toggle switches
    const googleSwitch = page.getByRole('switch').filter({ hasText: 'Google Calendar Integration' }).or(page.getByRole('switch').first());
    await expect(googleSwitch).toBeVisible();
    
    const lineSwitch = page.getByRole('switch').filter({ hasText: 'LINE Integration' }).or(page.getByRole('switch').nth(1));
    await expect(lineSwitch).toBeVisible();
    
    // 6. Check for configure buttons
    await expect(page.getByRole('button', { name: 'Configure' })).toHaveCount(2);
  });

  test('User can toggle integration switches', async ({ page }) => {
    // 1. Get first toggle switch (Google Calendar)
    const switches = page.getByRole('switch');
    const firstSwitch = switches.first();
    
    // Check initial state (should be unchecked/off)
    await expect(firstSwitch).not.toBeChecked();
    
    // 2. Toggle on
    await firstSwitch.click();
    
    // Should show loading state briefly
    await expect(firstSwitch).toBeChecked({ timeout: 5000 });
    
    // 3. Toggle off
    await firstSwitch.click();
    await expect(firstSwitch).not.toBeChecked({ timeout: 5000 });
    
    // 4. Test second switch (LINE)
    const secondSwitch = switches.nth(1);
    await expect(secondSwitch).not.toBeChecked();
    
    await secondSwitch.click();
    await expect(secondSwitch).toBeChecked({ timeout: 5000 });
  });

  test('Configure buttons are clickable', async ({ page }) => {
    // Configure buttons should open alert dialogs
    // We'll just verify they're clickable
    
    const configureButtons = page.getByRole('button', { name: 'Configure' });
    await expect(configureButtons).toHaveCount(2);
    
    // Click first configure button
    await configureButtons.first().click();
    
    // Should show alert dialog (can't test alert content easily)
    // At least verify button is clickable
    
    // Click second configure button
    await configureButtons.nth(1).click();
  });

});