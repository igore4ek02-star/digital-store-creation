import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { PRODUCTS, formatPrice, Product } from '@/components/site/products';

interface Order {
  id: string;
  product: string;
  email: string;
  method: 'AZVOX' | 'ЮMoney';
  amount: number;
  status: 'Оплачен' | 'Ожидает' | 'Возврат';
  date: string;
}

const ORDERS: Order[] = [
  { id: '#10428', product: 'CMS интернет-магазина', email: 'alex@mail.ru', method: 'ЮMoney', amount: 3490, status: 'Оплачен', date: '25.07.2026' },
  { id: '#10427', product: 'Плагин приёма платежей', email: 'studio@web.ru', method: 'AZVOX', amount: 590, status: 'Оплачен', date: '25.07.2026' },
  { id: '#10426', product: 'Шаблон лендинга «Про»', email: 'irina.k@gmail.com', method: 'ЮMoney', amount: 890, status: 'Ожидает', date: '24.07.2026' },
  { id: '#10425', product: 'Готовый проект «Каталог услуг»', email: 'startup@list.ru', method: 'AZVOX', amount: 3990, status: 'Оплачен', date: '24.07.2026' },
  { id: '#10424', product: 'Скрипт доски объявлений', email: 'roman@bk.ru', method: 'ЮMoney', amount: 1290, status: 'Возврат', date: '23.07.2026' },
];

const emptyForm = { title: '', desc: '', price: '', category: 'Скрипты', icon: 'FileCode2' };

const Admin = () => {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ title: p.title, desc: p.desc, price: String(p.price), category: p.category, icon: p.icon });
    setDialogOpen(true);
  };

  const save = () => {
    if (!form.title.trim() || !form.price) {
      toast.error('Заполните название и цену');
      return;
    }
    if (editing) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editing.id
            ? { ...p, title: form.title, desc: form.desc, price: Number(form.price), category: form.category as Product['category'], icon: form.icon }
            : p,
        ),
      );
      toast.success('Товар обновлён');
    } else {
      setProducts((prev) => [
        {
          id: Date.now(),
          title: form.title,
          desc: form.desc,
          price: Number(form.price),
          category: form.category as Product['category'],
          icon: form.icon,
          rating: 5,
          sales: 0,
        },
        ...prev,
      ]);
      toast.success('Товар добавлен');
    }
    setDialogOpen(false);
  };

  const remove = (id: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success('Товар удалён');
  };

  const revenue = ORDERS.filter((o) => o.status === 'Оплачен').reduce((s, o) => s + o.amount, 0);
  const stats = [
    { label: 'Товаров в каталоге', value: products.length, icon: 'Package' },
    { label: 'Заказов за месяц', value: ORDERS.length, icon: 'ShoppingCart' },
    { label: 'Выручка (оплачено)', value: formatPrice(revenue), icon: 'TrendingUp' },
    { label: 'Способы оплаты', value: 'AZVOX · ЮMoney', icon: 'CreditCard' },
  ];

  const statusColor = (s: Order['status']) =>
    s === 'Оплачен'
      ? 'text-brand-green'
      : s === 'Ожидает'
        ? 'text-primary'
        : 'text-destructive';

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
        <h1 className="mb-8 font-head text-3xl font-bold uppercase tracking-tight text-foreground">
          Панель управления
        </h1>

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Товары</TabsTrigger>
            <TabsTrigger value="orders">Заказы</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Управление каталогом цифровых товаров</p>
              <button
                onClick={openNew}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <Icon name="Plus" size={16} />
                Добавить товар
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Товар</TableHead>
                    <TableHead className="hidden md:table-cell">Категория</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead className="hidden sm:table-cell">Продаж</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-cyan/12 text-brand-cyan">
                            <Icon name={p.icon} size={18} />
                          </span>
                          <span className="font-medium text-foreground">{p.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {p.category}
                      </TableCell>
                      <TableCell className="font-head font-semibold text-foreground">
                        {formatPrice(p.price)}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {p.sales}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan"
                            aria-label="Редактировать"
                          >
                            <Icon name="Pencil" size={15} />
                          </button>
                          <button
                            onClick={() => remove(p.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                            aria-label="Удалить"
                          >
                            <Icon name="Trash2" size={15} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <p className="mb-4 text-sm text-muted-foreground">Последние заказы и статусы оплат</p>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Заказ</TableHead>
                    <TableHead className="hidden md:table-cell">Товар</TableHead>
                    <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                    <TableHead>Оплата</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="hidden lg:table-cell">Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ORDERS.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-head font-semibold text-foreground">{o.id}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{o.product}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{o.email}</TableCell>
                      <TableCell className="text-brand-cyan">{o.method}</TableCell>
                      <TableCell className="font-head font-semibold text-foreground">{formatPrice(o.amount)}</TableCell>
                      <TableCell className={`font-medium ${statusColor(o.status)}`}>{o.status}</TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{o.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-head uppercase tracking-wide">
              {editing ? 'Редактировать товар' : 'Новый товар'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="p-title">Название</Label>
              <Input
                id="p-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Например: CMS интернет-магазина"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-desc">Описание</Label>
              <Textarea
                id="p-desc"
                value={form.desc}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                placeholder="Краткое описание товара"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-price">Цена, ₽</Label>
                <Input
                  id="p-price"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="990"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-cat">Категория</Label>
                <select
                  id="p-cat"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option>Скрипты</option>
                  <option>Шаблоны</option>
                  <option>Плагины</option>
                  <option>Проекты</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="rounded-lg border border-border px-4 py-2.5 font-head text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
            >
              Отмена
            </button>
            <button
              onClick={save}
              className="rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Сохранить
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
