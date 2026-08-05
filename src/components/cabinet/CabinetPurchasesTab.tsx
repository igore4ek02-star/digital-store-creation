import Icon from '@/components/ui/icon';
import { TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatPrice } from '@/components/site/products';

export interface Purchase {
  id: number;
  title: string;
  amount: number;
  method: string;
  date: string;
  fileUrl: string | null;
  fileName: string | null;
}

const downloadFile = async (fileUrl: string, fileName: string, title: string) => {
  try {
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
    toast.success('Скачивание началось', {
      description: `Файл «${title}» загружается.`,
    });
  } catch {
    toast.error('Не удалось скачать файл');
  }
};

interface Props {
  purchases: Purchase[];
  purchasesLoading: boolean;
}

const CabinetPurchasesTab = ({ purchases, purchasesLoading }: Props) => {
  return (
    <TabsContent value="purchases">
      <p className="mb-4 text-sm text-muted-foreground">
        Купленные товары доступны для повторного скачивания в любое время.
      </p>
      {purchasesLoading ? (
        <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
      ) : purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground">У вас пока нет покупок.</p>
      ) : (
      <div className="space-y-3">
        {purchases.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon name="FileCode2" size={22} />
              </span>
              <div>
                <p className="font-head font-semibold uppercase tracking-wide text-foreground">
                  {p.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  #{p.id} · {p.date} · оплата {p.method === 'BALANCE' ? 'с баланса' : p.method}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <span className="font-head font-bold text-foreground">
                {formatPrice(p.amount)}
              </span>
              <button
                onClick={() => p.fileUrl && downloadFile(p.fileUrl, p.fileName || `${p.title}.zip`, p.title)}
                disabled={!p.fileUrl}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3.5 py-2 font-head text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Icon name="Download" size={15} />
                Скачать
              </button>
            </div>
          </div>
        ))}
      </div>
      )}
    </TabsContent>
  );
};

export default CabinetPurchasesTab;
