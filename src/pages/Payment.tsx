import Icon from '@/components/ui/icon';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';

const METHODS = [
  {
    icon: 'Wallet',
    name: 'AZVOX',
    desc: 'Быстрая платёжная система для приёма оплаты банковскими картами и электронными кошельками. Поддерживает все основные карты российских банков.',
    points: [
      'Оплата картой Visa, MasterCard, МИР',
      'Электронные кошельки и SBP-переводы',
      'Комиссия за перевод не взимается с покупателя',
    ],
  },
  {
    icon: 'CreditCard',
    name: 'ЮMoney',
    desc: 'Проверенный сервис для онлайн-платежей. Оплатить можно как картой, так и напрямую с баланса кошелька ЮMoney.',
    points: [
      'Оплата с баланса кошелька ЮMoney',
      'Привязанные банковские карты',
      'Мгновенное подтверждение платежа',
    ],
  },
];

const Payment = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <h1 className="font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-5xl">
          Оплата AZVOX и ЮMoney
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Оплачивайте покупки удобным способом — картой или из электронного кошелька.
          Ссылка на скачивание товара приходит на e-mail сразу после подтверждения платежа.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
          {METHODS.map((m) => (
            <div
              key={m.name}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand-cyan/40"
            >
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan">
                <Icon name={m.icon} size={24} />
              </span>
              <h2 className="font-head text-xl font-bold uppercase tracking-wide text-foreground">
                {m.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
              <ul className="mt-5 space-y-2.5">
                {m.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Icon name="Check" size={16} className="mt-0.5 shrink-0 text-primary" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon name="ShieldCheck" size={24} />
          </span>
          <div>
            <h3 className="font-head text-base font-semibold uppercase tracking-wide text-foreground">
              Безопасная оплата
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Все платежи обрабатываются через защищённые каналы AZVOX и ЮMoney. Мы не храним
              данные ваших карт — оплата происходит напрямую на стороне платёжной системы.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Payment;
