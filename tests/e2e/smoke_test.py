"""End-to-end smoke test: drives the real app in a headless browser.

Setup (once):  pip install playwright  &&  python -m playwright install chromium
Run:           start the server with `npm start`, then `python tests/e2e/smoke_test.py`
"""
import os, sys, asyncio
from playwright.async_api import async_playwright

BASE = os.environ.get("APP_URL", "http://localhost:3000")
SHOTS = os.environ.get("SHOTS_DIR", "e2e-screenshots")

async def main():
    os.makedirs(SHOTS, exist_ok=True)
    errors, results = [], []
    def check(name, ok):
        results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name)

    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
        page = await browser.new_page(viewport={"width": 1280, "height": 800}, accept_downloads=True)
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(BASE)
        await page.wait_for_selector("#modelName")
        await page.wait_for_timeout(1500)

        # 1. Design: chat creates a coaster with raised letters
        await page.fill("#prompt", "Coaster that says HOME"); await page.click("#send")
        await page.wait_for_timeout(2500)
        check("Chat builds a coaster", "coaster" in (await page.text_content("#modelName")).lower())
        check("Letters placed on the floor", "inside floor" in await page.text_content("#textWhere"))
        await page.screenshot(path=f"{SHOTS}/1-design.png")

        # 2. Printability: a vase too tall for a small printer must fail
        await page.fill("#prompt", "A ribbed vase about 25 cm tall"); await page.click("#send")
        await page.wait_for_timeout(2500)
        await page.click("#tab-check"); await page.select_option("#printer", "mini")
        await page.wait_for_timeout(500)
        checks = await page.eval_on_selector_all("#checks b", "els => els.map(e => e.textContent)")
        check("Fit check fails on small printer", any("Doesn't fit" in c for c in checks))
        await page.screenshot(path=f"{SHOTS}/2-printability.png")
        await page.select_option("#printer", "a1"); await page.wait_for_timeout(300)
        check("Fit check passes on larger printer", "Fits your printer" in " ".join(await page.eval_on_selector_all("#checks b", "els => els.map(e => e.textContent)")))

        # 3. Price
        await page.click("#tab-price")
        rec = await page.text_content(".tier.rec .p")
        check("Recommended price shown", rec.startswith("$"))
        await page.screenshot(path=f"{SHOTS}/3-price.png")

        # 4. Listing
        await page.click("#tab-listing")
        title = await page.input_value("#lTitle")
        check("Listing title written and within 140 characters", 0 < len(title) <= 140)
        await page.screenshot(path=f"{SHOTS}/4-listing.png")

        # 5. Export: zip downloads, project saves
        await page.click("#tab-export")
        async with page.expect_download() as d: await page.click("#dlZip")
        check("Seller package downloads", (await d.value).suggested_filename.endswith("-seller-package.zip"))
        await page.click("#saveProject"); await page.wait_for_timeout(800)
        check("Project saved to library", "Saved" in await page.text_content("#libraryStatus"))
        await page.screenshot(path=f"{SHOTS}/5-export.png")

        check("No JavaScript errors", not errors)
        for e in errors: print("  error:", e)
        await browser.close()

    failed = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(failed)} passed, {len(failed)} failed")
    sys.exit(1 if failed else 0)

asyncio.run(main())
