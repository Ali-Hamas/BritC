/**
 * Browser Agent — Puppeteer-powered automation for BritC
 * Allows BritC to control Chrome: search Google, YouTube, LinkedIn, open URLs
 */

const puppeteer = require('puppeteer');

let browser = null;
let lastScreenshot = null;

async function getBrowser() {
  if (!browser || !browser.connected) {
    const isHeadless = process.env.PUPPETEER_HEADLESS !== 'false';
    browser = await puppeteer.launch({
      headless: isHeadless ? 'new' : false,          
      defaultViewport: { width: 1280, height: 800 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });
  }
  return browser;
}

async function takeScreenshot(page) {
  try {
    const buf = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 70 });
    lastScreenshot = `data:image/jpeg;base64,${buf}`;
    return lastScreenshot;
  } catch {
    return null;
  }
}

async function closePage(page, delayMs = 30000) {
  setTimeout(async () => {
    try { if (!page.isClosed()) await page.close(); } catch {}
  }, delayMs);
}

async function googleSearch(query) {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
  
  try {
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('#search', { timeout: 8000 }).catch(() => {});

    const results = await page.evaluate(() => {
      const items = [];
      const elements = document.querySelectorAll('div.g, div[data-sokoban-container]');
      elements.forEach((el) => {
        const titleEl = el.querySelector('h3');
        const linkEl = el.querySelector('a[href]');
        const snippetEl = el.querySelector('div[data-sncf], .VwiC3b, span.st');
        if (titleEl && linkEl) {
          const href = linkEl.getAttribute('href');
          if (href && href.startsWith('http')) {
            items.push({
              title: titleEl.innerText,
              url: href,
              snippet: snippetEl ? snippetEl.innerText : '',
            });
          }
        }
      });
      return items.slice(0, 8);
    });

    const screenshot = await takeScreenshot(page);
    closePage(page);
    return { success: true, engine: 'google', query, results, screenshot };
  } catch (err) {
    await page.close().catch(() => {});
    throw new Error(`Google search failed: ${err.message}`);
  }
}

async function youtubeSearch(query) {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  try {
    await page.goto(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('ytd-video-renderer, ytd-compact-video-renderer', { timeout: 10000 }).catch(() => {});

    const results = await page.evaluate(() => {
      const videos = [];
      document.querySelectorAll('ytd-video-renderer').forEach((el) => {
        const titleEl = el.querySelector('#video-title');
        const channelEl = el.querySelector('#channel-name a');
        const metaEl = el.querySelector('#metadata-line span');
        const thumbEl = el.querySelector('img');
        if (titleEl) {
          videos.push({
            title: titleEl.getAttribute('title') || titleEl.innerText,
            url: 'https://www.youtube.com' + (titleEl.getAttribute('href') || ''),
            channel: channelEl ? channelEl.innerText : '',
            views: metaEl ? metaEl.innerText : '',
            thumbnail: thumbEl ? (thumbEl.getAttribute('src') || '') : '',
          });
        }
      });
      return videos.slice(0, 6);
    });

    const screenshot = await takeScreenshot(page);
    closePage(page);
    return { success: true, engine: 'youtube', query, results, screenshot };
  } catch (err) {
    await page.close().catch(() => {});
    throw new Error(`YouTube search failed: ${err.message}`);
  }
}

async function linkedinJobSearch(query, location = 'United Kingdom') {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  try {
    const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&f_TPR=r86400`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForSelector('.jobs-search__results-list, .base-card', { timeout: 10000 }).catch(() => {});

    const jobs = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('.base-card, li.jobs-search-results__list-item').forEach((el) => {
        const titleEl = el.querySelector('.base-search-card__title, h3');
        const companyEl = el.querySelector('.base-search-card__subtitle, h4');
        const locationEl = el.querySelector('.job-search-card__location, .base-search-card__metadata');
        const linkEl = el.querySelector('a.base-card__full-link, a[data-tracking-control-name]');
        if (titleEl) {
          items.push({
            title: titleEl.innerText.trim(),
            company: companyEl ? companyEl.innerText.trim() : '',
            location: locationEl ? locationEl.innerText.trim() : '',
            url: linkEl ? linkEl.href : '',
          });
        }
      });
      return items.slice(0, 8);
    });

    const screenshot = await takeScreenshot(page);
    closePage(page);
    return { success: true, engine: 'linkedin_jobs', query, location, results: jobs, screenshot };
  } catch (err) {
    await page.close().catch(() => {});
    throw new Error(`LinkedIn job search failed: ${err.message}`);
  }
}

async function getLeads(query, location = 'UK') {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  try {
    const leadQuery = `site:linkedin.com/in/ OR site:instagram.com/ "${query}" "${location}" email "@gmail.com"`;
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(leadQuery)}&num=20`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForSelector('#search', { timeout: 10000 }).catch(() => {});

    const leads = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('div.g').forEach((el) => {
        const titleEl = el.querySelector('h3');
        const linkEl = el.querySelector('a[href]');
        const snippetEl = el.querySelector('.VwiC3b');
        if (titleEl && linkEl) {
          const text = snippetEl ? snippetEl.innerText : '';
          const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
          items.push({
            name: titleEl.innerText.split(' - ')[0].split(' | ')[0],
            link: linkEl.href,
            snippet: text,
            email: emails[0] || 'N/A'
          });
        }
      });
      return items.slice(0, 10); 
    });

    const screenshot = await takeScreenshot(page);
    closePage(page);
    return { success: true, engine: 'lead_hunter_lite', query, results: leads, screenshot };
  } catch (err) {
    await page.close().catch(() => {});
    throw new Error(`Lead extraction failed: ${err.message}`);
  }
}

async function openUrl(url) {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const screenshot = await takeScreenshot(page);
    const content = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    closePage(page);
    return { success: true, url, content, screenshot };
  } catch (err) {
    await page.close().catch(() => {});
    throw new Error(`Failed to open URL: ${err.message}`);
  }
}

async function closeBrowser() {
  if (browser) { await browser.close(); browser = null; }
  return { success: true };
}

module.exports = { 
  googleSearch, 
  youtubeSearch, 
  linkedinJobSearch, 
  openUrl, 
  getLeads, 
  closeBrowser, 
  getLastScreenshot: () => lastScreenshot 
};
