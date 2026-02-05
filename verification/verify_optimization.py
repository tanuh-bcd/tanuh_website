import sys
import os
from playwright.sync_api import sync_playwright

def verify_optimization():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Mock the session start API
        page.route("**/api/session/start", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"success": true, "sessionId": "test-session-id"}'
        ))

        # Navigate to the app
        page.goto("http://localhost:5173/")

        # Wait for loading to finish
        page.wait_for_selector("h2:has-text('E-Consent')", timeout=10000)
        print("✅ Loaded Consent Page")

        # Accept Consent
        page.get_by_role("checkbox").check()
        page.get_by_role("button", name="Accept & Continue").click()

        # Wait for Questionnaire to load
        page.wait_for_selector(".questionnaire-container", timeout=10000)
        print("✅ Loaded Questionnaire Page")

        # Check initial progress
        progress_text = page.locator(".progress-bar-label").inner_text()
        print(f"Initial Progress: {progress_text}")
        if "0%" not in progress_text:
             print("⚠️ Warning: Initial progress is not 0%")

        # Fill "Age" (Q1) - Non-controlling field
        page.fill("input[name='Q1']", "35")

        # Click somewhere else to trigger blur/change if needed, though fill triggers input
        page.click("h1")

        # Check progress update
        progress_text_2 = page.locator(".progress-bar-label").inner_text()
        print(f"Progress after Age: {progress_text_2}")

        if progress_text == progress_text_2:
             print("❌ Progress did not update after filling Age!")
             sys.exit(1)

        print("✅ Progress updated successfully after simple input")

        # Test Visibility Logic (Controlling Key)
        # Q47: Gender
        # Default is nothing selected.
        # Select "Female" (should show Q9, Q14, etc.)

        # Check if Q9 is visible (It shouldn't be initially if Gender is not selected)
        # Q9: "Have you had a menstrual period?"
        if page.locator("input[name='Q9']").is_visible():
             print("❌ Q9 should not be visible initially (Gender not selected)")
             # sys.exit(1) # It might be visible if default is Female? No default is empty.

        print("Selecting Gender: Female")
        # Find radio button for Female. Q47 answers: Female, Male, Other.
        # Value might be "Female".
        page.check("input[name='Q47'][value='Female']")

        # Wait a bit for render
        page.wait_for_timeout(500)

        # Check if Q9 appeared
        if page.locator("input[name='Q9']").first.is_visible():
             print("✅ Q9 appeared after selecting Female")
        else:
             print("❌ Q9 did NOT appear after selecting Female!")
             sys.exit(1)

        # Test hiding (Select Male)
        print("Selecting Gender: Male")
        page.check("input[name='Q47'][value='Male']")
        page.wait_for_timeout(500)

        if not page.locator("input[name='Q9']").first.is_visible():
             print("✅ Q9 disappeared after selecting Male")
        else:
             print("❌ Q9 is still visible after selecting Male!")
             sys.exit(1)

        browser.close()

if __name__ == "__main__":
    verify_optimization()
