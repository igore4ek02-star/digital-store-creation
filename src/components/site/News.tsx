import Icon from '@/components/ui/icon';

const NEWS = [
  {
    date: '24 июля 2026',
    tag: 'Обновление',
    title: 'Добавили приём оплаты через AZVOX',
    text: 'Теперь оплатить любой товар можно через платёжную систему AZVOX — рядом с ЮMoney. Ссылка на скачивание приходит мгновенно.',
    icon: 'Wallet',
  },
  {
    date: '18 июля 2026',
    tag: 'Каталог',
    title: '20 новых PHP-скриптов в каталоге',
    text: 'Пополнили раздел готовых проектов: доски объявлений, каталоги услуг и платформы онлайн-курсов с полными исходниками.',
    icon: 'PackagePlus',
  },
  {
    date: '9 июля 2026',
    tag: 'Услуги',
    title: 'Запустили установку «под ключ»',
    text: 'Не хотите разбираться сами? Наши специалисты установят и настроят купленный скрипт на вашем хостинге под ключ.',
    icon: 'Wrench',
  },
];

const News = () => {
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

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
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
              <span className="mt-4 inline-flex items-center gap-1.5 font-head text-sm font-medium uppercase tracking-wide text-primary transition-transform group-hover:translate-x-1">
                Читать <Icon name="ArrowRight" size={15} />
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default News;
