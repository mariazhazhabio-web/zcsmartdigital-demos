"""Re-render every SVG in source-svg/ to an exact-size PNG in png/.

Windows (one-time setup, in Command Prompt):
    py -m pip install playwright
    py -m playwright install chromium
Then, from the campaign folder:
    py tools\\render-png.py
"""
import pathlib, re
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
src, dst = root / "source-svg", root / "png"
dst.mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for f in sorted(src.glob("*.svg")):
        w, h = map(int, re.search(r'width="(\d+)" height="(\d+)"', f.read_text(encoding="utf-8")[:400]).groups())
        page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        page.goto(f.as_uri())
        page.wait_for_timeout(300)  # let embedded fonts settle
        page.screenshot(path=str(dst / f"{f.stem}.png"), clip={"x": 0, "y": 0, "width": w, "height": h})
        page.close()
        print(f"{f.stem}.png  {w}x{h}")
    browser.close()
