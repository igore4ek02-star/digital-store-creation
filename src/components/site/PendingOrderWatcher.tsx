import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { API } from '@/lib/api';

const STORAGE_KEY = 'pending-order';

const downloadFile = async (fileUrl: string, fileName: string) => {
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
};

const PendingOrderWatcher = () => {
  const checking = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (checking.current) return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      let pending: { orderId: number; token: string; title: string };
      try {
        pending = JSON.parse(raw);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      checking.current = true;
      try {
        const res = await fetch(`${API.orderStatus}&orderId=${pending.orderId}&token=${pending.token}`);
        const data = await res.json();
        if (!res.ok) return;
        if (data.status === 'paid') {
          localStorage.removeItem(STORAGE_KEY);
          if (data.fileUrl) {
            await downloadFile(data.fileUrl, data.fileName || `${pending.title}.zip`);
            toast.success('Оплата прошла успешно', {
              description: `Файл «${data.title || pending.title}» скачивается.`,
            });
          }
        } else if (data.status === 'failed') {
          localStorage.removeItem(STORAGE_KEY);
          toast.error('Оплата не прошла', { description: pending.title });
        }
      } catch {
        // сеть недоступна — попробуем при следующем событии
      } finally {
        checking.current = false;
      }
    };

    check();
    const onFocus = () => check();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
};

export default PendingOrderWatcher;
