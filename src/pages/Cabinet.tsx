import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { formatPrice } from '@/components/site/products';

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
  { id: 'azvox', label: 'AZVOX', desc: 'Карты и электронные кошельки' },
  { id: 'yoomoney', label: 'ЮMoney', desc: 'Оплата картой или из кошелька' },
] as const;

const Cabinet = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [topupOpen, setTopupOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('azvox');
  const [wallet, setWallet] = useState('');

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  if (!user) return null;

  const doTopup = () => {
    const n = Number(amount);
    if (!n || n < 1) {
      toast.error('Введите сумму пополнения');
      return;
    }
    const name = PAYMENTS.find((p) => p.id === method)?.label;
    toast.success('Платёж инициирован', {
      description: `Пополнение на ${formatPrice(n)} через ${name}. Средства зачислятся после подтверждения.`,
    });
    setTopupOpen(false);
    setAmount('');
  };

  const doPayout = () => {
    const n = Number(amount);
    if (!n || n < 1) {
      toast.error('Введите сумму выплаты');
      return;
    }
    if (wallet.trim().length < 4) {
      toast.error('Укажите кошелёк или карту для выплаты');
      return;
    }
    const name = PAYMENTS.find((p) => p.id === method)?.label;
    toast.success('Заявка на выплату создана', {
      description: `Выплата ${formatPrice(n)} на ${name} · ${wallet}. Обработаем в течение суток.`,
    });
    setPayoutOpen(false);
    setAmount('');
    setWallet('');
  };

  const totalSpent = PURCHASES.reduce((s, p) => s + p.amount, 0);
  const stats = [
    { label: 'Покупок', value: PURCHASES.length, icon: 'ShoppingBag' },
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
                setMethod('azvox');
                setTopupOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <Icon name="Plus" size={16} />
              Пополнить
            </button>
            <button
              onClick={() => {
                setMethod('azvox');
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
            className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <Icon name="CreditCard" size={18} />
            Перейти к оплате
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <Icon name="Banknote" size={18} />
            Создать заявку
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cabinet;
