import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { getAuthToken } from '@/hooks/use-auth';
import { API } from '@/lib/api';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string | null;
  entityId: number | null;
  isRead: boolean;
  createdAt: string;
}

const typeIcon = (t: string) =>
  ({
    product_moderation: 'Package',
    ad_moderation: 'Megaphone',
    payout_request: 'Banknote',
    login: 'LogIn',
    login_failed: 'ShieldAlert',
    topup: 'Wallet',
    new_user: 'UserPlus',
    support_ticket: 'Headphones',
    purchase: 'ShoppingCart',
  }[t] || 'Bell');

const typeLink = (t: string) =>
  ({
    product_moderation: '/admin/moderation',
    ad_moderation: '/admin/moderation',
    payout_request: '/admin/payouts',
    login: '/admin/auth-history',
    login_failed: '/admin/auth-history',
    topup: '/admin/finance',
    new_user: '/admin/users',
    support_ticket: '/admin/support',
    purchase: '/admin/finance',
  }[t] || '/admin');

const AdminNotifications = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    fetch(`${API.admin}?section=notifications`, {
      headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.notifications || []);
        setUnread(d.unreadCount || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAllRead = async () => {
    if (unread === 0) return;
    await fetch(API.admin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ action: 'mark-notifications-read' }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next) load();
      return next;
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label="Уведомления"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan"
      >
        <Icon name="Bell" size={16} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-head text-sm font-semibold uppercase tracking-wide text-foreground">
              Уведомления
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-brand-cyan hover:underline"
              >
                Прочитать все
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Уведомлений пока нет.</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id}>
                    <Link
                      to={typeLink(n.type)}
                      onClick={() => setOpen(false)}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                        !n.isRead ? 'bg-brand-cyan/5' : ''
                      }`}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-cyan/12 text-brand-cyan">
                        <Icon name={typeIcon(n.type)} size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        {n.message && (
                          <p className="truncate text-xs text-muted-foreground">{n.message}</p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{n.createdAt}</p>
                      </div>
                      {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-cyan" />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;