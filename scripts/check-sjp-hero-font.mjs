#!/usr/bin/env node
/**
 * Uses Playwright to open SJP.co.uk, find the hero banner h1,
 * and output its computed font styles so we can match them locally.
 * Run: npx playwright run scripts/check-sjp-hero-font.mjs (or node with playwright)
 */
import { chromium } from 'playwright';

const SJP_URL = 'https://www.sjp.co.uk/';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    await page.goto(SJP_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Hero headline is the first visible h1 on the page
    const el = page.locator('h1').first();
    await el.waitFor({ state: 'visible', timeout: 5000 });

    const styles = await el.evaluate((node) => {
      const c = window.getComputedStyle(node);
      return {
        fontFamily: c.fontFamily,
        fontSize: c.fontSize,
        fontWeight: c.fontWeight,
        lineHeight: c.lineHeight,
        letterSpacing: c.letterSpacing,
      };
    });

    const text = await el.innerText().catch(() => '');
    console.log(JSON.stringify({ selector: 'hero h1', text: text.trim().slice(0, 60), ...styles }, null, 2));
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
