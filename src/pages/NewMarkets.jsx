import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { fetchEvents, formatUSD, polymarketMarketUrl } from '../utils/api';
import { PageHeader, TableSkeleton, EmptyState } from '../components/UI';
import { Sparkles, ArrowUpRight, TrendingUp, Activity } from 'lucide-react';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#ef4444','#8b5cf6','#f97316'];

export default function NewMarkets() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const intervalRef = useRef(null);
  const seenIds = useRef(new Set());

  const loadMarkets = useCallback(async (initial) => {
    try {
      const data = await fetchEvents({ limit: 30, order: 'createdAt', ascending: false, active: true, closed: false });
      const arr = Array.isArray(data) ? data : [];
      if (initial) {
        arr.forEach(e => seenIds.current.add(e.id));
        setEvents(arr);
        setLoading(false);
      } else {
        setEvents(prev => {
          const fresh = arr.filter(e => !seenIds.current.has(e.id));
          fresh.forEach(e => { seenIds.current.add(e.id); e._isNew = true; });
          if (fresh.length === 0) return prev;
          const cleared = prev.map(e => e._isNew ? { ...e, _isNew: false } : e);
          return [...fresh, ...cleared];
        });
      }
    } catch {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => { loadMarkets(true); }, [loadMarkets]);
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (isLive) intervalRef.current = setInterval(() => loadMarkets(false), 30000);
    return () => clearInterval(intervalRef.current);
  }, [isLive, loadMarkets]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="New Markets" subtitle="Recently created prediction markets on Polymarket" icon={Sparkles}
        badge={isLive ? <span className="badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/></span> Live
        </span> : null}>
        <button onClick={() => setIsLive(l => !l)}
          className={`btn-ghost text-xs flex items-center gap-1.5 ${isLive ? 'text-emerald-400 border-emerald-500/20' : ''}`}>
          {isLive ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
        </button>
      </PageHeader>

      <p className="text-[10px] text-slate-600">Auto-checks for new markets every 30 seconds.</p>

      {loading ? <TableSkeleton rows={6}/> : events.length === 0 ? <EmptyState icon={Sparkles} title="No new markets" description="Check back soon."/> : (
        <div className="space-y-4">
          {events.map((evt, i) => {
            const markets = evt.markets || []; const fm = markets[0] || {};
            const slug = evt.slug || fm.eventSlug;
            let chartData = [];
            if (markets.length > 1) {
              chartData = markets.map((mk, idx) => { let p=[]; try{p=JSON.parse(mk.outcomePrices||'[]')}catch{} return{name:mk.groupItemTitle||mk.question||'?',value:Number(p[0]||0),pct:Math.round(Number(p[0]||0)*100),fill:COLORS[idx%COLORS.length]}; }).filter(o=>o.value>0).sort((a,b)=>b.value-a.value).slice(0,8);
            } else {
              let oc=[],pr=[]; try{oc=JSON.parse(fm.outcomes||'[]')}catch{} try{pr=JSON.parse(fm.outcomePrices||'[]')}catch{}
              chartData=oc.map((o,idx)=>({name:o,value:Number(pr[idx]||0),pct:Math.round(Number(pr[idx]||0)*100),fill:COLORS[idx%COLORS.length]}));
            }
            return (
              <div key={evt.id||i} className={`glass-card overflow-hidden animate-slide-up ${evt._isNew ? 'border border-brand-500/30 bg-brand-500/[0.03]' : ''}`}
                style={{animationDelay:`${Math.min(i*15,120)}ms`}}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className={`w-9 h-9 rounded-md flex items-center justify-center text-sm font-bold flex-shrink-0 ${i<3?'bg-gradient-to-br from-brand-400 to-brand-600 text-white':'bg-surface-4 text-slate-500'}`}>{i+1}</span>
                      {evt.image && <img src={evt.image} alt="" className="w-10 h-10 rounded-md object-cover bg-surface-4"/>}
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-white line-clamp-2">{evt.title || fm.question || 'Untitled'}</h3>
                        {evt._isNew && <span className="badge bg-brand-500/15 text-brand-300 border border-brand-500/20 text-[10px] mt-1">NEW</span>}
                      </div>
                    </div>
                    <a href={slug?polymarketMarketUrl(slug):'#'} target="_blank" rel="noopener noreferrer"
                      className="btn-pulse-green flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold bg-emerald-600/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-600/25 hover:-translate-y-0.5 transition-all flex-shrink-0">
                      <ArrowUpRight size={15}/> Trade
                    </a>
                  </div>
                  <div className="flex items-center gap-3 mt-3 ml-12">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                      <TrendingUp size={13} className="text-emerald-400"/><span className="text-[11px] font-bold text-emerald-400">Vol:</span><span className="text-sm font-mono font-black text-emerald-300">{formatUSD(evt.volume24hr || fm.volume24hr || 0)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                      <span className="text-[11px] font-bold text-cyan-400">Liq:</span><span className="text-sm font-mono font-black text-cyan-300">{formatUSD(evt.liquidity || fm.liquidity || 0)}</span>
                    </span>
                  </div>
                </div>
                {chartData.length > 0 && (
                  <div className="px-4 pb-4" style={{height: Math.max(70, chartData.length * 26 + 12)}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{top:0,right:45,left:5,bottom:0}}>
                        <XAxis type="number" hide domain={[0,'dataMax']}/>
                        <YAxis type="category" dataKey="name" width={90} tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>v.length>12?v.slice(0,11)+'…':v}/>
                        <Bar dataKey="value" radius={[0,4,4,0]} maxBarSize={20} label={{position:'right',fontSize:12,fill:'#e2e8f0',fontWeight:800,formatter:v=>`${Math.round(v*100)}%`}}>
                          {chartData.map((d,idx)=><Cell key={idx} fill={d.fill}/>)}
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
  );
}
