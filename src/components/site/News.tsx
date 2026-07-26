import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { API } from '@/lib/api';

export interface NewsItem {
  id: number;
  slug: string;
  title: string;
  tag: string;
  text: string;
  fullText: string;
  icon: string;
  coverImage: string | null;
  publishedAt: string;
}

export const fetchNews = async (): Promise<NewsItem[]> => {
  const res = await fetch(API.news);
  const data = await res.json();
  return data.news || [];
};

const News = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews()
      .then((items) => setNews(items.slice(0, 3)))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && news.length === 0) return null;

  return (
    <section id="news" className="border-y border-border bg-[#16191c]">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="mb-12">
          <p className="mb-3 font-head text-xs font-medium uppercase tracking-[0.14em] text-brand-cyan">
            Новости
          </p>
          <h2 className="max-w-2xl font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-5xl">
            Что нового в Php-Skript
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {news.map((n) => (
              <Link
                key={n.id}
                to={`/news/${n.slug}`}
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
                <time className="text-xs text-muted-foreground">{n.publishedAt}</time>
                <h3 className="mt-2 font-head text-lg font-semibold uppercase leading-snug tracking-wide text-foreground">
                  {n.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {n.text}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 font-head text-sm font-medium uppercase tracking-wide text-primary transition-transform group-hover:translate-x-1">
                  Читать <Icon name="ArrowRight" size={15} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default News;
