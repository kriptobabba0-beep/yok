import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../utils/store';
import { fetchProfile, fetchPositions, formatUSD, shortenAddress, polymarketProfileUrl, timeAgo } from '../utils/api';
import { PageHeader, EmptyState, CopyButton, StatCard } from '../components/UI';
import { Bookmark, Plus, Trash2, ExternalLink, Wallet, Eye, ArrowRight, Bell, Users, ArrowUpRight, ArrowDownLeft, CheckCheck, X } from 'lucide-react';

export default function WalletTracker() {
  const navigate = useNavigate();
  const { favorites, addFavorite, removeFavorite, notifications, markAllRead, clearNotifications, unreadCount } = useApp();
  const [addInput, setAddInput] = useState('');
  const [addError, setAddError] = useState('');
  const [walletData, setWalletData] = useState({});
  const [loadingWallets, setLoadingWallets] = useState({});

  useEffect(() => {
    favorites.forEach(fav => {
      if (walletData[fav.address]) return;
      setLoadingWallets(prev => ({ ...prev, [fav.address]: true }));
      Promise.allSettled([fetchProfile(fav.address), fetchPositions(fav.address)])
        .then(([prof, pos]) => {
          const profile = prof.status === 'fulfilled' ? prof.value : null;
          const posArr = pos.status === 'fulfilled' && Array.isArray(pos.value) ? pos.value : [];
          setWalletData(prev => ({ ...prev, [fav.address]: { profile, positionCount: posArr.length, totalValue: posArr.reduce((s, p) => s + Number(p.currentValue || 0), 0), totalPnl: posArr.reduce((s, p) => s + Number(p.cashPnl || 0), 0) } }));
          setLoadingWallets(prev => { const n = { ...prev }; delete n[fav.address]; return n; });
        });
    });
  }, [favorites]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const addr = addInput.trim();
    setAddError('');
    if (!addr) return;
    if (!addr.startsWith('0x') || addr.length < 10) { setAddError('Please enter a valid Ethereum address starting with 0x'); return; }
    if (favorites.find(f => f.address.toLowerCase() === addr.toLowerCase())) { setAddError('This wallet is already tracked'); return; }
    let profile = null;
    try { profile = await fetchProfile(addr); } catch {}
    addFavorite({ address: addr, name: profile?.name || profile?.userName || '', pseudonym: profile?.pseudonym || '', profileImage: profile?.profileImage || '' });
    setAddInput('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Wallet Tracker" subtitle="Track wallets and get notified when they trade"
        icon={Bookmark}
        badge={<span className="badge-brand"><Bookmark size={10}/> {favorites.length} tracked</span>}/>

      {/* Add wallet form */}
      <div className="glass-card p-4">
        <form onSubmit={handleAdd} className="flex gap-3">
          <div className="flex-1 relative"><Plus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input type="text" placeholder="Paste wallet address to track (0x…)" value={addInput} onChange={e => { setAddInput(e.target.value); setAddError(''); }} className="input-field pl-9 h-11"/>
          </div>
          <button type="submit" className="btn-primary flex items-center gap-1.5"><Eye size={14}/> Track</button>
        </form>
        {addError && <p className="text-xs text-red-400 mt-2">{addError}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Tracked Wallets" value={favorites.length} icon={Users} color="brand"/>
        <StatCard label="Total Notifications" value={notifications.length} icon={Bell} color="amber"/>
        <StatCard label="Combined Portfolio" value={formatUSD(Object.values(walletData).reduce((s, d) => s + (d.totalValue || 0), 0))} icon={Wallet} color="cyan"/>
      </div>

      {/* Two-column layout: Wallets + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT: Tracked Wallets (3/5 width) */}
        <div className="lg:col-span-3">
          {favorites.length === 0 ? <EmptyState icon={Bookmark} title="No wallets tracked" description="Add wallet addresses above to start tracking."/> : (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Tracked Wallets</h2>
              {favorites.map(fav => {
                const d = walletData[fav.address];
                const isLoading = !!loadingWallets[fav.address];
                const name = d?.profile?.name || d?.profile?.userName || fav.name || shortenAddress(fav.address);
                return (
                  <div key={fav.address} className="glass-card-hover p-4 cursor-pointer" onClick={() => navigate(`/wallet/${fav.address}`)}>
                    <div className="flex items-center gap-4">
                      {(d?.profile?.profileImage || fav.profileImage) ? <img src={d?.profile?.profileImage || fav.profileImage} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0"/> :
                       <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0"><Wallet size={20} className="text-white"/></div>}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-200">{name}</span>
                        <div className="flex items-center gap-2 mt-0.5"><code className="text-xs font-mono text-slate-600">{shortenAddress(fav.address)}</code><CopyButton text={fav.address} size={11}/></div>
                        {isLoading ? <div className="h-3 w-40 shimmer rounded mt-2"/> : d ? (
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                            <span>{d.positionCount} positions</span><span>Value: {formatUSD(d.totalValue)}</span>
                            <span className={Number(d.totalPnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}>P&L: {Number(d.totalPnl) >= 0 ? '+' : ''}{formatUSD(d.totalPnl)}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <a href={polymarketProfileUrl(fav.address)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-500 hover:text-brand-400 transition-all" title="View on Polymarket" onClick={e => e.stopPropagation()}><ExternalLink size={14}/></a>
                        <button onClick={e => { e.stopPropagation(); removeFavorite(fav.address); }}
                          className="p-2 rounded-xl bg-white/[0.04] hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-all"
                          title="Remove from favorites">
                          <Trash2 size={14}/>
                        </button>
                        <ArrowRight size={14} className="text-slate-600 ml-1"/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Notifications Feed (2/5 width) */}
        <div className="lg:col-span-2">
          <div className="glass-card overflow-hidden sticky top-20">
            {/* Notification header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-brand-400" />
                <span className="font-medium text-sm text-slate-200">Notifications</span>
                {unreadCount > 0 && (
                  <span className="badge-brand text-[10px]">{unreadCount} new</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={markAllRead} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-all" title="Mark all read">
                  <CheckCheck size={14} />
                </button>
                <button onClick={clearNotifications} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-red-400 transition-all" title="Clear all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Bell size={32} className="mb-3 opacity-40" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs mt-1 text-slate-600">Track wallets to receive trade alerts</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => navigate(`/wallet/${n.wallet}`)}
                    className={`
                      flex items-start gap-3 px-4 py-3 border-b border-white/[0.03] cursor-pointer
                      hover:bg-white/[0.03] transition-all
                      ${!n.read ? 'bg-brand-500/[0.03]' : ''}
                    `}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                      n.side === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      {n.side === 'BUY' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="font-medium text-slate-200 truncate">
                          {n.walletName ? (n.walletName.length > 16 ? shortenAddress(n.walletName) : n.walletName) : shortenAddress(n.wallet)}
                        </span>
                        <span className={`text-xs font-medium ${n.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {n.side}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{n.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        {n.size && <span>{formatUSD(n.size)}</span>}
                        {n.outcome && <span className="badge-brand text-[9px] py-0">{n.outcome}</span>}
                        <span className="ml-auto">{timeAgo(n.timestamp)}</span>
                      </div>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
