import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatPrice } from '@/components/site/products';
import { API } from '@/lib/api';
import { getAuthToken } from '@/hooks/use-auth';
import AdminGuard from '@/components/site/AdminGuard';

interface VipProduct {
  id: number;
  title: string;
  price: number;
  category: string;
  icon: string;
  coverImage: string | null;
  vipUntil: string;
  sellerName: string | null;
  sellerEmail: string | null;
}

const AdminVip = () => {
  const [products, setProducts] = useState<VipProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [price, setPrice] = useState('199');
  const [defaultDays, setDefaultDays] = useState('7');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API.admin}?section=vip-products`, {
        headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
      }).then((r) => r.json()),
      fetch(`${API.admin}?section=vip-settings`, {
        headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
      }).then((r) => r.json()),
    ])
      .then(([productsData, settingsData]) => {
        setProducts(productsData.products || []);
        if (typeof settingsData.pricePerDay === 'number') setPrice(String(settingsData.pricePerDay));
        if (typeof settingsData.defaultDays === 'number') setDefaultDays(String(settingsData.defaultDays));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(API.admin, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          action: 'update-vip-settings',
          pricePerDay: Number(price),
          defaultDays: Number(defaultDays),
        }),
      });
      if (!res.ok) {
        toast.error('Не удалось сохранить настройки');
        return;
      }
      toast.success('Настройки VIP-продвижения сохранены');
    } finally {
      setSaving(false);
    }
  };

  const revokeVip = async (id: number) => {
    const res = await fetch(API.admin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ action: 'revoke-vip', id }),
    });
    if (!res.ok) {
      toast.error('Не удалось снять VIP');
      return;
    }
    toast.success('VIP-статус снят');
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <AdminGuard>
      <h1 className="mb-6 font-head text-3xl font-bold uppercase tracking-tight text-foreground">
        VIP-продвижение
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Продавцы платят за размещение товара в верхнем блоке на главной странице. Здесь можно
        менять цену за сутки, срок по умолчанию и снимать VIP-статус вручную.
      </p>

      <div className="mb-8 rounded-2xl border border-border bg-card p-5 md:max-w-md">
        <h2 className="mb-4 font-head text-sm font-semibold uppercase tracking-wide text-foreground">
          Цена и срок
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vip-price">₽ / сутки</Label>
              <Input id="vip-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vip-days">Срок по умолчанию, дней</Label>
              <Input
                id="vip-days"
                type="number"
                value={defaultDays}
                onChange={(e) => setDefaultDays(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Icon name="Check" size={16} />
            Сохранить
          </button>
        </div>
      </div>

      <h2 className="mb-4 font-head text-sm font-semibold uppercase tracking-wide text-foreground">
        Активные VIP-товары ({products.length})
      </h2>
      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">Пока никто не активировал VIP-продвижение.</p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon name={p.icon} size={22} />
                </span>
                <div>
                  <p className="flex items-center gap-1.5 font-head font-semibold uppercase tracking-wide text-foreground">
                    {p.title}
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-primary px-1.5 py-0.5 font-head text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
                      <Icon name="Crown" size={9} />
                      VIP
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.category} · {formatPrice(p.price)} · {p.sellerName || p.sellerEmail || 'Без продавца'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">до {p.vipUntil}</span>
                <button
                  onClick={() => revokeVip(p.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 font-head text-xs font-semibold uppercase tracking-wide text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Icon name="X" size={13} />
                  Снять VIP
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminGuard>
  );
};

export default AdminVip;
