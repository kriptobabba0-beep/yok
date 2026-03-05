import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchEvents, fetchMarketTrades, getTokenIds, fetchActivity, formatUSD, shortenAddress, polymarketMarketUrl, timeAgo } from '../utils/api';
import { PageHeader, TabBar, TableSkeleton, EmptyState } from '../components/UI';
import { generateBadges, BadgeList } from '../utils/badges';
import { TrendingUp, ExternalLink, Search, Timer, Flame, ArrowUpRight, Users, ChevronLeft, ChevronRight, Target, Star, DollarSign, X } from 'lucide-react';

const TIME_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'ending_today', label: 'Ending Today' },
  { value: 'ending_this_week', label: 'This Week' },
  { value: 'long_term', label: 'Long Term' },
  { value: 'starting_soon', label: 'Starting Soon' },
];
const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#ef4444','#8b5cf6','#f97316'];

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  return (<div className="bg-surface-2 border border-white/10 rounded-md px-3 py-2 shadow-xl">
    <p className="text-sm text-white font-bold">{payload[0].payload.name}</p>
    <p className="text-brand-400 font-mono text-lg font-bold">{payload[0].payload.pct}%</p>
  </div>);
}

// ─── TOP HOLDERS ───
function TopHoldersPanel({ markets, eventTitle, onClose }) {
  const navigate = useNavigate();
  const [holders, setHolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PER_PAGE = 5;
  const isMultiMarket = (markets || []).length > 1;

  useEffect(() => {
    let m = true; setLoading(true); setPage(0);
    (async () => {
      const mkts = (markets || []).slice(0, 6);
      const allTrades = [];

      // Fetch trades using CORRECT clobTokenIds
      for (const mk of mkts) {
        const tokenIds = getTokenIds(mk);
        const yesTokenId = tokenIds[0]; // First token = Yes/outcome token
        if (!yesTokenId) continue;
        try {
          const trades = await fetchMarketTrades(yesTokenId, { limit: 50 });
          if (Array.isArray(trades)) {
            trades.forEach(t => {
              // Tag each trade with which sub-market it belongs to
              t._subMarketName = mk.groupItemTitle || '';
            });
            allTrades.push(...trades);
          }
        } catch {}
      }

      // Group by wallet — only BUY
      const wMap = {};
      allTrades.forEach(t => {
        if (t.side !== 'BUY') return;
        const addr = t.proxyWallet || t.maker || '';
        if (!addr) return;
        if (!wMap[addr]) wMap[addr] = { address: addr, name: t.name || t.pseudonym || '', totalUSDC: 0, trades: [], subMarketAmounts: {} };
        const w = wMap[addr];
        const amt = Number(t.usdcSize || 0) || (Number(t.size || 0) * Number(t.price || 0));
        w.totalUSDC += amt;
        w.trades.push(t);
        // Track investment per sub-market
        const subName = t._subMarketName || t.outcome || 'Yes';
        w.subMarketAmounts[subName] = (w.subMarketAmounts[subName] || 0) + amt;
      });

      let sorted = Object.values(wMap).sort((a, b) => b.totalUSDC - a.totalUSDC).slice(0, 20);

      // Calculate prediction + win rate from their own trades
      sorted = sorted.map(h => {
        // Prediction: for multi-market events, the sub-market they invested most in
        // For binary events, just "Yes" or "No"
        let prediction = 'Yes';
        if (isMultiMarket) {
          const topSub = Object.entries(h.subMarketAmounts).sort((a, b) => b[1] - a[1])[0];
          prediction = topSub ? topSub[0] : 'Yes';
        } else {
          // Binary: all BUY trades on Yes token = predicted Yes
          prediction = 'Yes';
        }

        // Win rate: use price-based estimate
        // If avg buy price < current market price, they're "winning"
        // Simple approach: ratio of trades with positive implied gain
        const buyPrices = h.trades.map(t => Number(t.price || 0)).filter(p => p > 0);
        const avgPrice = buyPrices.length > 0 ? buyPrices.reduce((s, p) => s + p, 0) / buyPrices.length : 0;
        // Rough win rate based on total P&L direction — show trade count instead
        const tradeCount = h.trades.length;

        // Category detection
        const catCounts = { Sports: 0, Crypto: 0, Politics: 0, General: 0 };
        const catKw = { Sports: ['nba','nfl','mlb','nhl','ufc','la liga','premier','playoff','vs','match','champion','game','soccer','tennis','f1'],
          Crypto: ['bitcoin','ethereum','btc','eth','crypto','solana','token','defi','coin','price'],
          Politics: ['trump','biden','election','president','congress','democrat','republican','vote','senate'] };
        const titleLow = (eventTitle || '').toLowerCase();
        let topCat = 'General';
        for (const [cat, kws] of Object.entries(catKw)) {
          if (kws.some(k => titleLow.includes(k))) { topCat = cat; break; }
        }

        return { ...h, prediction, tradeCount, topCategory: topCat, avgPrice };
      });

      if (m) { setHolders(sorted); setLoading(false); }
    })();
    return () => { m = false; };
  }, [markets, eventTitle, isMultiMarket]);

  const totalPages = Math.ceil(holders.length / PER_PAGE);
  const pageItems = holders.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-surface-3/50">
        <span className="text-base font-bold text-white flex items-center gap-2"><Users size={16} className="text-brand-400"/> Top 20 Holders</span>
        {/* BIG RED CLOSE BUTTON */}
        <button onClick={onClose} className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 font-bold text-sm transition-all">
          <X size={16}/> Close
        </button>
      </div>
      {loading ? <div className="p-5"><TableSkeleton rows={5}/></div> : holders.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">No holder data available for this market</div>
      ) : (<>
        <div className="divide-y divide-white/[0.04]">
          {pageItems.map((h, i) => {
            const rank = page * PER_PAGE + i + 1;
            return (
              <div key={h.address} className="px-5 py-4 hover:bg-white/[0.02] transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold flex-shrink-0 ${rank <= 3 ? 'bg-gradient-to-br from-amber-400 to-yellow-300 text-black' : 'bg-surface-4 text-slate-400'}`}>{rank}</span>
                  <span onClick={() => navigate(`/wallet/${h.address}`)} className="text-sm font-bold text-white hover:text-brand-300 cursor-pointer">{h.name || shortenAddress(h.address)}</span>
                  <span className="text-sm px-3 py-1 rounded-md font-bold bg-brand-500/20 text-brand-200 border border-brand-500/30">
                    Predicted: {h.prediction}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-md p-3">
                    <div className="flex items-center gap-1.5 mb-1"><DollarSign size={14} className="text-emerald-400"/><span className="text-[11px] font-bold text-emerald-400 uppercase">Invested</span></div>
                    <p className="text-xl font-mono font-black text-emerald-300">{formatUSD(h.totalUSDC)}</p>
                  </div>
                  <div className="bg-brand-500/10 border border-brand-500/25 rounded-md p-3">
                    <div className="flex items-center gap-1.5 mb-1"><Target size={14} className="text-brand-400"/><span className="text-[11px] font-bold text-brand-400 uppercase">Trades</span></div>
                    <p className="text-xl font-mono font-black text-brand-300">{h.tradeCount}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">@ avg {Math.round(h.avgPrice * 100)}¢</p>
                  </div>
                  <div className="bg-pink-500/10 border border-pink-500/25 rounded-md p-3">
                    <div className="flex items-center gap-1.5 mb-1"><Star size={14} className="text-pink-400"/><span className="text-[11px] font-bold text-pink-400 uppercase">Category</span></div>
                    <p className="text-lg font-bold text-pink-300">{h.topCategory}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-white/[0.06]">
            <button onClick={() => setPage(Math.max(0,page-1))} disabled={page===0} className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 disabled:opacity-20"><ChevronLeft size={16}/></button>
            {Array.from({length:totalPages},(_,p)=>(<button key={p} onClick={()=>setPage(p)} className={`w-8 h-8 rounded-md text-xs font-bold transition-all ${page===p?'bg-brand-600 text-white':'bg-surface-4 text-slate-400 hover:text-white'}`}>{p+1}</button>))}
            <button onClick={() => setPage(Math.min(totalPages-1,page+1))} disabled={page>=totalPages-1} className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 disabled:opacity-20"><ChevronRight size={16}/></button>
          </div>
        )}
      </>)}
    </div>
  );
}

// ─── MAIN ───
export default function TrendingMarkets() {
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [timeFilter, setTimeFilter] = useState('all');
  const [showSportsOnly, setShowSportsOnly] = useState(false);
  const [hideLiveSports, setHideLiveSports] = useState(true);
  const [expandedMarket, setExpandedMarket] = useState(null);

  useEffect(() => {
    let m = true; setLoading(true);
    fetchEvents({ limit: 100, order: 'volume24hr', ascending: false, active: true, closed: false })
      .then(d => { if (m) { setEvents(Array.isArray(d) ? d : []); setLoading(false); }}).catch(() => m && setLoading(false));
    return () => { m = false; };
  }, []);

  const processedEvents = useMemo(() => {
    const now = Date.now();
    return events.map(evt => {
      const markets = evt.markets || []; const fm = markets[0] || {};
      const title = (evt.title || fm.question || '').toLowerCase();
      const isSports = ['nba','nfl','mlb','nhl','premier league','champions league','ufc','la liga','serie a','bundesliga','f1','world cup','playoff','mls'].some(k => title.includes(k)) || /\bvs\.?\b/.test(title);
      const isMatch = /\bvs\.?\b|\b@\b/.test(title);
      const isLiveMatch = isSports && isMatch && !/winner|champion|mvp/i.test(title);
      const endTime = (evt.endDate || fm.endDate || fm.endDateIso) ? new Date(evt.endDate || fm.endDate || fm.endDateIso).getTime() : null;
      const startTime = (evt.startDate || fm.startDate) ? new Date(evt.startDate || fm.startDate).getTime() : null;
      let hasStarted = false, minutesUntilStart = null;
      if (isLiveMatch && startTime) { hasStarted = startTime < now; if (!hasStarted) minutesUntilStart = Math.round((startTime - now) / 60000); }
      else if (startTime && startTime > now) minutesUntilStart = Math.round((startTime - now) / 60000);
      let chartData = [];
      if (markets.length > 1) {
        chartData = markets.map((mk, idx) => { let p=[]; try{p=JSON.parse(mk.outcomePrices||'[]')}catch{} return{name:mk.groupItemTitle||mk.question||'?',value:Number(p[0]||0),pct:Math.round(Number(p[0]||0)*100),fill:COLORS[idx%COLORS.length]}; }).filter(o=>o.value>0).sort((a,b)=>b.value-a.value).slice(0,8);
      } else {
        let oc=[],pr=[]; try{oc=JSON.parse(fm.outcomes||'[]')}catch{} try{pr=JSON.parse(fm.outcomePrices||'[]')}catch{}
        chartData=oc.map((o,idx)=>({name:o,value:Number(pr[idx]||0),pct:Math.round(Number(pr[idx]||0)*100),fill:COLORS[idx%COLORS.length]}));
      }
      return { ...evt, firstMarket: fm, isSports, isLiveMatch, hasStarted, minutesUntilStart, endTime, chartData,
        volume24hr: Number(evt.volume24hr || fm.volume24hr || 0), liquidity: Number(evt.liquidity || fm.liquidity || 0) };
    });
  }, [events]);

  const filteredEvents = useMemo(() => {
    let r = processedEvents; const now = Date.now(), today = new Date();
    r = r.filter(e => {
      if (e.closed || e.firstMarket?.closed || e.active === false) return false;
      if (e.endTime && e.endTime < now) return false;
      const t=(e.title||'').toLowerCase();
      const mp={jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11};
      const m=t.match(/(?:by|before)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})/i);
      if(m){const mi=mp[m[1].toLowerCase().replace('.','')];if(mi!==undefined&&new Date(today.getFullYear(),mi,parseInt(m[2],10),23,59,59).getTime()<now)return false;}
      return true;
    });
    if (hideLiveSports) r=r.filter(e=>!(e.isLiveMatch&&e.hasStarted));
    if (showSportsOnly) r=r.filter(e=>e.isSports);
    if (timeFilter==='starting_soon'){r=r.filter(e=>e.minutesUntilStart>0&&e.minutesUntilStart<=120);r.sort((a,b)=>a.minutesUntilStart-b.minutesUntilStart);}
    else if(timeFilter==='ending_today'){const eod=new Date();eod.setHours(23,59,59,999);r=r.filter(e=>e.endTime&&e.endTime<=eod.getTime());}
    else if(timeFilter==='ending_this_week'){const eow=new Date();eow.setDate(eow.getDate()+7);r=r.filter(e=>e.endTime&&e.endTime<=eow.getTime());}
    else if(timeFilter==='long_term'){const eow=new Date();eow.setDate(eow.getDate()+7);r=r.filter(e=>!e.endTime||e.endTime>eow.getTime());}
    if(searchQuery.trim()){const q=searchQuery.toLowerCase();r=r.filter(e=>(e.title||'').toLowerCase().includes(q)||(e.firstMarket.question||'').toLowerCase().includes(q));}
    return r;
  }, [processedEvents, timeFilter, showSportsOnly, hideLiveSports, searchQuery]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Trending Markets" subtitle="Most-bet-on markets ranked by 24h volume" icon={TrendingUp}
        badge={<span className="badge-brand flex items-center gap-1"><Flame size={10}/> Hot</span>}/>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input type="text" placeholder="Search markets…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="input-field pl-9 h-10"/></div>
        <TabBar tabs={TIME_FILTERS} active={timeFilter} onChange={setTimeFilter}/>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showSportsOnly} onChange={e=>setShowSportsOnly(e.target.checked)} className="w-4 h-4 rounded bg-surface-3 border-white/10"/><span className="text-xs text-slate-400">Sports only</span></label>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={hideLiveSports} onChange={e=>setHideLiveSports(e.target.checked)} className="w-4 h-4 rounded bg-surface-3 border-white/10"/><span className="text-xs text-slate-400">Hide live matches</span></label>
        <span className="ml-auto text-xs text-slate-600">{filteredEvents.length} markets</span>
      </div>

      {loading ? <TableSkeleton rows={6}/> : filteredEvents.length === 0 ? <EmptyState icon={TrendingUp} title="No markets" description="Adjust filters."/> : (
        <div className="space-y-4">
          {filteredEvents.map((evt, i) => {
            const slug = evt.slug || evt.firstMarket.eventSlug;
            const isOpen = expandedMarket === evt.id;
            return (
              <div key={evt.id||i} className="animate-slide-up" style={{animationDelay:`${Math.min(i*15,120)}ms`}}>
                <div className="glass-card overflow-hidden">
                  <div className="p-4">
                    {/* TOP: Title left, Buttons right */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <span className={`w-9 h-9 rounded-md flex items-center justify-center text-sm font-bold ${i<3?'bg-gradient-to-br from-amber-400 to-yellow-300 text-black':'bg-surface-4 text-slate-500'}`}>{i+1}</span>
                          {evt.image && <img src={evt.image} alt="" className="w-10 h-10 rounded-md object-cover bg-surface-4"/>}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-white line-clamp-2">{evt.title || evt.firstMarket.question || 'Untitled'}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {evt.isSports && <span className="badge-cyan text-[10px]">Sports</span>}
                            {evt.minutesUntilStart > 0 && evt.minutesUntilStart <= 120 && <span className="badge bg-orange-500/15 text-orange-400 border border-orange-500/20 text-[10px]"><Timer size={9}/> {evt.minutesUntilStart}m</span>}
                          </div>
                        </div>
                      </div>
                      {/* BUTTONS — top right */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={()=>setExpandedMarket(isOpen?null:evt.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 ${isOpen?'bg-brand-600 text-white shadow-brand-600/30':'bg-brand-600/15 text-brand-300 border border-brand-500/25 hover:bg-brand-600/25'}`}>
                          <Users size={15}/> Top Holders
                        </button>
                        <a href={slug?polymarketMarketUrl(slug):'#'} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold bg-emerald-600/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-600/25 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
                          <ArrowUpRight size={15}/> Trade
                        </a>
                      </div>
                    </div>
                    {/* Vol + Liq badges */}
                    <div className="flex items-center gap-3 mt-3 ml-12">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                        <TrendingUp size={13} className="text-emerald-400"/><span className="text-[11px] font-bold text-emerald-400">Vol:</span><span className="text-sm font-mono font-black text-emerald-300">{formatUSD(evt.volume24hr)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                        <span className="text-[11px] font-bold text-cyan-400">Liq:</span><span className="text-sm font-mono font-black text-cyan-300">{formatUSD(evt.liquidity)}</span>
                      </span>
                    </div>
                  </div>
                  {/* CHART — full width below */}
                  {evt.chartData.length > 0 && (
                    <div className="px-4 pb-4" style={{height: Math.max(70, evt.chartData.length * 26 + 12)}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={evt.chartData} layout="vertical" margin={{top:0,right:45,left:5,bottom:0}}>
                          <XAxis type="number" hide domain={[0,'dataMax']}/>
                          <YAxis type="category" dataKey="name" width={90} tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>v.length>12?v.slice(0,11)+'…':v}/>
                          <Tooltip content={<ChartTooltip/>} cursor={{fill:'rgba(255,255,255,0.03)'}}/>
                          <Bar dataKey="value" radius={[0,4,4,0]} maxBarSize={20} label={{position:'right',fontSize:12,fill:'#e2e8f0',fontWeight:800,formatter:v=>`${Math.round(v*100)}%`}}>
                            {evt.chartData.map((d,idx)=><Cell key={idx} fill={d.fill}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                {isOpen && <div className="mt-2"><TopHoldersPanel markets={evt.markets} eventTitle={evt.title||evt.firstMarket.question||''} onClose={()=>setExpandedMarket(null)}/></div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
