import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { API } from '@/lib/api';
import { Product, formatPrice } from './products';
import AdOrderDialog from './AdOrderDialog';

const PILLS = [
  { icon: 'Link2', title: 'CMS интернет-магазина', sub: 'php-skript.ru · 3 490 ₽' },
  { icon: 'FileCode2', title: 'Скрипт доски объявлений', sub: 'исходники · 1 290 ₽' },
  { icon: 'LayoutTemplate', title: 'Шаблон лендинга «Про»', sub: 'адаптив · 890 ₽' },
  { icon: 'ShieldCheck', title: 'Плагин приёма платежей', sub: 'AZVOX · ЮMoney · 590 ₽' },
];

interface AdItem {
  id: number;
  text: string;
  link: string | null;
}

const Hero = () => {
  const [query, setQuery] = useState('');
  const [ads, setAds] = useState<AdItem[]>([]);
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [vipProducts, setVipProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch(`${API.ads}&active=1`)
      .then((r) => r.json())
      .then((d) => setAds(d.ads || []))
      .catch(() => {});
    fetch(API.vipProducts)
      .then((r) => r.json())
      .then((d) => setVipProducts(d.products || []))
      .catch(() => {});
  }, []);

  const goCatalog = () => {
    document.querySelector('#catalog')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="top" className="brand-stage relative overflow-hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 pb-14 pt-6 md:px-8 md:pb-20 md:pt-8">
        {/* signature: fresh-products pill row */}
        <div className="animate-rise flex flex-col gap-3 md:flex-row md:items-stretch md:gap-3.5">
          {vipProducts.length > 0
            ? vipProducts.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.slug}`}
                  className="flex flex-1 items-center gap-3 rounded-2xl bg-brand-surface px-3.5 py-3 shadow-[0_10px_26px_-14px_rgba(0,0,0,0.55)] ring-1 ring-primary/40 transition-transform hover:-translate-y-0.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Icon name={p.icon} size={19} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1.5 truncate font-head text-sm font-semibold text-brand-surface-foreground">
                      {p.title}
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-primary px-1.5 py-0.5 font-head text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
                        <Icon name="Crown" size={9} />
                        VIP
                      </span>
                    </span>
                    <span className="truncate text-xs text-slate-500">
                      {p.category} · {p.price === 0 ? 'Бесплатно' : formatPrice(p.price)}
                    </span>
                  </span>
                  <span
                    aria-label="Открыть"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-green text-primary-foreground"
                  >
                    <Icon name="ArrowUpRight" size={16} />
                  </span>
                </Link>
              ))
            : PILLS.map((p) => (
                <div
                  key={p.title}
                  className="flex flex-1 items-center gap-3 rounded-2xl bg-brand-surface px-3.5 py-3 shadow-[0_10px_26px_-14px_rgba(0,0,0,0.55)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-cyan/15 text-brand-cyan">
                    <Icon name={p.icon} size={19} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-head text-sm font-semibold text-brand-surface-foreground">
                      {p.title}
                    </span>
                    <span className="truncate text-xs text-slate-500">{p.sub}</span>
                  </span>
                  <button
                    onClick={goCatalog}
                    aria-label="Открыть"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-green text-primary-foreground transition-transform hover:-translate-y-0.5"
                  >
                    <Icon name="ArrowUpRight" size={16} />
                  </button>
                </div>
              ))}
        </div>

        <div className="animate-rise flex flex-wrap items-center gap-2.5">
          {ads.map((ad) => (
            <a
              key={ad.id}
              href={ad.link || '#top'}
              target={ad.link ? '_blank' : undefined}
              rel={ad.link ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-sm text-foreground transition-colors hover:border-primary/60"
            >
              <Icon name="Megaphone" size={15} className="shrink-0 text-primary" />
              <span className="truncate">{ad.text}</span>
            </a>
          ))}
          <button
            onClick={() => setAdDialogOpen(true)}
            aria-label="Заказать рекламу"
            title="Заказать текстовую рекламу"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green text-primary-foreground shadow-[0_8px_22px_-8px_hsl(var(--brand-green)/0.8)] transition-transform hover:scale-105"
          >
            <Icon name="Plus" size={20} />
          </button>
        </div>

        {/* search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goCatalog();
          }}
          className="animate-rise mx-auto flex w-full max-w-xl overflow-hidden rounded-xl border border-brand-cyan/25 bg-[#ececee]"
          style={{ animationDelay: '0.06s' }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Например: скрипт интернет-магазина"
            aria-label="Поиск по каталогу"
            className="flex-1 bg-transparent px-4 py-3 text-sm text-[#3b4247] outline-none placeholder:text-[#3b4247]/55"
          />
          <button
            type="submit"
            aria-label="Искать"
            className="flex items-center bg-brand-cyan/80 px-4 text-primary-foreground transition-colors hover:bg-brand-cyan"
          >
            <Icon name="Search" size={18} />
          </button>
        </form>

        {/* hero panel */}
        <div
          className="animate-rise relative mt-1.5 flex flex-col items-start gap-8 rounded-2xl border-[1.5px] border-brand-cyan/60 bg-card/90 p-7 shadow-[0_0_0_1px_hsl(var(--brand-cyan)/0.18),0_24px_60px_-30px_hsl(var(--brand-cyan)/0.7)] md:flex-row md:items-center md:p-10"
          style={{ animationDelay: '0.12s' }}
        >
          <div className="min-w-0 flex-1">
            <div className="mb-3.5 flex items-center gap-2.5 font-head text-xs font-medium uppercase tracking-[0.14em] text-brand-cyan">
              Php-Skript <span className="text-muted-foreground/70">/</span>
              <span className="text-muted-foreground/70">Магазин цифровых товаров</span>
            </div>
            <h1 className="font-head text-4xl font-bold uppercase leading-[1.04] tracking-tight text-foreground md:text-[52px]">
              Готовые PHP-скрипты
              <br />
              <em className="not-italic text-primary">купил, скачал, запустил</em>
            </h1>
            <p className="mt-4 max-w-[44ch] leading-relaxed text-muted-foreground">
              Исходный код, шаблоны и плагины для сайтов. Оплата{' '}
              <b className="font-bold text-foreground">AZVOX</b> и{' '}
              <b className="font-bold text-foreground">ЮMoney</b>&nbsp;— ссылка на скачивание
              приходит сразу после платежа, без ожидания.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={goCatalog}
              className="cta-gradient inline-flex items-center gap-2.5 rounded-xl px-7 py-4 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <Icon name="Download" size={19} />
              Купить и скачать
            </button>
            <div className="mt-3.5 flex items-center justify-start gap-2.5 text-xs text-muted-foreground md:justify-end">
              <span className="rounded-md border border-brand-cyan/35 px-2.5 py-1 font-head font-semibold tracking-wide text-brand-cyan">
                AZVOX
              </span>
              <span className="rounded-md border border-brand-cyan/35 px-2.5 py-1 font-head font-semibold tracking-wide text-brand-cyan">
                ЮMoney
              </span>
            </div>
          </div>
        </div>
      </div>

      <AdOrderDialog open={adDialogOpen} onOpenChange={setAdDialogOpen} />
    </section>
  );
};

export default Hero;