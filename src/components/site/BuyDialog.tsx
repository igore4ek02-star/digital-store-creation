import { useState, useEffect } from 'react';
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
}

const PAYMENTS = [
  { id: 'BALANCE', label: 'С баланса', icon: 'Wallet', desc: 'Списание с баланса аккаунта, мгновенно' },
  { id: 'AZVOX', label: 'AZVOX', icon: 'Wallet', desc: 'Карты и электронные кошельки' },
  { id: 'ЮMoney', label: 'ЮMoney', icon: 'CreditCard', desc: 'Оплата картой или из кошелька' },
];

const downloadFile = async (fileUrl: string, fileName: string) => {
  const res = await fetch(fileUrl);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'file';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const BuyDialog = ({ product, open, onOpenChange }: Props) => {
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState(user ? 'BALANCE' : 'AZVOX');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setMethod(user ? 'BALANCE' : 'AZVOX');
  }, [open, user]);

  const submit = async () => {
    if (!product) return;
    if (method !== 'BALANCE' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Укажите корректный e-mail для получения ссылки');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(API.paymentCreate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ productId: product.id, email, method }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось создать заказ');
        return;
      }

      if (data.provider === 'BALANCE' && data.paid) {
        await downloadFile(data.fileUrl, data.fileName || `${product.title}.zip`);
        toast.success('Оплачено с баланса', {
          description: `Файл «${product.title}» скачивается.`,
        });
        await refreshUser();
        onOpenChange(false);
        return;
      }

      if (data.provider === 'AZVOX' && data.form) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.form.payUrl;
        const fields = ['m_shop', 'm_orderid', 'm_amount', 'm_curr', 'm_desc', 'm_params', 'm_sign'];
        fields.forEach((key) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(data.form[key]);
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        return;
      }

      toast.error('Этот способ оплаты пока недоступен');
    } finally {
      setLoading(false);
    }
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
            {PAYMENTS.filter((p) => p.id !== 'BALANCE' || user).map((p) => (
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
                <span className="text-xs text-muted-foreground">
                  {p.id === 'BALANCE' ? `Баланс: ${formatPrice(user?.balance || 0)}` : p.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {method !== 'BALANCE' && (
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
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          <Icon name="Download" size={18} />
          {loading ? 'Оформляем покупку…' : method === 'BALANCE' ? 'Оплатить с баланса и скачать' : 'Оплатить и скачать'}
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