import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import { API } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

interface Profile {
  id: number;
  name: string;
  createdAt: string;
  productsCount: number;
}

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API.userProfile}&userId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.profile) {
          navigate('/', { replace: true });
          return;
        }
        setProfile(d.profile);
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-body">
        <Header />
        <main className="mx-auto max-w-3xl px-5 py-16 md:px-8">
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) return null;

  const isSelf = user?.id === profile.id;

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand-cyan"
        >
          <Icon name="ArrowLeft" size={15} />
          На главную
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-cyan/15 font-head text-2xl font-bold text-brand-cyan">
                {profile.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <h1 className="font-head text-2xl font-bold uppercase tracking-tight text-foreground">
                  {profile.name}
                </h1>
                <p className="text-sm text-muted-foreground">На сайте с {profile.createdAt}</p>
              </div>
            </div>

            {!isSelf && (
              <button
                onClick={() => {
                  if (!user) {
                    navigate('/auth');
                    return;
                  }
                  navigate(`/messages/${profile.id}`);
                }}
                className="cta-gradient inline-flex items-center gap-2 rounded-xl px-5 py-3 font-head text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <Icon name="MessageCircle" size={17} />
                Написать сообщение
              </button>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:max-w-xs">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="font-head text-xl font-bold text-foreground">{profile.productsCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Товаров в каталоге</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserProfile;
