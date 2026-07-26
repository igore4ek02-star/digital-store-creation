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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { formatPrice } from '@/components/site/products';
import { API } from '@/lib/api';
import { getAuthToken } from '@/hooks/use-auth';
import AdminGuard from '@/components/site/AdminGuard';

interface AdRow {
  id: number;
  text: string;
  link: string | null;
  days: number;
  pricePerDay: number;
  totalPrice: number;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  adType: string;
  imageUrl: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  userName: string;
  userEmail: string;
}

const statusLabel = (s: string) =>
  ({ pending: 'На модерации', active: 'Активна', rejected: 'Отклонена', deleted: 'Удалена' }[s] || s);
const statusColor = (s: string) =>
  s === 'active'
    ? 'text-brand-green'
    : s === 'pending'
      ? 'text-primary'
      : 'text-muted-foreground';

const AdminBanners = () => {
  const [ads, setAds] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'banner' | 'text'>('all');

  const [adPrice, setAdPrice] = useState('150');
  const [bannerPrice, setBannerPrice] = useState('300');
  const [autoPublish, setAutoPublish] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API.admin}?section=banners`, {
        headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
      }).then((r) => r.json()),
      fetch(`${API.admin}?section=ad-settings`, {
        headers: { 'X-Authorization': `Bearer ${getAuthToken()}` },
      }).then((r) => r.json()),
    ])
      .then(([adsData, settingsData]) => {
        setAds(adsData.ads || []);
        if (typeof settingsData.adPricePerDay === 'number') setAdPrice(String(settingsData.adPricePerDay));
        if (typeof settingsData.bannerPricePerDay === 'number')
          setBannerPrice(String(settingsData.bannerPricePerDay));
        setAutoPublish(!!settingsData.autoPublish);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch(API.admin, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          action: 'update-ad-settings',
          adPricePerDay: Number(adPrice),
          bannerPricePerDay: Number(bannerPrice),
          autoPublish,
        }),
      });
      if (!res.ok) {
        toast.error('Не удалось сохранить настройки');
        return;
      }
      toast.success('Настройки рекламы сохранены');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleAutoPublish = async (value: boolean) => {
    setAutoPublish(value);
    const res = await fetch(API.admin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ action: 'update-ad-settings', autoPublish: value }),
    });
    if (!res.ok) {
      toast.error('Не удалось изменить настройку');
      setAutoPublish(!value);
      return;
    }
    toast.success(
      value
        ? 'Реклама теперь публикуется автоматически сразу после оплаты'
        : 'Реклама снова требует ручного одобрения',
    );
  };

  const toggleStatus = async (ad: AdRow) => {
    const newStatus = ad.status === 'active' ? 'rejected' : 'active';
    const res = await fetch(API.admin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ action: 'toggle-ad-status', id: ad.id, status: newStatus }),
    });
    if (!res.ok) {
      toast.error('Не удалось изменить статус');
      return;
    }
    toast.success(newStatus === 'active' ? 'Реклама включена' : 'Реклама выключена');
    setAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, status: newStatus } : a)));
  };

  const removeAd = async (id: number) => {
    const res = await fetch(API.admin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ action: 'delete-ad', id }),
    });
    if (!res.ok) {
      toast.error('Не удалось удалить');
      return;
    }
    toast.success('Реклама удалена');
    setAds((prev) => prev.filter((a) => a.id !== id));
  };

  const visibleAds = ads.filter((a) => a.status !== 'deleted' && (filter === 'all' || a.adType === filter));

  const totals = ads.reduce(
    (acc, a) => ({ impressions: acc.impressions + a.impressions, clicks: acc.clicks + a.clicks }),
    { impressions: 0, clicks: 0 },
  );
  const totalCtr = totals.impressions ? Math.round((totals.clicks / totals.impressions) * 1000) / 10 : 0;

  return (
    <AdminGuard>
      <h1 className="mb-6 font-head text-3xl font-bold uppercase tracking-tight text-foreground">
        Баннеры и реклама
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Управление всей рекламной цепочкой (плюсик вверху сайта): цены, автопубликация, статистика показов и кликов.
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-head text-sm font-semibold uppercase tracking-wide text-foreground">
            Цены и публикация
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ad-price">Текст, ₽/сутки</Label>
                <Input id="ad-price" type="number" value={adPrice} onChange={(e) => setAdPrice(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="banner-price">Баннер, ₽/сутки</Label>
                <Input
                  id="banner-price"
                  type="number"
                  value={bannerPrice}
                  onChange={(e) => setBannerPrice(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              <Icon name="Check" size={16} />
              Сохранить цены
            </button>

            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Автопубликация</p>
                <p className="text-xs text-muted-foreground">
                  Реклама выходит на сайт сразу после оплаты, без ручной модерации
                </p>
              </div>
              <Switch checked={autoPublish} onCheckedChange={toggleAutoPublish} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-head text-sm font-semibold uppercase tracking-wide text-foreground">
            Общая статистика
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted/30 p-3 text-center">
              <p className="font-head text-2xl font-bold text-foreground">{totals.impressions}</p>
              <p className="mt-1 text-xs text-muted-foreground">Показов</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-3 text-center">
              <p className="font-head text-2xl font-bold text-foreground">{totals.clicks}</p>
              <p className="mt-1 text-xs text-muted-foreground">Кликов</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-3 text-center">
              <p className="font-head text-2xl font-bold text-brand-cyan">{totalCtr}%</p>
              <p className="mt-1 text-xs text-muted-foreground">CTR</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        {(['all', 'banner', 'text'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 font-head text-xs font-medium uppercase tracking-wide transition-colors ${
              filter === f
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-brand-cyan/50 hover:text-brand-cyan'
            }`}
          >
            {f === 'all' ? 'Все' : f === 'banner' ? 'Баннеры' : 'Текстовые'}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="h-40 animate-pulse" />
        ) : visibleAds.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Рекламы пока нет.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Реклама</TableHead>
                <TableHead className="hidden md:table-cell">Пользователь</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="hidden sm:table-cell">Показы / клики</TableHead>
                <TableHead className="hidden sm:table-cell">CTR</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleAds.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      {a.adType === 'banner' && a.imageUrl ? (
                        <img
                          src={a.imageUrl}
                          alt={a.text}
                          className="h-6 w-[52px] shrink-0 rounded border border-border object-cover"
                        />
                      ) : (
                        <Icon
                          name={a.adType === 'banner' ? 'Image' : 'Megaphone'}
                          size={16}
                          className="shrink-0 text-primary"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {a.adType === 'banner' ? 'Баннер 468×60' : a.text}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.days} дн. · {a.createdAt}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    <p className="text-foreground">{a.userName}</p>
                    <p className="text-xs">{a.userEmail}</p>
                  </TableCell>
                  <TableCell className={`font-medium ${statusColor(a.status)}`}>
                    {statusLabel(a.status)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {a.impressions} / {a.clicks}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span
                      className={a.ctr > 0 ? 'font-semibold text-brand-cyan' : 'text-muted-foreground'}
                    >
                      {a.ctr}%
                    </span>
                  </TableCell>
                  <TableCell className="font-head font-semibold text-foreground">
                    {formatPrice(a.totalPrice)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {(a.status === 'active' || a.status === 'pending' || a.status === 'rejected') && (
                        <button
                          onClick={() => toggleStatus(a)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors ${
                            a.status === 'active'
                              ? 'hover:border-destructive/50 hover:text-destructive'
                              : 'hover:border-brand-green/50 hover:text-brand-green'
                          }`}
                          aria-label={a.status === 'active' ? 'Выключить' : 'Включить'}
                          title={a.status === 'active' ? 'Выключить показ' : 'Включить показ'}
                        >
                          <Icon name={a.status === 'active' ? 'EyeOff' : 'Eye'} size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => removeAd(a.id)}
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
    </AdminGuard>
  );
};

export default AdminBanners;
