import { createOptimizedPicture, getMetadata } from '../../scripts/aem.js';
import { isAuthorEnvironment, moveInstrumentation } from '../../scripts/scripts.js';
import { getHostname, mapAemPathToSitePath } from '../../scripts/utils.js';

const CONFIG = {
  WRAPPER_SERVICE_URL: 'https://3635370-refdemoapigateway-stage.adobeioruntime.net/api/v1/web/ref-demo-api-gateway/fetch-cf',
  GRAPHQL_QUERY: '/graphql/execute.json/ref-demo-eds/CTAByPath',
};

/**
 * Fetch a single content fragment by path and variation (same API as content-fragment block).
 */
async function fetchContentFragment(contentPath, variationname, env) {
  const { aemauthorurl, aempublishurl, isAuthor } = env;
  const requestConfig = isAuthor
    ? {
      url: `${aemauthorurl}${CONFIG.GRAPHQL_QUERY};path=${contentPath};variation=${variationname};ts=${Date.now()}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
    : {
      url: CONFIG.WRAPPER_SERVICE_URL,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        graphQLPath: `${aempublishurl}${CONFIG.GRAPHQL_QUERY}`,
        cfPath: contentPath,
        variation: `${variationname};ts=${Date.now()}`,
      }),
    };

  const response = await fetch(requestConfig.url, {
    method: requestConfig.method,
    headers: requestConfig.headers,
    ...(requestConfig.body && { body: requestConfig.body }),
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  return data?.data?.ctaByPath?.item ?? null;
}

/**
 * Resolve CTA href from CF item (author/publish and paths.json mapping).
 */
async function resolveCtaHref(cfReq, env) {
  const { aemauthorurl, aempublishurl, isAuthor } = env;
  let ctaHref = '#';
  const cta = cfReq?.ctaurl;
  if (!cta) return ctaHref;
  if (typeof cta === 'string') {
    ctaHref = /^https?:\/\//i.test(cta) ? cta : `${isAuthor ? (aemauthorurl || '') : (aempublishurl || '')}${cta}`;
  } else if (typeof cta === 'object') {
    const pathOnly = cta._path;
    const authorUrl = cta._authorUrl;
    if (isAuthor) {
      ctaHref = authorUrl || (pathOnly ? `${aemauthorurl || ''}${pathOnly}` : '#');
    } else {
      ctaHref = pathOnly ?? cta._publishUrl ?? cta._url ?? '#';
    }
  }
  if (!isAuthor && ctaHref && ctaHref.startsWith('/content/')) {
    try {
      const mapped = await mapAemPathToSitePath(ctaHref);
      if (mapped) ctaHref = mapped;
    } catch (e) {
      // ignore
    }
  }
  return ctaHref;
}

/**
 * Build one article card (li) from content fragment data.
 */
async function buildCardFromCf(cfReq, contentPath, variationname, env, cardStyle, ctaStyle) {
  const isAuthor = env.isAuthor;
  const imgUrl = isAuthor ? cfReq.bannerimage?._authorUrl : cfReq.bannerimage?._publishUrl;
  const ctaHref = await resolveCtaHref(cfReq, env);

  const li = document.createElement('li');
  if (cardStyle && cardStyle !== 'default') {
    li.className = cardStyle;
  }
  const itemId = `urn:aemconnection:${contentPath}/jcr:content/data/${variationname}`;
  li.setAttribute('data-aue-type', 'reference');
  li.setAttribute('data-aue-resource', itemId);
  li.setAttribute('data-aue-filter', 'contentfragment');

  const imageDiv = document.createElement('div');
  imageDiv.className = 'article-card-image';
  if (imgUrl) {
    const pic = document.createElement('picture');
    const img = document.createElement('img');
    img.src = imgUrl;
    img.alt = cfReq?.title ?? '';
    pic.appendChild(img);
    imageDiv.appendChild(pic);
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'article-card-body';
  const title = document.createElement('h3');
  title.textContent = cfReq?.title ?? '';
  title.setAttribute('data-aue-prop', 'title');
  const desc = document.createElement('div');
  desc.classList.add('article-card-description');
  desc.setAttribute('data-aue-prop', 'description');
  const p = document.createElement('p');
  p.textContent = cfReq?.description?.plaintext ?? '';
  desc.appendChild(p);

  const buttonP = document.createElement('p');
  buttonP.className = `button-container ${ctaStyle}`;
  const a = document.createElement('a');
  a.href = ctaHref;
  a.className = 'button';
  a.setAttribute('data-aue-prop', 'ctaurl');
  a.target = '_blank';
  a.rel = 'noopener';
  const span = document.createElement('span');
  span.setAttribute('data-aue-prop', 'ctalabel');
  span.textContent = cfReq?.ctalabel ?? 'Learn more';
  a.appendChild(span);
  buttonP.appendChild(a);

  bodyDiv.append(title, desc, buttonP);
  li.append(imageDiv, bodyDiv);
  return li;
}

/**
 * Build one article card (li) from direct row content (image + text cells).
 * If hasSixColumns: cells 2=image, 3=text. Else (4-column): cells 0=image, 1=text.
 */
function buildCardFromRow(row, cardStyle, ctaStyle, hasSixColumns) {
  const li = document.createElement('li');
  if (cardStyle && cardStyle !== 'default') {
    li.className = cardStyle;
  }

  const cells = row.querySelectorAll(':scope > div');
  const imageCell = hasSixColumns ? cells[2] : cells[0];
  const textCell = hasSixColumns ? cells[3] : cells[1];

  if (imageCell) {
    const imageDiv = imageCell.cloneNode(true);
    imageDiv.className = 'article-card-image';
    li.appendChild(imageDiv);
  }
  if (textCell) {
    const bodyDiv = textCell.cloneNode(true);
    bodyDiv.className = 'article-card-body';
    li.appendChild(bodyDiv);
  }

  const buttonContainers = li.querySelectorAll('p.button-container');
  buttonContainers.forEach((buttonContainer) => {
    buttonContainer.classList.remove('default', 'cta-button', 'cta-button-secondary', 'cta-button-dark', 'cta-default');
    buttonContainer.classList.add(ctaStyle);
  });

  li.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  moveInstrumentation(row, li);
  return li;
}

/**
 * Decorate article block. Each row = one article item.
 * If Content Fragment path is set (cell 0): fetch CF and render from CF.
 * Otherwise: render from direct Image (cell 2) and Text (cell 3); style from cell 4, CTA from cell 5.
 */
export default async function decorate(block) {
  const hostnameFromPlaceholders = await getHostname();
  const hostname = hostnameFromPlaceholders ?? getMetadata('hostname');
  const aemauthorurl = getMetadata('authorurl') || '';
  const aempublishurl = hostname?.replace('author', 'publish')?.replace(/\/$/, '') ?? '';
  const isAuthor = isAuthorEnvironment();
  const env = { aemauthorurl, aempublishurl, isAuthor };

  const ul = document.createElement('ul');
  const rows = [...block.querySelectorAll(':scope > div')];

  for (const row of rows) {
    const cells = row.querySelectorAll(':scope > div');
    const hasSixColumns = cells.length >= 6;
    const pathCell = hasSixColumns ? cells[0] : null;
    const variationCell = hasSixColumns ? cells[1] : null;
    const contentPath = pathCell ? (pathCell.querySelector('a')?.textContent?.trim() ?? pathCell?.textContent?.trim()) : '';
    const variationname = variationCell?.textContent?.trim()?.toLowerCase()?.replace(/\s+/g, '_') || 'master';
    const styleCell = hasSixColumns ? cells[4] : cells[2];
    const ctaStyleCell = hasSixColumns ? cells[5] : cells[3];
    const cardStyle = styleCell?.textContent?.trim() || 'default';
    const ctaStyle = ctaStyleCell?.textContent?.trim() || 'button';

    if (contentPath) {
      const cfReq = await fetchContentFragment(contentPath, variationname, env);
      if (cfReq) {
        const li = await buildCardFromCf(cfReq, contentPath, variationname, env, cardStyle, ctaStyle);
        moveInstrumentation(row, li);
        ul.appendChild(li);
      }
      continue;
    }

    const li = buildCardFromRow(row, cardStyle, ctaStyle, hasSixColumns);
    ul.appendChild(li);
  }

  block.textContent = '';
  block.appendChild(ul);
}
