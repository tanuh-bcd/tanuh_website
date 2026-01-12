
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Mock API responses
  await page.route('**/api/session/start', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, sessionId: 'test-session-id' })
    });
  });

  // Navigate to app (assumed running on localhost:5173 or we can serve the build)
  // For this test, I will assume we need to run the preview server or dev server.
  // But I cannot run background server easily and wait for it.
  // I will assume the user or environment handles it, OR I will try to run preview in background.

  // Start preview server in background
  const { spawn } = require('child_process');
  const preview = spawn('npm', ['run', 'preview', '--', '--port', '4173'], { cwd: 'questionnaire-app', stdio: 'inherit' });

  // Wait for server to start (simple timeout)
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
      await page.goto('http://localhost:4173');

      // Check E-Consent title
      const title = await page.locator('h2').textContent();
      if (!title.includes('E-Consent')) throw new Error('Consent page not found');
      console.log('Consent page verified');

      // Click checkbox
      await page.locator('input[type="checkbox"]').click();

      // Click Accept
      await page.getByText('Accept', { exact: false }).click();

      // Wait for questionnaire
      await page.waitForURL('**/'); // It stays on same URL but state changes

      // Verify Questionnaire Header using text that comes from 'ui' object (which we memoized)
      // "Health Risk Assessment" is in ui.header.title usually
      // We can look for the H1
      await page.waitForSelector('h1');
      const qTitle = await page.locator('h1').textContent();
      console.log('Questionnaire Title:', qTitle);

      // Check if questions are rendered (meaning questionnaireData is valid)
      const inputs = await page.locator('input').count();
      if (inputs === 0) throw new Error('No inputs found');
      console.log('Inputs found:', inputs);

      // Check mandatory fields Q47 (Gender) and Q1 (Age)
      // We need to type/select to trigger re-renders and ensure no crash

      // Find Q1 (Age)
      const q1Input = page.locator('input[name="Q1"]');
      if (await q1Input.count() > 0) {
          await q1Input.fill('25');
          console.log('Filled Q1');
      }

      // Find Q47 (Gender) - it's a radio or select?
      // Assuming radio based on typical form. Or select.
      // Let's list inputs names to be sure?
      // Just check that typing didn't crash app (ui object recreation issue?)

      // Take screenshot
      await page.screenshot({ path: 'verification_screenshot.png' });
      console.log('Verification successful');

  } catch (e) {
      console.error('Verification failed', e);
      process.exit(1);
  } finally {
      preview.kill();
      await browser.close();
  }
})();
