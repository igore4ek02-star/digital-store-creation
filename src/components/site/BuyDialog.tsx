import { useState } from 'react';
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

interface Props {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PAYMENTS = [
  { id: 'azvox', label: 'AZVOX', icon: 'Wallet', desc: 'Карты и электронные кошельки' },
  { id: 'yoomoney', label: 'ЮMoney', icon: 'CreditCard', desc: 'Оплата картой или из кошелька' },
];

const BuyDialog = ({ product, open, onOpenChange }: Props) => {
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('azvox');
  const [error, setError] = useState('');

  const submit = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Укажите корректный e-mail для получения ссылки');
      return;
    }
    setError('');
    const name = PAYMENTS.find((p) => p.id === method)?.label;
    toast.success('Заказ оформлен', {
      description: `Оплата через ${name}. Ссылка на скачивание придёт на ${email} сразу после платежа.`,
    });
    onOpenChange(false);
    setEmail('');
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon name={product.icon} size={22} />
          </div>
          <DialogTitle className="font-head text-xl uppercase tracking-wide">
            {product.title}
          </DialogTitle>
          <DialogDescription>{product.desc}</DialogDescription>
        </DialogHeader>

        <div className="flex items-baseline justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
          <span className="text-sm text-muted-foreground">К оплате</span>
          <span className="font-head text-2xl font-bold text-primary">
            {formatPrice(product.price)}
          </span>
        </div>

        <div className="space-y-2">
          <Label>Способ оплаты</Label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setMethod(p.id)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                  method === p.id
                    ? 'border-brand-cyan bg-brand-cyan/10'
                    : 'border-border hover:border-brand-cyan/40'
                }`}
              >
                <span className="flex items-center gap-2 font-head text-sm font-semibold">
                  <Icon name={p.icon} size={16} />
                  {p.label}
                </span>
                <span className="text-xs text-muted-foreground">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="buy-email">E-mail для ссылки на скачивание</Label>
          <Input
            id="buy-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <button
          onClick={submit}
          className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          <Icon name="Download" size={18} />
          Оплатить и скачать
        </button>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Icon name="Lock" size={13} />
          Мгновенная выдача файла после подтверждения платежа
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default BuyDialog;
