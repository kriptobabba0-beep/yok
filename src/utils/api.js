// Polyuserstats — Polymarket API Integration
// Routed through Vite proxy to avoid CORS
// Verified against: https://docs.polymarket.com/api-reference/

const GAMMA_API = '/api/gamma';
const DATA_API = '/api/data';
const CLOB_API = '/api/clob';

// ---------- FETCH HELPER WITH RETRY ----------

async function apiFetch(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 429 && i < retries) {
          await new Promise(r => setTimeout(r, 2000 * (i + 1)));
          continue;
        }
        console.warn(`API ${res.status} for ${url}`);
        if (i === retries) return [];
        continue;
      }
      const text = await res.text();
      if (!text || text.trim() === '') return [];
      try {
        return JSON.parse(text);
      } catch {
        console.warn('Non-JSON from', url);
        return [];
      }
    } catch (err) {
      if (i === retries) {
        console.error(`Fetch failed:`, url, err.message);
        return [];
      }
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return [];
}

// ============================================
// GAMMA API  (https://gamma-api.polymarket.com)
// ============================================

export async function fetchMarkets(opts = {}) {
  const { limit = 20, offset = 0, active = true, closed = false, order = 'volume24hr', ascending = false, tag_id } = opts;
  const p = new URLSearchParams({ limit, offset, active, closed, order, ascending });
  if (tag_id) p.set('tag_id', tag_id);
  return apiFetch(`${GAMMA_API}/markets?${p}`);
}

export async function fetchEvents(opts = {}) {
  const { limit = 20, offset = 0, active = true, closed = false, order = 'volume24hr', ascending = false, tag_id } = opts;
  const p = new URLSearchParams({ limit, offset, active, closed, order, ascending });
  if (tag_id) p.set('tag_id', tag_id);
  return apiFetch(`${GAMMA_API}/events?${p}`);
}

// Fetch trending events from /events/pagination — matches Polymarket's trending sort
export async function fetchTrendingEvents({ limit = 20, order = 'volume24hr', ascending = false } = {}) {
  const p = new URLSearchParams({ limit, order, ascending, active: true, archived: false, closed: false, offset: 0 });
  const raw = await apiFetch(`${GAMMA_API}/events/pagination?${p}`);
  return raw?.data || (Array.isArray(raw) ? raw : []);
}

// ============================================
// TRENDING MARKETS
// ============================================

// Matches Polymarket's "All markets" page exactly.
// For Daily/Weekly/Monthly: Polymarket fetches two lists (recurrence + tag_id) and merges them.
// For All: single fetch with no recurrence/tag filter.
// All sorted by volume24hr descending.
const PERIOD_TAG_ID = { daily: '102281', weekly: '102264', monthly: '102144' };

export async function fetchTrendingMarkets({ limit = 50, timeframe = 'daily' } = {}) {
  const base = { limit: 100, active: true, archived: false, closed: false, order: 'volume24hr', ascending: false };

  if (timeframe === 'all') {
    const p = new URLSearchParams({ ...base, order: 'volume', offset: 0 });
    const raw = await apiFetch(`${GAMMA_API}/events/pagination?${p}`);
    const events = raw?.data || (Array.isArray(raw) ? raw : []);
    return mapEvents(Array.isArray(events) ? events : [], 'volume');
  }

  // Fetch both recurrence list and tag list in parallel, then merge & deduplicate
  const pRec = new URLSearchParams({ ...base, recurrence: timeframe });
  const pTag = new URLSearchParams({ ...base, tag_id: PERIOD_TAG_ID[timeframe] });
  const [rawRec, rawTag] = await Promise.all([
    apiFetch(`${GAMMA_API}/events/pagination?${pRec}`),
    apiFetch(`${GAMMA_API}/events/pagination?${pTag}`),
  ]);
  const eventsRec = rawRec?.data || (Array.isArray(rawRec) ? rawRec : []);
  const eventsTag = rawTag?.data || (Array.isArray(rawTag) ? rawTag : []);

  // Deduplicate by event ID and sort by volume24hr descending
  const seen = new Set();
  const merged = [];
  for (const evt of [...eventsRec, ...eventsTag]) {
    if (!evt?.id || seen.has(String(evt.id))) continue;
    seen.add(String(evt.id));
    merged.push(evt);
  }
  merged.sort((a, b) => Number(b.volume24hr || 0) - Number(a.volume24hr || 0));
  return mapEvents(merged.slice(0, limit));
}

