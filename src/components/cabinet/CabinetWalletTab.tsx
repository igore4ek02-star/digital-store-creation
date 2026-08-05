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

export interface Payout {
  id: number;
  amount: number;
  method: string;
  wallet: string;
  status: string;
  createdAt: string;
}

export const PAYMENTS = [
  { id: 'AZVOX', label: 'AZVOX', desc: 'Карты и электронные кошельки' },
  { id: 'ЮMoney', label: 'ЮMoney', desc: 'Оплата картой или из кошелька' },
] as const;

const payoutStatusLabel = (s: string) =>
  s === 'pending' ? 'В обработке' : s === 'completed' ? 'Выплачено' : 'Отклонено';

interface Props {
  transactions: Transaction[];
  payouts: Payout[];
  walletLoading: boolean;
  topupOpen: boolean;
  setTopupOpen: (v: boolean) => void;
  payoutOpen: boolean;
  setPayoutOpen: (v: boolean) => void;
  amount: string;
  setAmount: (v: string) => void;
  method: string;
  setMethod: (v: string) => void;
  wallet: string;
  setWallet: (v: string) => void;
  submitting: boolean;
  doTopup: () => void;
  doPayout: () => void;
}

const CabinetWalletTab = ({
  transactions,
  payouts,
  walletLoading,
  topupOpen,
  setTopupOpen,
  payoutOpen,
  setPayoutOpen,
  amount,
  setAmount,
  method,
  setMethod,
  wallet,
  setWallet,
  submitting,
  doTopup,
  doPayout,
}: Props) => {
  return (
    <>
      <TabsContent value="wallet">
        {walletLoading ? (
          <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
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
            <div>
              <h3 className="mb-3 font-head text-sm font-semibold uppercase tracking-wide text-foreground">
                Заявки на выплату
              </h3>
              {payouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Заявок пока нет.</p>
              ) : (
                <div className="space-y-2.5">
                  {payouts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                    >
                      <div>
                        <p className="text-sm text-foreground">
                          {p.method} · {p.wallet}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.createdAt}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-head text-sm font-bold text-foreground">
                          {formatPrice(p.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">{payoutStatusLabel(p.status)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

      {/* Выплата */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-head text-xl uppercase tracking-wide">
              Вывод средств
            </DialogTitle>
            <DialogDescription>
              Заявка на выплату на кошелёк AZVOX или ЮMoney.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Куда вывести</Label>
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
            <Label htmlFor="payout-wallet">Номер кошелька / карты</Label>
            <Input
              id="payout-wallet"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="Например: 4100 1234 5678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-amount">Сумма, ₽</Label>
            <Input
              id="payout-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
            />
          </div>
          <button
            onClick={doPayout}
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Icon name="Banknote" size={18} />
            Создать заявку
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CabinetWalletTab;
