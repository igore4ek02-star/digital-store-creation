import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatPrice } from '@/components/site/products';
import { API } from '@/lib/api';
import { getAuthToken } from '@/hooks/use-auth';
import AdminGuard from '@/components/site/AdminGuard';

interface Tx {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
  userName: string;
  userEmail: string;
}

const typeLabel = (t: string) =>
  ({ topup: 'Пополнение', payout: 'Выплата', ad_purchase: 'Реклама' }[t] || t);

const AdminFinance = () => {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [totals, setTotals] = useState({ topups: 0, adRevenue: 0, ordersRevenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API.admin}?section=finance`, {
      headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setTransactions(d.transactions || []);
        if (d.totals) setTotals(d.totals);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Пополнения', value: formatPrice(totals.topups), icon: 'ArrowDownCircle' },
    { label: 'Доход с рекламы', value: formatPrice(totals.adRevenue), icon: 'Megaphone' },
    { label: 'Оплаченные заказы', value: formatPrice(totals.ordersRevenue), icon: 'ShoppingCart' },
  ];

  return (
    <AdminGuard>
      <h1 className="mb-6 font-head text-3xl font-bold uppercase tracking-tight text-foreground">
        Финансовая активность
      </h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan">
              <Icon name={s.icon} size={20} />
            </span>
            <p className="font-head text-2xl font-bold text-foreground">{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <p className="mb-4 text-sm text-muted-foreground">Последние транзакции пользователей</p>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="h-40 animate-pulse" />
        ) : transactions.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Транзакций пока нет.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead className="hidden md:table-cell">Описание</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead className="hidden lg:table-cell">Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">{t.userName}</p>
                    <p className="text-xs text-muted-foreground">{t.userEmail}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{typeLabel(t.type)}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {t.description}
                  </TableCell>
                  <TableCell
                    className={`text-right font-head font-semibold ${t.amount >= 0 ? 'text-brand-green' : 'text-destructive'}`}
                  >
                    {t.amount >= 0 ? '+' : ''}
                    {formatPrice(t.amount)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {t.createdAt}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminGuard>
  );
};

export default AdminFinance;
