import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { useAuth, getAuthToken } from '@/hooks/use-auth';
import { API } from '@/lib/api';

interface Visitor {
  id: string;
  page: string;
  lastSeen: string;
  name: string;
}

const getVisitorId = () => {
  let id = localStorage.getItem('php-skript-visitor');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('php-skript-visitor', id);
  }
  return id;
};

const OnlineWidget = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [count, setCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [visitors, setVisitors] = useState<Visitor[] | null>(null);
  const visitorId = useRef(getVisitorId());

  useEffect(() => {
    const beat = async () => {
      try {
        const token = getAuthToken();
        const res = await fetch(API.presence, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'X-Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ visitorId: visitorId.current, page: location.pathname }),
        });
        const data = await res.json();
        if (typeof data.onlineCount === 'number') setCount(data.onlineCount);
      } catch {
        /* ignore */
      }
    };
    beat();
    const interval = setInterval(beat, 20000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const loadVisitors = async () => {
    if (!user?.isAdmin) return;
    try {
      const res = await fetch(API.presence, {
        headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      setVisitors(data.visitors || []);
    } catch {
      setVisitors([]);
    }
  };

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next) loadVisitors();
      return next;
    });
  };

  if (count === null) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 border-b border-border bg-[#16191c] px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-brand-green shadow-[0_0_0_3px_hsl(var(--brand-green)/0.3)]" />
            <span className="font-head text-sm font-semibold uppercase tracking-wide text-foreground">
              Онлайн: {count}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {!user?.isAdmin ? (
              <p className="p-4 text-sm text-muted-foreground">
                Список посетителей доступен администратору.
              </p>
            ) : visitors === null ? (
              <p className="p-4 text-sm text-muted-foreground">Загрузка…</p>
            ) : visitors.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Сейчас никого нет.</p>
            ) : (
              <ul className="divide-y divide-border">
                {visitors.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-cyan/12 text-brand-cyan">
                      <Icon name={v.name === 'Гость' ? 'User' : 'CircleUser'} size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{v.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{v.page}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{v.lastSeen}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <button
        onClick={toggle}
        className="flex items-center gap-2 rounded-full border border-brand-cyan/40 bg-card px-4 py-2.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5"
        aria-label="Онлайн сейчас"
      >
        <span className="h-2 w-2 rounded-full bg-brand-green shadow-[0_0_0_3px_hsl(var(--brand-green)/0.3)]" />
        <span className="font-head text-xs font-semibold uppercase tracking-wide text-foreground">
          {count} онлайн
        </span>
      </button>
    </div>
  );
};

export default OnlineWidget;
