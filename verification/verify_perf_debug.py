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

    print("Waiting for Consent page...")
    expect(page.get_by_role("heading", name="E-Consent")).to_be_visible()

    print("Accepting consent...")
    page.locator("input[type='checkbox']").check()
    page.get_by_text("Accept & Continue").click()

    # Wait a bit
    time.sleep(2)

    print("Taking debug screenshot...")
    page.screenshot(path="verification/debug.png")

    # Dump HTML
    with open("verification/debug.html", "w") as f:
        f.write(page.content())

    browser.close()
    print("Done.")

with sync_playwright() as playwright:
    run(playwright)
