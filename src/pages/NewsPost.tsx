import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import { useAuth, getAuthToken } from '@/hooks/use-auth';
import { API } from '@/lib/api';

interface NewsItem {
  id: number;
  slug: string;
  title: string;
  tag: string;
  text: string;
  fullText: string;
  icon: string;
  coverImage: string | null;
  publishedAt: string;
}

interface Comment {
  id: number;
  text: string;
  createdAt: string;
  userName: string;
}

const NewsPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`${API.news}&slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.news) {
          navigate('/news', { replace: true });
          return;
        }
        setNews(d.news);
      })
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  useEffect(() => {
    if (!news) return;
    setCommentsLoading(true);
    fetch(`${API.newsComments}&newsId=${news.id}`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .finally(() => setCommentsLoading(false));
  }, [news]);

  const submitComment = async () => {
    if (!news) return;
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
      const res = await fetch(API.newsComments, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ newsId: news.id, text: newComment.trim() }),
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
        <main className="mx-auto max-w-3xl px-5 py-16 md:px-8">
          <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!news) return null;

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <Link
          to="/news"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand-cyan"
        >
          <Icon name="ArrowLeft" size={15} />
          Назад к новостям
        </Link>

        {news.coverImage && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
            <img src={news.coverImage} alt={news.title} className="aspect-video w-full object-cover" />
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan">
            <Icon name={news.icon} size={22} />
          </span>
          <span className="rounded-md bg-muted px-2.5 py-1 font-head text-[11px] font-semibold uppercase tracking-wide text-brand-cyan">
            {news.tag}
          </span>
        </div>

        <time className="text-xs text-muted-foreground">{news.publishedAt}</time>
        <h1 className="mt-2 font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground">
          {news.title}
        </h1>
        <p className="mt-5 whitespace-pre-line leading-relaxed text-muted-foreground">
          {news.fullText || news.text}
        </p>

        <div className="mt-14">
          <h2 className="mb-5 font-head text-xl font-bold uppercase tracking-wide text-foreground">
            Комментарии {comments.length > 0 && `(${comments.length})`}
          </h2>

          <div className="mb-6 rounded-2xl border border-border bg-card p-5">
            {user ? (
              <>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Поделитесь мнением о новости..."
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
            <p className="text-sm text-muted-foreground">Пока нет комментариев — будьте первым.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-head text-sm font-semibold text-foreground">{c.userName}</span>
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
    </div>
  );
};

export default NewsPost;
