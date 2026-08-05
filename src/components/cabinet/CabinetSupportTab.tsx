import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AuthUser } from '@/hooks/use-auth';

export interface Ticket {
  id: number;
  subject: string;
  message: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
}

const ticketStatusLabel = (s: string) =>
  s === 'open' ? 'Открыт' : s === 'answered' ? 'Есть ответ' : 'Закрыт';
const ticketStatusColor = (s: string) =>
  s === 'open' ? 'text-primary' : s === 'answered' ? 'text-brand-green' : 'text-muted-foreground';

interface Props {
  tickets: Ticket[];
  ticketsLoading: boolean;
  user: AuthUser;
  ticketOpen: boolean;
  setTicketOpen: (v: boolean) => void;
  subject: string;
  setSubject: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  ticketSubmitting: boolean;
  submitTicket: () => void;
}

const CabinetSupportTab = ({
  tickets,
  ticketsLoading,
  user,
  ticketOpen,
  setTicketOpen,
  subject,
  setSubject,
  message,
  setMessage,
  ticketSubmitting,
  submitTicket,
}: Props) => {
  return (
    <>
      <TabsContent value="support">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Ваши обращения в поддержку</p>
          <button
            onClick={() => setTicketOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <Icon name="Plus" size={16} />
            Новое обращение
          </button>
        </div>
        {ticketsLoading ? (
          <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Обращений пока нет.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <p className="font-head font-semibold uppercase tracking-wide text-foreground">
                    {t.subject}
                  </p>
                  <span className={`text-xs font-medium ${ticketStatusColor(t.status)}`}>
                    {ticketStatusLabel(t.status)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{t.createdAt}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t.message}</p>
                {t.adminReply && (
                  <div className="mt-3 rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-cyan">
                      Ответ поддержки
                    </p>
                    <p className="text-sm text-foreground">{t.adminReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="profile">
        <div className="max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="space-y-2">
            <Label>Имя</Label>
            <Input defaultValue={user.name} />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input defaultValue={user.email} type="email" />
          </div>
          <button
            onClick={() => toast.success('Профиль сохранён')}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <Icon name="Check" size={16} />
            Сохранить
          </button>
        </div>
      </TabsContent>

      {/* Новое обращение в поддержку */}
      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-head text-xl uppercase tracking-wide">
              Обращение в поддержку
            </DialogTitle>
            <DialogDescription>Опишите вопрос — ответим в ближайшее время.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ticket-subject">Тема</Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Например: Не пришла ссылка на скачивание"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-message">Сообщение</Label>
            <Textarea
              id="ticket-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите подробнее"
              className="min-h-28"
            />
          </div>
          <button
            onClick={submitTicket}
            disabled={ticketSubmitting}
            className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-head text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Icon name="Send" size={18} />
            Отправить
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CabinetSupportTab;
