import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/hooks/use-auth';
import AdminNav from './AdminNav';

const AdminGuard = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || !user.isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-5 text-center font-body">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
          <Icon name="ShieldAlert" size={26} />
        </span>
        <h1 className="font-head text-xl font-bold uppercase tracking-wide text-foreground">
          Доступ только для администратора
        </h1>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-head text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan"
        >
          <Icon name="ArrowLeft" size={15} />
          На сайт
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="sticky top-0 z-40 border-b border-border bg-[#16191c]">
        <div className="mx-auto flex h-[70px] max-w-7xl items-center gap-4 px-5 md:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/img/logo.png" alt="Php-Skript" className="h-8 w-auto" />
          </Link>
          <span className="hidden font-head text-sm uppercase tracking-wide text-muted-foreground sm:inline">
            / Админ-панель
          </span>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-head text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan"
          >
            <Icon name="ArrowLeft" size={15} />
            На сайт
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <AdminNav />
        {children}
      </main>
    </div>
  );
};

export default AdminGuard;
