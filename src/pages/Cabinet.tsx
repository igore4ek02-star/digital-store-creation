import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth, getAuthToken } from '@/hooks/use-auth';
import { formatPrice } from '@/components/site/products';
import { API } from '@/lib/api';

interface Purchase {
  id: string;
  title: string;
  amount: number;
  method: 'AZVOX' | 'ЮMoney';
  date: string;
}

const PURCHASES: Purchase[] = [
  { id: '#10428', title: 'CMS интернет-магазина', amount: 3490, method: 'ЮMoney', date: '25.07.2026' },
  { id: '#10391', title: 'Плагин приёма платежей', amount: 590, method: 'AZVOX', date: '19.07.2026' },
  { id: '#10355', title: 'Шаблон лендинга «Про»', amount: 890, method: 'ЮMoney', date: '11.07.2026' },
];

const PAYMENTS = [
  { id: 'AZVOX', label: 'AZVOX', desc: 'Карты и электронные кошельки' },
  { id: 'ЮMoney', label: 'ЮMoney', desc: 'Оплата картой или из кошелька' },
] as const;

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface Payout {
  id: number;
  amount: number;
  method: string;
  wallet: string;
  status: string;
  createdAt: string;
}

interface Ticket {
  id: number;
  subject: string;
  message: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Authorization': `Bearer ${getAuthToken()}`,
});

