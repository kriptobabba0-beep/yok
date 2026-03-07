import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../utils/store';
import {
  LayoutDashboard, TrendingUp, Crosshair, Zap, Trophy,
  Bookmark, Bell, X, ExternalLink, Menu, Award, Sparkles
} from 'lucide-react';
import NotificationPanel from './NotificationPanel';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', iconColor: 'text-blue-400' },
  { to: '/top-earners', icon: Trophy, label: 'Top Earners', iconColor: 'text-amber-400' },
  { to: '/high-stakes', icon: Zap, label: 'Hot Trades', iconColor: 'text-red-400' },
  { to: '/snipers', icon: Crosshair, label: 'Snipers', iconColor: 'text-emerald-400' },
  { to: '/trending', icon: TrendingUp, label: 'Trending Markets', iconColor: 'text-brand-400' },
  { to: '/new-markets', icon: Sparkles, label: 'New Markets', iconColor: 'text-purple-400' },
  { to: '/leaders', icon: Award, label: 'Categories & Leaders', iconColor: 'text-pink-400' },
  { to: '/tracker', icon: Bookmark, label: 'Wallet Tracker', iconColor: 'text-cyan-400' },
];

export default function Layout() {
  const { unreadCount } = useApp();
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-surface-1/95 backdrop-blur-xl border-b border-white/[0.06]">

        {/* ===== SINGLE ROW: Logo | Center Nav | Right actions ===== */}
        <div className="flex items-center h-14 px-4 lg:px-6">

          {/* LEFT — Logo */}
          <div className="flex items-center gap-2.5 w-40 flex-shrink-0">
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
          <nav className="hidden lg:flex items-center justify-center gap-0.5 flex-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label, iconColor }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200
                  ${isActive
                    ? 'bg-brand-600/15 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                  }
                `}
              >
                <Icon size={14} className={`flex-shrink-0 ${iconColor}`} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* RIGHT — Bell, Polymarket */}
          <div className="flex items-center gap-2 w-40 flex-shrink-0 justify-end">
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
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all">
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
            {NAV_ITEMS.map(({ to, icon: Icon, label, iconColor }) => (
              <NavLink key={to} to={to} end={to === '/'} onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-brand-600/15 text-white' : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'}`}>
                <Icon size={16} className={`flex-shrink-0 ${iconColor}`} /><span>{label}</span>
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
