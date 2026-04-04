import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchProfile, fetchPositions, fetchAllPositions, fetchClosedPositions, fetchActivity, formatUSD, shortenAddress, polymarketProfileUrl, polymarketMarketUrl, timeAgo } from '../utils/api';
import { PageHeader, TabBar, TableSkeleton, FavoriteButton, CopyButton, ExtLink, EmptyState, ProbBar, StatCard, CardSkeleton } from '../components/UI';
import { generateBadges, BadgeList } from '../utils/badges';
import { Wallet, ArrowUpRight, ArrowDownLeft, ExternalLink, Activity, BarChart3, CheckCircle, XCircle, DollarSign } from 'lucide-react';

const TABS = [
  { value: 'positions', label: 'Open Positions' },
  { value: 'closed', label: 'Closed Positions' },
  { value: 'activity', label: 'All Activity' },
];

export default function WalletDetail() {
  const { address } = useParams();
  const [profile, setProfile] = useState(null);
  const [positions, setPositions] = useState([]);
  const [closedPositions, setClosedPositions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [tab, setTab] = useState('positions');
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  const [activityStats, setActivityStats] = useState(null);

  const [closedPnl, setClosedPnl] = useState({ total: 0, unrealized: 0 });

  useEffect(() => {
    let m = true;
    setLoading(true);
    Promise.allSettled([
      fetchProfile(address),
      fetchPositions(address),
      fetchAllPositions(address),
      fetchClosedPositions(address),
      fetchActivity(address, { limit: 100 }),
    ]).then(([p, pos, allPos, closed, act]) => {
        if (!m) return;
        setProfile(p.status === 'fulfilled' ? p.value : null);
        const posArr = pos.status === 'fulfilled' && Array.isArray(pos.value) ? pos.value : [];
        setPositions(posArr);

        // Use ALL positions (sizeThreshold=0) for P&L accuracy
        const allPosArr = allPos.status === 'fulfilled' && Array.isArray(allPos.value) ? allPos.value : [];

        // Closed positions: store for display + sum realized P&L
        const closedArr = closed.status === 'fulfilled' && Array.isArray(closed.value) ? closed.value : [];
        setClosedPositions(closedArr);
        const closedConditionIds = new Set(closedArr.map(p => p.conditionId).filter(Boolean));
        const realizedPnl = closedArr.reduce((s, p) => s + Number(p.realizedPnl || 0), 0);

        // Unrealized P&L: from ALL positions (sizeThreshold=0) NOT in closed-positions
        const unrealizedPnl = allPosArr.reduce((s, p) => {
          if (closedConditionIds.has(p.conditionId)) return s; // skip — already counted in closed
          const currentVal = Number(p.currentValue || 0);
          const cost = Number(p.size || 0) * Number(p.avgPrice || 0);
          return s + (currentVal - cost);
        }, 0);

        setClosedPnl({ total: realizedPnl, unrealized: unrealizedPnl });

        // Compute activity stats for badges
        const acts = act.status === 'fulfilled' && Array.isArray(act.value) ? act.value : [];
        const tradeLike = acts.filter(a => a.side && a.title);
        const totalVol = tradeLike.reduce((s, a) => s + (Number(a.usdcSize || 0) || Number(a.size || 0) * Number(a.price || 0)), 0);
        const marketSet = new Set(tradeLike.map(a => a.title).filter(Boolean));
        setActivityStats({ trades: tradeLike.length, vol: totalVol, marketCount: marketSet.size });
        setLoading(false);
      });
    return () => { m = false; };
  }, [address]);

  useEffect(() => {
    if (tab !== 'activity') return;
    let m = true;
    setTabLoading(true);
    fetchActivity(address, { limit: 100 })
      .then(d => { if (!m) return; setActivity(Array.isArray(d) ? d : []); setTabLoading(false); })
      .catch(() => m && setTabLoading(false));
    return () => { m = false; };
  }, [tab, address]);

  const displayName = profile?.name || profile?.pseudonym || profile?.userName || shortenAddress(address);
  const totalValue = positions.reduce((s, p) => s + Number(p.currentValue || 0), 0);
  // Total P&L = realized gains from closed positions + unrealized P&L from open-only positions
  // Exclude positions that appear in closed-positions to prevent double-counting
  const totalPnl = closedPnl.total + closedPnl.unrealized;

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
        <StatCard label="Total P&L" value={formatUSD(totalPnl)} icon={Activity} color={totalPnl >= 0 ? 'green' : 'red'}/>
      </div>}

      {/* Badges */}
      {!loading && (() => {
        const badges = generateBadges({
          pnl: totalPnl,
          positions: positions.length,
          vol: activityStats?.vol || 0,
          trades: activityStats?.trades || 0,
          marketCount: activityStats?.marketCount || 0,
        });
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
          const currentVal = Number(pos.currentValue || 0);
          const cost = Number(pos.size || 0) * Number(pos.avgPrice || 0);
          const pnl = currentVal - cost;
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

      {/* Closed Positions */}
      {tab === 'closed' && (loading ? <TableSkeleton rows={5}/> :
        closedPositions.length === 0 ? <EmptyState icon={CheckCircle} title="No closed positions" description="This wallet has no resolved positions."/> :
        <div className="space-y-2">{closedPositions.map((pos, i) => {
          const totalTraded = Number(pos.totalBought || 0);
          const realizedPnl = Number(pos.realizedPnl || 0);
          const won = realizedPnl > 0;
          const pctReturn = totalTraded > 0 ? ((realizedPnl / totalTraded) * 100).toFixed(2) : '0.00';
          return (
            <div key={i} className="glass-card-hover p-4">
              <div className="flex items-start gap-3">
                {pos.icon && <img src={pos.icon} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-surface-4"/>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${won ? 'text-emerald-400' : 'text-red-400'}`}>
                      {won ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                      {won ? 'Won' : 'Lost'}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-200 line-clamp-2 mt-1">{pos.title || 'Unknown'}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    <span className={`badge ${pos.outcome === 'Yes' ? 'badge-green' : 'badge-red'}`}>{pos.outcome || '—'}</span>
                    <span className="text-slate-500">Avg: {Number(pos.avgPrice || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">Total Traded</p>
                  <p className="text-sm font-mono text-slate-300">{formatUSD(totalTraded)}</p>
                  <p className={`text-sm font-mono font-bold mt-1 ${won ? 'text-emerald-400' : 'text-red-400'}`}>
                    {won ? '+' : ''}{formatUSD(realizedPnl)}
                    <span className="text-xs font-normal ml-1">({pctReturn}%)</span>
                  </p>
                </div>
              </div>
              {pos.eventSlug && <div className="mt-2 flex justify-end"><a href={polymarketMarketUrl(pos.eventSlug)} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">View on Polymarket <ExternalLink size={10}/></a></div>}
            </div>
          );
        })}</div>
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
