from playwright.sync_api import sync_playwright, expect
import time

def verify_subtree_optimization():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use existing context to persist if needed, but new page is fine
        page = browser.new_page()

        # Mock the session start API to ensure we can pass the consent screen
        page.route("**/api/session/start", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"success": true, "sessionId": "test-session-id"}'
        ))

        print("Navigating to app...")
        page.goto("http://localhost:5173")

        # Wait for loading state
        page.wait_for_load_state("networkidle")

        # 1. Consent Screen
        print("Handling Consent Screen...")
        expect(page.get_by_role("heading", name="E-Consent")).to_be_visible(timeout=10000)

        # Click checkbox
        page.locator("input[type='checkbox']").click()

        # Click Accept
        page.get_by_role("button", name="Accept").click()

        # 2. Questionnaire Screen
        print("Waiting for Questionnaire...")
        expect(page.get_by_role("heading", name="Breast Cancer Risk Questionnaire")).to_be_visible(timeout=10000)

        # 3. Fill Mandatory Fields (Age Q1, Gender Q47)
        print("Filling mandatory fields...")
        # Q47 (Gender) - Radio button
        page.get_by_label("Female").click()

        # Q1 (Age) - Number input
        # Note: Locating by name is robust here
        page.locator("input[name='Q1']").fill("35")

        # 4. Interact with a question having sub-questions
        # Q9: "Have you had a menstrual period?" -> Yes -> Q10, Q12_Current show up
        print("Testing Sub-question logic (Q9)...")

        # Initially, Q10 should not be visible
        expect(page.locator("input[name='Q10']")).not_to_be_visible()

        # Click Yes on Q9
        q9_block = page.locator(".question-block", has_text="Have you had a menstrual period?")
        # Use exact=True for get_by_label to avoid partial matching "I don't know" as "No"
        q9_block.get_by_label("Yes", exact=True).click()

        # Now Q10 should be visible
        print("Verifying Q10 visibility...")
        expect(page.locator("input[name='Q10']")).to_be_visible()

        # Fill Q10
        page.locator("input[name='Q10']").fill("12")

        # Click No on Q9 -> Q10 should disappear
        print("Toggling Q9 to No...")
        # Use exact=True for get_by_label to avoid partial matching "I don't know" which ends in "know" -> "No"?
        # Actually the error said "I don't know" was matched by "No" label query?
        # Ah, Playwright's get_by_label works by associated text. "I don't know" contains "No".
        q9_block.get_by_label("No", exact=True).click()

        expect(page.locator("input[name='Q10']")).not_to_be_visible()

        # Click Yes again -> Q10 should reappear
        print("Toggling Q9 back to Yes...")
        q9_block.get_by_label("Yes", exact=True).click()
        expect(page.locator("input[name='Q10']")).to_be_visible()

        # 5. Take Screenshot
        print("Taking screenshot...")
        page.screenshot(path="/home/jules/verification/verification.png")
        print("Verification complete.")

        browser.close()

if __name__ == "__main__":
    verify_subtree_optimization()
