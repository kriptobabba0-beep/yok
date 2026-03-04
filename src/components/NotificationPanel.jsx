import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../utils/store';
import { shortenAddress, formatUSD, timeAgo } from '../utils/api';
import { Bell, Trash2, CheckCheck, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function NotificationPanel({ onClose }) {
  const { notifications, markAllRead, clearNotifications, unreadCount } = useApp();
  const navigate = useNavigate();

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-brand-400" />
          <span className="font-medium text-sm">Notifications</span>
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

      {/* Notifications list */}
      <div className="max-h-[55vh] overflow-y-auto">
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
              onClick={() => {
                navigate(`/wallet/${n.wallet}`);
                onClose();
              }}
              className={`
                flex items-start gap-3 px-4 py-3 border-b border-white/[0.03] cursor-pointer
                hover:bg-white/[0.03] transition-all
                ${!n.read ? 'bg-brand-500/[0.03]' : ''}
              `}
            >
              {/* Icon */}
              <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                n.side === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
              }`}>
                {n.side === 'BUY' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
              </div>

              {/* Content */}
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

              {/* Unread dot */}
              {!n.read && <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
