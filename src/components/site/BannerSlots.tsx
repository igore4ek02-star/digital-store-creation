import { useEffect, useRef, useState } from 'react';
import { API } from '@/lib/api';
import Icon from '@/components/ui/icon';
import AdOrderDialog from './AdOrderDialog';

interface BannerAd {
  id: number;
  text: string;
  link: string | null;
  imageUrl: string | null;
}

const ROTATE_INTERVAL = 6000;

const trackAd = (adId: number, action: 'impression' | 'click') => {
  fetch(API.adTrack, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adId, action }),
  }).catch(() => {});
};

const PlaceholderSlot = ({ onOrder }: { onOrder: () => void }) => (
  <button
    onClick={onOrder}
    className="flex h-[60px] w-[468px] max-w-full shrink-0 items-center justify-center gap-2.5 overflow-hidden rounded-lg border border-dashed border-brand-cyan/40 bg-brand-cyan/5 px-4 transition-colors hover:border-brand-cyan hover:bg-brand-cyan/10"
  >
    <Icon name="Megaphone" size={18} className="shrink-0 text-brand-cyan" />
    <span className="text-left text-sm leading-tight text-muted-foreground">
      <span className="block font-head font-semibold uppercase tracking-wide text-brand-cyan">
        Место свободно
      </span>
      <span>Закажи рекламу здесь · 468×60</span>
    </span>
  </button>
);

const BannerSlot = ({ ads, onOrder }: { ads: BannerAd[]; onOrder: () => void }) => {
  const [index, setIndex] = useState(0);
  const seenIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (ads.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [ads.length]);

  const ad = ads.length > 0 ? ads[index % ads.length] : null;

  useEffect(() => {
    if (ad && !seenIds.current.has(ad.id)) {
      seenIds.current.add(ad.id);
      trackAd(ad.id, 'impression');
    }
  }, [ad]);

  if (!ad) return <PlaceholderSlot onOrder={onOrder} />;

  return (
    <a
      href={ad.link || '#top'}
      target={ad.link ? '_blank' : undefined}
      rel={ad.link ? 'noopener noreferrer' : undefined}
      onClick={() => trackAd(ad.id, 'click')}
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
  const [ads, setAds] = useState<BannerAd[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetch(`${API.ads}&active=1&type=banner`)
      .then((r) => r.json())
      .then((d) => setAds(d.ads || []))
      .catch(() => setAds([]));
  }, []);

  const left = ads.filter((_, i) => i % 2 === 0);
  const right = ads.filter((_, i) => i % 2 === 1);

  return (
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-5 py-3 md:px-8">
      <BannerSlot ads={left} onOrder={() => setDialogOpen(true)} />
      <BannerSlot ads={right} onOrder={() => setDialogOpen(true)} />
      <AdOrderDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultType="banner" />
    </div>
  );
};

export default BannerSlots;
