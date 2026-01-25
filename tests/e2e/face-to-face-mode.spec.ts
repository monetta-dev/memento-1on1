import { test, expect } from '@playwright/test';
import { loginViaUI } from '../helpers/auth';
import { ensureSubordinate, createTestSession, cleanupTestSessions } from '../helpers/db';

test.describe.serial('Face-to-Face Mode', () => {
  let testSessionId: string;
  let testSessionTheme: string;
  
  // Setup test data before all tests
  test.beforeAll(async () => {
    console.log('Setting up test session for face-to-face mode...');
    try {
      // Clean up any existing test sessions first
      await cleanupTestSessions();
      
      // Ensure we have a subordinate
      const subordinate = await ensureSubordinate();
      
      // Create a unique theme to avoid conflicts
      testSessionTheme = `対面モードテスト-${Date.now()}`;
      
      // Create a face-to-face session
      const session = await createTestSession(subordinate.id!, {
        theme: testSessionTheme,
        mode: 'face-to-face',
        status: 'live',
        agenda_items: [
          { id: '1', text: '前回のアクションアイテム確認', completed: true },
          { id: '2', text: '現在のプロジェクト進捗', completed: false },
        ],
        notes: [
          { id: '1', content: 'テストメモ1', timestamp: '10:00', source: 'manual' },
        ]
      });
      
      testSessionId = session.id!;
      console.log(`Face-to-face test session created with ID: ${testSessionId}, theme: ${testSessionTheme}`);
    } catch (error) {
      console.error('Failed to setup test session:', error);
      throw error;
    }
  });
  
  // Cleanup after all tests
  test.afterAll(async () => {
    console.log('Cleaning up test sessions...');
    await cleanupTestSessions();
  });
  
  test.beforeEach(async ({ page }) => {
    // Log in with test user
    console.log('🔐 Logging in via UI...');
    await loginViaUI(page);
    
    // Capture console logs for debugging
    page.on('console', msg => {
      console.log(`[Browser Console ${msg.type().toUpperCase()}] ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      console.log(`[Browser Page Error] ${error.message}`);
    });
  });
  
  test('Face-to-face dashboard displays correctly', async ({ page }) => {
    console.log(`🚀 Starting face-to-face dashboard test`);
    console.log(`📝 Test session ID: ${testSessionId}`);
    
    // 1. Navigate to dashboard
    await page.goto('/');
    await expect(page).toHaveURL('/');
    
    // 2. Find and click on the face-to-face session
    const sessionRow = page.locator(`tr:has-text("${testSessionTheme}")`);
    await expect(sessionRow).toBeVisible();
    await sessionRow.click();
    
    // 3. Should navigate to session page
    await expect(page).toHaveURL(new RegExp(`/session/${testSessionId}`));
    
    // 4. Verify face-to-face dashboard is displayed (not video)
    await expect(page.locator('text=部下プロファイル')).toBeVisible();
    await expect(page.locator('text=本日の議題')).toBeVisible();
    await expect(page.locator('text=セッションタイマー')).toBeVisible();
    await expect(page.locator('text=メモ')).toBeVisible();
    
    // 5. Verify existing agenda items are shown
    await expect(page.locator('text=前回のアクションアイテム確認')).toBeVisible();
    await expect(page.locator('text=現在のプロジェクト進捗')).toBeVisible();
    
    // 6. Verify existing notes are shown
    await expect(page.locator('text=テストメモ1')).toBeVisible();
  });
  
  test('User can add agenda items in face-to-face mode', async ({ page }) => {
    console.log(`🚀 Testing agenda item addition`);
    
    // 1. Navigate to the face-to-face session
    await page.goto(`/session/${testSessionId}`);
    await expect(page).toHaveURL(new RegExp(`/session/${testSessionId}`));
    
    // 2. Add a new agenda item
    const agendaInput = page.locator('input[placeholder="議題を追加..."]');
    await agendaInput.fill('新しいテスト議題');
    await agendaInput.press('Enter');
    
    // 3. Verify the new agenda item appears
    await expect(page.locator('text=新しいテスト議題')).toBeVisible();
    
    // 4. Toggle agenda item completion
    const newAgendaCheckbox = page.locator('text=新しいテスト議題').locator('..').locator('input[type="checkbox"]');
    await newAgendaCheckbox.click();
    
    // 5. Verify it's marked as completed (strikethrough)
    const completedText = page.locator('text=新しいテスト議題');
    await expect(completedText).toHaveCSS('text-decoration', /line-through/);
  });
  
  test('User can add notes in face-to-face mode', async ({ page }) => {
    console.log(`🚀 Testing note addition`);
    
    // 1. Navigate to the face-to-face session
    await page.goto(`/session/${testSessionId}`);
    await expect(page).toHaveURL(new RegExp(`/session/${testSessionId}`));
    
    // 2. Add a new note
    const noteInput = page.locator('textarea[placeholder="メモを入力..."]');
    await noteInput.fill('これは新しいテストメモです');
    await page.locator('button:has-text("追加")').click();
    
    // 3. Verify the new note appears
    await expect(page.locator('text=これは新しいテストメモです')).toBeVisible();
    
    // 4. Verify note has timestamp
    const noteContainer = page.locator('text=これは新しいテストメモです').locator('..').locator('..');
    await expect(noteContainer).toContainText(/\d{1,2}:\d{2}/); // Time format like 10:30
  });
  
  test('Timer functionality works in face-to-face mode', async ({ page }) => {
    console.log(`🚀 Testing timer functionality`);
    
    // 1. Navigate to the face-to-face session
    await page.goto(`/session/${testSessionId}`);
    await expect(page).toHaveURL(new RegExp(`/session/${testSessionId}`));
    
    // 2. Verify timer is running (shows time)
    const timerDisplay = page.locator('h2.ant-typography'); // Timer display
    await expect(timerDisplay).toBeVisible();
    const initialTime = await timerDisplay.textContent();
    expect(initialTime).toMatch(/^\d{2}:\d{2}$/); // MM:SS format
    
    // 3. Pause the timer
    await page.locator('button:has-text("一時停止")').click();
    await expect(page.locator('button:has-text("再開")')).toBeVisible();
    
    // 4. Wait a moment and verify time hasn't changed
    await page.waitForTimeout(2000); // Wait 2 seconds
    const pausedTime = await timerDisplay.textContent();
    expect(pausedTime).toBe(initialTime);
    
    // 5. Resume the timer
    await page.locator('button:has-text("再開")').click();
    await expect(page.locator('button:has-text("一時停止")')).toBeVisible();
    
    // 6. Verify timer shows progress bar
    const progressBar = page.locator('.ant-progress-bg');
    await expect(progressBar).toBeVisible();
  });
  
  test('User can end face-to-face session and save data', async ({ page }) => {
    console.log(`🚀 Testing session end with data saving`);
    
    // 1. Navigate to the face-to-face session
    await page.goto(`/session/${testSessionId}`);
    await expect(page).toHaveURL(new RegExp(`/session/${testSessionId}`));
    
    // 2. Add some test data
    const agendaInput = page.locator('input[placeholder="議題を追加..."]');
    await agendaInput.fill('終了テスト議題');
    await agendaInput.press('Enter');
    
    const noteInput = page.locator('textarea[placeholder="メモを入力..."]');
    await noteInput.fill('セッション終了テストメモ');
    await page.locator('button:has-text("追加")').click();
    
    // 3. Click end session button
    await page.locator('button:has-text("セッションを終了")').click();
    
    // 4. Should navigate to summary page
    await expect(page).toHaveURL(new RegExp(`/session/${testSessionId}/summary`));
    
    // 5. Verify summary page shows the session was completed
    await expect(page.locator('text=セッション完了')).toBeVisible();
    await expect(page.locator('text=対面モードテスト')).toBeVisible();
  });
});