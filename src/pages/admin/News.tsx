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
import { toast } from 'sonner';
import { API } from '@/lib/api';
import { getAuthToken } from '@/hooks/use-auth';
import AdminGuard from '@/components/site/AdminGuard';
import { NewsItem, fetchNews } from '@/components/site/News';

const emptyForm = { title: '', tag: 'Новость', text: '', fullText: '', icon: 'Newspaper' };

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Authorization': `Bearer ${getAuthToken()}`,
});

const AdminNews = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchNews()
      .then(setNews)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (n: NewsItem) => {
    setEditing(n);
    setForm({ title: n.title, tag: n.tag, text: n.text, fullText: n.fullText, icon: n.icon });
    setDialogOpen(true);
  };

  const save = async () => {
    if (form.title.trim().length < 2 || form.text.trim().length < 2) {
      toast.error('Заполните заголовок и текст новости');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        tag: form.tag,
        text: form.text,
        fullText: form.fullText || form.text,
        icon: form.icon,
      };
      const res = await fetch(API.news, {
        method: editing ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(editing ? { ...payload, id: editing.id } : payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось сохранить новость');
        return;
      }
      toast.success(editing ? 'Новость обновлена' : 'Новость опубликована');
      setDialogOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const res = await fetch(`${API.news}&id=${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      toast.error('Не удалось удалить новость');
      return;
    }
    toast.success('Новость удалена');
    setNews((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <AdminGuard>
      <h1 className="mb-6 font-head text-3xl font-bold uppercase tracking-tight text-foreground">
        Новости
      </h1>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Публикации отображаются на главной странице и на /news
        </p>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          <Icon name="Plus" size={16} />
          Добавить новость
        </button>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      ) : news.length === 0 ? (
        <p className="text-sm text-muted-foreground">Новостей пока нет.</p>
      ) : (
        <div className="space-y-3">
          {news.map((n) => (
            <div
              key={n.id}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan">
                  <Icon name={n.icon} size={18} />
                </span>
                <div>
                  <p className="font-head font-semibold text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.tag} · {n.publishedAt}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => openEdit(n)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan"
                  aria-label="Редактировать"
                >
                  <Icon name="Pencil" size={15} />
                </button>
                <button
                  onClick={() => remove(n.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                  aria-label="Удалить"
                >
                  <Icon name="Trash2" size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-head uppercase tracking-wide">
              {editing ? 'Редактировать новость' : 'Новая новость'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="n-title">Заголовок</Label>
              <Input
                id="n-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Например: Запустили новую функцию"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-tag">Тег</Label>
              <Input
                id="n-tag"
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                placeholder="Обновление / Каталог / Услуги..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-text">Краткий текст (для карточки)</Label>
              <Textarea
                id="n-text"
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                placeholder="Краткое описание новости"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-full">Полный текст (на странице новости)</Label>
              <Textarea
                id="n-full"
                value={form.fullText}
                onChange={(e) => setForm({ ...form, fullText: e.target.value })}
                placeholder="Подробный текст новости"
                className="min-h-32"
              />
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

export default AdminNews;
