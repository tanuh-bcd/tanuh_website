from playwright.sync_api import sync_playwright

def verify_app_renders():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (assuming Vite default port 5173)
        try:
            page.goto("http://localhost:5173", timeout=30000)

            # Wait for main content to load
            page.wait_for_selector("h2", timeout=30000)

            # Check for consent screen elements (since that's the default state)
            # The app should render 'Consent' component initially

            # Take a screenshot
            page.screenshot(path="verification/app_render_final.png")
            print("Screenshot saved to verification/app_render_final.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app_renders()
