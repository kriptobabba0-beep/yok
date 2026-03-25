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

// Fetch events for trending — only passes order and limit, no active/closed filter
export async function fetchTrendingEvents({ limit = 100, order = 'volume24hr', ascending = false } = {}) {
  const p = new URLSearchParams({ limit, order, ascending });
  return apiFetch(`${GAMMA_API}/events?${p}`);
}

// ============================================
// TRENDING MARKETS
// ============================================

// Gamma API's volume24hr/volume1wk/volume1mo fields are stale and unreliable for ranking.
// Accurate trending rankings require computing rolling volume from periodic snapshots.
// We fetch pre-computed rankings via /api/rankings/ proxy, then hydrate with Gamma for rich UI.

export async function fetchTrendingMarkets({ limit = 50, timeframe = 'daily' } = {}) {
  // Step 1: Fetch pre-computed rankings with accurate volume data
  let ranked;
  try {
    ranked = await apiFetch(`/api/rankings/hot?limit=${limit}&timeframe=${timeframe}`);
  } catch (err) {
    console.error('[Trending] Failed to fetch rankings:', err);
    return [];
  }

  if (!Array.isArray(ranked) || ranked.length === 0) return [];

  // Step 2: Collect unique slugs for Gamma hydration
  const slugs = [...new Set(ranked.map(m => m.slug).filter(Boolean))];
  const gammaEvents = {};

  // Step 3: Batch-fetch event details from Gamma (images, outcomes, sub-markets)
  for (let i = 0; i < slugs.length; i += 20) {
    const batch = slugs.slice(i, i + 20);
    const params = new URLSearchParams();
    batch.forEach(s => params.append('slug', s));
    try {
      const events = await apiFetch(`${GAMMA_API}/events?${params}`);
      if (Array.isArray(events)) events.forEach(e => { if (e.slug) gammaEvents[e.slug] = e; });
    } catch {}
  }

  // Step 4: Merge — ranking order + volume from rankings, rich data from Gamma
  return ranked.map((item, idx) => {
    const evt = gammaEvents[item.slug];
    return {
      id: evt?.id || item.id || item.slug,
      title: evt?.title || item.question || item.slug,
      slug: item.slug || '',
      image: evt?.image || evt?.icon || '',
      markets: evt?.markets || [],
      active: item.active ?? evt?.active ?? true,
      closed: evt?.closed ?? false,
      liquidity: Number(evt?.liquidity || 0),
      trendingVolume: Number(item.volume || 0),
      rank: idx + 1,
    };
  });
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
export async function fetchPositions(address) {
  return apiFetch(`${DATA_API}/positions?user=${address}`);
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
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
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
