import Icon from '@/components/ui/icon';

const STEPS = [
  {
    icon: 'MousePointerClick',
    title: 'Выбираете товар',
    desc: 'Находите нужный PHP-скрипт, шаблон или плагин в каталоге и открываете карточку.',
  },
  {
    icon: 'CreditCard',
    title: 'Оплачиваете онлайн',
    desc: 'Оплата через AZVOX или ЮMoney — картой или из электронного кошелька, безопасно.',
  },
  {
    icon: 'Download',
    title: 'Скачиваете сразу',
    desc: 'Ссылка на архив с исходниками приходит на e-mail мгновенно после платежа.',
  },
  {
    icon: 'Rocket',
    title: 'Запускаете проект',
    desc: 'Устанавливаете по инструкции или заказываете настройку «под ключ» у нас.',
  },
];

const HowItWorks = () => {
  return (
    <section id="how" className="border-y border-border bg-[#16191c]">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="mb-12 text-center">
          <p className="mb-3 font-head text-xs font-medium uppercase tracking-[0.14em] text-brand-cyan">
            Как это работает
          </p>
          <h2 className="mx-auto max-w-2xl font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-5xl">
            Покупка и скачивание за 4 шага
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand-cyan/40"
            >
              <span className="absolute right-5 top-5 font-head text-4xl font-bold text-muted/70">
                0{i + 1}
              </span>
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon name={s.icon} size={24} />
              </span>
              <h3 className="font-head text-lg font-semibold uppercase tracking-wide text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
