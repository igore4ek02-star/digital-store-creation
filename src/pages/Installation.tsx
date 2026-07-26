import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import { formatPrice } from '@/components/site/products';

const PLANS = [
  {
    icon: 'Rocket',
    title: 'Базовая установка',
    price: 1500,
    desc: 'Разместим купленный скрипт на вашем хостинге и запустим его в рабочем состоянии.',
    features: [
      'Загрузка файлов на хостинг',
      'Создание и настройка базы данных',
      'Проверка работоспособности сайта',
    ],
    highlighted: false,
  },
  {
    icon: 'Settings',
    title: 'Установка + настройка',
    price: 3500,
    desc: 'Установим скрипт и настроим его под ваши задачи: домен, почту, базовые параметры.',
    features: [
      'Всё из тарифа «Базовая установка»',
      'Настройка домена и SSL-сертификата',
      'Настройка почты и уведомлений',
      'Базовая настройка внешнего вида',
    ],
    highlighted: true,
  },
  {
    icon: 'Wrench',
    title: 'Установка + доработка',
    price: 6900,
    desc: 'Полный цикл: установка, настройка и доработка функциональности под ваши требования.',
    features: [
      'Всё из тарифа «Установка + настройка»',
      'Доработка функциональности по ТЗ',
      'Индивидуальные правки дизайна',
      'Консультация после запуска',
    ],
    highlighted: false,
  },
];

const Installation = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <h1 className="font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-5xl">
          Установка под ключ
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Не хотите разбираться сами? Наши специалисты установят и настроят купленный скрипт
          на вашем хостинге — от загрузки файлов до полностью рабочего сайта.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.title}
              className={`flex flex-col rounded-2xl border p-6 transition-colors ${
                p.highlighted
                  ? 'border-primary bg-card shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]'
                  : 'border-border bg-card hover:border-brand-cyan/40'
              }`}
            >
              {p.highlighted && (
                <span className="mb-4 inline-flex w-fit items-center rounded-md bg-primary/15 px-2.5 py-1 font-head text-[11px] font-semibold uppercase tracking-wide text-primary">
                  Популярный выбор
                </span>
              )}
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan">
                <Icon name={p.icon} size={24} />
              </span>
              <h2 className="font-head text-lg font-semibold uppercase tracking-wide text-foreground">
                {p.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>

              <div className="mt-5 border-t border-border pt-5">
                <span className="font-head text-3xl font-bold text-foreground">
                  {formatPrice(p.price)}
                </span>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Icon name="Check" size={16} className="mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/support"
                className={`mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-head text-sm font-semibold uppercase tracking-wide transition-transform hover:-translate-y-0.5 ${
                  p.highlighted
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-brand-green text-primary-foreground'
                }`}
              >
                <Icon name="Send" size={16} />
                Заказать
              </Link>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Installation;
