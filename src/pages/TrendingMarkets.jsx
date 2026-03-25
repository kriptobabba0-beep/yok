import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchMarketTrades, fetchTrendingMarkets, formatUSD, shortenAddress, polymarketMarketUrl, timeAgo } from '../utils/api';
import { PageHeader, TabBar, TableSkeleton, EmptyState } from '../components/UI';
import { TrendingUp, Search, Flame, ArrowUpRight, ArrowDownLeft, Activity, RefreshCw } from 'lucide-react';

// Timeframe tabs — values sent directly to our /api/trending backend
const VOLUME_PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all', label: 'All Time' },
];
const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#ef4444','#8b5cf6','#f97316'];

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  return (<div className="bg-surface-2 border border-white/10 rounded-md px-3 py-2 shadow-xl">
    <p className="text-sm text-white font-bold">{payload[0].payload.name}</p>
    <p className="text-brand-400 font-mono text-lg font-bold">{payload[0].payload.pct}%</p>
  </div>);
}

// ─── LIVE FEED PANEL ───
function LiveFeedPanel({ markets, evt, onClose }) {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const isMultiMarket = (markets || []).length > 1;
  const seenRef = useRef(new Set());
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchJobs = useMemo(() => {
    const mkts = (markets || []);
    const ranked = mkts.map(mk => {
      let p = []; try { p = JSON.parse(mk.outcomePrices || '[]'); } catch {}
      return { mk, prob: Number(p[0] || 0), name: mk.groupItemTitle || '' };
    }).sort((a, b) => b.prob - a.prob);
    const jobs = [];
    if (isMultiMarket) {
      for (const { mk, name } of ranked) {
        const mktId = mk.conditionId || mk.id;
        if (mktId) jobs.push({ mktId, subName: name });
      }
    } else {
      const fm = mkts[0];
      if (fm) {
        const mktId = fm.conditionId || fm.id;
        if (mktId) jobs.push({ mktId, subName: '' });
      }
    }
    return jobs;
  }, [markets, isMultiMarket]);

  const NEW_WINDOW = 180;
  const KEEP_WINDOW = 600;
  const MIN_USD = 5;

  const fetchOne = useCallback(async (job, limit) => {
    try {
      const tr = await fetchMarketTrades(job.mktId, { limit });
      if (!Array.isArray(tr)) return [];
      return tr.map(t => ({ ...t, _subName: job.subName, _yesNo: t.outcome || 'Yes' }));
    } catch { return []; }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const jobs = fetchJobs.slice(0, Math.min(5, fetchJobs.length));
      const results = await Promise.allSettled(jobs.map(j => fetchOne(j, 15)));
      const now = Math.floor(Date.now() / 1000);
      const all = [];
      results.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value); });
      const filtered = all.filter(t => {
        if (!t.timestamp || (now - Number(t.timestamp)) > KEEP_WINDOW) return false;
        const amt = Number(t.size || 0) * Number(t.price || 0);
        return amt >= MIN_USD;
      });
      filtered.sort((a, b) => (Number(b.timestamp || 0)) - (Number(a.timestamp || 0)));
      filtered.forEach(t => seenRef.current.add(t.transactionHash || `${t.timestamp}-${t.proxyWallet}`));
      if (mountedRef.current) { setTrades(filtered.slice(0, 50)); setLoading(false); }
    } catch {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchJobs, fetchOne]);

  const rotRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const refresh = useCallback(async () => {
    if (fetchJobs.length === 0 || isRefreshingRef.current || !mountedRef.current) return;
    isRefreshingRef.current = true;
    try {
      const count = Math.min(4, fetchJobs.length);
      const jobs = [];
      for (let i = 0; i < count; i++) jobs.push(fetchJobs[(rotRef.current + i) % fetchJobs.length]);
      rotRef.current = (rotRef.current + count) % fetchJobs.length;

      const results = await Promise.allSettled(jobs.map(j => fetchOne(j, 8)));
      const now = Math.floor(Date.now() / 1000);
      const fresh = [];
      results.forEach(r => {
        if (r.status !== 'fulfilled') return;
        r.value.forEach(t => {
          if (!t.timestamp || (now - Number(t.timestamp)) > NEW_WINDOW) return;
          const amt = Number(t.size || 0) * Number(t.price || 0);
          if (amt < MIN_USD) return;
          const k = t.transactionHash || `${t.timestamp}-${t.proxyWallet}`;
          if (!seenRef.current.has(k)) {
            seenRef.current.add(k);
            t._isNew = true;
            fresh.push(t);
          }
        });
      });

      if (mountedRef.current) {
        setTrades(prev => {
          const cutoff = now - KEEP_WINDOW;
          const kept = prev.filter(t => Number(t.timestamp || 0) > cutoff).map(t => t._isNew ? { ...t, _isNew: false } : t);
          if (fresh.length > 0) {
            fresh.sort((a, b) => (Number(b.timestamp || 0)) - (Number(a.timestamp || 0)));
            return [...fresh, ...kept].slice(0, 60);
          }
          return kept;
        });
      }
    } catch {}
    isRefreshingRef.current = false;
  }, [fetchJobs, fetchOne]);

  useEffect(() => {
    mountedRef.current = true;
    loadAll();
    return () => { mountedRef.current = false; clearInterval(intervalRef.current); };
  }, [loadAll]);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (isLive && fetchJobs.length > 0) {
      intervalRef.current = setInterval(refresh, 4000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isLive, refresh, fetchJobs]);

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-surface-3/50">
        <span className="text-base font-bold text-white flex items-center gap-2">
          <Activity size={16} className="text-brand-400"/> Live Feed
          {isLive && (
            <span className="flex items-center gap-1.5 ml-2 text-xs font-semibold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/>
              </span>
              Live
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsLive(l => !l)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${isLive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-surface-4 text-slate-500 border border-white/[0.04]'}`}>
            {isLive ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button onClick={onClose} className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 font-bold text-sm transition-all">
            ✕ Close
          </button>
        </div>
      </div>

      {loading ? <div className="p-5"><TableSkeleton rows={5}/></div> : (
        <div className="p-4">
          <p className="text-[10px] text-slate-600 mb-3">Trades $5+ appear within 3 minutes and stay visible for 10 minutes.</p>
          {trades.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">No trades in the last 10 minutes — waiting for new activity…</p> : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {trades.map((t, i) => {
                const shares = Number(t.size || 0);
                const price = Number(t.price || 0);
                const amt = shares * price;
                const isBuy = t.side === 'BUY';
                const name = t.name || t.pseudonym || shortenAddress(t.proxyWallet || '');
                const isNo = t._yesNo === 'No';
                const priceCents = (price * 100).toFixed(1).replace(/\.0$/, '');

                return (
                  <div key={i} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md hover:bg-white/[0.02] transition-all ${t._isNew ? 'animate-slide-up bg-brand-500/[0.04] border-l-2 border-l-brand-500' : ''}`}>
                    <div className={`p-1 rounded-md flex-shrink-0 ${isBuy ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                      {isBuy ? <ArrowUpRight size={13} className="text-emerald-400"/> : <ArrowDownLeft size={13} className="text-red-400"/>}
                    </div>
                    <p className="text-sm text-slate-300 flex-1">
                      <span onClick={() => t.proxyWallet && navigate(`/wallet/${t.proxyWallet}`)}
                        className="font-bold text-white hover:text-brand-300 cursor-pointer">{name}</span>
                      {' '}
                      <span className="text-slate-400">{isBuy ? 'bought' : 'sold'}</span>
                      {' '}
                      <span className={`font-bold ${isNo ? 'text-red-400' : 'text-emerald-400'}`}>
                        {shares >= 1 ? Math.round(shares).toLocaleString() : shares.toFixed(1)} {isNo ? 'No' : 'Yes'}
                      </span>
                      {' '}
                      {isMultiMarket && t._subName && (
                        <>
                          <span className="text-slate-500">for</span>
                          {' '}
                          <span className="font-semibold text-slate-200">{t._subName}</span>
                          {' '}
                        </>
                      )}
                      <span className="text-slate-500">at</span>
                      {' '}
                      <span className="text-slate-300">{priceCents}¢</span>
                      {' '}
                      <span className="text-slate-500">({formatUSD(amt)})</span>
                    </p>
                    <span className="text-[10px] text-slate-600 flex-shrink-0">{t.timestamp ? timeAgo(t.timestamp) : ''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ───
export default function TrendingMarkets() {
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [volumePeriod, setVolumePeriod] = useState('daily');
  const [showSportsOnly, setShowSportsOnly] = useState(false);
  const [expandedMarket, setExpandedMarket] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTrending = useCallback(async (period, signal) => {
    try {
      const results = await fetchTrendingMarkets({ limit: 50, timeframe: period });
      if (signal?.aborted) return;
      setEvents(Array.isArray(results) ? results : []);
    } catch (err) {
      if (!signal?.aborted) {
        console.error('[TrendingMarkets] Fetch failed:', err);
        setEvents([]);
      }
    }
    if (!signal?.aborted) setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setExpandedMarket(null);
    fetchTrending(volumePeriod, controller.signal);
    return () => controller.abort();
  }, [volumePeriod, fetchTrending]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing || loading) return;
    setIsRefreshing(true);
    fetchTrending(volumePeriod).then(() => setIsRefreshing(false)).catch(() => setIsRefreshing(false));
  }, [volumePeriod, fetchTrending, isRefreshing, loading]);

  const processedEvents = useMemo(() => {
    return events.map(evt => {
      const markets = evt.markets || [];
      const fm = markets[0] || {};
      const title = (evt.title || '').toLowerCase();
      const isSports = ['nba','nfl','mlb','nhl','premier league','champions league','ufc','la liga','serie a','bundesliga','f1','world cup','playoff','mls','dota','lol','csgo','valorant','mma','soccer','hockey','basketball','football','tennis','boxing'].some(k => title.includes(k)) || /\bvs\.?\b/.test(title);

      let chartData = [];
      if (markets.length > 1) {
        chartData = markets.map((mk, idx) => {
          let p = []; try { p = JSON.parse(mk.outcomePrices || '[]'); } catch {}
          return { name: mk.groupItemTitle || mk.question || '?', value: Number(p[0] || 0), pct: Math.round(Number(p[0] || 0) * 100), fill: COLORS[idx % COLORS.length] };
        }).filter(o => o.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
      } else if (fm.outcomes) {
        let oc = [], pr = []; try { oc = JSON.parse(fm.outcomes || '[]'); } catch {} try { pr = JSON.parse(fm.outcomePrices || '[]'); } catch {}
        chartData = oc.map((o, idx) => ({ name: o, value: Number(pr[idx] || 0), pct: Math.round(Number(pr[idx] || 0) * 100), fill: COLORS[idx % COLORS.length] }));
      }

      return {
        ...evt,
        firstMarket: fm,
        markets,
        title: evt.title || 'Untitled',
        slug: evt.slug,
        image: evt.image || fm.image,
        isSports,
        chartData,
        displayVolume: evt.trendingVolume || 0,
        liquidity: Number(evt.liquidity || 0),
      };
    });
  }, [events]);

  const filteredEvents = useMemo(() => {
    let r = processedEvents;
    if (showSportsOnly) r = r.filter(e => e.isSports);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(e => (e.title || '').toLowerCase().includes(q));
    }
    return r;
  }, [processedEvents, showSportsOnly, searchQuery]);

  const periodLabel = VOLUME_PERIODS.find(p => p.value === volumePeriod)?.label || 'Daily';

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Trending Markets" subtitle={`Markets ranked by ${periodLabel.toLowerCase()} trading volume`} icon={TrendingUp}
        badge={<span className="badge-brand flex items-center gap-1"><Flame size={10}/> Hot</span>}>
        <button onClick={handleRefresh} disabled={isRefreshing || loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            isRefreshing ? 'bg-surface-3 text-slate-600 cursor-wait' : 'bg-surface-3 text-slate-400 hover:text-white hover:bg-surface-4 border border-white/[0.04]'
          }`}>
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''}/> Refresh
        </button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input type="text" placeholder="Search markets…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-field pl-9 h-10"/>
        </div>
        <TabBar tabs={VOLUME_PERIODS} active={volumePeriod} onChange={setVolumePeriod}/>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showSportsOnly} onChange={e => setShowSportsOnly(e.target.checked)} className="w-4 h-4 rounded bg-surface-3 border-white/10"/>
          <span className="text-xs text-slate-400">Sports only</span>
        </label>
        <span className="ml-auto text-xs text-slate-600">{filteredEvents.length} markets</span>
      </div>

      {loading ? <TableSkeleton rows={6}/> : filteredEvents.length === 0 ? <EmptyState icon={TrendingUp} title="No markets" description="Adjust filters or try refreshing."/> : (
        <div className="space-y-4">
          {filteredEvents.map((evt, i) => {
            const slug = evt.slug || evt.firstMarket?.eventSlug;
            const isOpen = expandedMarket === evt.id;
            return (
              <div key={evt.id || i} className="animate-slide-up" style={{ animationDelay: `${Math.min(i * 15, 120)}ms` }}>
                <div className="glass-card overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <span className={`w-9 h-9 rounded-md flex items-center justify-center text-sm font-bold ${i < 3 ? 'bg-gradient-to-br from-amber-400 to-yellow-300 text-black' : 'bg-surface-4 text-slate-500'}`}>{i + 1}</span>
                          {evt.image && <img src={evt.image} alt="" className="w-10 h-10 rounded-md object-cover bg-surface-4"/>}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-white line-clamp-2">{evt.title}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {evt.isSports && <span className="badge-cyan text-[10px]">Sports</span>}
                            {evt.tradeCount > 0 && <span className="text-[10px] text-slate-600">{evt.tradeCount} trades</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {evt.markets && evt.markets.length > 0 && (
                          <button onClick={() => setExpandedMarket(isOpen ? null : evt.id)}
                            className={`btn-pulse flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all hover:-translate-y-0.5 ${isOpen ? 'bg-brand-600 text-white' : 'bg-brand-600/15 text-brand-300 border border-brand-500/25 hover:bg-brand-600/25'}`}>
                            <Activity size={15}/> Live Feed
                          </button>
                        )}
                        <a href={slug ? polymarketMarketUrl(slug) : '#'} target="_blank" rel="noopener noreferrer"
                          className="btn-pulse-green flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold bg-emerald-600/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-600/25 hover:-translate-y-0.5 transition-all">
                          <ArrowUpRight size={15}/> Trade
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 ml-12">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                        <TrendingUp size={13} className="text-emerald-400"/>
                        <span className="text-[11px] font-bold text-emerald-400">{periodLabel} Vol:</span>
                        <span className="text-sm font-mono font-black text-emerald-300">{formatUSD(evt.displayVolume)}</span>
                      </span>
                      {evt.liquidity > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                          <span className="text-[11px] font-bold text-cyan-400">Liq:</span>
                          <span className="text-sm font-mono font-black text-cyan-300">{formatUSD(evt.liquidity)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {evt.chartData.length > 0 && (
                    <div className="px-4 pb-4" style={{ height: Math.max(70, evt.chartData.length * 26 + 12) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={evt.chartData} layout="vertical" margin={{ top: 0, right: 45, left: 5, bottom: 0 }}>
                          <XAxis type="number" hide domain={[0, 'dataMax']}/>
                          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v.length > 12 ? v.slice(0, 11) + '…' : v}/>
                          <Tooltip content={<ChartTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.03)' }}/>
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20} label={{ position: 'right', fontSize: 12, fill: '#e2e8f0', fontWeight: 800, formatter: v => `${Math.round(v * 100)}%` }}>
                            {evt.chartData.map((d, idx) => <Cell key={idx} fill={d.fill}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                {isOpen && <div className="mt-2"><LiveFeedPanel markets={evt.markets} evt={evt} onClose={() => setExpandedMarket(null)}/></div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
