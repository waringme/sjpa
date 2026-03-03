#!/usr/bin/env node
/**
 * Inspect how "harder" appears in the SJP hero h1 (structure + styles).
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

    const h1 = page.locator('h1').first();
    await h1.waitFor({ state: 'visible', timeout: 5000 });

    const result = await h1.evaluate((node) => {
      const getStyles = (el) => {
        const c = window.getComputedStyle(el);
        return {
          fontFamily: c.fontFamily,
          fontSize: c.fontSize,
          fontWeight: c.fontWeight,
          fontStyle: c.fontStyle,
          lineHeight: c.lineHeight,
          letterSpacing: c.letterSpacing,
          color: c.color,
          display: c.display,
        };
      };
      const h1Styles = getStyles(node);
      const innerHTML = node.innerHTML;
      const children = [];
      node.querySelectorAll('*').forEach((child) => {
        children.push({ tag: child.tagName, text: child.textContent.trim().slice(0, 30), styles: getStyles(child) });
      });
      return {
        innerHTML,
        fullText: node.innerText,
        h1Styles,
        children: children.length ? children : null,
      };
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
