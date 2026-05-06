// Public RSS aggregator. Fetches a small set of finance-focused feeds in
// parallel, parses them with fast-xml-parser, and caches the merged output
// in memory for 10 minutes so we don't hammer upstreams.

const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const FEEDS = [
  { source: 'BBC',         url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { source: 'FT',          url: 'https://www.ft.com/companies?format=rss' },
  { source: 'Guardian',    url: 'https://www.theguardian.com/uk/business/rss' },
  { source: 'Sky',         url: 'https://feeds.skynews.com/feeds/rss/business.xml' },
  { source: 'CNBC',        url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
  { source: 'Yahoo',       url: 'https://finance.yahoo.com/news/rssindex' },
  { source: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  { source: 'Investing',   url: 'https://www.investing.com/rss/news_25.rss' },
  { source: 'Telegraph',   url: 'https://www.telegraph.co.uk/business/rss.xml' },
  { source: 'NPR',         url: 'https://feeds.npr.org/1006/rss.xml' },
];

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_ITEMS = 80;

let cache = { items: null, fetchedAt: 0 };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '_text',
  numberParseOptions: { skipLike: /./ },
  htmlEntities: true,
  processEntities: false,
});

function stripHtml(s) {
  if (!s) return '';
  return String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function pickText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && '_text' in v) return v._text || '';
  return String(v);
}

function normalizeItems(source, xml) {
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel || parsed?.feed;
  if (!channel) return [];
  const raw = channel.item || channel.entry || [];
  const arr = Array.isArray(raw) ? raw : [raw];

  return arr.map((it) => {
    const title = stripHtml(pickText(it.title));
    const link =
      typeof it.link === 'string'
        ? it.link
        : it.link?.href || it.link?._text || '';
    const pubDate = pickText(it.pubDate || it.published || it.updated || '');
    const summary = stripHtml(
      pickText(it.description || it.summary || it['content:encoded']) || ''
    ).slice(0, 240);
    const id = `${source}:${link || title}`;
    return { id, source, title, link, pubDate, summary };
  }).filter((x) => x.title && x.link);
}

async function fetchNewsItems() {
  const results = await Promise.allSettled(
    FEEDS.map((f) =>
      axios
        .get(f.url, {
          timeout: 8000,
          responseType: 'text',
          headers: { 'User-Agent': 'Britsync-NewsBot/1.0 (+https://britsync.ai)' },
        })
        .then((res) => normalizeItems(f.source, res.data))
    )
  );

  const items = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      items.push(...r.value);
    } else {
      console.warn(`[news] feed failed: ${FEEDS[i].source}`, r.reason?.message || r.reason);
    }
  });

  items.sort((a, b) => {
    const ta = Date.parse(a.pubDate) || 0;
    const tb = Date.parse(b.pubDate) || 0;
    return tb - ta;
  });

  return items.slice(0, MAX_ITEMS);
}

async function getCachedNews({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache.items && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { items: cache.items, fetchedAt: cache.fetchedAt, cached: true };
  }
  const items = await fetchNewsItems();
  cache = { items, fetchedAt: now };
  return { items, fetchedAt: now, cached: false };
}

module.exports = { FEEDS, fetchNewsItems, getCachedNews };
