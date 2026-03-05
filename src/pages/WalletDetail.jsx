import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchProfile, fetchPositions, fetchActivity, fetchTrades, formatUSD, shortenAddress, polymarketProfileUrl, polymarketMarketUrl, timeAgo } from '../utils/api';
import { PageHeader, TabBar, TableSkeleton, FavoriteButton, CopyButton, ExtLink, EmptyState, ProbBar, StatCard, CardSkeleton } from '../components/UI';
import { generateBadges, BadgeList } from '../utils/badges';
import { Wallet, ArrowUpRight, ArrowDownLeft, ExternalLink, Activity, BarChart3, FileText, DollarSign } from 'lucide-react';

const TABS = [
  { value: 'positions', label: 'Open Positions' },
  { value: 'trades', label: 'Trade History' },
  { value: 'activity', label: 'All Activity' },
];

export default function WalletDetail() {
  const { address } = useParams();
  const [profile, setProfile] = useState(null);
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [activity, setActivity] = useState([]);
  const [tab, setTab] = useState('positions');
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    let m = true;
    setLoading(true);
    Promise.allSettled([fetchProfile(address), fetchPositions(address)])
      .then(([p, pos]) => {
        if (!m) return;
        setProfile(p.status === 'fulfilled' ? p.value : null);
        setPositions(pos.status === 'fulfilled' && Array.isArray(pos.value) ? pos.value : []);
        setLoading(false);
      });
    return () => { m = false; };
  }, [address]);

  useEffect(() => {
    if (tab === 'positions') return;
    let m = true;
    setTabLoading(true);
    const p = tab === 'trades' ? fetchTrades({ user: address, limit: 100 }) : fetchActivity(address, { limit: 100 });
    p.then(d => { if (!m) return; if (tab === 'trades') setTrades(Array.isArray(d) ? d : []); else setActivity(Array.isArray(d) ? d : []); setTabLoading(false); })
     .catch(() => m && setTabLoading(false));
    return () => { m = false; };
  }, [tab, address]);

  const displayName = profile?.name || profile?.pseudonym || profile?.userName || shortenAddress(address);
  const totalValue = positions.reduce((s, p) => s + Number(p.currentValue || 0), 0);
  const totalPnl = positions.reduce((s, p) => s + Number(p.cashPnl || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <div className="glass-card p-6">
        {loading ? <div className="flex items-center gap-4"><div className="w-16 h-16 rounded-2xl shimmer"/><div className="space-y-2 flex-1"><div className="h-6 w-48 shimmer rounded-lg"/><div className="h-4 w-32 shimmer rounded-lg"/></div></div> : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {profile?.profileImage ? <img src={profile.profileImage} alt="" className="w-16 h-16 rounded-2xl object-cover"/> :
             <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center"><Wallet size={24} className="text-white"/></div>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3"><h1 className="text-xl font-bold text-white">{displayName}</h1><FavoriteButton address={address} name={profile?.name || profile?.userName}/></div>
              <div className="flex items-center gap-2 mt-1"><code className="text-xs font-mono text-slate-500">{address}</code><CopyButton text={address}/></div>
              {profile?.bio && <p className="text-sm text-slate-400 mt-2">{profile.bio}</p>}
            </div>
            <ExtLink href={polymarketProfileUrl(address)} className="btn-ghost text-xs">Polymarket Profile</ExtLink>
          </div>
        )}
      </div>

      {!loading && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Open Positions" value={positions.length} icon={BarChart3} color="brand"/>
        <StatCard label="Portfolio Value" value={formatUSD(totalValue)} icon={DollarSign} color="cyan"/>
        <StatCard label="Unrealized P&L" value={formatUSD(totalPnl)} icon={Activity} color={totalPnl >= 0 ? 'green' : 'red'}/>
      </div>}

      {/* Badges */}
      {!loading && (() => {
        const badges = generateBadges({ pnl: totalPnl, positions: positions.length });
        return badges.length > 0 ? (
          <div className="glass-card p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Achievements</p>
            <BadgeList badges={badges} size="sm" />
          </div>
        ) : null;
      })()}

      <TabBar tabs={TABS} active={tab} onChange={setTab}/>

      {/* Positions */}
      {tab === 'positions' && (loading ? <TableSkeleton rows={5}/> :
        positions.length === 0 ? <EmptyState icon={BarChart3} title="No open positions" description="This wallet has no active positions."/> :
        <div className="space-y-2">{positions.map((pos, i) => {
          const pnl = Number(pos.cashPnl || 0);
          return (
            <div key={i} className="glass-card-hover p-4">
              <div className="flex items-start gap-3">
                {pos.icon && <img src={pos.icon} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-surface-4"/>}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-slate-200 line-clamp-2">{pos.title || 'Unknown'}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    <span className={`badge ${pos.outcome === 'Yes' ? 'badge-green' : 'badge-red'}`}>{pos.outcome || '—'}</span>
                    <span className="text-slate-500">Size: {Number(pos.size || 0).toFixed(2)}</span>
                    <span className="text-slate-500">Avg: {Number(pos.avgPrice || 0).toFixed(3)}</span>
                    <span className="text-slate-500">Cur: {Number(pos.curPrice || 0).toFixed(3)}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-mono text-slate-300">{formatUSD(pos.currentValue)}</p>
                  <p className={`text-xs font-mono ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pnl >= 0 ? '+' : ''}{formatUSD(pnl)}</p>
                </div>
              </div>
              {pos.eventSlug && <div className="mt-2 flex justify-end"><a href={polymarketMarketUrl(pos.eventSlug)} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">View on Polymarket <ExternalLink size={10}/></a></div>}
            </div>
          );
        })}</div>
      )}

      {/* Trades */}
      {tab === 'trades' && (tabLoading ? <TableSkeleton rows={5}/> :
        trades.length === 0 ? <EmptyState icon={FileText} title="No trades found" description="No trade history for this wallet."/> :
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-white/[0.06]">
            <div className="col-span-1">Side</div><div className="col-span-4">Market</div><div className="col-span-2">Outcome</div><div className="col-span-2 text-right">Amount</div><div className="col-span-1 text-right">Price</div><div className="col-span-2 text-right">Time</div>
          </div>
          {trades.slice(0, 100).map((t, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] text-sm items-center">
              <div className="col-span-1"><span className={`inline-flex items-center gap-1 text-xs font-medium ${t.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                {t.side === 'BUY' ? <ArrowUpRight size={12}/> : <ArrowDownLeft size={12}/>}{t.side}</span></div>
              <div className="col-span-4 truncate text-slate-300 text-xs">{t.eventSlug ? <a href={polymarketMarketUrl(t.eventSlug)} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400">{t.title || 'Unknown'}</a> : t.title || 'Unknown'}</div>
              <div className="col-span-2"><span className={`badge text-[10px] ${t.outcome === 'Yes' ? 'badge-green' : 'badge-red'}`}>{t.outcome || '—'}</span></div>
              <div className="col-span-2 text-right font-mono text-slate-300">{formatUSD(Number(t.size || 0) * Number(t.price || 0))}</div>
              <div className="col-span-1 text-right font-mono text-slate-400">{Number(t.price || 0).toFixed(2)}</div>
              <div className="col-span-2 text-right text-xs text-slate-500">{t.timestamp ? timeAgo(t.timestamp) : '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Activity */}
      {tab === 'activity' && (tabLoading ? <TableSkeleton rows={5}/> :
        activity.length === 0 ? <EmptyState icon={Activity} title="No activity" description="No on-chain activity found."/> :
        <div className="space-y-2">{activity.slice(0, 100).map((a, i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-3">
            <div className={`p-2 rounded-md flex-shrink-0 ${a.type === 'TRADE' ? (a.side === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400') : a.type === 'REDEEM' ? 'bg-amber-500/15 text-amber-400' : 'bg-brand-500/15 text-brand-400'}`}>
              {a.type === 'TRADE' ? (a.side === 'BUY' ? <ArrowUpRight size={14}/> : <ArrowDownLeft size={14}/>) : <Activity size={14}/>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm"><span className="badge text-[10px] badge-brand">{a.type}</span>{a.side && <span className={`text-xs font-medium ${a.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{a.side}</span>}</div>
              <p className="text-xs text-slate-400 mt-1 truncate">{a.title || 'Unknown'}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-mono text-slate-300">{formatUSD(a.usdcSize || a.size)}</p>
              <p className="text-xs text-slate-600">{a.timestamp ? timeAgo(a.timestamp) : '—'}</p>
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
