import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCategoryLeaderboard, fetchActivity, formatUSD, shortenAddress, polymarketMarketUrl, timeAgo } from '../utils/api';
import { PageHeader, TabBar, TableSkeleton, EmptyState } from '../components/UI';
import { generateBadges, BadgeList } from '../utils/badges';
import { Award, Crown, Trophy, TrendingUp, Coins, Star, Shield, ExternalLink, ArrowUpRight, BarChart3 } from 'lucide-react';

// Categories that Polymarket API supports
const CATEGORIES = [
  { id: 'POLITICS', label: 'Politics', icon: Shield, color: '#ef4444' },
  { id: 'SPORTS', label: 'Sports', icon: Trophy, color: '#10b981' },
  { id: 'CRYPTO', label: 'Crypto', icon: Coins, color: '#f59e0b' },
  { id: 'CULTURE', label: 'Culture', icon: Star, color: '#ec4899' },
  { id: 'OVERALL', label: 'Overall', icon: Crown, color: '#6366f1' },
];

const TIME_TABS = [
  { value: 'DAY', label: 'Today' },
  { value: 'WEEK', label: 'This Week' },
  { value: 'MONTH', label: 'This Month' },
  { value: 'ALL', label: 'All Time' },
];

// Extract trade count from API response
function getTradeCount(entry) {
  const fields = ['numTrades', 'numberOfTrades', 'num_trades', 'tradeCount', 'trades', 'numMarkets'];
  for (const f of fields) { const v = Number(entry[f] || 0); if (v > 0) return v; }
  return 0;
}

