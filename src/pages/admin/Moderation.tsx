import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { formatPrice } from '@/components/site/products';
import { API } from '@/lib/api';
import { getAuthToken } from '@/hooks/use-auth';
import AdminGuard from '@/components/site/AdminGuard';

interface PendingProduct {
  id: number;
  title: string;
  desc: string;
  price: number;
  category: string;
  status: string;
  createdAt: string;
  sellerName: string | null;
  sellerEmail: string | null;
}

interface PendingAd {
  id: number;
  text: string;
  link: string | null;
  days: number;
  totalPrice: number;
  status: string;
  createdAt: string;
}

const AdminModeration = () => {
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [ads, setAds] = useState<PendingAd[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`${API.admin}?section=moderation`, {
      headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
        setAds(d.ads || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const moderateProduct = async (id: number, status: string) => {
    const res = await fetch(API.admin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ action: 'moderate-product', id, status }),
    });
    if (!res.ok) {
      toast.error('Не удалось обновить товар');
      return;
    }
    toast.success(status === 'approved' ? 'Товар одобрен' : 'Товар отклонён');
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const moderateAd = async (id: number, status: string) => {
    const res = await fetch(API.admin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ action: 'moderate-ad', id, status }),
    });
    if (!res.ok) {
      toast.error('Не удалось обновить рекламу');
      return;
    }
    toast.success(status === 'active' ? 'Реклама одобрена и опубликована' : 'Реклама отклонена');
    setAds((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <AdminGuard>
      <h1 className="mb-6 font-head text-3xl font-bold uppercase tracking-tight text-foreground">
        Товары на модерации
      </h1>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-4 font-head text-sm font-semibold uppercase tracking-wide text-foreground">
              Товары от пользователей
            </h2>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет товаров на модерации.</p>
            ) : (
              <div className="space-y-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-head font-semibold uppercase tracking-wide text-foreground">
                        {p.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.category} · {formatPrice(p.price)} · от {p.sellerName || 'неизвестно'} (
                        {p.sellerEmail}) · {p.createdAt}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => moderateProduct(p.id, 'approved')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3.5 py-2 font-head text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
                      >
                        <Icon name="Check" size={14} />
                        Одобрить
                      </button>
                      <button
                        onClick={() => moderateProduct(p.id, 'rejected')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 font-head text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                      >
                        <Icon name="X" size={14} />
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 font-head text-sm font-semibold uppercase tracking-wide text-foreground">
              Заявки на рекламу
            </h2>
            {ads.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет заявок на рекламу.</p>
            ) : (
              <div className="space-y-3">
                {ads.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="flex items-center gap-2 font-head font-semibold text-foreground">
                        <Icon name="Megaphone" size={16} className="text-primary" />
                        {a.text}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.days} дн. · {formatPrice(a.totalPrice)} · {a.createdAt}
                        {a.link && ` · ${a.link}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => moderateAd(a.id, 'active')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3.5 py-2 font-head text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
                      >
                        <Icon name="Check" size={14} />
                        Опубликовать
                      </button>
                      <button
                        onClick={() => moderateAd(a.id, 'rejected')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 font-head text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                      >
                        <Icon name="X" size={14} />
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AdminGuard>
  );
};

export default AdminModeration;
