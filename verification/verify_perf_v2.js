
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

  // Navigate to app (assumed running on localhost:4173)
  const appUrl = 'http://localhost:4173';

  // Retry connection a few times
  for (let i = 0; i < 5; i++) {
      try {
          await page.goto(appUrl);
          break;
      } catch (e) {
          console.log('Waiting for server...');
          await new Promise(resolve => setTimeout(resolve, 1000));
      }
  }

  try {
      // Check E-Consent title
      const title = await page.locator('h2').textContent();
      if (!title.includes('E-Consent')) throw new Error('Consent page not found');
      console.log('Consent page verified');

      // Click checkbox
      await page.locator('input[type="checkbox"]').click();

      // Click Accept
      await page.getByText('Accept', { exact: false }).click();

      // Wait for questionnaire
      await page.waitForURL('**/');

      // Verify Questionnaire Header
      await page.waitForSelector('h1');
      const qTitle = await page.locator('h1').textContent();
      console.log('Questionnaire Title:', qTitle);

      // Check if questions are rendered
      const inputs = await page.locator('input').count();
      if (inputs === 0) throw new Error('No inputs found');
      console.log('Inputs found:', inputs);

      // Find Q1 (Age) and type
      const q1Input = page.locator('input[name="Q1"]');
      if (await q1Input.count() > 0) {
          await q1Input.fill('25');
          console.log('Filled Q1');
      }

      // Take screenshot
      await page.screenshot({ path: 'verification.png' });
      console.log('Verification successful');

  } catch (e) {
      console.error('Verification failed', e);
      process.exit(1);
  } finally {
      await browser.close();
  }
})();
