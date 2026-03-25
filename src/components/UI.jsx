import React from 'react';
import { Star, ExternalLink, Copy, Check } from 'lucide-react';
import { useApp } from '../utils/store';
import { useAuth } from '../utils/auth';

// Loading skeleton
export function Skeleton({ className = '' }) {
  return <div className={`shimmer rounded-md ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

// Stat card
export function StatCard({ label, value, change, icon: Icon, color = 'brand' }) {
  const colorMap = {
    brand: 'from-brand-500/20 to-brand-500/5 text-brand-400',
    green: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    red: 'from-red-500/20 to-red-500/5 text-red-400',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400',
  };

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change !== undefined && (
            <p className={`text-xs mt-1 font-medium ${Number(change) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {Number(change) >= 0 ? '+' : ''}{change}%
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-md bg-gradient-to-br ${colorMap[color]}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}

// Favorite star button
export function FavoriteButton({ address, name, pseudonym, size = 18 }) {
  const { isFavorite, addFavorite, removeFavorite } = useApp();
  const { requireAuth } = useAuth();
  const fav = isFavorite(address);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (fav) {
          removeFavorite(address);
        } else {
          if (!requireAuth()) return; // Shows sign-in modal if not logged in
          addFavorite({ address, name, pseudonym });
        }
      }}
      className={`p-1.5 rounded-lg transition-all ${
        fav ? 'text-amber-400 bg-amber-500/15' : 'text-slate-600 hover:text-amber-400 hover:bg-amber-500/10'
      }`}
      title={fav ? 'Remove from favorites' : 'Sign in to add to favorites'}
    >
      <Star size={size} fill={fav ? 'currentColor' : 'none'} />
    </button>
  );
}

// External link button
export function ExtLink({ href, children, className = '' }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-brand-400 hover:text-brand-300 transition-colors ${className}`}
    >
      {children}
      <ExternalLink size={12} />
    </a>
  );
}

// Copy address button
export function CopyButton({ text, size = 14 }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
      title="Copy"
    >
      {copied ? <Check size={size} className="text-emerald-400" /> : <Copy size={size} />}
    </button>
  );
}

// Empty state
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={48} className="text-slate-600 mb-4" />}
      <h3 className="text-lg font-medium text-slate-300">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Tab bar
export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-surface-2/50 rounded-md p-1 border border-white/[0.04]">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            active === tab.value
              ? 'bg-brand-600/20 text-brand-300 border border-brand-500/20'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Probability bar
export function ProbBar({ value, label, showMinWidth = true }) {
  const pct = Math.round(Number(value) * 100);
  // Ensure very small values still show a visible sliver
  const displayWidth = pct > 0 && pct < 3 && showMinWidth ? 3 : pct;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-surface-4 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct >= 60 ? 'bg-emerald-500' : pct >= 30 ? 'bg-brand-400' : pct >= 10 ? 'bg-amber-500' : 'bg-red-400'
          }`}
          style={{ width: `${displayWidth}%`, minWidth: pct > 0 ? '6px' : '0' }}
        />
      </div>
      <span className="text-xs font-mono font-semibold text-slate-200 min-w-[32px] text-right">{pct}%</span>
      {label && <span className="text-xs text-slate-400 truncate max-w-[80px]">{label}</span>}
    </div>
  );
}

// Page header
export function PageHeader({ title, subtitle, badge, icon: Icon, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-3">
          {Icon && <Icon size={24} className="text-brand-400 flex-shrink-0" />}
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
    </div>
  );
}
