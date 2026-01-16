
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Mock the /api/session/start endpoint
  await page.route('**/api/session/start', async route => {
    const json = { success: true, sessionId: 'test-session-id' };
    await route.fulfill({ json });
  });

  try {
    console.log('Navigating to app...');
    // Wait for the server to be ready (naive wait)
    await page.waitForTimeout(3000);

    await page.goto('http://localhost:5173');

    // Check if Consent page is loaded
    await page.waitForSelector('h2:has-text("Consent")');
    console.log('Consent page loaded');

    // Accept consent
    await page.click('input[type="checkbox"]');
    await page.click('button:has-text("Accept & Continue")');

    // Wait for Questionnaire to load
    await page.waitForSelector('.questionnaire-container');
    console.log('Questionnaire loaded');

    // Wait a bit for "Loading..." to potentially disappear if it flashes
    await page.waitForTimeout(1000);

    // Verify critical elements that depend on 'ui' and 'questionnaireData'
    const title = await page.textContent('h1');
    console.log('Title found:', title);

    // Check if a question is rendered (Q1 is usually first)
    // The text might depend on the language, but the structure should be there
    const questionBlock = await page.waitForSelector('.question-block');
    console.log('Question block found');

    // Take screenshot
    const screenshotPath = path.join(__dirname, 'verification.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to ${screenshotPath}`);

  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
