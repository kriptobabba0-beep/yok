import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchEvents, fetchTags, formatUSD, polymarketMarketUrl } from '../utils/api';
import { PageHeader, TabBar, TableSkeleton, ProbBar, EmptyState } from '../components/UI';
import { TrendingUp, Clock, ExternalLink, Filter, Search, Timer, Flame, ArrowUpRight } from 'lucide-react';

const TIME_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'starting_soon', label: 'Starting Soon' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
];

export default function TrendingMarkets() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [timeFilter, setTimeFilter] = useState('all');
  const [showSportsOnly, setShowSportsOnly] = useState(false);
  const [hideLiveSports, setHideLiveSports] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchEvents({ limit: 100, order: 'volume24hr', ascending: false, active: true, closed: false })
      .then(data => {
        if (mounted) {
          setEvents(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  // Process and filter events
  const processedEvents = useMemo(() => {
    const now = Date.now();

    return events.map(evt => {
      const markets = evt.markets || [];
      const firstMarket = markets[0] || {};
      const title = (evt.title || firstMarket.question || '').toLowerCase();

      // --- Sport detection ---
      // League/tournament keywords (these events exist as sports context)
      const leagueKeywords = ['nba', 'nfl', 'mlb', 'nhl', 'premier league', 'champions league', 'ufc', 'boxing', 'tennis', 'f1', 'formula', 'world cup', 'la liga', 'serie a', 'bundesliga', 'ligue 1', 'mls', 'super bowl', 'playoff', 'playoffs', 'lol', 'esports', 'cricket', 'rugby'];
      const hasLeagueKeyword = leagueKeywords.some(kw => title.includes(kw));

      // Match-specific patterns: "vs", "vs.", "@", "at" between teams
      const isMatchPattern = /\bvs\.?\b|\b@\b/.test(title) || /\bat\b.*\b(game|match)\b/i.test(title);
      
      // "Winner" / "champion" patterns indicate a SEASON market, NOT a live match
      const isSeasonMarket = /winner|champion|mvp|award|rookie|standings|playoff.*winner|finals.*winner/i.test(title);
      
      // It's a sports event if it has league keywords OR match patterns
      const isSports = hasLeagueKeyword || isMatchPattern;
      
      // A "live match" is a sports event that looks like an individual match (not a season market)
      // It should have a match pattern OR be a short-duration sports event (not a winner/champion market)
      const isLiveMatch = isSports && isMatchPattern && !isSeasonMarket;

      // Check dates
      const endDate = evt.endDate || firstMarket.endDate || firstMarket.endDateIso;
      const startDate = evt.startDate || firstMarket.startDate;
      let endTime = endDate ? new Date(endDate).getTime() : null;
      let startTime = startDate ? new Date(startDate).getTime() : null;

      // For individual matches: determine if started
      // Only flag as "hasStarted" if it's an actual match AND its start time has passed
      let hasStarted = false;
      let minutesUntilStart = null;
      if (isLiveMatch && startTime) {
        hasStarted = startTime < now;
        if (!hasStarted) {
          minutesUntilStart = Math.round((startTime - now) / 60000);
        }
      } else if (!isLiveMatch && startTime) {
        // For non-match events (season markets, politics, etc.), just track countdown
        if (startTime > now) {
          minutesUntilStart = Math.round((startTime - now) / 60000);
        }
      }

      // Parse outcomes
      let outcomes = [];
      let prices = [];
      try { outcomes = JSON.parse(firstMarket.outcomes || '[]'); } catch {}
      try { prices = JSON.parse(firstMarket.outcomePrices || '[]'); } catch {}

      return {
        ...evt,
        firstMarket,
        isSports,
        isLiveMatch,
        hasStarted,
        minutesUntilStart,
        startTime,
        endTime,
        outcomes,
        prices,
        volume24hr: Number(evt.volume24hr || firstMarket.volume24hr || 0),
        liquidity: Number(evt.liquidity || firstMarket.liquidity || 0),
      };
    });
  }, [events]);

  const filteredEvents = useMemo(() => {
    let result = processedEvents;
    const now = Date.now();
    const today = new Date();

    // ALWAYS filter out expired markets
    result = result.filter(e => {
      // Filter explicitly closed markets
      if (e.closed === true || e.firstMarket?.closed === true) return false;
      if (e.active === false) return false;

      // Filter expired by endDate
      if (e.endTime && e.endTime < now) return false;

      // Heuristic: parse deadline dates from the title itself
      // Catches things like "by February 28", "this week (March 1)", "by March 3", "before Feb 28"
      const title = (e.title || e.firstMarket?.question || '').toLowerCase();
      const datePatterns = [
        // "by february 28" / "by feb 28" / "before march 1"
        /(?:by|before|until)\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})/i,
        // "this week (march 1)" / "(feb 28)"
        /\((?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})\)/i,
        // "march 1" at end of title
        /(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})\s*\??$/i,
      ];
      const monthMap = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };

      for (const pat of datePatterns) {
        const match = title.match(pat);
        if (match) {
          // Extract month and day from the match
          const groups = match.slice(1).filter(Boolean);
          let monthStr, dayStr;
          if (groups.length >= 2) {
            monthStr = groups[0].toLowerCase().replace('.', '');
            dayStr = groups[1];
          } else if (groups.length === 1) {
            // For patterns that capture month in the full match
            const fullMatch = match[0].toLowerCase();
            for (const [mName, mIdx] of Object.entries(monthMap)) {
              if (fullMatch.includes(mName)) { monthStr = mName; break; }
            }
            dayStr = groups[0];
          }

          if (monthStr && dayStr) {
            const monthIdx = monthMap[monthStr.replace('.', '')];
            if (monthIdx !== undefined) {
              const day = parseInt(dayStr, 10);
              const year = today.getFullYear();
              const deadline = new Date(year, monthIdx, day, 23, 59, 59);
              // If the deadline is in the past, filter it out
              if (deadline.getTime() < now) return false;
            }
          }
        }
      }

      // Also catch "this week" if we're past that week
      if (/this week/i.test(title)) {
        // Check if there's a date in parentheses that's passed
        const weekMatch = title.match(/this week.*?(\d{1,2})\s*\)/);
        // If no specific date found but title says "this week" and market is stale, we keep it
        // (handled by the date patterns above)
      }

      return true;
    });

    // Filter: hide live matches that have already started (NOT season/tournament markets)
    if (hideLiveSports) {
      result = result.filter(e => !(e.isLiveMatch && e.hasStarted));
    }

    if (showSportsOnly) {
      result = result.filter(e => e.isSports);
    }

    // Time filter
    if (timeFilter === 'starting_soon') {
      result = result.filter(e => e.minutesUntilStart !== null && e.minutesUntilStart <= 120 && e.minutesUntilStart > 0);
      result.sort((a, b) => (a.minutesUntilStart || Infinity) - (b.minutesUntilStart || Infinity));
    } else if (timeFilter === 'today') {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(e => e.endTime && e.endTime <= endOfDay.getTime());
    } else if (timeFilter === 'this_week') {
      const endOfWeek = new Date();
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      result = result.filter(e => e.endTime && e.endTime <= endOfWeek.getTime());
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.firstMarket.question || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [processedEvents, timeFilter, showSportsOnly, hideLiveSports, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Trending Markets"
        subtitle="Most-bet-on markets ranked by 24h volume"
        icon={TrendingUp}
        badge={
          <span className="badge-brand flex items-center gap-1">
            <Flame size={10} /> Hot
          </span>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search markets…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 h-10"
          />
        </div>
        <TabBar tabs={TIME_FILTERS} active={timeFilter} onChange={setTimeFilter} />
      </div>

      {/* Toggle filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showSportsOnly}
            onChange={(e) => setShowSportsOnly(e.target.checked)}
            className="w-4 h-4 rounded bg-surface-3 border-white/10 text-brand-500 focus:ring-brand-500/50"
          />
          <span className="text-xs text-slate-400">Sports only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hideLiveSports}
            onChange={(e) => setHideLiveSports(e.target.checked)}
            className="w-4 h-4 rounded bg-surface-3 border-white/10 text-brand-500 focus:ring-brand-500/50"
          />
          <span className="text-xs text-slate-400">Hide live matches (in-progress)</span>
        </label>
        <span className="ml-auto text-xs text-slate-600">{filteredEvents.length} markets</span>
      </div>

      {/* Market list */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : filteredEvents.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No markets found" description="Try adjusting your filters or search query." />
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((evt, i) => {
            const slug = evt.slug || evt.firstMarket.eventSlug;

            return (
              <div
                key={evt.id || i}
                className="glass-card-hover p-4 animate-slide-up"
                style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
              >
                <div className="flex items-start gap-3">
                  {/* Rank */}
                  <span className="w-8 h-8 rounded-xl bg-surface-4 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                    {i + 1}
                  </span>

                  {/* Image */}
                  {evt.image && (
                    <img src={evt.image} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-surface-4" />
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium text-slate-200 line-clamp-1">
                        {evt.title || evt.firstMarket.question || 'Untitled'}
                      </h3>
                      {evt.isSports && <span className="badge-cyan text-[10px]">Sports</span>}
                      {evt.isLiveMatch && evt.hasStarted && <span className="badge bg-red-500/15 text-red-400 border border-red-500/20 text-[10px]">Live</span>}
                      {evt.minutesUntilStart !== null && evt.minutesUntilStart > 0 && evt.minutesUntilStart <= 120 && (
                        <span className="badge bg-orange-500/15 text-orange-400 border border-orange-500/20 text-[10px] flex items-center gap-1">
                          <Timer size={9} />
                          Starts in {evt.minutesUntilStart < 60 ? `${evt.minutesUntilStart}m` : `${Math.round(evt.minutesUntilStart / 60)}h ${evt.minutesUntilStart % 60}m`}
                        </span>
                      )}
                    </div>

                    {/* Outcomes — handle multi-market events */}
                    <div className="mt-2 space-y-1">
                      {(() => {
                        const markets = evt.markets || [];
                        if (markets.length > 1) {
                          // Multi-market: rank by Yes price, show top 2
                          const ranked = markets.map(mk => {
                            let p = [];
                            try { p = JSON.parse(mk.outcomePrices || '[]'); } catch {}
                            return { label: mk.groupItemTitle || mk.question || '?', value: Number(p[0] || 0) };
                          }).filter(o => o.value > 0).sort((a, b) => b.value - a.value);
                          return ranked.slice(0, 2).map((o, j) => (
                            <ProbBar key={j} value={o.value} label={o.label} />
                          ));
                        } else {
                          // Single market: show outcomes
                          return evt.prices.slice(0, 2).map((price, j) => (
                            <ProbBar key={j} value={price} label={evt.outcomes[j]} />
                          ));
                        }
                      })()}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-5 mt-2.5 text-sm">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <TrendingUp size={13} className="text-brand-400" /> <span className="font-medium">Vol:</span> <span className="text-slate-200 font-semibold">{formatUSD(evt.volume24hr)}</span>
                      </span>
                      <span className="text-slate-400">
                        <span className="font-medium">Liquidity:</span> <span className="text-slate-200 font-semibold">{formatUSD(evt.liquidity)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <a
                    href={slug ? polymarketMarketUrl(slug) : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-xs flex items-center gap-1 flex-shrink-0"
                    onClick={e => !slug && e.preventDefault()}
                  >
                    Trade <ArrowUpRight size={12} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
