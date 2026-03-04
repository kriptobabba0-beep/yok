import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGlobalTrades, formatUSD, shortenAddress, polymarketProfileUrl, polymarketMarketUrl, timeAgo } from '../utils/api';
import { PageHeader, TableSkeleton, FavoriteButton, EmptyState } from '../components/UI';
import { Zap, ArrowUpRight, ArrowDownLeft, ExternalLink, RefreshCw, Filter, User } from 'lucide-react';

const MIN_STAKE_OPTIONS = [
  { value: 0, label: 'All' },
  { value: 100, label: '$100+' },
  { value: 500, label: '$500+' },
  { value: 1000, label: '$1K+' },
  { value: 5000, label: '$5K+' },
  { value: 10000, label: '$10K+' },
];

export default function HighStakes() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minStake, setMinStake] = useState(100);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  const loadTrades = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await fetchGlobalTrades({ limit: 100, minUSD: minStake > 0 ? minStake : 0 });
      const arr = Array.isArray(data) ? data : [];
      // Only show BUY trades (open positions) — hide SELL/closed
      const filtered = arr.filter(t => t.side === 'BUY');
      setTrades(filtered);
    } catch (err) {
      console.error('High stakes load error:', err);
    }
    setLoading(false);
  }, [minStake]);

  useEffect(() => { loadTrades(true); }, [loadTrades]);

  useEffect(() => {
    if (autoRefresh) intervalRef.current = setInterval(() => loadTrades(false), 15000);
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, loadTrades]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="High Stakes Live" subtitle="Real-time feed of high-value open positions on Polymarket"
        icon={Zap}
        badge={<span className="badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/></span> LIVE
        </span>}
      >
        <button onClick={() => setAutoRefresh(!autoRefresh)}
          className={`btn-ghost text-xs flex items-center gap-1.5 ${autoRefresh ? 'text-emerald-400 border-emerald-500/20' : ''}`}>
          <RefreshCw size={12} className={autoRefresh ? 'animate-spin' : ''} style={{ animationDuration: '3s' }}/>
          {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
        </button>
      </PageHeader>

      {/* Stake filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-slate-500"/><span className="text-xs text-slate-500 mr-1">Min stake:</span>
        {MIN_STAKE_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setMinStake(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              minStake === opt.value ? 'bg-brand-600/20 text-brand-300 border border-brand-500/20' : 'bg-surface-3 text-slate-500 hover:text-slate-300 border border-white/[0.04]'
            }`}>{opt.label}</button>
        ))}
        <span className="ml-auto text-xs text-slate-600">{trades.length} open positions shown</span>
      </div>

      {loading ? <TableSkeleton rows={8}/> :
       trades.length === 0 ? <EmptyState icon={Zap} title="No high-stakes positions found" description={`No open positions above ${formatUSD(minStake)} found recently. Try lowering the minimum stake filter.`}/> : (
        <div className="space-y-4">
          {trades.map((t, i) => {
            const amount = Number(t.size || 0) * Number(t.price || 0);
            const addr = t.proxyWallet || '';
            const name = t.name || t.pseudonym || shortenAddress(addr);
            const marketTitle = t.title || 'Unknown market';
            const pricePct = Math.round(Number(t.price || 0) * 100);
            const tier = amount >= 10000 ? 'mega' : amount >= 5000 ? 'high' : amount >= 1000 ? 'mid' : 'normal';

            const cardBorder = {
              mega: 'border-l-4 border-l-red-500',
              high: 'border-l-4 border-l-amber-500',
              mid: 'border-l-4 border-l-brand-500',
              normal: 'border-l-4 border-l-surface-4',
            }[tier];
            const amountColor = {
              mega: 'text-red-400', high: 'text-amber-400', mid: 'text-brand-300', normal: 'text-white',
            }[tier];

            return (
              <div key={`${t.transactionHash || ''}-${i}`}
                className={`glass-card-hover p-6 ${cardBorder} animate-slide-up`}
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>

                {/* Row 1: Market title — BIG and prominent */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-xl font-bold text-white leading-snug line-clamp-2 flex-1">
                    {marketTitle}
                  </h3>
                  <div className="flex-shrink-0 text-right">
                    <span className={`text-3xl font-mono font-bold ${amountColor}`}>
                      {formatUSD(amount)}
                    </span>
                    {tier === 'mega' && <div className="mt-1"><span className="text-[11px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">WHALE</span></div>}
                    {tier === 'high' && <div className="mt-1"><span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">HIGH STAKE</span></div>}
                  </div>
                </div>

                {/* Row 2: Trade description — clear readable sentence, LARGER */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="p-2 rounded-xl bg-emerald-500/15 flex-shrink-0">
                    <ArrowUpRight size={18} className="text-emerald-400"/>
                  </div>
                  <p className="text-base text-slate-200 leading-relaxed">
                    <span onClick={e => { e.stopPropagation(); addr && navigate(`/wallet/${addr}`); }}
                      className="font-bold text-brand-300 hover:text-brand-200 cursor-pointer transition-colors">{name}</span>
                    {' '}
                    <span className="font-semibold text-emerald-400">bought</span>
                    {' '}
                    <span className="font-semibold text-white">{Number(t.size || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    {' '}
                    <span className="text-slate-400">shares of</span>
                    {' '}
                    <span className={`font-bold inline-flex items-center px-2.5 py-1 rounded-lg text-sm ${
                      t.outcome === 'Yes' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' :
                      t.outcome === 'No' ? 'bg-red-500/15 text-red-300 border border-red-500/20' :
                      'bg-brand-500/15 text-brand-300 border border-brand-500/20'
                    }`}>{t.outcome || '—'}</span>
                    {' '}
                    <span className="text-slate-500">at {pricePct}¢ each</span>
                  </p>
                </div>

                {/* Row 3: Footer metadata */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5 font-mono">{shortenAddress(addr)}</span>
                    {t.timestamp && <span>{timeAgo(t.timestamp)}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {t.eventSlug && (
                      <a href={polymarketMarketUrl(t.eventSlug)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-brand-300 transition-all text-xs font-medium"
                        onClick={e => e.stopPropagation()}>
                        View market <ExternalLink size={12}/>
                      </a>
                    )}
                    <a href={polymarketProfileUrl(addr)} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-500 hover:text-brand-400 transition-all"
                      title="View profile" onClick={e => e.stopPropagation()}>
                      <User size={14}/>
                    </a>
                    <FavoriteButton address={addr} name={t.name} pseudonym={t.pseudonym} size={14}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
