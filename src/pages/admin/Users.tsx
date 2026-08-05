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
import UserLink from '@/components/site/UserLink';

interface UserRow {
  id: number;
  name: string;
  email: string;
  balance: number;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`${API.admin}?section=users`, {
      headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
    })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = async (id: number, patch: Partial<Pick<UserRow, 'isBanned' | 'isAdmin'>>) => {
    const res = await fetch(API.admin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ action: 'update-user', id, ...patch }),
    });
    if (!res.ok) {
      toast.error('Не удалось обновить пользователя');
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    toast.success('Изменения сохранены');
  };

  return (
    <AdminGuard>
      <h1 className="mb-6 font-head text-3xl font-bold uppercase tracking-tight text-foreground">
        Управление пользователями
      </h1>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="h-40 animate-pulse" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead className="hidden sm:table-cell">Баланс</TableHead>
                <TableHead className="hidden md:table-cell">Регистрация</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <UserLink userId={u.id} name={u.name} className="font-medium text-foreground hover:text-brand-cyan" />
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell className="hidden font-head font-semibold text-foreground sm:table-cell">
                    {formatPrice(u.balance)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {u.createdAt}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {u.isAdmin && (
                        <span className="rounded-md bg-brand-cyan/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-cyan">
                          Админ
                        </span>
                      )}
                      {u.isBanned && (
                        <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-destructive">
                          Заблокирован
                        </span>
                      )}
                      {!u.isAdmin && !u.isBanned && (
                        <span className="text-xs text-muted-foreground">Активен</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => update(u.id, { isBanned: !u.isBanned })}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors ${
                          u.isBanned
                            ? 'hover:border-brand-green/50 hover:text-brand-green'
                            : 'hover:border-destructive/50 hover:text-destructive'
                        }`}
                        aria-label={u.isBanned ? 'Разблокировать' : 'Заблокировать'}
                        title={u.isBanned ? 'Разблокировать' : 'Заблокировать'}
                      >
                        <Icon name={u.isBanned ? 'Unlock' : 'Lock'} size={15} />
                      </button>
                      <button
                        onClick={() => update(u.id, { isAdmin: !u.isAdmin })}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan"
                        aria-label={u.isAdmin ? 'Убрать права админа' : 'Сделать админом'}
                        title={u.isAdmin ? 'Убрать права админа' : 'Сделать админом'}
                      >
                        <Icon name="ShieldCheck" size={15} />
                      </button>
                    </div>
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

export default AdminUsers;