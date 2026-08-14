import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { CATEGORIES, formatPrice, Product, fetchProducts } from './products';
import BuyDialog from './BuyDialog';

const TABS = [...CATEGORIES, 'Бесплатные'];

const Catalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string>('Все');
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    const filtered =
      active === 'Все'
        ? products
        : active === 'Бесплатные'
          ? products.filter((p) => p.price === 0)
          : products.filter((p) => p.category === active);
    return [...filtered].sort((a, b) => Number(b.isVip) - Number(a.isVip));
  }, [active, products]);

  const buy = (p: Product) => {
    setSelected(p);
    setOpen(true);
  };

  return (
    <section id="catalog" className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-3 font-head text-xs font-medium uppercase tracking-[0.14em] text-brand-cyan">
            Каталог скриптов
          </p>
          <h2 className="max-w-2xl font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-5xl">
            Цифровые товары для сайтов
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            PHP-скрипты, шаблоны, плагины и готовые проекты. Купите, скачайте и запустите за
            минуты.
          </p>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {TABS.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`rounded-full border px-4 py-2 font-head text-sm font-medium uppercase tracking-wide transition-colors ${
              active === c
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-brand-cyan/50 hover:text-brand-cyan'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => (
            <article
              key={p.id}
              className={`group relative flex animate-fade-in flex-col rounded-2xl border bg-card p-5 transition-colors hover:border-brand-cyan/50 ${
                p.isVip ? 'border-primary/60' : 'border-border'
              }`}
            >
              {p.isVip && (
                <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 font-head text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                  <Icon name="Crown" size={11} />
                  VIP
                </span>
              )}
              {p.coverImage ? (
                <Link to={`/product/${p.slug}`} className="relative mb-4 block overflow-hidden rounded-xl">
                  <img
                    src={p.coverImage}
                    alt={p.title}
                    className="h-24 w-full object-cover"
                  />
                  {p.tag && (
                    <span className="absolute right-2 top-2 rounded-md bg-primary/90 px-2.5 py-1 font-head text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
                      {p.tag}
                    </span>
                  )}
                </Link>
              ) : (
                <Link to={`/product/${p.slug}`} className="mb-4 flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan transition-colors group-hover:bg-brand-cyan/20">
                    <Icon name={p.icon} size={24} />
                  </span>
                  {p.tag && (
                    <span className="rounded-md bg-primary/15 px-2.5 py-1 font-head text-[11px] font-semibold uppercase tracking-wide text-primary">
                      {p.tag}
                    </span>
                  )}
                </Link>
              )}
              <Link to={`/product/${p.slug}`}>
                <h3 className="font-head text-lg font-semibold uppercase leading-snug tracking-wide text-foreground transition-colors hover:text-brand-cyan">
                  {p.title}
                </h3>
              </Link>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>

              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-primary">
                  <Icon name="Star" size={13} fallback="Star" />
                  {p.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="Download" size={13} />
                  {p.sales} продаж
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="font-head text-xl font-bold text-foreground">
                  {p.price === 0 ? 'Бесплатно' : formatPrice(p.price)}
                </span>
                <button
                  onClick={() => buy(p)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3.5 py-2 font-head text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  <Icon name={p.price === 0 ? 'Download' : 'ShoppingCart'} size={15} />
                  {p.price === 0 ? 'Скачать' : 'Купить'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <BuyDialog product={selected} open={open} onOpenChange={setOpen} />
    </section>
  );
};

export default Catalog;