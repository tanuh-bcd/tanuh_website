from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Mock the API response
    page.route("**/api/session/start", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"success": true, "sessionId": "test-session-id"}'
    ))

    # Go to app
    try:
        page.goto("http://localhost:5173")
    except Exception as e:
        print(f"Error navigating: {e}")
        return

    # Wait for Consent page
    try:
        expect(page.locator("h2")).to_contain_text("Consent")
    except Exception:
        page.screenshot(path="/home/jules/verification/error_consent.png")
        raise

    # Click checkbox
    page.locator("input[type='checkbox']").click()

    # Click Accept & Continue
    page.get_by_text("Accept & Continue").click()

    # Wait for Questionnaire
    try:
        expect(page.locator("h1")).to_contain_text("Breast Cancer Risk Questionnaire")

        # Wait for loading to finish (question Q1 visible)
        page.locator("input[name='Q1']").wait_for(state="visible")

        # Take screenshot of initial state
        page.screenshot(path="/home/jules/verification/questionnaire_initial.png")

        # Verify Gender logic (Q47 -> Q9)
        # By default, Q47 is not selected? Or maybe undefined.
        # Check if Q9 is hidden.
        # Q9 label: "Have you had a menstrual period?"

        # It should NOT be visible initially
        if page.get_by_text("Have you had a menstrual period?").is_visible():
             print("WARNING: Q9 is visible initially! Maybe default is Female?")

        # Select Female in Q47
        # We need to find Q47. It's usually at the top or bottom?
        # Q47 is in "General Information".
        # Locate the radio button with value 'Female'
        # Since multiple questions might have 'Female' (unlikely?), we specify name if possible.
        # Input name='Q47'
        page.locator("input[name='Q47'][value='Female']").click()

        # Now Q9 should be visible
        expect(page.get_by_text("Have you had a menstrual period?")).to_be_visible()

        # Take screenshot
        page.screenshot(path="/home/jules/verification/questionnaire_visible.png")
        print("Verification successful!")

    except Exception as e:
        print(f"Error in questionnaire: {e}")
        page.screenshot(path="/home/jules/verification/error_questionnaire.png")
        raise

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