function mapEvents(events, volField = 'volume24hr') {
  return events.map((evt, idx) => ({
    id: evt.id,
    title: evt.title || 'Untitled',
    slug: evt.slug || '',
    image: evt.image || evt.icon || '',
    markets: evt.markets || [],
    active: evt.active ?? true,
    closed: evt.closed ?? false,
    liquidity: Number(evt.liquidity || 0),
    trendingVolume: Number(evt[volField] || 0),
    rank: idx + 1,
  }));
}

export async function searchGamma(query) {
  return apiFetch(`${GAMMA_API}/events?limit=20&active=true&closed=false&title=${encodeURIComponent(query)}`);
}

export async function fetchTags() {
  return apiFetch(`${GAMMA_API}/tags`);
}

// ============================================
// CLOB API  (https://clob.polymarket.com)
// ============================================

export async function fetchPrice(tokenId, side = 'buy') {
  return apiFetch(`${CLOB_API}/price?token_id=${tokenId}&side=${side}`);
}

export async function fetchOrderBook(tokenId) {
  return apiFetch(`${CLOB_API}/book?token_id=${tokenId}`);
}

// ============================================
// DATA API  (https://data-api.polymarket.com)
// ============================================

// -- Leaderboard --
// Official: GET /v1/leaderboard
// timePeriod: DAY | WEEK | MONTH | ALL
// orderBy:    PNL | VOL
// limit:      max 50
// category:   OVERALL | POLITICS | SPORTS | CRYPTO | CULTURE | ...
export async function fetchLeaderboard({ timePeriod = 'DAY', orderBy = 'PNL', limit = 50, offset = 0, category = 'OVERALL' } = {}) {
  const p = new URLSearchParams({ timePeriod, orderBy, limit: Math.min(limit, 50), offset, category });
  return apiFetch(`${DATA_API}/v1/leaderboard?${p}`);
}

// -- Profile --
// Official: GET /profiles/{address}
export async function fetchProfile(address) {
  const d = await apiFetch(`${DATA_API}/profiles/${address}`);
  if (Array.isArray(d)) return d[0] || null;
  return (d && typeof d === 'object' && Object.keys(d).length) ? d : null;
}

// -- Positions --
// Official: GET /positions?user={address}
// Two modes: display (sizeThreshold=1, sorted by value) and P&L (sizeThreshold=0, all positions)

