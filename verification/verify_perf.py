import time
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Mock backend to allow proceeding to questionnaire
    page.route("**/api/session/start", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"success": true, "sessionId": "perf-test-session"}'
    ))

    print("Navigating to app...")
    page.goto("http://localhost:5173")

    # Wait for Consent page
    print("Waiting for Consent page...")
    expect(page.get_by_role("heading", name="E-Consent")).to_be_visible()

    # Accept consent
    print("Accepting consent...")
    page.locator("input[type='checkbox']").check()
    page.get_by_text("Accept & Continue").click()

    # Wait for Questionnaire
    print("Waiting for Questionnaire...")
    expect(page.get_by_role("heading", name="Breast Cancer Risk Questionnaire")).to_be_visible(timeout=10000)

    # Verify content loads
    expect(page.get_by_text("Section 1: General Information")).to_be_visible()

    print("Taking screenshot...")
    page.screenshot(path="verification/perf_verification.png")

    browser.close()
    print("Done.")

with sync_playwright() as playwright:
    run(playwright)
