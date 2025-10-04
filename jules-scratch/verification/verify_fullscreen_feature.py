from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    # Use a mobile viewport. The device preset includes `has_touch=True`.
    context = browser.new_context(**playwright.devices['iPhone 13 Pro'])
    page = context.new_page()

    try:
        # Navigate to the library page
        page.goto("http://localhost:8000/joziels-library/index.html", wait_until="networkidle")

        # --- 1. Verify Carousel View & Swipe ---
        carousel_locator = page.locator('#book-carousel')
        expect(carousel_locator).to_be_visible(timeout=10000)
        expect(page.locator('#book1').locator('..')).to_have_class("book-container active")
        page.screenshot(path="jules-scratch/verification/01_carousel_initial_view.png")

        # --- Simulate swipe left using the correct dispatch_event method ---
        box = carousel_locator.bounding_box()
        if not box:
            raise Exception("Carousel bounding box not found")

        start_x = box['x'] + box['width'] * 0.8
        end_x = box['x'] + box['width'] * 0.2
        y_pos = box['y'] + box['height'] / 2

        # The 'touches' object requires an 'identifier' property.
        page.dispatch_event('#book-carousel', 'touchstart', {'touches': [{'identifier': 0, 'clientX': start_x, 'clientY': y_pos}]})
        page.dispatch_event('#book-carousel', 'touchmove', {'touches': [{'identifier': 0, 'clientX': end_x, 'clientY': y_pos}]})
        page.dispatch_event('#book-carousel', 'touchend')

        page.wait_for_timeout(500) # Wait for CSS transition
        expect(page.locator('#book2').locator('..')).to_have_class("book-container active")
        page.screenshot(path="jules-scratch/verification/02_carousel_swiped_left.png")

        # --- Simulate swipe right ---
        page.dispatch_event('#book-carousel', 'touchstart', {'touches': [{'identifier': 0, 'clientX': end_x, 'clientY': y_pos}]})
        page.dispatch_event('#book-carousel', 'touchmove', {'touches': [{'identifier': 0, 'clientX': start_x, 'clientY': y_pos}]})
        page.dispatch_event('#book-carousel', 'touchend')

        page.wait_for_timeout(500)
        expect(page.locator('#book1').locator('..')).to_have_class("book-container active")

        # --- 2. Verify Fullscreen Toggle ---
        page.locator('.book-container.active').click()
        page.wait_for_timeout(1000)

        expect(page.locator('#book-view')).to_be_visible()
        expect(page.locator('#carousel-view')).to_be_hidden()
        page.screenshot(path="jules-scratch/verification/03_fullscreen_view_opened.png")

        # --- 3. Verify Fullscreen Page Turning ---
        page.locator('#next-page-area').click()
        page.wait_for_timeout(1000)
        page.screenshot(path="jules-scratch/verification/04_fullscreen_page_turned_next.png")

        page.locator('#prev-page-area').click()
        page.wait_for_timeout(1000)
        page.screenshot(path="jules-scratch/verification/05_fullscreen_page_turned_back.png")

        # --- 4. Verify Return to Carousel ---
        page.locator('#back-to-carousel').click()
        page.wait_for_timeout(500)
        expect(page.locator('#carousel-view')).to_be_visible()
        page.screenshot(path="jules-scratch/verification/06_carousel_view_restored.png")

        print("Verification script completed successfully.")

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)