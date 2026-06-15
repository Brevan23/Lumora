import { chromium } from "playwright";
import { writeFileSync } from "fs";

const URL = "https://superpower.com/";
const b = await chromium.launch({ args: ["--ignore-gpu-blocklist", "--use-gl=swiftshader"] });
try {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: "load", timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(5000);
  await p.evaluate(async () => {
    // trigger lazy/scroll content
    for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
  });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: "desktop-1440.png", fullPage: true });

  const data = await p.evaluate(() => {
    const pick = (sel, props) => { const el = document.querySelector(sel); if (!el) return null; const cs = getComputedStyle(el); const o = {}; props.forEach(k => (o[k] = cs.getPropertyValue(k))); return o; };
    return {
      libs: { gsap: !!window.gsap, ScrollTrigger: !!(window.ScrollTrigger || window.gsap?.core?.globals?.().ScrollTrigger), Swiper: !!window.Swiper, UnicornStudio: !!window.UnicornStudio, Plyr: !!window.Plyr },
      body: pick("body", ["background-color", "color", "font-family", "font-size", "line-height"]),
      h1: pick("h1", ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "color"]),
      h2: pick("h2", ["font-family", "font-size", "font-weight", "line-height", "letter-spacing"]),
      button: pick("a.button, .button, button", ["background-color", "color", "border-radius", "padding", "font-size", "font-weight", "box-shadow"]),
    };
  });
  writeFileSync("computed.json", JSON.stringify(data, null, 2));

  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: "mobile-390.png", fullPage: true });
  console.log("SHOTS_OK " + JSON.stringify(data.libs));
} catch (e) {
  console.error("shoot failed:", e.message);
} finally {
  await b.close();
}
