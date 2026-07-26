import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import BuyDialog from '@/components/site/BuyDialog';
import { Category, Product, fetchProducts, formatPrice } from '@/components/site/products';

interface CategoryMeta {
  category: Category;
  title: string;
  description: string;
}

const CATEGORY_MAP: Record<string, CategoryMeta> = {
  scripts: {
    category: 'Скрипты',
    title: 'PHP-скрипты',
    description: 'Готовые PHP-скрипты с открытым исходным кодом для быстрого запуска проекта.',
  },
  templates: {
    category: 'Шаблоны',
    title: 'Шаблоны сайтов',
    description: 'Адаптивные шаблоны для лендингов, интернет-магазинов и корпоративных сайтов.',
  },
  plugins: {
    category: 'Плагины',
    title: 'Плагины и модули',
    description: 'Модули и плагины для расширения функциональности вашего сайта.',
  },
  projects: {
    category: 'Проекты',
    title: 'Готовые проекты',
    description: 'Полноценные проекты под ключ — от идеи до запуска за минуты.',
  },
};

const CategoryPage = () => {
  const { category: slug } = useParams<{ category: string }>();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const meta = slug ? CATEGORY_MAP[slug] : undefined;

  useEffect(() => {
    if (!meta) {
      navigate('/', { replace: true });
      return;
    }
  }, [meta, navigate]);

  useEffect(() => {
    if (!meta) return;
    setLoading(true);
    fetchProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [meta]);

  const list = useMemo(
    () => (meta ? products.filter((p) => p.category === meta.category) : []),
    [products, meta],
  );

  const buy = (p: Product) => {
    setSelected(p);
    setOpen(true);
  };

  if (!meta) return null;

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-brand-cyan">
            Каталог
          </Link>
          <Icon name="ChevronRight" size={14} />
          <span className="text-foreground">{meta.title}</span>
        </nav>

        <h1 className="font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-5xl">
          {meta.title}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{meta.description}</p>

        <div className="mt-10">
          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border border-border bg-card"
                />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-20 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan">
                <Icon name="PackageOpen" size={28} />
              </span>
              <p className="font-head text-lg font-semibold uppercase tracking-wide text-foreground">
                Пока нет товаров в этой категории
              </p>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Загляните позже — каталог регулярно пополняется новыми товарами.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-head text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                На главную
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((p) => (
                <article
                  key={p.id}
                  className="group flex animate-fade-in flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-brand-cyan/50"
                >
                  <Link
                    to={`/product/${p.slug}`}
                    className="mb-4 flex items-start justify-between"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan transition-colors group-hover:bg-brand-cyan/20">
                      <Icon name={p.icon} size={24} />
                    </span>
                    {p.tag && (
                      <span className="rounded-md bg-primary/15 px-2.5 py-1 font-head text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {p.tag}
                      </span>
                    )}
                  </Link>
                  <Link to={`/product/${p.slug}`}>
                    <h3 className="font-head text-lg font-semibold uppercase leading-snug tracking-wide text-foreground transition-colors hover:text-brand-cyan">
                      {p.title}
                    </h3>
                  </Link>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {p.desc}
                  </p>

                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-primary">
                      <Icon name="Star" size={13} />
                      {p.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="Download" size={13} />
                      {p.sales} продаж
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <span className="font-head text-xl font-bold text-foreground">
                      {formatPrice(p.price)}
                    </span>
                    <button
                      onClick={() => buy(p)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3.5 py-2 font-head text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
                    >
                      <Icon name="ShoppingCart" size={15} />
                      Купить
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <BuyDialog product={selected} open={open} onOpenChange={setOpen} />
      <Footer />
    </div>
  );
};

export default CategoryPage;
