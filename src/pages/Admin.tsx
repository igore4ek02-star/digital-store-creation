import { useEffect, useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { formatPrice, Product, fetchProducts } from '@/components/site/products';
import { API } from '@/lib/api';
import AdminGuard from '@/components/site/AdminGuard';

const emptyForm = { title: '', desc: '', fullDescription: '', price: '', category: 'Скрипты', icon: 'FileCode2' };

const Admin = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      title: p.title,
      desc: p.desc,
      fullDescription: p.fullDescription || '',
      price: String(p.price),
      category: p.category,
      icon: p.icon,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.price) {
      toast.error('Заполните название и цену');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        desc: form.desc,
        fullDescription: form.fullDescription,
        price: Number(form.price),
        category: form.category,
        icon: form.icon,
      };
      const res = await fetch(API.products, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { ...payload, id: editing.id } : payload),
      });
      if (!res.ok) {
        toast.error('Не удалось сохранить товар');
        return;
      }
      toast.success(editing ? 'Товар обновлён' : 'Товар добавлен');
      setDialogOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const res = await fetch(`${API.products}?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Не удалось удалить товар');
      return;
    }
    toast.success('Товар удалён');
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const stats = [
    { label: 'Товаров в каталоге', value: products.length, icon: 'Package' },
    { label: 'Способы оплаты', value: 'AZVOX · ЮMoney', icon: 'CreditCard' },
  ];

  return (
    <AdminGuard>
      <h1 className="mb-6 font-head text-3xl font-bold uppercase tracking-tight text-foreground">
        Товары
      </h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        {loading ? (
          <div className="h-40 animate-pulse" />
        ) : (
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
        )}
      </div>

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
              <Label htmlFor="p-desc">Краткое описание</Label>
              <Textarea
                id="p-desc"
                value={form.desc}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                placeholder="Краткое описание товара для карточки"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-full">Полное описание (на странице товара)</Label>
              <Textarea
                id="p-full"
                value={form.fullDescription}
                onChange={(e) => setForm({ ...form, fullDescription: e.target.value })}
                placeholder="Подробное описание товара"
                className="min-h-24"
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
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              Сохранить
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminGuard>
  );
};

export default Admin;
