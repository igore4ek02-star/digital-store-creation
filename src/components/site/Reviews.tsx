import Icon from '@/components/ui/icon';

const REVIEWS = [
  {
    name: 'Алексей М.',
    role: 'Веб-разработчик',
    text: 'Купил CMS магазина — исходники чистые, документация понятная. Запустил клиенту за вечер. Оплатил через ЮMoney, ссылка пришла моментально.',
    rating: 5,
  },
  {
    name: 'Ирина К.',
    role: 'Фрилансер',
    text: 'Беру шаблоны лендингов регулярно. Адаптив отличный, правки вносятся легко. Экономит кучу времени на проектах.',
    rating: 5,
  },
  {
    name: 'Дмитрий В.',
    role: 'Владелец бизнеса',
    text: 'Заказал плагин приёма платежей и установку под ключ. Всё настроили быстро, приём оплаты через AZVOX заработал сразу.',
    rating: 5,
  },
  {
    name: 'Сергей Т.',
    role: 'Стартап',
    text: 'Готовый проект каталога услуг сэкономил нам месяцы разработки. Код поддерживаемый, поддержка отвечает по делу.',
    rating: 4,
  },
  {
    name: 'Наталья П.',
    role: 'Владелец сайта',
    text: 'Понравилось, что скачивание сразу после оплаты — не пришлось ничего ждать. Скрипт доски объявлений работает стабильно.',
    rating: 5,
  },
  {
    name: 'Роман Л.',
    role: 'Веб-студия',
    text: 'Регулярно закупаем плагины для клиентских сайтов. Цены адекватные, качество кода на уровне. Рекомендую.',
    rating: 5,
  },
];

const Reviews = () => {
  return (
    <section id="reviews" className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
      <div className="mb-12 flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-3 font-head text-xs font-medium uppercase tracking-[0.14em] text-brand-cyan">
            Отзывы клиентов
          </p>
          <h2 className="max-w-2xl font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-5xl">
            Нам доверяют разработчики и бизнес
          </h2>
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
    </section>
  );
};

export default Reviews;
