import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../utils/store';
import {
  LayoutDashboard, TrendingUp, Crosshair, Zap, Trophy,
  Bookmark, Bell, Search, X, ExternalLink, Menu
} from 'lucide-react';
import NotificationPanel from './NotificationPanel';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/top-earners', icon: Trophy, label: 'Top Earners' },
  { to: '/high-stakes', icon: Zap, label: 'High Stakes' },
  { to: '/snipers', icon: Crosshair, label: 'Snipers' },
  { to: '/trending', icon: TrendingUp, label: 'Trending Markets' },
  { to: '/tracker', icon: Bookmark, label: 'Wallet Tracker' },
];

export default function Layout() {
  const { unreadCount } = useApp();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (q.startsWith('0x') && q.length >= 10) navigate(`/wallet/${q}`);
    else navigate(`/trending?q=${encodeURIComponent(q)}`);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-surface-1/95 backdrop-blur-xl border-b border-white/[0.06]">

        {/* ===== SINGLE ROW: Logo | Center Nav | Right actions ===== */}
        <div className="flex items-center h-14 px-4 lg:px-6">

          {/* LEFT — Logo (fixed width so center stays centered) */}
          <div className="flex items-center gap-2.5 w-48 flex-shrink-0">
            <NavLink to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="22" width="6" height="14" rx="2" fill="white" opacity="0.6"/>
                  <rect x="13" y="14" width="6" height="22" rx="2" fill="white" opacity="0.8"/>
                  <rect x="22" y="8" width="6" height="28" rx="2" fill="white"/>
                  <rect x="31" y="4" width="6" height="32" rx="2" fill="white" opacity="0.9"/>
                  <circle cx="7" cy="18" r="3" fill="#a5b4fc"/><circle cx="16" cy="11" r="3" fill="#a5b4fc"/>
                  <circle cx="25" cy="6" r="3" fill="#a5b4fc"/><circle cx="34" cy="3" r="3" fill="#a5b4fc"/>
                  <line x1="7" y1="18" x2="16" y2="11" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="16" y1="11" x2="25" y2="6" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="25" y1="6" x2="34" y2="3" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-display font-bold text-base tracking-tight text-white hidden sm:inline">
                Poly<span className="text-brand-400">user</span><span className="text-slate-400 font-normal text-sm">stats</span>
              </span>
            </NavLink>
          </div>

          {/* CENTER — Navigation links (desktop) */}
          <nav className="hidden lg:flex items-center justify-center gap-1 flex-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-brand-600/15 text-brand-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }
                `}
              >
                <Icon size={14} className="flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* RIGHT — Search, Bell, Polymarket (fixed width to balance logo) */}
          <div className="flex items-center gap-2 w-48 flex-shrink-0 justify-end">
            {/* Search */}
            <form onSubmit={handleSearch} className="hidden md:block">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-8 pr-3 h-8 text-xs w-36 focus:w-52 transition-all duration-300"
                />
              </div>
            </form>

            {/* Bell */}
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-brand-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Polymarket */}
            <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
              Polymarket <ExternalLink size={10} />
            </a>

            {/* Mobile menu toggle */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-white/[0.06] px-3 py-2 space-y-0.5 bg-surface-1">
            {/* Mobile search */}
            <form onSubmit={(e) => { handleSearch(e); setMobileMenuOpen(false); }} className="mb-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Search markets or wallet…" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} className="input-field pl-9 pr-3 h-9 text-sm w-full"/>
              </div>
            </form>
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'} onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-brand-600/15 text-brand-300' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'}`}>
                <Icon size={16} className="flex-shrink-0" /><span>{label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Notification panel */}
      {showNotifs && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
          <div className="fixed top-14 right-4 z-50 w-96 max-h-[70vh] animate-slide-up">
            <NotificationPanel onClose={() => setShowNotifs(false)} />
          </div>
        </>
      )}

      {/* Page content */}
      <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
