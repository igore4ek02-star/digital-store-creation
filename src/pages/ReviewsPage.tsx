import Icon from '@/components/ui/icon';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import { REVIEWS } from '@/components/site/Reviews';

const ReviewsPage = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="mb-10 flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-5xl">
              Отзывы клиентов
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Что говорят разработчики, фрилансеры и владельцы бизнеса о наших товарах и услугах.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
            <span className="font-head text-4xl font-bold text-primary">4.9</span>
            <div>
              <div className="flex text-primary">
                {[...Array(5)].map((_, i) => (
                  <Icon key={i} name="Star" size={16} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">на основе 1 200+ отзывов</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((r) => (
            <figure
              key={r.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand-cyan/40"
            >
              <div className="mb-3 flex text-primary">
                {[...Array(5)].map((_, i) => (
                  <Icon
                    key={i}
                    name="Star"
                    size={16}
                    className={i < r.rating ? '' : 'opacity-25'}
                  />
                ))}
              </div>
              <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
                «{r.text}»
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-cyan/15 font-head font-bold text-brand-cyan">
                  {r.name.charAt(0)}
                </span>
                <span>
                  <span className="block font-head text-sm font-semibold uppercase tracking-wide text-foreground">
                    {r.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">{r.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReviewsPage;
