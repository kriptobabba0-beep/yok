import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLeaderboard, formatUSD, shortenAddress } from '../utils/api';
import { PageHeader, TabBar, TableSkeleton, FavoriteButton, EmptyState } from '../components/UI';
import { Trophy, Crown } from 'lucide-react';

// Maps to timePeriod enum: DAY, WEEK, MONTH, ALL
const TIME_TABS = [
  { value: 'DAY', label: 'Today' },
  { value: 'WEEK', label: 'This Week' },
  { value: 'MONTH', label: 'This Month' },
  { value: 'ALL', label: 'All Time' },
];
const RANK_TABS = [
  { value: 'PNL', label: 'By Profit' },
  { value: 'VOL', label: 'By Volume' },
];

export default function TopEarners() {
  const navigate = useNavigate();
  const [timePeriod, setTimePeriod] = useState('DAY');
  const [orderBy, setOrderBy] = useState('PNL');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchLeaderboard({ timePeriod, orderBy, limit: 50 })
      .then(d => { if (mounted) { setData(Array.isArray(d) ? d : []); setLoading(false); } })
      .catch(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [timePeriod, orderBy]);

  const windowLabel = TIME_TABS.find(t => t.value === timePeriod)?.label || '';
  const windowDescription = {
    DAY: 'Rankings based on the last 24 hours',
    WEEK: 'Rankings based on the last 7 days',
    MONTH: 'Rankings based on the last 30 days',
    ALL: 'Rankings since Polymarket launched (cumulative all-time data)',
  }[timePeriod] || '';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Top Earners"
        subtitle={`Highest ${orderBy === 'PNL' ? 'profit' : 'volume'} wallets — ${windowLabel}`}
        badge={<span className="badge-amber"><Crown size={12}/> Leaderboard</span>}
        icon={Trophy}
      >
        <TabBar tabs={RANK_TABS} active={orderBy} onChange={setOrderBy} />
      </PageHeader>

      <TabBar tabs={TIME_TABS} active={timePeriod} onChange={setTimePeriod} />

      {/* Time period explanation */}
      <p className="text-xs text-slate-500 -mt-3">{windowDescription}</p>

      {loading ? <TableSkeleton rows={10}/> :
       data.length === 0 ? <EmptyState icon={Trophy} title="No data available" description="Leaderboard data could not be loaded. Try again later."/> : (
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-white/[0.06]">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Trader</div>
            <div className="col-span-3 text-right">Profit/Loss</div>
            <div className="col-span-3 text-right">Volume</div>
            <div className="col-span-1"></div>
          </div>
          {data.map((u, i) => {
            const addr = u.proxyWallet || '';
            const name = u.userName || shortenAddress(addr);
            return (
              <div key={addr || i} onClick={() => addr && navigate(`/wallet/${addr}`)}
                className="grid grid-cols-12 gap-4 px-4 py-3.5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.03] cursor-pointer transition-all items-center">
                <div className="col-span-1">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-slate-400/20 text-slate-300' : i === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-surface-4 text-slate-500'
                  }`}>{u.rank || i + 1}</span>
                </div>
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  {u.profileImage ? <img src={u.profileImage} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0"/> :
                   <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex-shrink-0"/>}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{name}</p>
                    <p className="text-xs text-slate-600 font-mono">{shortenAddress(addr)}</p>
                  </div>
                </div>
                <div className="col-span-3 text-right">
                  <span className={`text-sm font-mono font-semibold ${Number(u.pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {Number(u.pnl) >= 0 ? '+' : ''}{formatUSD(u.pnl)}
                  </span>
                </div>
                <div className="col-span-3 text-right"><span className="text-sm font-mono text-slate-400">{formatUSD(u.vol)}</span></div>
                <div className="col-span-1 flex justify-end">
                  <FavoriteButton address={addr} name={u.userName} size={14}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
