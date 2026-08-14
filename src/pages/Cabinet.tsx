import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth, getAuthToken } from '@/hooks/use-auth';
import { formatPrice, Product } from '@/components/site/products';
import { API } from '@/lib/api';
import ProposeProductDialog from '@/components/site/ProposeProductDialog';
import ProductMediaDialog from '@/components/site/ProductMediaDialog';
import VipPromoteDialog from '@/components/site/VipPromoteDialog';
import CabinetPurchasesTab, { Purchase } from '@/components/cabinet/CabinetPurchasesTab';
import CabinetProductsTab from '@/components/cabinet/CabinetProductsTab';
import CabinetWalletTab, { Transaction, Payout } from '@/components/cabinet/CabinetWalletTab';
import CabinetSupportTab, { Ticket } from '@/components/cabinet/CabinetSupportTab';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Authorization': `Bearer ${getAuthToken()}`,
});

const Cabinet = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout, refreshUser } = useAuth();

  const [topupOpen, setTopupOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('SBP');
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

  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [myProductsLoading, setMyProductsLoading] = useState(true);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [draftProduct, setDraftProduct] = useState<{ id: number; title: string } | null>(null);
  const [vipOpen, setVipOpen] = useState(false);
  const [vipProduct, setVipProduct] = useState<Product | null>(null);

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const loadPurchases = () => {
    setPurchasesLoading(true);
    fetch(API.myOrders, { headers: { 'X-Authorization': `Bearer ${getAuthToken()}` } })
      .then((r) => r.json())
      .then((d) => setPurchases(d.purchases || []))
      .finally(() => setPurchasesLoading(false));
  };

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

  const loadMyProducts = () => {
    setMyProductsLoading(true);
    fetch(`${API.products}?mine=1`, { headers: { 'X-Authorization': `Bearer ${getAuthToken()}` } })
      .then((r) => r.json())
      .then((d) => setMyProducts(d.products || []))
      .finally(() => setMyProductsLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadPurchases();
    loadWallet();
    loadTickets();
    loadMyProducts();
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
        body: JSON.stringify({ action: 'topup', amount: n, method, returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось пополнить баланс');
        return;
      }
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
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

  const totalSpent = purchases.reduce((s, p) => s + p.amount, 0);
  const stats = [
    { label: 'Покупок', value: purchases.length, icon: 'ShoppingBag' },
    { label: 'Потрачено', value: formatPrice(totalSpent), icon: 'Receipt' },
    { label: 'Баланс', value: formatPrice(user.balance), icon: 'Wallet' },
    { label: 'На счету с', value: user.createdAt, icon: 'CalendarDays' },
  ];

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
                setMethod('SBP');
                setTopupOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <Icon name="Plus" size={16} />
              Пополнить
            </button>
            <button
              onClick={() => {
                setMethod('SBP');
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
            <TabsTrigger value="my-products">Мои товары</TabsTrigger>
            <TabsTrigger value="wallet">Баланс</TabsTrigger>
            <TabsTrigger value="support">Поддержка</TabsTrigger>
            <TabsTrigger value="profile">Профиль</TabsTrigger>
          </TabsList>

          <CabinetPurchasesTab purchases={purchases} purchasesLoading={purchasesLoading} />

          <CabinetProductsTab
            myProducts={myProducts}
            myProductsLoading={myProductsLoading}
            onPropose={() => setProposeOpen(true)}
            onPromoteVip={(p) => {
              setVipProduct(p);
              setVipOpen(true);
            }}
          />

          <CabinetWalletTab
            transactions={transactions}
            payouts={payouts}
            walletLoading={walletLoading}
            topupOpen={topupOpen}
            setTopupOpen={setTopupOpen}
            payoutOpen={payoutOpen}
            setPayoutOpen={setPayoutOpen}
            amount={amount}
            setAmount={setAmount}
            method={method}
            setMethod={setMethod}
            wallet={wallet}
            setWallet={setWallet}
            submitting={submitting}
            doTopup={doTopup}
            doPayout={doPayout}
          />

          <CabinetSupportTab
            tickets={tickets}
            ticketsLoading={ticketsLoading}
            user={user}
            ticketOpen={ticketOpen}
            setTicketOpen={setTicketOpen}
            subject={subject}
            setSubject={setSubject}
            message={message}
            setMessage={setMessage}
            ticketSubmitting={ticketSubmitting}
            submitTicket={submitTicket}
          />
        </Tabs>
      </main>

      <ProposeProductDialog
        open={proposeOpen}
        onOpenChange={setProposeOpen}
        onDraftCreated={(product) => {
          setDraftProduct(product);
          setMediaOpen(true);
          loadMyProducts();
        }}
      />
      <ProductMediaDialog
        product={draftProduct}
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        onSubmitted={loadMyProducts}
      />
      <VipPromoteDialog
        product={vipProduct}
        open={vipOpen}
        onOpenChange={setVipOpen}
        onSuccess={loadMyProducts}
      />
    </div>
  );
};

export default Cabinet;