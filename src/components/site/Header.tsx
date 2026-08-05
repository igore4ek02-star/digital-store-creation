import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, getAuthToken } from '@/hooks/use-auth';
import ProposeProductDialog from '@/components/site/ProposeProductDialog';
import ProductMediaDialog from '@/components/site/ProductMediaDialog';
import { API } from '@/lib/api';

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
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  const [proposeOpen, setProposeOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [draftProduct, setDraftProduct] = useState<{ id: number; title: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const loadUnread = () => {
      fetch(API.conversations, { headers: { 'X-Authorization': `Bearer ${getAuthToken()}` } })
        .then((r) => r.json())
        .then((d) => {
          const total = (d.conversations || []).reduce(
            (sum: number, c: { unreadCount: number }) => sum + c.unreadCount,
            0,
          );
          setUnreadCount(total);
        })
        .catch(() => {});
    };
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const scrollTo = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const openPropose = () => {
    setOpen(false);
    if (!user) {
      navigate('/auth');
      return;
    }
    setProposeOpen(true);
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
          <button
            onClick={openPropose}
            className="hidden items-center gap-2 rounded-full border border-brand-cyan/50 px-4 py-2 font-head text-xs font-semibold uppercase tracking-wide text-brand-cyan transition-colors hover:bg-brand-cyan/10 md:inline-flex"
          >
            <Icon name="Plus" size={15} />
            Добавить товар
          </button>
          {user && (
            <Link
              to="/messages"
              className="relative hidden h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan md:inline-flex"
              aria-label="Личные сообщения"
            >
              <Icon name="MessageCircle" size={17} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </Link>
          )}
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
            <button
              onClick={openPropose}
              className="mt-1 flex items-center gap-2 rounded-lg px-3 py-3 text-left font-head text-base uppercase tracking-wide text-brand-cyan"
            >
              <Icon name="Plus" size={17} />
              Добавить товар
            </button>
            {user && (
              <Link
                to="/messages"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-3 text-left font-head text-base uppercase tracking-wide text-foreground"
              >
                <Icon name="MessageCircle" size={17} />
                Сообщения
                {unreadCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}
            <Link
              to={user ? '/cabinet' : '/auth'}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-left font-head text-base uppercase tracking-wide text-foreground"
            >
              {user ? 'Личный кабинет' : 'Вход и регистрация'}
            </Link>
          </nav>
        </div>
      )}

      <ProposeProductDialog
        open={proposeOpen}
        onOpenChange={setProposeOpen}
        onDraftCreated={(product) => {
          setDraftProduct(product);
          setMediaOpen(true);
        }}
      />
      <ProductMediaDialog
        product={draftProduct}
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        onSubmitted={() => setDraftProduct(null)}
      />
    </header>
  );
};

export default Header;