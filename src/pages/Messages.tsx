import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import { API } from '@/lib/api';
import { useAuth, getAuthToken } from '@/hooks/use-auth';

interface Conversation {
  userId: number;
  userName: string;
  lastText: string;
  lastCreatedAt: string;
  unreadCount: number;
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setLoading(true);
    fetch(API.conversations, { headers: { 'X-Authorization': `Bearer ${getAuthToken()}` } })
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations || []))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <h1 className="mb-6 font-head text-2xl font-bold uppercase tracking-tight text-foreground">
          Личные сообщения
        </h1>

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
        ) : conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            У вас пока нет переписок. Откройте страницу пользователя и напишите ему сообщение.
          </p>
        ) : (
          <div className="space-y-2.5">
            {conversations.map((c) => (
              <Link
                key={c.userId}
                to={`/messages/${c.userId}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-brand-cyan/40"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-cyan/15 font-head text-lg font-bold text-brand-cyan">
                  {c.userName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-head text-sm font-semibold uppercase tracking-wide text-foreground">
                      {c.userName}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">{c.lastCreatedAt}</span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{c.lastText}</p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 font-head text-xs font-bold text-primary-foreground">
                    {c.unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Messages;
