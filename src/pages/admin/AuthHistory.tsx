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
import { API } from '@/lib/api';
import { getAuthToken } from '@/hooks/use-auth';
import AdminGuard from '@/components/site/AdminGuard';

interface HistoryItem {
  id: number;
  action: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  userName: string;
  userEmail: string;
}

const actionLabel = (a: string) =>
  ({ login: 'Вход', register: 'Регистрация', logout: 'Выход' }[a] || a);
const actionIcon = (a: string) =>
  ({ login: 'LogIn', register: 'UserPlus', logout: 'LogOut' }[a] || 'Circle');
const actionColor = (a: string) =>
  a === 'login' ? 'text-brand-green' : a === 'register' ? 'text-brand-cyan' : 'text-muted-foreground';

const AdminAuthHistory = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API.admin}?section=auth-history`, {
      headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
    })
      .then((r) => r.json())
      .then((d) => setHistory(d.history || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminGuard>
      <h1 className="mb-6 font-head text-3xl font-bold uppercase tracking-tight text-foreground">
        История авторизаций
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Все входы, регистрации и выходы пользователей с IP-адресом.
      </p>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="h-40 animate-pulse" />
        ) : history.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Записей пока нет.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead className="hidden sm:table-cell">IP</TableHead>
                <TableHead className="hidden lg:table-cell">Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">{h.userName}</p>
                    <p className="text-xs text-muted-foreground">{h.userEmail}</p>
                  </TableCell>
                  <TableCell className={`inline-flex items-center gap-1.5 ${actionColor(h.action)}`}>
                    <Icon name={actionIcon(h.action)} size={14} />
                    {actionLabel(h.action)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {h.ip || '—'}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {h.createdAt}
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

export default AdminAuthHistory;