const Cabinet = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();

  const [topupOpen, setTopupOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('AZVOX');
  const [wallet, setWallet] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [walletLoading, setWalletLoading] = useState(true);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const loadWallet = () => {
    setWalletLoading(true);
    fetch(API.wallet, { headers: { 'X-Authorization': `Bearer ${getAuthToken()}` } })
      .then((r) => r.json())
      .then((d) => {
        setTransactions(d.transactions || []);
        setPayouts(d.payouts || []);
      })
      .finally(() => setWalletLoading(false));
  };

  const loadTickets = () => {
    setTicketsLoading(true);
    fetch(API.support, { headers: { 'X-Authorization': `Bearer ${getAuthToken()}` } })
      .then((r) => r.json())
      .then((d) => setTickets(d.tickets || []))
      .finally(() => setTicketsLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadWallet();
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  const doTopup = async () => {
    const n = Number(amount);
    if (!n || n < 1) {
      toast.error('Введите сумму пополнения');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API.wallet, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'topup', amount: n, method }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось пополнить баланс');
        return;
      }
      toast.success('Баланс пополнен', {
        description: `+${formatPrice(n)} через ${method}.`,
      });
      setTopupOpen(false);
      setAmount('');
      await refreshUser();
      loadWallet();
    } finally {
      setSubmitting(false);
    }
  };

  const doPayout = async () => {
    const n = Number(amount);
    if (!n || n < 1) {
      toast.error('Введите сумму выплаты');
      return;
    }
    if (wallet.trim().length < 4) {
      toast.error('Укажите кошелёк или карту для выплаты');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API.wallet, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'payout', amount: n, method, wallet: wallet.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось создать заявку');
        return;
      }
      toast.success('Заявка на выплату создана', {
        description: `Выплата ${formatPrice(n)} на ${method} · ${wallet}. Обработаем в течение суток.`,
      });
      setPayoutOpen(false);
      setAmount('');
      setWallet('');
      await refreshUser();
      loadWallet();
    } finally {
      setSubmitting(false);
    }
  };

  const submitTicket = async () => {
    if (subject.trim().length < 2 || message.trim().length < 5) {
      toast.error('Заполните тему и сообщение');
      return;
    }
    setTicketSubmitting(true);
    try {
      const res = await fetch(API.support, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось отправить обращение');
        return;
      }
      setTickets((prev) => [data.ticket, ...prev]);
      toast.success('Обращение отправлено в поддержку');
      setSubject('');
      setMessage('');
      setTicketOpen(false);
    } finally {
      setTicketSubmitting(false);
    }
  };

  const totalSpent = PURCHASES.reduce((s, p) => s + p.amount, 0);
  const stats = [
    { label: 'Покупок', value: PURCHASES.length, icon: 'ShoppingBag' },
    { label: 'Потрачено', value: formatPrice(totalSpent), icon: 'Receipt' },
    { label: 'Баланс', value: formatPrice(user.balance), icon: 'Wallet' },
    { label: 'На счету с', value: user.createdAt, icon: 'CalendarDays' },
  ];

  const ticketStatusLabel = (s: string) =>
    s === 'open' ? 'Открыт' : s === 'answered' ? 'Есть ответ' : 'Закрыт';
  const ticketStatusColor = (s: string) =>
    s === 'open' ? 'text-primary' : s === 'answered' ? 'text-brand-green' : 'text-muted-foreground';

  const payoutStatusLabel = (s: string) =>
    s === 'pending' ? 'В обработке' : s === 'completed' ? 'Выплачено' : 'Отклонено';

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="sticky top-0 z-40 border-b border-border bg-[#16191c]">
        <div className="mx-auto flex h-[70px] max-w-6xl items-center gap-4 px-5 md:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/img/logo.png" alt="Php-Skript" className="h-8 w-auto" />
          </Link>
          <span className="hidden font-head text-sm uppercase tracking-wide text-muted-foreground sm:inline">
            / Личный кабинет
          </span>
          <button
            onClick={() => {
              logout();
              toast('Вы вышли из аккаунта');
              navigate('/');
            }}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-head text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
          >
            <Icon name="LogOut" size={15} />
            Выйти
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-cyan/15 font-head text-2xl font-bold text-brand-cyan">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="font-head text-2xl font-bold uppercase tracking-tight text-foreground">
                {user.name}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setMethod('AZVOX');
                setTopupOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <Icon name="Plus" size={16} />
              Пополнить
            </button>
            <button
              onClick={() => {
                setMethod('AZVOX');
                setPayoutOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-foreground transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan"
            >
              <Icon name="Banknote" size={16} />
              Выплата
            </button>
          </div>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan">
                <Icon name={s.icon} size={20} />
              </span>
              <p className="font-head text-xl font-bold text-foreground">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="purchases">
          <TabsList>
            <TabsTrigger value="purchases">Мои покупки</TabsTrigger>
            <TabsTrigger value="wallet">Баланс</TabsTrigger>
            <TabsTrigger value="support">Поддержка</TabsTrigger>
            <TabsTrigger value="profile">Профиль</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases">
            <p className="mb-4 text-sm text-muted-foreground">
              Купленные товары доступны для повторного скачивания в любое время.
            </p>
            <div className="space-y-3">
              {PURCHASES.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon name="FileCode2" size={22} />
                    </span>
                    <div>
                      <p className="font-head font-semibold uppercase tracking-wide text-foreground">
                        {p.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.id} · {p.date} · оплата {p.method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="font-head font-bold text-foreground">
                      {formatPrice(p.amount)}
                    </span>
                    <button
                      onClick={() =>
                        toast.success('Скачивание началось', {
                          description: `Архив «${p.title}» готов к загрузке.`,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3.5 py-2 font-head text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
                    >
                      <Icon name="Download" size={15} />
                      Скачать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="wallet">
            {walletLoading ? (
              <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 font-head text-sm font-semibold uppercase tracking-wide text-foreground">
                    История операций
                  </h3>
                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Пока нет операций.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {transactions.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                        >
                          <div>
                            <p className="text-sm text-foreground">{t.description}</p>
                            <p className="text-xs text-muted-foreground">{t.createdAt}</p>
                          </div>
                          <span
                            className={`font-head text-sm font-bold ${t.amount >= 0 ? 'text-brand-green' : 'text-destructive'}`}
                          >
                            {t.amount >= 0 ? '+' : ''}
                            {formatPrice(t.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="mb-3 font-head text-sm font-semibold uppercase tracking-wide text-foreground">
                    Заявки на выплату
                  </h3>
                  {payouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Заявок пока нет.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {payouts.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                        >
                          <div>
                            <p className="text-sm text-foreground">
                              {p.method} · {p.wallet}
                            </p>
                            <p className="text-xs text-muted-foreground">{p.createdAt}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-head text-sm font-bold text-foreground">
                              {formatPrice(p.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">{payoutStatusLabel(p.status)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="support">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Ваши обращения в поддержку</p>
              <button
                onClick={() => setTicketOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <Icon name="Plus" size={16} />
                Новое обращение
              </button>
            </div>
            {ticketsLoading ? (
              <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
            ) : tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Обращений пока нет.</p>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <p className="font-head font-semibold uppercase tracking-wide text-foreground">
                        {t.subject}
                      </p>
                      <span className={`text-xs font-medium ${ticketStatusColor(t.status)}`}>
                        {ticketStatusLabel(t.status)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.createdAt}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{t.message}</p>
                    {t.adminReply && (
                      <div className="mt-3 rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-cyan">
                          Ответ поддержки
                        </p>
                        <p className="text-sm text-foreground">{t.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile">
            <div className="max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6">
              <div className="space-y-2">
                <Label>Имя</Label>
                <Input defaultValue={user.name} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input defaultValue={user.email} type="email" />
              </div>
              <button
                onClick={() => toast.success('Профиль сохранён')}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <Icon name="Check" size={16} />
                Сохранить
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Пополнение баланса */}
      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-head text-xl uppercase tracking-wide">
              Пополнить баланс
            </DialogTitle>
            <DialogDescription>
              Выберите систему оплаты и укажите сумму пополнения.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Система оплаты</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setMethod(p.id)}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                    method === p.id
                      ? 'border-brand-cyan bg-brand-cyan/10'
                      : 'border-border hover:border-brand-cyan/40'
                  }`}
                >
                  <span className="font-head text-sm font-semibold">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="topup-amount">Сумма, ₽</Label>
            <Input
              id="topup-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
            />
          </div>
          <button
            onClick={doTopup}
            disabled={submitting}
            className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Icon name="CreditCard" size={18} />
            Пополнить
          </button>
        </DialogContent>
      </Dialog>

      {/* Выплата */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-head text-xl uppercase tracking-wide">
              Вывод средств
            </DialogTitle>
            <DialogDescription>
              Заявка на выплату на кошелёк AZVOX или ЮMoney.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Куда вывести</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setMethod(p.id)}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                    method === p.id
                      ? 'border-brand-cyan bg-brand-cyan/10'
                      : 'border-border hover:border-brand-cyan/40'
                  }`}
                >
                  <span className="font-head text-sm font-semibold">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-wallet">Номер кошелька / карты</Label>
            <Input
              id="payout-wallet"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="Например: 4100 1234 5678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-amount">Сумма, ₽</Label>
            <Input
              id="payout-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
            />
          </div>
          <button
            onClick={doPayout}
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Icon name="Banknote" size={18} />
            Создать заявку
          </button>
        </DialogContent>
      </Dialog>

      {/* Новое обращение в поддержку */}
      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-head text-xl uppercase tracking-wide">
              Обращение в поддержку
            </DialogTitle>
            <DialogDescription>Опишите вопрос — ответим в ближайшее время.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ticket-subject">Тема</Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Например: Не пришла ссылка на скачивание"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-message">Сообщение</Label>
            <Textarea
              id="ticket-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите подробнее"
              className="min-h-28"
            />
          </div>
          <button
            onClick={submitTicket}
            disabled={ticketSubmitting}
            className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Icon name="Send" size={18} />
            Отправить
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cabinet;
