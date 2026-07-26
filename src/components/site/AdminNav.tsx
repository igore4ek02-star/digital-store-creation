import { Link, useLocation } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const ITEMS = [
  { to: '/admin', label: 'Товары', icon: 'Package' },
  { to: '/admin/moderation', label: 'Модерация', icon: 'ShieldCheck' },
  { to: '/admin/banners', label: 'Баннеры', icon: 'Image' },
  { to: '/admin/users', label: 'Пользователи', icon: 'Users' },
  { to: '/admin/activity', label: 'Активность', icon: 'Activity' },
  { to: '/admin/finance', label: 'Финансы', icon: 'Wallet' },
  { to: '/admin/auth-history', label: 'История входов', icon: 'History' },
  { to: '/admin/payouts', label: 'Выплаты', icon: 'Banknote' },
  { to: '/admin/support', label: 'Поддержка', icon: 'Headphones' },
];

const AdminNav = () => {
  const location = useLocation();
  return (
    <nav className="mb-8 flex flex-wrap gap-2">
      {ITEMS.map((item) => {
        const active = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 font-head text-xs font-medium uppercase tracking-wide transition-colors ${
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-brand-cyan/50 hover:text-brand-cyan'
            }`}
          >
            <Icon name={item.icon} size={14} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default AdminNav;