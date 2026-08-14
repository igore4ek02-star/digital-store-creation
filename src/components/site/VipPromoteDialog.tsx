import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { Product, formatPrice } from './products';
import { API } from '@/lib/api';
import { getAuthToken, useAuth } from '@/hooks/use-auth';

interface Props {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

const VipPromoteDialog = ({ product, open, onOpenChange, onSuccess }: Props) => {
  const { user, refreshUser } = useAuth();
  const [pricePerDay, setPricePerDay] = useState(199);
  const [days, setDays] = useState('7');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(API.vip)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.pricePerDay === 'number') setPricePerDay(d.pricePerDay);
        if (typeof d.defaultDays === 'number') setDays(String(d.defaultDays));
      })
      .catch(() => {});
  }, [open]);

  if (!product) return null;

  const daysNum = Number(days) || 0;
  const total = pricePerDay * daysNum;

  const submit = async () => {
    if (daysNum < 1) {
      toast.error('Укажите срок продвижения (не менее 1 дня)');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API.vip, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ productId: product.id, days: daysNum }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось активировать VIP');
        return;
      }
      toast.success('VIP-продвижение активировано', {
        description: `«${product.title}» будет в топе ${daysNum} дн.`,
      });
      await refreshUser();
      onSuccess();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon name="Crown" size={22} />
          </div>
          <DialogTitle className="font-head text-xl uppercase tracking-wide">
            VIP-продвижение
          </DialogTitle>
          <DialogDescription>
            «{product.title}» будет показан в верхнем блоке на главной странице.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="vip-days">Срок продвижения, дней</Label>
          <Input
            id="vip-days"
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{formatPrice(pricePerDay)} / сутки</p>
        </div>

        <div className="flex items-baseline justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
          <span className="text-sm text-muted-foreground">К оплате с баланса</span>
          <span className="font-head text-2xl font-bold text-primary">{formatPrice(total)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Баланс: {formatPrice(user?.balance || 0)}
        </p>

        <button
          onClick={submit}
          disabled={submitting}
          className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          <Icon name="Crown" size={18} />
          {submitting ? 'Активируем…' : 'Активировать VIP'}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default VipPromoteDialog;
