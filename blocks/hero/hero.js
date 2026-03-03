import { getMetadata } from '../../scripts/aem.js';
import { isAuthorEnvironment, moveInstrumentation } from '../../scripts/scripts.js';
import { readBlockConfig } from '../../scripts/aem.js';

/**
 *
 * @param {Element} block
 */
export default function decorate(block) {
  // Get the enable underline setting from the block content (3rd div)
  const enableUnderline = block.querySelector(':scope div:nth-child(3) > div')?.textContent?.trim() || 'true';
  
  // Get the layout Style from the block content (4th div)
  const layoutStyle = block.querySelector(':scope div:nth-child(4) > div')?.textContent?.trim() || 'overlay';

  // Get the CTA style from the block content (5th div)
  const ctaStyle = block.querySelector(':scope div:nth-child(5) > div')?.textContent?.trim() || 'default';

  const backgroundStyle = block.querySelector(':scope div:nth-child(6) > div')?.textContent?.trim() || 'default';

  if(layoutStyle){
     block.classList.add(`${layoutStyle}`);
  }

  if(backgroundStyle){
    block.classList.add(`${backgroundStyle}`);
  }

  // Add removeunderline class if underline is disabled
  if (enableUnderline.toLowerCase() === 'false') {
    block.classList.add('removeunderline');
  }
  
  // Find the button container within the hero block
  const buttonContainer = block.querySelector('p.button-container');
  
  if (buttonContainer) {
    // Add the CTA style class to the button container
    buttonContainer.classList.add(`cta-${ctaStyle}`);
  }
  
  // Hide the CTA style configuration paragraph
  const ctaStyleParagraph = block.querySelector('p[data-aue-prop="ctastyle"]');
  if (ctaStyleParagraph) {
    ctaStyleParagraph.style.display = 'none';
  }

  // Optional: Remove the configuration divs after reading them to keep the DOM clean
  const underlineDiv = block.querySelector(':scope div:nth-child(3)');
  if (underlineDiv) {
    underlineDiv.style.display = 'none';
  }
  
  const layoutStyleDiv = block.querySelector(':scope div:nth-child(4)');
  if (layoutStyleDiv) {
    layoutStyleDiv.style.display = 'none';
  }

  const ctaStyleDiv = block.querySelector(':scope div:nth-child(5)');
  if (ctaStyleDiv) {
    ctaStyleDiv.style.display = 'none';
  }

  const backgroundStyleDiv = block.querySelector(':scope div:nth-child(6)');
  if (backgroundStyleDiv) {
    backgroundStyleDiv.style.display = 'none';
  }

  // Ensure hero has an h1 for the title (content may be in a <p> from the sheet)
  let titleEl = block.querySelector('h1');
  if (!titleEl) {
    const firstRow = block.querySelector(':scope > div:first-child');
    const firstCell = firstRow?.querySelector(':scope > div');
    const firstP = firstCell?.querySelector('p:not(.button-container)');
    if (firstP?.textContent?.trim()) {
      titleEl = document.createElement('h1');
      titleEl.innerHTML = firstP.innerHTML;
      firstP.replaceWith(titleEl);
    }
  }
  if (!titleEl) {
    const anyP = block.querySelector('p:not(.button-container)');
    if (anyP?.textContent?.trim()) {
      titleEl = document.createElement('h1');
      titleEl.innerHTML = anyP.innerHTML;
      anyP.replaceWith(titleEl);
    }
  }

  // SJP-style: wrap the word "harder" in a span so it can be styled like sjp.co.uk (cursive, teal, larger)
  if (titleEl?.textContent && /\bharder\b/i.test(titleEl.textContent) && !titleEl.querySelector('.hero-h1-harder')) {
    const raw = titleEl.innerHTML || titleEl.textContent;
    titleEl.innerHTML = raw.replace(/\b(harder)\b/gi, '<span class="hero-h1-harder">$1</span>');
  }
}
