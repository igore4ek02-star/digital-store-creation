import { useEffect, useState } from 'react';
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

interface UserActivity {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  lastSeen: string | null;
  ordersCount: number;
}

const AdminActivity = () => {
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API.admin}?section=users-activity`, {
      headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
    })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setLoading(false));
  }, []);

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const [datePart, timePart] = lastSeen.split(' ');
    const [d, m, y] = datePart.split('.');
    const seenDate = new Date(`${y}-${m}-${d}T${timePart}`);
    return Date.now() - seenDate.getTime() < 60000;
  };

  return (
    <AdminGuard>
      <h1 className="mb-6 font-head text-3xl font-bold uppercase tracking-tight text-foreground">
        Активность пользователей
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Когда пользователь заходил в последний раз и сколько заказов оформил.
      </p>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="h-40 animate-pulse" />
        ) : users.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Пока нет данных.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                <TableHead>Последний визит</TableHead>
                <TableHead className="hidden md:table-cell">Регистрация</TableHead>
                <TableHead className="text-right">Заказов</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-foreground">{u.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{u.email}</TableCell>
                  <TableCell>
                    {u.lastSeen ? (
                      <span className="inline-flex items-center gap-1.5">
                        {isOnline(u.lastSeen) && (
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                        )}
                        <span className="text-muted-foreground">{u.lastSeen}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {u.createdAt}
                  </TableCell>
                  <TableCell className="text-right font-head font-semibold text-foreground">
                    {u.ordersCount}
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

export default AdminActivity;