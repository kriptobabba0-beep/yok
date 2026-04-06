import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { fetchTrendingEvents, fetchLeaderboard, formatUSD, shortenAddress, polymarketMarketUrl } from '../utils/api';
import { StatCard, CardSkeleton, PageHeader } from '../components/UI';
import { generateBadges, BadgeList } from '../utils/badges';
import { TrendingUp, DollarSign, BarChart3, Zap, Trophy, ArrowRight, ExternalLink, LayoutDashboard, ArrowUpRight } from 'lucide-react';

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
        fetchTrendingEvents({ limit: 8, order: 'volume24hr', ascending: false }),
        fetchLeaderboard({ timePeriod: 'DAY', orderBy: 'PNL', limit: 10 }),
      ]);
      if (!mounted) return;

      const evtData = evts.status === 'fulfilled' && Array.isArray(evts.value) ? evts.value : [];
      const lbData = lb.status === 'fulfilled' && Array.isArray(lb.value) ? lb.value : [];

      setEvents(evtData);
      setLeaders(lbData);

      const totalVol = evtData.reduce((sum, e) => sum + Number(e.volume24hr || 0), 0);
      const topProfit = lbData[0]?.pnl || 0;
      setStats({ totalVol, topProfit });
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
          <StatCard label="Top Trending Shown" value={`${events.length} markets`} icon={BarChart3} color="brand" />
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
                const slug = evt.slug || m.eventSlug;
                const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#ef4444','#8b5cf6','#f97316'];

                // Build chart data
                let chartData = [];
                if (markets.length > 1) {
                  chartData = markets.map((mk, idx) => {
                    let p = []; try { p = JSON.parse(mk.outcomePrices || '[]'); } catch {}
                    return { name: mk.groupItemTitle || mk.question || '?', value: Number(p[0] || 0), pct: Math.round(Number(p[0] || 0) * 100), fill: COLORS[idx % COLORS.length] };
                  }).filter(o => o.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
                } else {
                  let outcomes = [], prices = [];
                  try { outcomes = JSON.parse(m.outcomes || '[]'); } catch {}
                  try { prices = JSON.parse(m.outcomePrices || '[]'); } catch {}
                  chartData = outcomes.map((o, idx) => ({ name: o, value: Number(prices[idx] || 0), pct: Math.round(Number(prices[idx] || 0) * 100), fill: COLORS[idx % COLORS.length] }));
                }

                return (
                  <div key={evt.id || i} className="glass-card overflow-hidden">
                    <div className="p-4">
                      {/* Title + Trade button */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {evt.image && <img src={evt.image} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-surface-4"/>}
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">{evt.title || m.question || 'Untitled'}</h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px]">
                                <TrendingUp size={10} className="text-emerald-400"/><span className="font-bold text-emerald-400">Vol:</span><span className="font-mono font-bold text-emerald-300">{formatUSD(evt.volume24hr || m.volume24hr)}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[10px]">
                                <span className="font-bold text-cyan-400">Liq:</span><span className="font-mono font-bold text-cyan-300">{formatUSD(evt.liquidity || m.liquidity)}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <a href={slug ? polymarketMarketUrl(slug) : '#'} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-600/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-600/25 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex-shrink-0">
                          <ArrowUpRight size={12}/> Trade
                        </a>
                      </div>
                    </div>
                    {/* Horizontal bar chart */}
                    {chartData.length > 0 && (
                      <div className="px-4 pb-3" style={{ height: Math.max(50, chartData.length * 22 + 8) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 35, left: 5, bottom: 0 }}>
                            <XAxis type="number" hide domain={[0, 'dataMax']} />
                            <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                              tickFormatter={v => v.length > 9 ? v.slice(0, 8) + '…' : v} />
                            <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={16}
                              label={{ position: 'right', fontSize: 11, fill: '#e2e8f0', fontWeight: 800, formatter: v => `${Math.round(v * 100)}%` }}>
                              {chartData.map((d, idx) => <Cell key={idx} fill={d.fill} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
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
              const b = generateBadges({ rank: i+1, category: 'Overall', timePeriod: 'DAY', pnl: u.pnl, vol: u.vol });
              return (
                <div key={addr || i} onClick={() => addr && navigate(`/wallet/${addr}`)}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.03] cursor-pointer transition-all">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-surface-4 text-slate-500'}`}>{i + 1}</span>
                  {u.profileImage ? <img src={u.profileImage} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0"/> :
                   <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-500 to-brand-700 flex-shrink-0"/>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{name}</p>
                    {b.length > 0 && <div className="mt-0.5"><BadgeList badges={b} size="sm"/></div>}
                  </div>
                  <span className={`text-sm font-mono font-medium ${Number(u.pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {Number(u.pnl) >= 0 ? '+' : ''}{formatUSD(u.pnl)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-2">
            <Link to="/high-stakes" className="glass-card-hover p-4 flex items-center gap-3 group">
              <div className="p-2 rounded-md bg-gradient-to-br from-red-500/20 to-red-500/5"><Zap size={16} className="text-red-400"/></div>
              <div className="flex-1"><p className="text-sm font-medium text-slate-200">Hot Trades Live</p><p className="text-xs text-slate-500">Watch big trades in real time</p></div>
              <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors"/>
            </Link>
            <Link to="/new-markets" className="glass-card-hover p-4 flex items-center gap-3 group">
              <div className="p-2 rounded-md bg-gradient-to-br from-brand-500/20 to-brand-500/5"><TrendingUp size={16} className="text-brand-400"/></div>
              <div className="flex-1"><p className="text-sm font-medium text-slate-200">New Markets</p><p className="text-xs text-slate-500">Recently created prediction markets</p></div>
              <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors"/>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
