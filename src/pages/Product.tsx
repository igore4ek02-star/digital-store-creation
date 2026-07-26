import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import BuyDialog from '@/components/site/BuyDialog';
import { Product as ProductType, fetchProductBySlug, formatPrice } from '@/components/site/products';
import { useAuth, getAuthToken } from '@/hooks/use-auth';
import { API } from '@/lib/api';

interface Comment {
  id: number;
  text: string;
  createdAt: string;
  userName: string;
}

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [buyOpen, setBuyOpen] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchProductBySlug(slug)
      .then((p) => {
        if (!p) {
          navigate('/', { replace: true });
          return;
        }
        setProduct(p);
      })
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  useEffect(() => {
    if (!product) return;
    setCommentsLoading(true);
    fetch(`${API.comments}?productId=${product.id}`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .finally(() => setCommentsLoading(false));
  }, [product]);

  const submitComment = async () => {
    if (!product) return;
    if (!user) {
      toast.error('Войдите в аккаунт, чтобы оставить комментарий');
      return;
    }
    if (newComment.trim().length < 2) {
      toast.error('Введите текст комментария');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(API.comments, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ productId: product.id, text: newComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось отправить комментарий');
        return;
      }
      setComments((prev) => [data.comment, ...prev]);
      setNewComment('');
      toast.success('Комментарий опубликован');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-body">
        <Header />
        <main className="mx-auto max-w-6xl px-5 py-16 md:px-8">
          <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) return null;

  const images = product.images && product.images.length > 0
    ? product.images
    : product.coverImage
      ? [product.coverImage]
      : [];

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand-cyan"
        >
          <Icon name="ArrowLeft" size={15} />
          Назад в каталог
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            {images.length > 0 ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <img
                    src={images[activeImage]}
                    alt={product.title}
                    className="aspect-video w-full object-cover"
                  />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2">
                    {images.map((img, i) => (
                      <button
                        key={img}
                        onClick={() => setActiveImage(i)}
                        className={`overflow-hidden rounded-lg border-2 transition-colors ${
                          i === activeImage ? 'border-brand-cyan' : 'border-transparent'
                        }`}
                      >
                        <img src={img} alt="" className="h-16 w-24 object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-2xl border border-border bg-card">
                <Icon name={product.icon} size={48} className="text-brand-cyan" />
              </div>
            )}

            <div className="mt-8">
              <h2 className="mb-3 font-head text-lg font-bold uppercase tracking-wide text-foreground">
                Описание
              </h2>
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                {product.fullDescription || product.desc}
              </p>
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan">
                  <Icon name={product.icon} size={24} />
                </span>
                {product.tag && (
                  <span className="rounded-md bg-primary/15 px-2.5 py-1 font-head text-[11px] font-semibold uppercase tracking-wide text-primary">
                    {product.tag}
                  </span>
                )}
              </div>
              <h1 className="mb-2 font-head text-2xl font-bold uppercase leading-tight tracking-wide text-foreground">
                {product.title}
              </h1>
              <p className="mb-4 text-sm text-muted-foreground">{product.desc}</p>

              <div className="mb-5 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 text-primary">
                  <Icon name="Star" size={14} />
                  {product.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="Download" size={14} />
                  {product.sales} продаж
                </span>
              </div>

              <div className="mb-5 flex items-baseline justify-between border-t border-border pt-5">
                <span className="text-sm text-muted-foreground">Цена</span>
                <span className="font-head text-3xl font-bold text-foreground">
                  {formatPrice(product.price)}
                </span>
              </div>

              <button
                onClick={() => setBuyOpen(true)}
                className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <Icon name="ShoppingCart" size={18} />
                Купить и скачать
              </button>
            </div>
          </div>
        </div>

        <div className="mt-14 max-w-3xl">
          <h2 className="mb-5 font-head text-xl font-bold uppercase tracking-wide text-foreground">
            Комментарии {comments.length > 0 && `(${comments.length})`}
          </h2>

          <div className="mb-6 rounded-2xl border border-border bg-card p-5">
            {user ? (
              <>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Поделитесь впечатлением о товаре..."
                  className="mb-3"
                />
                <button
                  onClick={submitComment}
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  <Icon name="Send" size={15} />
                  Отправить
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link to="/auth" className="text-brand-cyan hover:underline">
                  Войдите в аккаунт
                </Link>
                , чтобы оставить комментарий.
              </p>
            )}
          </div>

          {commentsLoading ? (
            <div className="h-20 animate-pulse rounded-2xl border border-border bg-card" />
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет комментариев — будьте первым!</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-cyan/15 font-head text-xs font-bold text-brand-cyan">
                      {c.userName.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-head text-sm font-semibold text-foreground">
                      {c.userName}
                    </span>
                    <span className="text-xs text-muted-foreground">{c.createdAt}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      <BuyDialog product={product} open={buyOpen} onOpenChange={setBuyOpen} />
    </div>
  );
};

export default ProductPage;