export default function MarketLeaders() {
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [timePeriod, setTimePeriod] = useState('ALL');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [catVolumes, setCatVolumes] = useState({});
  const [catLoading, setCatLoading] = useState(true);
  const [activityCache, setActivityCache] = useState({});
  const [actLoading, setActLoading] = useState({});
  const [showReturnInfo, setShowReturnInfo] = useState(false);
  const loadedRef = useRef(new Set());

  // Fetch volumes for category sorting
  useEffect(() => {
    let m = true; setCatLoading(true);
    Promise.allSettled(CATEGORIES.map(cat =>
      fetchCategoryLeaderboard(cat.id, { timePeriod: 'ALL', orderBy: 'VOL', limit: 1 })
        .then(d => ({ id: cat.id, vol: Array.isArray(d) && d[0] ? Number(d[0].vol || 0) : 0 }))
    )).then(results => {
      if (!m) return;
      const vols = {};
      results.forEach(r => { if (r.status === 'fulfilled' && r.value) vols[r.value.id] = r.value.vol; });
      setCatVolumes(vols); setCatLoading(false);
    });
    return () => { m = false; };
  }, []);

  // Fetch leaderboard
  useEffect(() => {
    if (!category) return;
    let m = true; setLoading(true); setActivityCache({}); setActLoading({}); loadedRef.current = new Set();
    fetchCategoryLeaderboard(category, { timePeriod, orderBy: 'PNL', limit: 50 })
      .then(d => { if (m) { setData(Array.isArray(d) ? d : []); setLoading(false); } })
      .catch(() => m && setLoading(false));
    return () => { m = false; };
  }, [category, timePeriod]);

  // Load activity for ALL wallets in batches
  useEffect(() => {
    if (!data.length) return;
    const BATCH = 5;
    let idx = 0;
    const loadBatch = () => {
      const batch = [];
      while (idx < data.length && batch.length < BATCH) {
        const addr = data[idx]?.proxyWallet || data[idx]?.userAddress || '';
        if (addr && !loadedRef.current.has(addr)) {
          loadedRef.current.add(addr);
          batch.push(addr);
        }
        idx++;
      }
      if (batch.length === 0) return;
      batch.forEach(addr => {
        setActLoading(prev => ({ ...prev, [addr]: true }));
      });
      Promise.allSettled(batch.map(addr => fetchActivity(addr, { limit: 50 }))).then(results => {
        results.forEach((r, i) => {
          const addr = batch[i];
          setActivityCache(prev => ({ ...prev, [addr]: r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : [] }));
          setActLoading(prev => { const n = { ...prev }; delete n[addr]; return n; });
        });
        // Load next batch after a delay
        if (idx < data.length) setTimeout(loadBatch, 500);
      });
    };
    loadBatch();
  }, [data]);

  const catInfo = CATEGORIES.find(c => c.id === category);
  const maxPnl = data.length > 0 ? Math.max(...data.map(d => Math.abs(Number(d.pnl || 0))), 1) : 1;
  const sortedCats = [...CATEGORIES].sort((a, b) => (catVolumes[b.id] || 0) - (catVolumes[a.id] || 0));

  // ─── CATEGORY PICKER ───
  if (!category) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Categories & Leaders" subtitle="Explore Polymarket categories and discover top performers" icon={Award}
          badge={<span className="badge bg-gradient-to-r from-amber-500/20 to-pink-500/20 text-amber-300 border border-amber-500/20 flex items-center gap-1"><Crown size={10}/> Elite</span>}/>
        <div className="p-3 rounded-md bg-brand-500/10 border border-brand-500/20 flex items-center gap-2">
          <BarChart3 size={16} className="text-brand-400 flex-shrink-0"/>
          <span className="text-sm font-semibold text-brand-300">Categories ranked by total trading volume — highest volume first</span>
        </div>
        {catLoading ? <TableSkeleton rows={4}/> : (
          <div className="space-y-3">
            {sortedCats.map((cat, i) => {
              const Icon = cat.icon; const vol = catVolumes[cat.id] || 0;
              return (
                <button key={cat.id} onClick={() => setCategory(cat.id)}
                  className="glass-card-hover p-5 text-left w-full group animate-slide-up flex items-center gap-5" style={{animationDelay:`${i*60}ms`}}>
                  <span className={`w-10 h-10 rounded-md flex items-center justify-center text-lg font-black flex-shrink-0 ${
                    i===0?'bg-gradient-to-br from-amber-400 to-yellow-300 text-black':i===1?'bg-gradient-to-br from-slate-300 to-slate-200 text-black':i===2?'bg-gradient-to-br from-amber-700 to-amber-500 text-white':'bg-surface-4 text-slate-400'
                  }`}>{i+1}</span>
                  <div className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0" style={{backgroundColor:cat.color+'20'}}>
                    <Icon size={24} style={{color:cat.color}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition-colors">{cat.label}</h3>
                    <p className="text-sm mt-0.5"><span className="text-amber-400 font-bold">Top earner volume:</span> <span className="text-white font-mono font-bold">{formatUSD(vol)}</span></p>
                  </div>
                  <span className="text-sm text-brand-400 font-semibold flex items-center gap-1 flex-shrink-0">View Top 50 <ArrowUpRight size={14}/></span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── LEADERBOARD ───
  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title={`${catInfo?.label||''} Leaders`} subtitle={`Top 50 earners in ${catInfo?.label||''} — ranked by category-specific profit`}
        icon={catInfo?.icon||Award}
        badge={<span className="badge" style={{backgroundColor:catInfo?.color+'20',color:catInfo?.color,borderColor:catInfo?.color+'40'}}><Crown size={10}/> {catInfo?.label}</span>}>
        <button onClick={()=>{setCategory(null);setData([]);}} className="btn-ghost text-xs">← All Categories</button>
      </PageHeader>
      <TabBar tabs={TIME_TABS} active={timePeriod} onChange={setTimePeriod}/>
      <p className="text-xs text-slate-500 -mt-2">{timePeriod==='ALL'?`All-time cumulative ${catInfo?.label} rankings`:timePeriod==='DAY'?'Last 24 hours':timePeriod==='WEEK'?'Last 7 days':'Last 30 days'}</p>

      {loading ? <TableSkeleton rows={12}/> : data.length===0 ? <EmptyState icon={Award} title="No data" description="Try a different time period."/> : (
        <div className="space-y-3">
          {data.map((entry, i) => {
            const addr = entry.proxyWallet || entry.userAddress || '';
            const name = entry.userName || entry.name || entry.pseudonym || shortenAddress(addr);
            const pnl = Number(entry.pnl || 0);
            const vol = Number(entry.vol || 0);
            const apiTrades = getTradeCount(entry);
            const pnlPct = maxPnl > 0 ? Math.min(100, Math.abs(pnl) / maxPnl * 100) : 0;

            const acts = activityCache[addr] || [];
            const isActLoading = !!actLoading[addr];
            const allTradeLike = acts.filter(a => a.side && a.title);

            // Trade count: use API value or activity count
            const tradeCount = apiTrades > 0 ? apiTrades : allTradeLike.length;

            // Win rate: P&L-based estimate — pnl / vol = return rate
            // If pnl > 0, that's a "winning" trader. Show return %
            const returnPct = vol > 0 ? Math.round((pnl / vol) * 100) : 0;

            // Last 5 BUY trades
            const buyTrades = allTradeLike.filter(a => a.side === 'BUY').slice(0, 5);

            const badges = generateBadges({ rank: i + 1, category: catInfo?.label, timePeriod, pnl, vol, trades: tradeCount });

            return (
              <div key={addr||i} className="glass-card overflow-hidden animate-slide-up" style={{animationDelay:`${Math.min(i*20,200)}ms`}}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className={`w-9 h-9 rounded-md flex items-center justify-center text-sm font-black flex-shrink-0 ${
                      i===0?'bg-gradient-to-br from-amber-400 to-yellow-300 text-black':i===1?'bg-gradient-to-br from-slate-300 to-slate-200 text-black':i===2?'bg-gradient-to-br from-amber-700 to-amber-500 text-white':'bg-surface-4 text-slate-500'
                    }`}>{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span onClick={()=>navigate(`/wallet/${addr}`)} className="text-sm font-bold text-white hover:text-brand-300 cursor-pointer">{name}</span>
                        <code className="text-[10px] text-slate-600 font-mono">{shortenAddress(addr)}</code>
                      </div>
                      {badges.length>0 && <div className="mt-1.5"><BadgeList badges={badges} size="sm"/></div>}

                      <div className="grid grid-cols-4 gap-3 mt-3">
                        <div className="bg-surface-3/50 rounded-md p-2.5 border border-white/[0.04]">
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">P&L</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-2 bg-surface-4 rounded-sm overflow-hidden"><div className={`h-full rounded-sm ${pnl>=0?'bg-emerald-500':'bg-red-500'}`} style={{width:`${pnlPct}%`}}/></div>
                            <span className={`text-sm font-mono font-black ${pnl>=0?'text-emerald-400':'text-red-400'}`}>{pnl>=0?'+':''}{formatUSD(pnl)}</span>
                          </div>
                        </div>
                        <div className="bg-surface-3/50 rounded-md p-2.5 border border-white/[0.04]">
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Volume</p>
                          <p className="text-sm font-mono font-bold text-slate-200 mt-1">{formatUSD(vol)}</p>
                        </div>
                        <div className="bg-brand-500/10 rounded-md p-2.5 border border-brand-500/20">
                          <p className="text-[9px] text-brand-400 uppercase tracking-wider font-bold">{catInfo?.label} Trades</p>
                          <p className="text-sm font-bold text-brand-300 mt-1">{tradeCount > 0 ? tradeCount : isActLoading ? '…' : '—'}</p>
                        </div>
                        <div className={`rounded-md p-2.5 border ${returnPct > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : returnPct < 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-surface-3/50 border-white/[0.04]'}`}>
                          <p className={`text-[9px] uppercase tracking-wider font-bold flex items-center gap-1 ${returnPct > 0 ? 'text-emerald-400' : returnPct < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                            Return Rate
                            <span onClick={(e) => { e.stopPropagation(); setShowReturnInfo(v => !v); }}
                              className="cursor-pointer text-slate-500 hover:text-brand-400 transition-colors text-[11px]">ⓘ</span>
                          </p>
                          <p className={`text-sm font-mono font-black mt-1 ${returnPct > 0 ? 'text-emerald-300' : returnPct < 0 ? 'text-red-300' : 'text-slate-500'}`}>
                            {vol > 0 ? `${returnPct > 0 ? '+' : ''}${returnPct}%` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Last 5 BUY positions — always visible */}
                <div className="px-4 pb-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Last 5 Open Positions</p>
                  {isActLoading ? <div className="h-8 shimmer rounded-md"/> : buyTrades.length===0 ? (
                    <p className="text-[11px] text-slate-600 italic">No open positions found</p>
                  ) : (
                    <div className="space-y-1">
                      {buyTrades.map((a, j) => (
                        <div key={j} className="flex items-center gap-2 py-1.5 px-2.5 rounded-md bg-surface-3/30 text-[11px]">
                          <span className="px-1.5 py-0.5 rounded-sm font-bold bg-emerald-500/15 text-emerald-400">BUY</span>
                          <span className="text-slate-300 truncate flex-1">{a.title||'Unknown'}</span>
                          {a.outcome && <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold ${a.outcome==='Yes'?'bg-emerald-500/15 text-emerald-400':'bg-red-500/15 text-red-400'}`}>Predicted: {a.outcome}</span>}
                          {(a.usdcSize || a.size) && <span className="text-slate-400 font-mono font-bold">{formatUSD(a.usdcSize || a.size)}</span>}
                          {a.timestamp && <span className="text-slate-600 flex-shrink-0">{timeAgo(a.timestamp)}</span>}
                          {(a.slug || a.eventSlug) && <a href={polymarketMarketUrl(a.slug || a.eventSlug)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="text-brand-400 hover:text-brand-300 flex-shrink-0"><ExternalLink size={11}/></a>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Return Rate explanation */}
      {showReturnInfo && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowReturnInfo(false)}/>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-96 glass-card p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">What is Return Rate?</h3>
              <button onClick={() => setShowReturnInfo(false)} className="text-slate-500 hover:text-white text-lg">✕</button>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              Return Rate measures how efficiently a trader generates profit relative to their total trading volume.
            </p>
            <div className="bg-surface-3/50 rounded-md p-3 border border-white/[0.04] mb-3">
              <p className="text-xs text-brand-400 font-bold font-mono">Return Rate = (P&L ÷ Volume) × 100</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-2">
              For example, if a trader has $5,000 profit on $50,000 total volume, their return rate is 10%. This means they earned 10 cents of profit for every dollar they traded.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              A higher return rate indicates smarter, more efficient trading. A trader with $10K profit on $50K volume (20% return) is more efficient than one with $100K profit on $10M volume (1% return).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
