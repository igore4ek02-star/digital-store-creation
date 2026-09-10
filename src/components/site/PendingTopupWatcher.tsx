import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { API } from '@/lib/api';
import { getAuthToken, useAuth } from '@/hooks/use-auth';

const STORAGE_KEY = 'pending-topup';

const PendingTopupWatcher = () => {
  const checking = useRef(false);
  const { refreshUser } = useAuth();

  useEffect(() => {
    const check = async () => {
      if (checking.current) return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const token = getAuthToken();
      if (!token) return;
      let pending: { txId: number; amount: number };
      try {
        pending = JSON.parse(raw);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      checking.current = true;
      try {
        const res = await fetch(`${API.topupStatus}&txId=${pending.txId}`, {
          headers: { 'X-Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) return;
        if (data.status === 'paid') {
          localStorage.removeItem(STORAGE_KEY);
          toast.success('Баланс пополнен', {
            description: `+${data.amount} ₽ зачислено на счёт.`,
          });
          await refreshUser();
        } else if (data.status === 'failed') {
          localStorage.removeItem(STORAGE_KEY);
          toast.error('Пополнение не прошло');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default PendingTopupWatcher;
