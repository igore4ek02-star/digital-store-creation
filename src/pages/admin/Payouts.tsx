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
import { toast } from 'sonner';
import { formatPrice } from '@/components/site/products';
import { API } from '@/lib/api';
import { getAuthToken } from '@/hooks/use-auth';
import AdminGuard from '@/components/site/AdminGuard';

interface Payout {
  id: number;
  amount: number;
  method: string;
  wallet: string;
  status: string;
  createdAt: string;
  userName: string;
  userEmail: string;
}

const statusLabel = (s: string) =>
  ({ pending: 'В обработке', completed: 'Выплачено', rejected: 'Отклонено' }[s] || s);
const statusColor = (s: string) =>
  s === 'pending' ? 'text-primary' : s === 'completed' ? 'text-brand-green' : 'text-destructive';

const AdminPayouts = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`${API.admin}?section=payouts`, {
      headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
    })
      .then((r) => r.json())
      .then((d) => setPayouts(d.payouts || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const process = async (id: number, status: string) => {
    const res = await fetch(API.admin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ action: 'process-payout', id, status }),
    });
    if (!res.ok) {
      toast.error('Не удалось обновить статус');
      return;
    }
    toast.success(status === 'completed' ? 'Выплата отмечена как выполненная' : 'Заявка отклонена');
    setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  return (
    <AdminGuard>
      <h1 className="mb-6 font-head text-3xl font-bold uppercase tracking-tight text-foreground">
        Вывод средств
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Заявки пользователей на выплату через AZVOX и ЮMoney.
      </p>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="h-40 animate-pulse" />
        ) : payouts.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Заявок пока нет.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead className="hidden md:table-cell">Реквизиты</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">{p.userName}</p>
                    <p className="text-xs text-muted-foreground">{p.userEmail}</p>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {p.method} · {p.wallet}
                  </TableCell>
                  <TableCell className="font-head font-semibold text-foreground">
                    {formatPrice(p.amount)}
                  </TableCell>
                  <TableCell className={`font-medium ${statusColor(p.status)}`}>
                    {statusLabel(p.status)}
                  </TableCell>
                  <TableCell>
                    {p.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => process(p.id, 'completed')}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-brand-green/50 hover:text-brand-green"
                          aria-label="Выплатить"
                        >
                          <Icon name="Check" size={15} />
                        </button>
                        <button
                          onClick={() => process(p.id, 'rejected')}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                          aria-label="Отклонить"
                        >
                          <Icon name="X" size={15} />
                        </button>
                      </div>
                    )}
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

export default AdminPayouts;
