import React from 'react';
import { Crown, Award, Trophy, TrendingUp, Zap, Star, Shield, Flame, Target, Gem, Clock, BarChart3, Coins, Heart, Rocket, Eye } from 'lucide-react';

export function generateBadges({ rank, category, timePeriod, pnl, vol, trades, winRate, daysSinceFirst, positions, marketCount } = {}) {
  const badges = [];
  const r = rank || 999;
  const pnlNum = Number(pnl || 0);
  const volNum = Number(vol || 0);
  const tradeNum = Number(trades || 0);
  const wr = Number(winRate || 0);
  const days = Number(daysSinceFirst || 0);
  const posNum = Number(positions || 0);
  const mkts = Number(marketCount || 0);

  // RANK
  if (r === 1 && category) badges.push({ text: `#1 ${category}`, tip: `Ranked #1 in ${category} by profit`, bg: 'bg-gradient-to-r from-amber-400 to-yellow-300', fg: 'text-black', icon: Crown, p: 100 });
  else if (r === 2 && category) badges.push({ text: `#2 ${category}`, tip: `Ranked #2 in ${category}`, bg: 'bg-gradient-to-r from-slate-300 to-slate-200', fg: 'text-black', icon: Award, p: 99 });
  else if (r === 3 && category) badges.push({ text: `#3 ${category}`, tip: `Ranked #3 in ${category}`, bg: 'bg-gradient-to-r from-amber-700 to-amber-500', fg: 'text-white', icon: Award, p: 98 });
  else if (r <= 5 && category) badges.push({ text: `Top 5 ${category}`, tip: `Top 5 earner in ${category}`, bg: 'bg-brand-600/20', fg: 'text-brand-300', border: 'border-brand-500/30', p: 90 });
  else if (r <= 10 && category) badges.push({ text: `Top 10 ${category}`, tip: `Top 10 earner in ${category}`, bg: 'bg-brand-500/15', fg: 'text-brand-400', border: 'border-brand-500/20', p: 85 });
  else if (r <= 25 && category) badges.push({ text: `Top 25 ${category}`, tip: `Among the top 25 earners in ${category}`, bg: 'bg-cyan-500/15', fg: 'text-cyan-400', border: 'border-cyan-500/20', p: 80 });
  else if (r <= 50 && category) badges.push({ text: `Top 50 ${category}`, tip: `Top 50 earner in ${category}`, bg: 'bg-surface-4', fg: 'text-slate-300', border: 'border-white/10', p: 70 });

  // TIME-BASED
  if (timePeriod === 'DAY' && r <= 3) badges.push({ text: `#${r} Today`, tip: `Ranked #${r} earner in the last 24 hours`, bg: 'bg-emerald-500/15', fg: 'text-emerald-400', border: 'border-emerald-500/20', icon: Flame, p: 95 });
  if (timePeriod === 'DAY' && r > 3 && r <= 10) badges.push({ text: 'Top 10 Today', tip: 'Among the top 10 earners today', bg: 'bg-emerald-500/10', fg: 'text-emerald-300', border: 'border-emerald-500/15', p: 75 });
  if (timePeriod === 'ALL' && r <= 5) badges.push({ text: 'All-Time Legend', tip: 'Top 5 all-time earner since Polymarket launched', bg: 'bg-gradient-to-r from-purple-600 to-pink-500', fg: 'text-white', icon: Gem, p: 97 });
  if (timePeriod === 'ALL' && r > 5 && r <= 20) badges.push({ text: 'All-Time Elite', tip: 'Top 20 all-time earner', bg: 'bg-purple-500/15', fg: 'text-purple-400', border: 'border-purple-500/20', p: 82 });
  if (timePeriod === 'WEEK' && category && r <= 10) badges.push({ text: `Weekly ${category} Star`, tip: `Top 10 weekly earner in ${category}`, bg: 'bg-sky-500/15', fg: 'text-sky-400', border: 'border-sky-500/20', icon: Star, p: 76 });
  if (timePeriod === 'MONTH' && category && r <= 5) badges.push({ text: `Monthly ${category} Elite`, tip: `Top 5 monthly earner in ${category}`, bg: 'bg-gradient-to-r from-sky-500 to-blue-600', fg: 'text-white', p: 89 });

  // P&L
  if (pnlNum >= 1000000) badges.push({ text: 'Millionaire', tip: 'Over $1M in cumulative profit', bg: 'bg-gradient-to-r from-amber-500 to-orange-500', fg: 'text-black', icon: Gem, p: 96 });
  else if (pnlNum >= 500000) badges.push({ text: '$500K+ Profit', tip: 'Earned over $500K in profit', bg: 'bg-amber-500/15', fg: 'text-amber-400', border: 'border-amber-500/20', icon: TrendingUp, p: 88 });
  else if (pnlNum >= 100000) badges.push({ text: '$100K+ Profit', tip: 'Earned over $100K in profit', bg: 'bg-amber-500/10', fg: 'text-amber-300', border: 'border-amber-500/15', p: 78 });
  else if (pnlNum >= 10000) badges.push({ text: '$10K+ Profit', tip: 'Earned over $10K in profit', bg: 'bg-surface-4', fg: 'text-amber-300', border: 'border-white/8', p: 60 });

  // VOLUME
  if (volNum >= 10000000) badges.push({ text: '$10M+ Volume', tip: 'Over $10M total trading volume', bg: 'bg-gradient-to-r from-cyan-500 to-blue-500', fg: 'text-white', icon: BarChart3, p: 92 });
  else if (volNum >= 1000000) badges.push({ text: '$1M+ Volume', tip: 'Over $1M total trading volume', bg: 'bg-cyan-500/15', fg: 'text-cyan-400', border: 'border-cyan-500/20', icon: TrendingUp, p: 77 });
  else if (volNum >= 100000) badges.push({ text: '$100K+ Volume', tip: 'Over $100K total trading volume', bg: 'bg-surface-4', fg: 'text-cyan-300', border: 'border-white/8', p: 55 });

  // TRADES
  if (tradeNum >= 5000) badges.push({ text: '5000+ Trades', tip: 'Made over 5,000 predictions on Polymarket', bg: 'bg-gradient-to-r from-pink-600 to-rose-500', fg: 'text-white', icon: Zap, p: 87 });
  else if (tradeNum >= 1000) badges.push({ text: '1000+ Trades', tip: 'Made over 1,000 predictions', bg: 'bg-pink-500/15', fg: 'text-pink-400', border: 'border-pink-500/20', icon: Zap, p: 73 });
  else if (tradeNum >= 500) badges.push({ text: '500+ Trades', tip: '500+ total predictions placed', bg: 'bg-pink-500/10', fg: 'text-pink-300', border: 'border-pink-500/15', p: 62 });
  else if (tradeNum >= 250) badges.push({ text: '250+ Trades', tip: '250+ total predictions placed', bg: 'bg-surface-4', fg: 'text-pink-300', border: 'border-white/8', p: 50 });
  else if (tradeNum >= 100) badges.push({ text: '100+ Trades', tip: '100+ total predictions placed', bg: 'bg-surface-4', fg: 'text-slate-400', border: 'border-white/6', p: 40 });

  // WIN RATE
  if (wr >= 80 && tradeNum >= 50) badges.push({ text: `${Math.round(wr)}% Win Rate`, tip: `${Math.round(wr)}% of predictions were profitable (50+ trades)`, bg: 'bg-gradient-to-r from-emerald-500 to-green-400', fg: 'text-black', icon: Target, p: 91 });
  else if (wr >= 65 && tradeNum >= 30) badges.push({ text: `${Math.round(wr)}% Accuracy`, tip: `${Math.round(wr)}% prediction accuracy`, bg: 'bg-emerald-500/15', fg: 'text-emerald-400', border: 'border-emerald-500/20', icon: Target, p: 74 });
  else if (wr >= 55 && tradeNum >= 20) badges.push({ text: `${Math.round(wr)}% Accuracy`, tip: `${Math.round(wr)}% prediction accuracy`, bg: 'bg-emerald-500/10', fg: 'text-emerald-300', border: 'border-emerald-500/15', p: 52 });

  // VETERAN
  if (days >= 730) badges.push({ text: 'Veteran (2yr+)', tip: 'Active on Polymarket for over 2 years', bg: 'bg-gradient-to-r from-indigo-600 to-violet-500', fg: 'text-white', icon: Shield, p: 84 });
  else if (days >= 365) badges.push({ text: 'Veteran (1yr+)', tip: 'Active on Polymarket for over 1 year', bg: 'bg-indigo-500/15', fg: 'text-indigo-400', border: 'border-indigo-500/20', icon: Shield, p: 68 });

  // POSITIONS
  if (posNum >= 50) badges.push({ text: '50+ Positions', tip: 'Currently holding 50+ open positions', bg: 'bg-violet-500/15', fg: 'text-violet-400', border: 'border-violet-500/20', icon: Eye, p: 58 });
  else if (posNum >= 20) badges.push({ text: '20+ Positions', tip: 'Currently holding 20+ open positions', bg: 'bg-surface-4', fg: 'text-violet-300', border: 'border-white/8', p: 42 });

  // DIVERSITY
  if (mkts >= 100) badges.push({ text: 'Market Explorer', tip: 'Traded in 100+ different markets', bg: 'bg-orange-500/15', fg: 'text-orange-400', border: 'border-orange-500/20', icon: Rocket, p: 65 });
  else if (mkts >= 30) badges.push({ text: 'Diversified', tip: 'Traded in 30+ different markets', bg: 'bg-surface-4', fg: 'text-orange-300', border: 'border-white/8', p: 43 });

  // COMBOS
  if (pnlNum >= 100000 && wr >= 70 && tradeNum >= 200) badges.push({ text: 'Prediction Master', tip: '$100K+ profit with 70%+ win rate and 200+ trades', bg: 'bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600', fg: 'text-white', icon: Star, p: 99 });
  if (volNum >= 500000 && tradeNum >= 500) badges.push({ text: 'Whale', tip: '$500K+ volume with 500+ trades', bg: 'bg-gradient-to-r from-blue-600 to-cyan-400', fg: 'text-white', icon: Coins, p: 86 });
  if (pnlNum < 0 && Math.abs(pnlNum) >= 10000 && tradeNum >= 50) badges.push({ text: 'Diamond Hands', tip: 'Holding through $10K+ losses with 50+ trades', bg: 'bg-surface-4', fg: 'text-slate-400', border: 'border-white/8', icon: Heart, p: 35 });
  if (pnlNum >= 50000 && wr >= 60) badges.push({ text: 'Hot Streak', tip: '$50K+ profit with 60%+ win rate', bg: 'bg-gradient-to-r from-orange-500 to-red-500', fg: 'text-white', icon: Flame, p: 83 });
  if (tradeNum >= 50 && pnlNum > 0 && volNum >= 10000) badges.push({ text: 'Consistent Earner', tip: 'Profitable with 50+ trades and $10K+ volume', bg: 'bg-teal-500/15', fg: 'text-teal-400', border: 'border-teal-500/20', p: 56 });
  if (tradeNum >= 10 && tradeNum < 50 && pnlNum > 0) badges.push({ text: 'Rising Star', tip: 'New trader showing early profit', bg: 'bg-yellow-500/15', fg: 'text-yellow-400', border: 'border-yellow-500/20', icon: Rocket, p: 48 });

  // SIZE-BASED
  if (volNum >= 50000 && !tradeNum) badges.push({ text: 'Big Trade', tip: 'Opened a position worth $50K+', bg: 'bg-amber-500/15', fg: 'text-amber-400', border: 'border-amber-500/20', icon: Zap, p: 50 });
  if (volNum >= 10000 && volNum < 50000 && !tradeNum) badges.push({ text: 'High Roller', tip: 'Opened a position worth $10K+', bg: 'bg-surface-4', fg: 'text-amber-300', border: 'border-white/8', p: 38 });

  badges.sort((a, b) => b.p - a.p);
  return badges;
}

// Badge component — shows ALL badges with hover tooltips
export function BadgeList({ badges, max, size = 'md' }) {
  if (!badges || badges.length === 0) return null;
  // Show ALL badges (no max limit unless explicitly set)
  const shown = max ? badges.slice(0, max) : badges;
  const textSize = size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-[11px]' : 'text-xs';
  const iconSize = size === 'xs' ? 8 : size === 'sm' ? 10 : 12;
  const px = size === 'xs' ? 'px-1.5' : 'px-2';
  const py = size === 'xs' ? 'py-0.5' : 'py-1';

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((b, i) => (
        <span key={i} title={b.tip || b.text}
          className={`inline-flex items-center gap-1 ${px} ${py} rounded-md ${textSize} font-bold cursor-default ${b.bg} ${b.fg} ${b.border ? `border ${b.border}` : ''} hover:scale-105 transition-transform`}>
          {b.icon && <b.icon size={iconSize} />}
          {b.text}
        </span>
      ))}
    </div>
  );
}
