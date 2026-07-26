import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { API } from '@/lib/api';
import { getAuthToken } from '@/hooks/use-auth';
import AdminGuard from '@/components/site/AdminGuard';

interface Ticket {
  id: number;
  subject: string;
  message: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
  userName: string;
  userEmail: string;
}

const statusLabel = (s: string) =>
  ({ open: 'Открыт', answered: 'Есть ответ', closed: 'Закрыт' }[s] || s);
const statusColor = (s: string) =>
  s === 'open' ? 'text-primary' : s === 'answered' ? 'text-brand-green' : 'text-muted-foreground';

const AdminSupport = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [sending, setSending] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`${API.support}&all=1`, {
      headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
    })
      .then((r) => r.json())
      .then((d) => setTickets(d.tickets || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const reply = async (id: number) => {
    const text = (replies[id] || '').trim();
    if (text.length < 2) {
      toast.error('Введите текст ответа');
      return;
    }
    setSending(id);
    try {
      const res = await fetch(API.support, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ id, adminReply: text, status: 'answered' }),
      });
      if (!res.ok) {
        toast.error('Не удалось отправить ответ');
        return;
      }
      toast.success('Ответ отправлен');
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, adminReply: text, status: 'answered' } : t)),
      );
    } finally {
      setSending(null);
    }
  };

  const close = async (id: number) => {
    const res = await fetch(API.support, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ id, status: 'closed' }),
    });
    if (!res.ok) {
      toast.error('Не удалось закрыть обращение');
      return;
    }
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'closed' } : t)));
    toast.success('Обращение закрыто');
  };

  return (
    <AdminGuard>
      <h1 className="mb-6 font-head text-3xl font-bold uppercase tracking-tight text-foreground">
        Поддержка
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">Обращения пользователей и ответы.</p>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      ) : tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">Обращений пока нет.</p>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <p className="font-head font-semibold uppercase tracking-wide text-foreground">
                  {t.subject}
                </p>
                <span className={`text-xs font-medium ${statusColor(t.status)}`}>
                  {statusLabel(t.status)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.userName} ({t.userEmail}) · {t.createdAt}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{t.message}</p>

              {t.adminReply && (
                <div className="mt-3 rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-cyan">
                    Ваш ответ
                  </p>
                  <p className="text-sm text-foreground">{t.adminReply}</p>
                </div>
              )}

              {t.status !== 'closed' && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={replies[t.id] ?? ''}
                    onChange={(e) => setReplies((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    placeholder="Написать ответ пользователю..."
                    className="min-h-20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => reply(t.id)}
                      disabled={sending === t.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 font-head text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      <Icon name="Send" size={14} />
                      Ответить
                    </button>
                    <button
                      onClick={() => close(t.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 font-head text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Icon name="Check" size={14} />
                      Закрыть
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminGuard>
  );
};

export default AdminSupport;
