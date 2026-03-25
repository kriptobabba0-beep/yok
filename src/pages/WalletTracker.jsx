import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../utils/store';
import { useAuth } from '../utils/auth';
import { fetchProfile, fetchPositions, formatUSD, shortenAddress, polymarketProfileUrl, timeAgo } from '../utils/api';
import { PageHeader, EmptyState, CopyButton, StatCard } from '../components/UI';
import { generateBadges, BadgeList } from '../utils/badges';
import { Bookmark, Plus, ExternalLink, Wallet, Eye, ArrowRight, Bell, Users, ArrowUpRight, ArrowDownLeft, CheckCheck, Trash2, Star, TrendingUp, Activity, LogIn } from 'lucide-react';

export default function WalletTracker() {
  const navigate = useNavigate();
  const { user, authLoading, signInWithGoogle } = useAuth();
  const { favorites, addFavorite, removeFavorite, notifications, markAllRead, clearNotifications, unreadCount } = useApp();
  const [addInput, setAddInput] = useState('');
  const [addError, setAddError] = useState('');
  const [walletData, setWalletData] = useState({});
  const [loadingWallets, setLoadingWallets] = useState({});
  const [notifFilter, setNotifFilter] = useState('all'); // all, buy, sell

  useEffect(() => {
    favorites.forEach(fav => {
      if (walletData[fav.address]) return;
      setLoadingWallets(prev => ({ ...prev, [fav.address]: true }));
      Promise.allSettled([fetchProfile(fav.address), fetchPositions(fav.address)])
        .then(([prof, pos]) => {
          const profile = prof.status === 'fulfilled' ? prof.value : null;
          const posArr = pos.status === 'fulfilled' && Array.isArray(pos.value) ? pos.value : [];
          setWalletData(prev => ({
            ...prev,
            [fav.address]: {
              profile,
              positionCount: posArr.length,
              totalValue: posArr.reduce((s, p) => s + Number(p.currentValue || 0), 0),
              totalPnl: posArr.reduce((s, p) => s + Number(p.cashPnl || 0), 0),
            }
          }));
          setLoadingWallets(prev => { const n = { ...prev }; delete n[fav.address]; return n; });
        });
    });
  }, [favorites]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const addr = addInput.trim();
    setAddError('');
    if (!addr) return;
    if (!addr.startsWith('0x') || addr.length < 10) { setAddError('Enter a valid Ethereum address starting with 0x'); return; }
    if (favorites.find(f => f.address.toLowerCase() === addr.toLowerCase())) { setAddError('Already tracked'); return; }
    let profile = null;
    try { profile = await fetchProfile(addr); } catch {}
    addFavorite({ address: addr, name: profile?.name || profile?.userName || '', pseudonym: profile?.pseudonym || '', profileImage: profile?.profileImage || '' });
    setAddInput('');
  };

  const filteredNotifs = notifications.filter(n => {
    if (notifFilter === 'buy') return n.side === 'BUY';
    if (notifFilter === 'sell') return n.side === 'SELL';
    return true;
  });

  const combinedPnl = Object.values(walletData).reduce((s, d) => s + (d.totalPnl || 0), 0);
  const combinedValue = Object.values(walletData).reduce((s, d) => s + (d.totalValue || 0), 0);

  // ============================================
  // Sign-in gate: require Google auth
  // ============================================
  if (authLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <PageHeader title="Wallet Tracker" subtitle="Track wallets, monitor trades, and get real-time alerts" icon={Bookmark} />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-5 animate-fade-in">
        <PageHeader title="Wallet Tracker" subtitle="Track wallets, monitor trades, and get real-time alerts" icon={Bookmark} />
        <div className="glass-card p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-5">
            <Bookmark size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Sign in to track wallets</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Sign in with Google to add wallets to your favorites, monitor trades in real-time, and get alerts. Your tracked wallets will sync across all your devices.
          </p>
          <button
            onClick={signInWithGoogle}
            className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-white text-gray-800 font-semibold text-sm hover:bg-gray-100 transition-all shadow-md mx-auto"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <p className="text-[11px] text-slate-600 mt-4">Free to use. Only required for wallet tracking.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Wallet Tracker" subtitle="Track wallets, monitor trades, and get real-time alerts"
        icon={Bookmark}
        badge={<span className="badge-brand"><Bookmark size={10} /> {favorites.length} tracked</span>} />

      {/* Add wallet */}
      <div className="glass-card p-4">
        <form onSubmit={handleAdd} className="flex gap-3">
          <div className="flex-1 relative">
            <Plus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Paste wallet address to track (0x…)" value={addInput}
              onChange={e => { setAddInput(e.target.value); setAddError(''); }} className="input-field pl-9 h-11" />
          </div>
          <button type="submit" className="btn-primary flex items-center gap-1.5"><Eye size={14} /> Track</button>
        </form>
        {addError && <p className="text-xs text-red-400 mt-2">{addError}</p>}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Tracked" value={favorites.length} icon={Users} color="brand" />
        <StatCard label="Alerts" value={notifications.length} icon={Bell} color="amber" />
        <StatCard label="Portfolio" value={formatUSD(combinedValue)} icon={Wallet} color="cyan" />
        <StatCard label="Combined P&L" value={`${combinedPnl >= 0 ? '+' : ''}${formatUSD(combinedPnl)}`} icon={TrendingUp}
          color={combinedPnl >= 0 ? 'green' : 'red'} />
      </div>

      {/* TWO-COLUMN: Wallets left, Alerts right */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT — Tracked Wallets (3/5) */}
        <div className="lg:col-span-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Star size={14} className="text-amber-400" /> Tracked Wallets
          </h2>
          {favorites.length === 0 ? (
            <EmptyState icon={Bookmark} title="No wallets tracked" description="Add wallet addresses above to start tracking." />
          ) : (
            <div className="space-y-3">
            {favorites.map(fav => {
              const d = walletData[fav.address];
              const isLoading = !!loadingWallets[fav.address];
              const name = d?.profile?.name || d?.profile?.userName || fav.name || shortenAddress(fav.address);
              const pnl = Number(d?.totalPnl || 0);

              return (
                <div key={fav.address} className="glass-card-hover p-4 cursor-pointer group" onClick={() => navigate(`/wallet/${fav.address}`)}>
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    {(d?.profile?.profileImage || fav.profileImage) ?
                      <img src={d?.profile?.profileImage || fav.profileImage} alt="" className="w-11 h-11 rounded-md object-cover flex-shrink-0" /> :
                      <div className="w-11 h-11 rounded-md bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
                        <Wallet size={18} className="text-white" />
                      </div>
                    }

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200 truncate">{name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-[10px] font-mono text-slate-600">{shortenAddress(fav.address)}</code>
                        <CopyButton text={fav.address} size={10} />
                      </div>
                      {isLoading ? <div className="h-3 w-32 shimmer rounded mt-1.5" /> : d ? (
                        <>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                            <span>{d.positionCount} pos</span>
                            <span>{formatUSD(d.totalValue)}</span>
                            <span className={pnl >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                              {pnl >= 0 ? '+' : ''}{formatUSD(pnl)}
                            </span>
                          </div>
                          {(() => { const b = generateBadges({ pnl, positions: d.positionCount }); return b.length > 0 ? <div className="mt-1.5"><BadgeList badges={b} size="sm"/></div> : null; })()}
                        </>
                      ) : null}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); removeFavorite(fav.address); }}
                        className="p-1.5 rounded-md bg-amber-500/10 hover:bg-red-500/15 text-amber-400 hover:text-red-400 transition-all"
                        title="Remove from tracking">
                        <Star size={14} fill="currentColor" />
                      </button>
                      <a href={polymarketProfileUrl(fav.address)} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-slate-500 hover:text-brand-400 transition-all"
                        onClick={e => e.stopPropagation()}>
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* RIGHT — Trade Alerts (2/5) */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity size={14} className="text-brand-400" /> Trade Alerts
              {unreadCount > 0 && <span className="badge-brand text-[10px]">{unreadCount} new</span>}
            </h2>
          <div className="flex items-center gap-2">
            {/* Filter tabs */}
            <div className="flex items-center gap-0.5 bg-surface-3 rounded-md p-0.5">
              {[
                { val: 'all', label: 'All' },
                { val: 'buy', label: 'Buy' },
                { val: 'sell', label: 'Sell' },
              ].map(f => (
                <button key={f.val} onClick={() => setNotifFilter(f.val)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    notifFilter === f.val ? 'bg-brand-600/20 text-brand-300' : 'text-slate-500 hover:text-slate-300'
                  }`}>{f.label}</button>
              ))}
            </div>
            <button onClick={markAllRead} className="p-1.5 rounded-md hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-all" title="Mark all read">
              <CheckCheck size={14} />
            </button>
            <button onClick={clearNotifications} className="p-1.5 rounded-md hover:bg-white/[0.06] text-slate-500 hover:text-red-400 transition-all" title="Clear all">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="glass-card overflow-hidden sticky top-20">
          {/* Rows */}
          {filteredNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Bell size={28} className="mb-3 opacity-40" />
              <p className="text-sm">No alerts yet</p>
              <p className="text-xs mt-1 text-slate-600">Track wallets to receive trade alerts</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03] max-h-[65vh] overflow-y-auto">
              {filteredNotifs.map(n => (
                <div key={n.id} onClick={() => navigate(`/wallet/${n.wallet}`)}
                  className={`flex items-start gap-2 px-3 py-2.5 hover:bg-white/[0.02] cursor-pointer transition-all ${!n.read ? 'bg-brand-500/[0.02]' : ''}`}>
                  <div className={`p-1 rounded-md flex-shrink-0 mt-0.5 ${n.side === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {n.side === 'BUY' ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-200 truncate">{n.walletName ? (n.walletName.length > 16 ? shortenAddress(n.walletName) : n.walletName) : shortenAddress(n.wallet)}</span>
                      <span className={`text-[9px] font-bold ${n.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{n.side}</span>
                      {n.outcome && <span className={`text-[8px] px-1 rounded-sm font-bold ${n.outcome === 'Yes' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{n.outcome}</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{n.title || 'Unknown'}</p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-[10px] font-mono font-bold text-slate-300">{n.size ? formatUSD(n.size) : ''}</span>
                    <span className="text-[9px] text-slate-600">{timeAgo(n.timestamp)}</span>
                  </div>
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0 mt-1.5"/>}
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