// For display: matches Polymarket's "Active" positions view (sorted by value, skips dust)
export async function fetchPositions(address) {
  const PAGE_SIZE = 500;
  let all = [];
  let offset = 0;

  while (true) {
    const batch = await apiFetch(
      `${DATA_API}/positions?user=${address}&limit=${PAGE_SIZE}&sizeThreshold=1&sortBy=CURRENT&sortDirection=DESC&offset=${offset}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    if (offset > 10000) { console.warn(`fetchPositions: safety cap hit for ${address}, results may be incomplete`); break; }
  }

  return all;
}

// For P&L calculation: sizeThreshold=0 to include all positions for accurate totals
export async function fetchAllPositions(address) {
  const PAGE_SIZE = 500;
  let all = [];
  let offset = 0;

  while (true) {
    const batch = await apiFetch(
      `${DATA_API}/positions?user=${address}&limit=${PAGE_SIZE}&sizeThreshold=0&offset=${offset}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    if (offset > 10000) { console.warn(`fetchAllPositions: safety cap hit for ${address}, results may be incomplete`); break; }
  }

  return all;
}

// -- Closed Positions --
// Official: GET /closed-positions?user={address}
// Returns resolved positions with realizedPnl (wins/losses that have settled)
// API max limit is 50, so we must paginate to get all closed positions
export async function fetchClosedPositions(address) {
  const PAGE_SIZE = 50; // API max
  let all = [];
  let offset = 0;

  while (true) {
    const batch = await apiFetch(
      `${DATA_API}/closed-positions?user=${address}&limit=${PAGE_SIZE}&offset=${offset}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    if (offset > 5000) { console.warn(`fetchClosedPositions: safety cap hit for ${address}, results may be incomplete`); break; }
  }

  return all;
}

// -- Activity --
// Official: GET /activity?user={address}   (user REQUIRED)
export async function fetchActivity(address, { type, limit = 50, offset = 0 } = {}) {
  const p = new URLSearchParams({ user: address, limit, offset });
  if (type) p.set('type', type);
  return apiFetch(`${DATA_API}/activity?${p}`);
}

// -- Trades --
// Official: GET /trades
// WORKS WITHOUT user → returns global recent trades
// user, market, limit, offset, side, filterType (CASH|TOKENS), filterAmount
export async function fetchTrades({ user, market, limit = 50, offset = 0, side, filterType, filterAmount } = {}) {
  const p = new URLSearchParams({ limit, offset });
  if (user) p.set('user', user);
  if (market) p.set('market', market);
  if (side) p.set('side', side);
  if (filterType) p.set('filterType', filterType);
  if (filterAmount) p.set('filterAmount', String(filterAmount));
  return apiFetch(`${DATA_API}/trades?${p}`);
}

// Convenience: global high-value trades
export async function fetchGlobalTrades({ limit = 100, minUSD = 0 } = {}) {
  const p = new URLSearchParams({ limit });
  if (minUSD > 0) {
    p.set('filterType', 'CASH');
    p.set('filterAmount', String(minUSD));
  }
  return apiFetch(`${DATA_API}/trades?${p}`);
}

// Fetch multiple pages of global trades for volume calculation
export async function fetchTradesForVolume({ pages = 3, perPage = 200 } = {}) {
  const requests = [];
  for (let i = 0; i < pages; i++) {
    requests.push(
      apiFetch(`${DATA_API}/trades?${new URLSearchParams({ limit: perPage, offset: i * perPage })}`)
    );
  }
  const results = await Promise.allSettled(requests);
  const allTrades = [];
  results.forEach(r => {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) allTrades.push(...r.value);
  });
  return allTrades;
}

// Fetch event details by slug from Gamma
export async function fetchEventBySlug(slug) {
  const data = await apiFetch(`${GAMMA_API}/events?slug=${encodeURIComponent(slug)}`);
  return Array.isArray(data) ? data[0] : data;
}

// Category-specific leaderboard
export async function fetchCategoryLeaderboard(category, { timePeriod = 'ALL', orderBy = 'PNL', limit = 50 } = {}) {
  const p = new URLSearchParams({ timePeriod, orderBy, limit: Math.min(limit, 50), category: category.toUpperCase() });
  return apiFetch(`${DATA_API}/v1/leaderboard?${p}`);
}

// Fetch trades for a specific market token
export async function fetchMarketTrades(tokenId, { limit = 50 } = {}) {
  if (!tokenId) return [];
  const p = new URLSearchParams({ market: tokenId, limit });
  return apiFetch(`${DATA_API}/trades?${p}`);
}

// Fetch price history (CLOB timeseries)
export async function fetchPriceHistory(tokenId, interval = '1d', fidelity = 60) {
  if (!tokenId) return [];
  return apiFetch(`${CLOB_API}/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`);
}

// Extract clobTokenIds from a Gamma market object
export function getTokenIds(market) {
  try {
    const ids = JSON.parse(market.clobTokenIds || '[]');
    return Array.isArray(ids) ? ids : [];
  } catch { return []; }
}

// ============================================
// HELPERS
// ============================================

export function formatUSD(v) {
  const n = Number(v);
  if (isNaN(n)) return '$0.00';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

export function shortenAddress(a) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';
}

export function timeAgo(ts) {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 0) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function polymarketProfileUrl(a) {
  return `https://polymarket.com/profile/${a}`;
}

export function polymarketMarketUrl(slug) {
  return `https://polymarket.com/event/${slug}`;
}
