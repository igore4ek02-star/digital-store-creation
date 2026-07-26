import Icon from '@/components/ui/icon';
import { Link } from 'react-router-dom';

const Footer = () => {
  const cols = [
    {
      title: 'Каталог',
      links: ['PHP-скрипты', 'Шаблоны сайтов', 'Плагины и модули', 'Готовые проекты'],
    },
    {
      title: 'Клиентам',
      links: ['Как это работает', 'Оплата AZVOX и ЮMoney', 'Установка под ключ', 'Поддержка'],
    },
    {
      title: 'Компания',
      links: ['О нас', 'Отзывы', 'Новости', 'Договор оферты'],
    },
  ];

  return (
    <footer className="border-t border-border bg-[#131518]">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <img src="/img/logo.png" alt="Php-Skript" className="h-9 w-auto" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Магазин цифровых товаров: PHP-скрипты, шаблоны и плагины. Купил, скачал, запустил.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              <span className="rounded-md border border-brand-cyan/35 px-2.5 py-1 font-head text-xs font-semibold tracking-wide text-brand-cyan">
                AZVOX
              </span>
              <span className="rounded-md border border-brand-cyan/35 px-2.5 py-1 font-head text-xs font-semibold tracking-wide text-brand-cyan">
                ЮMoney
              </span>
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="mb-4 font-head text-sm font-semibold uppercase tracking-wide text-foreground">
                {c.title}
              </h4>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#catalog"
                      className="text-sm text-muted-foreground transition-colors hover:text-brand-cyan"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 md:flex-row">
          <p className="text-xs text-muted-foreground">
            © 2026 Php-Skript. Магазин PHP-скриптов и цифровых товаров.
          </p>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-brand-cyan"
          >
            <Icon name="ShieldCheck" size={14} />
            Панель администратора
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
