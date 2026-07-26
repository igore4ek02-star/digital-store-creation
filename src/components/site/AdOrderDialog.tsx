import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { useAuth, getAuthToken } from '@/hooks/use-auth';
import { API } from '@/lib/api';
import { formatPrice } from './products';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const AdOrderDialog = ({ open, onOpenChange }: Props) => {
  const { user, refreshUser } = useAuth();
  const [pricePerDay, setPricePerDay] = useState(150);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [days, setDays] = useState('3');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(API.ads)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.pricePerDay === 'number') setPricePerDay(d.pricePerDay);
      })
      .catch(() => {});
  }, [open]);

  const daysNum = Number(days) || 0;
  const total = pricePerDay * daysNum;

  const submit = async () => {
    if (text.trim().length < 3) {
      toast.error('Введите текст объявления');
      return;
    }
    if (daysNum < 1) {
      toast.error('Укажите срок показа (не менее 1 дня)');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API.ads, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ text: text.trim(), link: link.trim(), days: daysNum }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось оформить заявку');
        return;
      }
      toast.success('Заявка на рекламу отправлена', {
        description: `Спишем ${formatPrice(total)} после одобрения модератором.`,
      });
      await refreshUser();
      setText('');
      setLink('');
      setDays('3');
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
            <Icon name="Megaphone" size={22} />
          </div>
          <DialogTitle className="font-head text-xl uppercase tracking-wide">
            Текстовая реклама
          </DialogTitle>
          <DialogDescription>
            Объявление появится в верхней карусели сайта после одобрения модератором.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <p className="text-sm text-muted-foreground">
            <Link to="/auth" className="text-brand-cyan hover:underline">
              Войдите в аккаунт
            </Link>
            , чтобы заказать рекламу — оплата спишется с баланса личного кабинета.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="ad-text">Текст объявления</Label>
              <Input
                id="ad-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Например: Скидка 20% на все шаблоны"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad-link">Ссылка (необязательно)</Label>
              <Input
                id="ad-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad-days">Срок показа, дней</Label>
              <Input
                id="ad-days"
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>

            <div className="flex items-baseline justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                {formatPrice(pricePerDay)} × {daysNum || 0} дн.
              </span>
              <span className="font-head text-xl font-bold text-primary">{formatPrice(total)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Баланс: {formatPrice(user.balance)}
            </p>

            <button
              onClick={submit}
              disabled={submitting}
              className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              <Icon name="Megaphone" size={18} />
              Оформить и списать с баланса
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdOrderDialog;
