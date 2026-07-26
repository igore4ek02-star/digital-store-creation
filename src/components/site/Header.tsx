import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

const NAV = [
  { label: 'Каталог', href: '#catalog' },
  { label: 'Как это работает', href: '#how' },
  { label: 'Отзывы', href: '#reviews' },
  { label: 'Новости', href: '#news' },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors ${
        scrolled ? 'border-border bg-[#16191c]/95 backdrop-blur' : 'border-transparent bg-[#16191c]'
      }`}
    >
      <div className="mx-auto flex h-[70px] max-w-7xl items-center gap-9 px-5 md:px-8">
        <a href="#top" className="flex shrink-0 items-center gap-3">
          <img src="/img/logo.png" alt="Php-Skript" className="h-8 w-auto" />
        </a>

        <nav className="ml-2 hidden items-center gap-8 lg:flex">
          {NAV.map((n) =>
            isHome ? (
              <button
                key={n.href}
                onClick={() => scrollTo(n.href)}
                className="font-head text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-brand-cyan"
              >
                {n.label}
              </button>
            ) : (
              <Link
                key={n.href}
                to={`/${n.href}`}
                className="font-head text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-brand-cyan"
              >
                {n.label}
              </Link>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            to={user ? '/cabinet' : '/auth'}
            className="hidden items-center gap-2 rounded-full border border-border px-4 py-2 font-head text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan md:inline-flex"
          >
            <Icon name={user ? 'CircleUser' : 'LogIn'} size={15} />
            {user ? 'Кабинет' : 'Войти'}
          </Link>
          {isHome ? (
            <a
              href="#catalog"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('#catalog');
              }}
              className="hidden rounded-full bg-primary px-5 py-2 font-head text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 sm:inline-block"
            >
              В каталог
            </a>
          ) : (
            <Link
              to="/#catalog"
              className="hidden rounded-full bg-primary px-5 py-2 font-head text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 sm:inline-block"
            >
              В каталог
            </Link>
          )}
          <button
            className="text-foreground lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Меню"
          >
            <Icon name={open ? 'X' : 'Menu'} size={26} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-[#16191c] px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((n) =>
              isHome ? (
                <button
                  key={n.href}
                  onClick={() => scrollTo(n.href)}
                  className="rounded-lg px-3 py-3 text-left font-head text-base uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted hover:text-brand-cyan"
                >
                  {n.label}
                </button>
              ) : (
                <Link
                  key={n.href}
                  to={`/${n.href}`}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-left font-head text-base uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted hover:text-brand-cyan"
                >
                  {n.label}
                </Link>
              ),
            )}
            <Link
              to={user ? '/cabinet' : '/auth'}
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg px-3 py-3 text-left font-head text-base uppercase tracking-wide text-foreground"
            >
              {user ? 'Личный кабинет' : 'Вход и регистрация'}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;