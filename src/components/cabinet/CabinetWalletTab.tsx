import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatPrice } from '@/components/site/products';

export interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export const PAYMENTS = [
  { id: 'ROBOKASSA', label: 'Робокасса', desc: 'Карты, SberPay и другие способы' },
] as const;

interface Props {
  transactions: Transaction[];
  walletLoading: boolean;
  topupOpen: boolean;
  setTopupOpen: (v: boolean) => void;
  amount: string;
  setAmount: (v: string) => void;
  method: string;
  setMethod: (v: string) => void;
  submitting: boolean;
  doTopup: () => void;
}

const CabinetWalletTab = ({
  transactions,
  walletLoading,
  topupOpen,
  setTopupOpen,
  amount,
  setAmount,
  method,
  setMethod,
  submitting,
  doTopup,
}: Props) => {
  return (
    <>
      <TabsContent value="wallet">
        {walletLoading ? (
          <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
        ) : (
          <div>
            <h3 className="mb-3 font-head text-sm font-semibold uppercase tracking-wide text-foreground">
              История операций
            </h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока нет операций.</p>
            ) : (
              <div className="space-y-2.5">
                {transactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div>
                      <p className="text-sm text-foreground">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.createdAt}</p>
                    </div>
                    <span
                      className={`font-head text-sm font-bold ${t.amount >= 0 ? 'text-brand-green' : 'text-destructive'}`}
                    >
                      {t.amount >= 0 ? '+' : ''}
                      {formatPrice(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </TabsContent>

      {/* Пополнение баланса */}
      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-head text-xl uppercase tracking-wide">
              Пополнить баланс
            </DialogTitle>
            <DialogDescription>
              Выберите систему оплаты и укажите сумму пополнения.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Система оплаты</Label>
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
                  <span className="font-head text-sm font-semibold">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="topup-amount">Сумма, ₽</Label>
            <Input
              id="topup-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
            />
          </div>
          <button
            onClick={doTopup}
            disabled={submitting}
            className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Icon name="CreditCard" size={18} />
            Пополнить
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CabinetWalletTab;