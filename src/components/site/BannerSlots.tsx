import { useEffect, useState } from 'react';
import { API } from '@/lib/api';

interface BannerAd {
  id: number;
  text: string;
  link: string | null;
  imageUrl: string | null;
}

const ROTATE_INTERVAL = 6000;

const BannerSlot = ({ ads }: { ads: BannerAd[] }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (ads.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [ads.length]);

  if (ads.length === 0) return null;
  const ad = ads[index % ads.length];

  return (
    <a
      href={ad.link || '#top'}
      target={ad.link ? '_blank' : undefined}
      rel={ad.link ? 'noopener noreferrer' : undefined}
      className="flex h-[60px] w-[468px] max-w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card transition-opacity hover:opacity-90"
      title={ad.text}
    >
      {ad.imageUrl ? (
        <img src={ad.imageUrl} alt={ad.text} className="h-[60px] w-[468px] max-w-full object-cover" />
      ) : (
        <span className="px-3 text-center text-sm text-muted-foreground">{ad.text}</span>
      )}
    </a>
  );
};

const BannerSlots = () => {
  const [ads, setAds] = useState<BannerAd[] | null>(null);

  useEffect(() => {
    fetch(`${API.ads}&active=1&type=banner`)
      .then((r) => r.json())
      .then((d) => setAds(d.ads || []))
      .catch(() => setAds([]));
  }, []);

  if (!ads || ads.length === 0) return null;

  const left = ads.filter((_, i) => i % 2 === 0);
  const right = ads.filter((_, i) => i % 2 === 1);

  return (
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-5 py-3 md:px-8">
      <BannerSlot ads={left} />
      {right.length > 0 && <BannerSlot ads={right} />}
    </div>
  );
};

export default BannerSlots;
