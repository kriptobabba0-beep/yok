import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGlobalTrades, fetchActivity, formatUSD, shortenAddress, polymarketProfileUrl, polymarketMarketUrl, timeAgo } from '../utils/api';
import { PageHeader, TableSkeleton, FavoriteButton, EmptyState } from '../components/UI';
import { generateBadges, BadgeList } from '../utils/badges';
import { Crosshair, AlertTriangle, ExternalLink, RefreshCw, Shield, Zap, ArrowUpRight, ArrowDownLeft, Loader } from 'lucide-react';

export default function Snipers() {
  const navigate = useNavigate();
  const [snipers, setSnipers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const detectSnipers = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setLoading(true);
    setSnipers([]);
    setProgress('Fetching recent trades…');

    try {
      // 1) Fetch recent trades at two price levels
      const [highTrades, medTrades] = await Promise.all([
        fetchGlobalTrades({ limit: 100, minUSD: 200 }),
        fetchGlobalTrades({ limit: 100, minUSD: 50 }),
      ]);

      if (!mountedRef.current) return;

      const allTrades = [
        ...(Array.isArray(highTrades) ? highTrades : []),
        ...(Array.isArray(medTrades) ? medTrades : []),
      ];

      if (allTrades.length === 0) {
        setProgress('No trades found');
        setLoading(false);
        setScanning(false);
        return;
      }

      // 2) Group by wallet — deduplicate by txHash, use plain objects only (no Set)
      const seenHashes = {};
      const walletMap = {};

      for (const t of allTrades) {
        const hash = t.transactionHash || '';
        if (hash && seenHashes[hash]) continue;
        if (hash) seenHashes[hash] = true;

        const addr = t.proxyWallet || '';
        if (!addr) continue;

        if (!walletMap[addr]) {
          walletMap[addr] = {
            address: addr,
            name: t.name || t.pseudonym || '',
            profileImage: t.profileImage || '',
            trades: [],
            totalStaked: 0,
            marketTitles: {},
          };
        }
        const entry = walletMap[addr];
        const amount = Number(t.size || 0) * Number(t.price || 0);
        entry.trades.push(t);
        entry.totalStaked += amount;
        entry.marketTitles[t.title || 'unknown'] = true;
      }

      // 3) Select candidates — skip wallets with many trades in our batch (clearly active)
      const candidates = Object.values(walletMap)
        .filter(w => w.trades.length <= 10)
        .sort((a, b) => b.totalStaked - a.totalStaked)
        .slice(0, 30);

      if (!mountedRef.current) return;
      setProgress(`Checking ${candidates.length} wallets…`);

      // 4) Check activity counts in parallel batches
      const BATCH = 6;
      const ACTIVITY_LIMIT = 30;
      const found = [];

      for (let b = 0; b < candidates.length; b += BATCH) {
        if (!mountedRef.current) return;
        const batch = candidates.slice(b, b + BATCH);
        setProgress(`Checking wallets ${b + 1}–${Math.min(b + BATCH, candidates.length)} of ${candidates.length}…`);

        const results = await Promise.allSettled(
          batch.map(w => fetchActivity(w.address, { limit: ACTIVITY_LIMIT }))
        );

        if (!mountedRef.current) return;

        for (let idx = 0; idx < batch.length; idx++) {
          const wallet = batch[idx];
          const res = results[idx];
          const hist = (res.status === 'fulfilled' && Array.isArray(res.value)) ? res.value : [];
          const count = hist.length;

          if (count < ACTIVITY_LIMIT && wallet.totalStaked >= 50) {
            const marketCount = Object.keys(wallet.marketTitles).length;
            const activityFactor = Math.max(0, (ACTIVITY_LIMIT - count) / ACTIVITY_LIMIT) * 40;
            const stakeFactor = Math.min(40, (wallet.totalStaked / 2000) * 40);
            const focusFactor = marketCount === 1 ? 20 : marketCount <= 3 ? 10 : 0;
            const riskScore = Math.min(100, Math.round(activityFactor + stakeFactor + focusFactor));

            if (riskScore >= 15) {
              found.push({
                address: wallet.address,
                name: wallet.name,
                profileImage: wallet.profileImage,
                trades: wallet.trades,
                totalStaked: wallet.totalStaked,
                marketCount,
                activityCount: count,
                riskScore,
              });
            }
          }
        }
      }

      if (!mountedRef.current) return;

      found.sort((a, b) => b.riskScore - a.riskScore);
      setSnipers(found);
      setProgress(found.length > 0 ? `Found ${found.length} suspicious wallet${found.length !== 1 ? 's' : ''}` : 'Scan complete');
    } catch (err) {
      console.error('Sniper detection error:', err);
      if (mountedRef.current) setProgress('Scan failed — try again');
    }

    if (mountedRef.current) {
      setLoading(false);
      setScanning(false);
    }
  }, [scanning]);

  useEffect(() => { detectSnipers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Snipers" subtitle="New or low-activity wallets placing high-stakes bets — possible insider signals"
        icon={Crosshair}
        badge={<span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center gap-1"><AlertTriangle size={10}/> Intel</span>}
      >
        <button onClick={detectSnipers} disabled={scanning} className="btn-primary text-xs flex items-center gap-1.5">
          <RefreshCw size={12} className={scanning ? 'animate-spin' : ''}/> {scanning ? 'Scanning…' : 'Rescan'}
        </button>
      </PageHeader>

      {/* Explanation */}
      <div className="glass-card p-4 border-l-4 border-l-amber-500/60">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-amber-400 flex-shrink-0 mt-0.5"/>
          <div>
            <h3 className="text-sm font-medium text-slate-200">How Sniper Detection Works</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Polyuserstats scans recent trades and checks each wallet's total on-chain activity. Wallets with fewer than 30
              total transactions that are placing meaningful bets get flagged. A higher risk score means the wallet is newer,
              the stake is larger, and the bets are focused on fewer markets.
              <strong className="text-amber-400/80"> This is algorithmic analysis, not a guarantee of insider trading.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      {scanning && (
        <div className="glass-card p-4 flex items-center gap-3">
          <Loader size={16} className="text-brand-400 animate-spin flex-shrink-0"/>
          <span className="text-sm text-slate-300">{progress}</span>
        </div>
      )}

      {/* Results */}
      {!scanning && loading ? <TableSkeleton rows={6}/> : null}

      {!scanning && !loading && snipers.length === 0 && (
        <EmptyState icon={Crosshair} title="No snipers detected" description="No suspicious new-wallet patterns found. Check back later or click Rescan."/>
      )}

      {!scanning && !loading && snipers.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{snipers.length} suspicious wallet{snipers.length !== 1 ? 's' : ''} found</p>
          {snipers.map((s, i) => {
            const riskColor = s.riskScore >= 70 ? 'red' : s.riskScore >= 40 ? 'amber' : 'brand';
            const riskBg = { red: 'bg-red-500/10 border-red-500/20', amber: 'bg-amber-500/10 border-amber-500/20', brand: 'bg-brand-500/10 border-brand-500/20' }[riskColor];

            return (
              <div key={s.address} className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                {/* Header */}
                <div className="flex items-center gap-4 p-5 border-b border-white/[0.04]">
                  {s.profileImage ? <img src={s.profileImage} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0"/> :
                   <div className="w-12 h-12 rounded-md bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center flex-shrink-0"><Crosshair size={20} className="text-white"/></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span onClick={() => navigate(`/wallet/${s.address}`)} className="text-base font-bold text-slate-200 hover:text-brand-300 cursor-pointer">{s.name || shortenAddress(s.address)}</span>
                      <span className={`badge text-[10px] border ${riskBg}`}>Risk: {s.riskScore}/100</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
                      <span>{s.activityCount} total txns</span>
                      <span>{s.marketCount} market{s.marketCount !== 1 ? 's' : ''}</span>
                      <span className="font-semibold text-white">{formatUSD(s.totalStaked)} staked</span>
                    </div>
                    {(() => { const b = generateBadges({ vol: s.totalStaked, trades: s.activityCount, marketCount: s.marketCount }); return b.length > 0 ? <div className="mt-2"><BadgeList badges={b} size="sm"/></div> : null; })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={polymarketProfileUrl(s.address)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-slate-500 hover:text-brand-400 transition-all"><ExternalLink size={14}/></a>
                    <FavoriteButton address={s.address} name={s.name} size={14}/>
                  </div>
                </div>

                {/* Risk bar */}
                <div className="px-5 py-3 bg-surface-1/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider w-12">Risk</span>
                    <div className="flex-1 h-2 bg-surface-4 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${s.riskScore >= 70 ? 'bg-red-500' : s.riskScore >= 40 ? 'bg-amber-500' : 'bg-brand-500'}`}
                        style={{ width: `${s.riskScore}%` }}/>
                    </div>
                    <span className={`text-sm font-mono font-bold min-w-[32px] text-right ${s.riskScore >= 70 ? 'text-red-400' : s.riskScore >= 40 ? 'text-amber-400' : 'text-brand-400'}`}>{s.riskScore}</span>
                  </div>
                </div>

                {/* Trades */}
                <div className="p-5 space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Trades</p>
                  {s.trades.length === 0 ? (
                    <p className="text-xs text-slate-600 italic">No trade details available</p>
                  ) : s.trades.slice(0, 5).map((t, j) => {
                    const amt = Number(t.size || 0) * Number(t.price || 0);
                    return (
                      <div key={`${t.transactionHash || j}-${j}`} className="flex items-center gap-3 p-3 rounded-md bg-surface-1/50 hover:bg-surface-1 transition-all">
                        <div className={`p-1.5 rounded-lg flex-shrink-0 ${t.side === 'BUY' ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                          {t.side === 'BUY' ? <ArrowUpRight size={14} className="text-emerald-400"/> : <ArrowDownLeft size={14} className="text-red-400"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{t.title || 'Unknown market'}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <span className={t.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>{t.side}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.outcome === 'Yes' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{t.outcome}</span>
                            <span>@ {Number(t.price || 0).toFixed(2)}</span>
                            {t.timestamp && <span>{timeAgo(t.timestamp)}</span>}
                          </div>
                        </div>
                        <span className="text-sm font-mono font-bold text-white flex-shrink-0">{formatUSD(amt)}</span>
                        {t.eventSlug && <a href={polymarketMarketUrl(t.eventSlug)} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-brand-400 flex-shrink-0" onClick={e => e.stopPropagation()}><ExternalLink size={12}/></a>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
