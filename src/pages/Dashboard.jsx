import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchEvents, fetchLeaderboard, formatUSD, shortenAddress, polymarketMarketUrl } from '../utils/api';
import { StatCard, CardSkeleton, ProbBar, PageHeader } from '../components/UI';
import { TrendingUp, DollarSign, BarChart3, Zap, Trophy, ArrowRight, ExternalLink, LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalVol: 0, activeMarkets: 0, topProfit: 0 });

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [evts, lb] = await Promise.allSettled([
        fetchEvents({ limit: 8, order: 'volume24hr', ascending: false, active: true, closed: false }),
        fetchLeaderboard({ timePeriod: 'DAY', orderBy: 'PNL', limit: 10 }),
      ]);
      if (!mounted) return;

      const evtData = evts.status === 'fulfilled' && Array.isArray(evts.value) ? evts.value : [];
      const lbData = lb.status === 'fulfilled' && Array.isArray(lb.value) ? lb.value : [];
      
      setEvents(evtData);
      setLeaders(lbData);

      const totalVol = evtData.reduce((sum, e) => sum + Number(e.volume24hr || 0), 0);
      const topProfit = lbData[0]?.pnl || 0;
      setStats({ totalVol, activeMarkets: evtData.length, topProfit });
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Dashboard" subtitle="Real-time Polymarket intelligence at a glance" icon={LayoutDashboard} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? <><CardSkeleton/><CardSkeleton/><CardSkeleton/><CardSkeleton/></> : <>
          <StatCard label="24h Volume (Top 8)" value={formatUSD(stats.totalVol)} icon={DollarSign} color="green" />
          <StatCard label="Hot Markets" value={events.length} icon={BarChart3} color="brand" />
          <StatCard label="Top Daily Profit" value={formatUSD(stats.topProfit)} icon={Trophy} color="amber" />
          <div className="glass-card p-5 flex items-center gap-3">
            <div className="relative"><div className="glow-dot"/><div className="live-pulse absolute inset-0"/></div>
            <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</p><p className="text-sm font-medium text-emerald-400 mt-0.5">Markets Live</p></div>
          </div>
        </>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trending */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2"><TrendingUp size={18} className="text-brand-400"/> Trending Markets</h2>
            <Link to="/trending" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">View all <ArrowRight size={12}/></Link>
          </div>
          {loading ? <div className="space-y-3"><CardSkeleton/><CardSkeleton/><CardSkeleton/></div> : (
            <div className="space-y-3">
              {events.slice(0, 6).map((evt, i) => {
                const markets = evt.markets || [];
                const m = markets[0] || {};
                
                // Build the best outcome display for this event
                let displayOutcomes = [];
                
                if (markets.length > 1) {
                  // MULTI-MARKET EVENT (e.g., "2026 NBA Champion" with one market per team)
                  // Each market is a team/option — find the top ones by Yes price
                  const ranked = markets.map(mk => {
                    let p = [];
                    try { p = JSON.parse(mk.outcomePrices || '[]'); } catch {}
                    const yesPrice = Number(p[0] || 0); // first outcome is Yes for that option
                    return { label: mk.groupItemTitle || mk.question || '?', value: yesPrice };
                  }).filter(o => o.value > 0).sort((a, b) => b.value - a.value);
                  displayOutcomes = ranked.slice(0, 3);
                } else {
                  // SINGLE MARKET EVENT (binary Yes/No or small set of outcomes)
                  let outcomes = [], prices = [];
                  try { outcomes = JSON.parse(m.outcomes || '[]'); } catch {}
                  try { prices = JSON.parse(m.outcomePrices || '[]'); } catch {}
                  
                  if (outcomes.length === 2 && outcomes.includes('Yes')) {
                    // Binary Yes/No
                    const yesIdx = outcomes.indexOf('Yes');
                    displayOutcomes = [{ label: 'Yes', value: Number(prices[yesIdx] || 0) }];
                  } else if (outcomes.length > 0 && prices.length > 0) {
                    // Named outcomes — show top 2
                    const paired = outcomes.map((o, idx) => ({ label: o, value: Number(prices[idx] || 0) }));
                    paired.sort((a, b) => b.value - a.value);
                    displayOutcomes = paired.slice(0, 2);
                  }
                }

                return (
                  <div key={evt.id || i} className="glass-card-hover p-4 cursor-pointer"
                    onClick={() => { const s = evt.slug || m.eventSlug; if (s) window.open(polymarketMarketUrl(s), '_blank'); }}>
                    <div className="flex items-start gap-3">
                      {evt.image && <img src={evt.image} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-surface-4"/>}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-200 leading-snug line-clamp-2">{evt.title || m.question || 'Untitled'}</h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span>Vol: {formatUSD(evt.volume24hr || m.volume24hr)}</span>
                          <span>Liquidity: {formatUSD(evt.liquidity || m.liquidity)}</span>
                        </div>
                        {displayOutcomes.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {displayOutcomes.map((o, j) => (
                              <ProbBar key={j} value={o.value} label={o.label} />
                            ))}
                          </div>
                        )}
                      </div>
                      <ExternalLink size={14} className="text-slate-600 flex-shrink-0 mt-1"/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leaderboard sidebar */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Trophy size={18} className="text-amber-400"/> Top Earners Today</h2>
            <Link to="/top-earners" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">View all <ArrowRight size={12}/></Link>
          </div>
          <div className="glass-card overflow-hidden">
            {loading ? <div className="p-4 space-y-3"><CardSkeleton/><CardSkeleton/></div> :
             leaders.length === 0 ? <div className="p-8 text-center text-slate-500 text-sm">No leaderboard data</div> :
             leaders.slice(0, 8).map((u, i) => {
              const addr = u.proxyWallet || '';
              const name = u.userName || shortenAddress(addr);
              return (
                <div key={addr || i} onClick={() => addr && navigate(`/wallet/${addr}`)}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.03] cursor-pointer transition-all">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-surface-4 text-slate-500'}`}>{i + 1}</span>
                  {u.profileImage ? <img src={u.profileImage} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0"/> :
                   <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex-shrink-0"/>}
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-200 truncate">{name}</p></div>
                  <span className={`text-sm font-mono font-medium ${Number(u.pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {Number(u.pnl) >= 0 ? '+' : ''}{formatUSD(u.pnl)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-2">
            <Link to="/high-stakes" className="glass-card-hover p-4 flex items-center gap-3 group">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/5"><Zap size={16} className="text-red-400"/></div>
              <div className="flex-1"><p className="text-sm font-medium text-slate-200">High Stakes Live</p><p className="text-xs text-slate-500">Watch big bets in real time</p></div>
              <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors"/>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
