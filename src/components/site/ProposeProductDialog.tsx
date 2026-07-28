import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { getAuthToken } from '@/hooks/use-auth';
import { API } from '@/lib/api';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDraftCreated: (product: { id: number; title: string }) => void;
}

const emptyForm = { title: '', desc: '', fullDescription: '', price: '', category: 'Скрипты', icon: 'FileCode2' };

const ProposeProductDialog = ({ open, onOpenChange, onDraftCreated }: Props) => {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (form.title.trim().length < 2 || !form.price) {
      toast.error('Заполните название и цену');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API.products, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          action: 'create-draft',
          title: form.title,
          desc: form.desc,
          fullDescription: form.fullDescription,
          price: Number(form.price),
          category: form.category,
          icon: form.icon,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось создать товар');
        return;
      }
      toast.success('Данные сохранены, добавьте медиафайлы');
      setForm(emptyForm);
      onOpenChange(false);
      onDraftCreated({ id: data.product.id, title: data.product.title });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-head uppercase tracking-wide">Предложить товар</DialogTitle>
          <DialogDescription>
            Укажите название, описание и цену. На следующем шаге загрузите скриншоты и файл — товар уйдёт на модерацию.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pp-title">Название</Label>
            <Input
              id="pp-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Например: Скрипт учёта задач"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-desc">Краткое описание</Label>
            <Textarea
              id="pp-desc"
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
              placeholder="Краткое описание для карточки"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-full">Полное описание</Label>
            <Textarea
              id="pp-full"
              value={form.fullDescription}
              onChange={(e) => setForm({ ...form, fullDescription: e.target.value })}
              placeholder="Подробное описание товара"
              className="min-h-24"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pp-price">Цена, ₽</Label>
              <Input
                id="pp-price"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="990"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-cat">Категория</Label>
              <select
                id="pp-cat"
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
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2.5 font-head text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Icon name="ArrowRight" size={15} />
            Далее: медиафайлы
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProposeProductDialog;
