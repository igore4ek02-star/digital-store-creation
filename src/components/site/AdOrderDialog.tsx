import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { useAuth, getAuthToken } from '@/hooks/use-auth';
import { API } from '@/lib/api';
import { formatPrice } from './products';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType?: 'text' | 'banner';
}

const AdOrderDialog = ({ open, onOpenChange, defaultType = 'text' }: Props) => {
  const { user, refreshUser } = useAuth();
  const [adType, setAdType] = useState<'text' | 'banner'>(defaultType);

  useEffect(() => {
    if (open) setAdType(defaultType);
  }, [open, defaultType]);

  const [pricePerDay, setPricePerDay] = useState(150);
  const [bannerPricePerDay, setBannerPricePerDay] = useState(300);

  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [days, setDays] = useState('3');
  const [submitting, setSubmitting] = useState(false);

  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [bannerFileName, setBannerFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch(API.ads)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.pricePerDay === 'number') setPricePerDay(d.pricePerDay);
        if (typeof d.bannerPricePerDay === 'number') setBannerPricePerDay(d.bannerPricePerDay);
      })
      .catch(() => {});
  }, [open]);

  const daysNum = Number(days) || 0;
  const activePrice = adType === 'banner' ? bannerPricePerDay : pricePerDay;
  const total = activePrice * daysNum;

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Поддерживаются форматы PNG, JPEG, WEBP');
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error('Файл слишком большой (максимум 1 МБ)');
      return;
    }
    setBannerFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setBannerImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setText('');
    setLink('');
    setDays('3');
    setBannerImage(null);
    setBannerFileName('');
  };

  const submit = async () => {
    if (adType === 'text' && text.trim().length < 3) {
      toast.error('Введите текст объявления');
      return;
    }
    if (adType === 'banner' && !bannerImage) {
      toast.error('Загрузите изображение баннера 468×60');
      return;
    }
    if (daysNum < 1) {
      toast.error('Укажите срок показа (не менее 1 дня)');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API.ads, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          adType,
          text: text.trim(),
          link: link.trim(),
          days: daysNum,
          image: adType === 'banner' ? bannerImage : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось оформить заявку');
        return;
      }
      toast.success('Заявка на рекламу отправлена', {
        description: `Спишем ${formatPrice(total)} после одобрения модератором.`,
      });
      await refreshUser();
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon name="Megaphone" size={22} />
          </div>
          <DialogTitle className="font-head text-xl uppercase tracking-wide">
            Реклама на сайте
          </DialogTitle>
          <DialogDescription>
            Объявление появится на сайте после одобрения модератором.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <p className="text-sm text-muted-foreground">
            <Link to="/auth" className="text-brand-cyan hover:underline">
              Войдите в аккаунт
            </Link>
            , чтобы заказать рекламу — оплата спишется с баланса личного кабинета.
          </p>
        ) : (
          <>
            <Tabs value={adType} onValueChange={(v) => setAdType(v as 'text' | 'banner')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">Текстовое объявление</TabsTrigger>
                <TabsTrigger value="banner">Баннер 468×60</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="ad-text">Текст объявления</Label>
                  <Input
                    id="ad-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Например: Скидка 20% на все шаблоны"
                    maxLength={100}
                  />
                </div>
              </TabsContent>

              <TabsContent value="banner" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Изображение баннера (468×60 px)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  {bannerImage ? (
                    <div className="space-y-2">
                      <div className="flex justify-center overflow-hidden rounded-lg border border-border bg-muted/30 p-2">
                        <img src={bannerImage} alt="Превью баннера" className="h-[60px] w-[468px] max-w-full object-cover" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate">{bannerFileName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setBannerImage(null);
                            setBannerFileName('');
                          }}
                          className="text-destructive hover:underline"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-6 text-muted-foreground transition-colors hover:border-brand-cyan/50 hover:text-brand-cyan"
                    >
                      <Icon name="ImagePlus" size={22} />
                      <span className="text-xs">PNG, JPEG или WEBP, до 1 МБ, размер 468×60</span>
                    </button>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="ad-link">Ссылка (необязательно)</Label>
              <Input
                id="ad-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad-days">Срок показа, дней</Label>
              <Input
                id="ad-days"
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>

            <div className="flex items-baseline justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                {formatPrice(activePrice)} × {daysNum || 0} дн.
              </span>
              <span className="font-head text-xl font-bold text-primary">{formatPrice(total)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Баланс: {formatPrice(user.balance)}
            </p>

            <button
              onClick={submit}
              disabled={submitting}
              className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              <Icon name="Megaphone" size={18} />
              Оформить и списать с баланса
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdOrderDialog;