import Icon from '@/components/ui/icon';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import { NEWS } from '@/components/site/News';

const NewsPage = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <h1 className="font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-5xl">
          Новости Php-Skript
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Обновления каталога, новые услуги и всё, что происходит в магазине.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {NEWS.map((n) => (
            <article
              key={n.title}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand-cyan/40"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan">
                  <Icon name={n.icon} size={22} />
                </span>
                <span className="rounded-md bg-muted px-2.5 py-1 font-head text-[11px] font-semibold uppercase tracking-wide text-brand-cyan">
                  {n.tag}
                </span>
              </div>
              <time className="text-xs text-muted-foreground">{n.date}</time>
              <h3 className="mt-2 font-head text-lg font-semibold uppercase leading-snug tracking-wide text-foreground">
                {n.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {n.text}
              </p>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NewsPage;
