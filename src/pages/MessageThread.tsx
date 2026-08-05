import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import { API } from '@/lib/api';
import { useAuth, getAuthToken } from '@/hooks/use-auth';

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  text: string;
  createdAt: string;
  isRead: boolean;
}

interface OtherUser {
  id: number;
  name: string;
}

const MessageThread = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!userId) return;
    setLoading(true);
    fetch(`${API.messageThread}&withUserId=${userId}`, {
      headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.otherUser) {
          navigate('/messages', { replace: true });
          return;
        }
        setMessages(d.messages || []);
        setOtherUser(d.otherUser);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!userId || text.trim().length < 1) return;
    setSending(true);
    try {
      const res = await fetch(API.sendMessage, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ receiverId: Number(userId), text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось отправить сообщение');
        return;
      }
      setMessages((prev) => [...prev, data.message]);
      setText('');
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-body">
        <Header />
        <main className="mx-auto max-w-3xl px-5 py-16 md:px-8">
          <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!otherUser) return null;

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <Link
          to="/messages"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand-cyan"
        >
          <Icon name="ArrowLeft" size={15} />
          Все переписки
        </Link>

        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-cyan/15 font-head text-lg font-bold text-brand-cyan">
            {otherUser.name.charAt(0).toUpperCase()}
          </span>
          <Link
            to={`/user/${otherUser.id}`}
            className="font-head text-lg font-bold uppercase tracking-wide text-foreground transition-colors hover:text-brand-cyan"
          >
            {otherUser.name}
          </Link>
        </div>

        <div className="mb-4 flex min-h-[300px] flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Сообщений пока нет. Начните переписку первым.</p>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === user.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      mine
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>
                    <p
                      className={`mt-1 text-[11px] ${
                        mine ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {m.createdAt}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Напишите сообщение..."
            className="min-h-[52px]"
          />
          <button
            onClick={send}
            disabled={sending || text.trim().length < 1}
            className="inline-flex h-[52px] shrink-0 items-center gap-2 rounded-xl bg-primary px-5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Icon name="Send" size={16} />
            Отправить
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MessageThread;
