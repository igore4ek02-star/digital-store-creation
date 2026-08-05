import Icon from '@/components/ui/icon';
import { TabsContent } from '@/components/ui/tabs';
import { formatPrice, Product } from '@/components/site/products';

interface Props {
  myProducts: Product[];
  myProductsLoading: boolean;
  onPropose: () => void;
}

const CabinetProductsTab = ({ myProducts, myProductsLoading, onPropose }: Props) => {
  return (
    <TabsContent value="my-products">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Статус ваших товаров, отправленных на модерацию.
        </p>
        <button
          onClick={onPropose}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          <Icon name="Plus" size={16} />
          Предложить товар
        </button>
      </div>
      {myProductsLoading ? (
        <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
      ) : myProducts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Вы пока не предлагали товары.</p>
      ) : (
        <div className="space-y-3">
          {myProducts.map((p) => {
            const statusLabel =
              ({ approved: 'Опубликован', pending: 'На модерации', rejected: 'Отклонён' } as Record<
                string,
                string
              >)[p.status || ''] || p.status;
            const statusColor =
              p.status === 'approved'
                ? 'text-brand-green'
                : p.status === 'pending'
                  ? 'text-primary'
                  : 'text-destructive';
            return (
              <div
                key={p.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon name={p.icon} size={22} />
                  </span>
                  <div>
                    <p className="font-head font-semibold uppercase tracking-wide text-foreground">
                      {p.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.category} · {formatPrice(p.price)}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
              </div>
            );
          })}
        </div>
      )}
    </TabsContent>
  );
};

export default CabinetProductsTab;
