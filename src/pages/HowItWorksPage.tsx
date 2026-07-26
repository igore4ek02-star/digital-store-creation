import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import HowItWorks from '@/components/site/HowItWorks';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

const FAQ = [
  {
    q: 'Когда мне придёт ссылка на скачивание?',
    a: 'Сразу после подтверждения оплаты — обычно в течение нескольких секунд. Ссылка приходит на e-mail, который вы указали при оформлении заказа.',
  },
  {
    q: 'Что делать, если письмо со ссылкой не пришло?',
    a: 'Проверьте папку «Спам». Если письма всё равно нет — напишите в поддержку, укажите e-mail и способ оплаты, мы вышлем ссылку повторно.',
  },
  {
    q: 'Можно ли скачать товар повторно?',
    a: 'Да, в личном кабинете. Все ваши покупки сохраняются и доступны для повторного скачивания в любое время без ограничений.',
  },
  {
    q: 'Нужна ли регистрация для покупки?',
    a: 'Нет, купить товар можно без регистрации — достаточно указать e-mail для получения ссылки. Но с аккаунтом удобнее: все покупки хранятся в одном месте.',
  },
  {
    q: 'Какими способами можно оплатить заказ?',
    a: 'Мы принимаем оплату через AZVOX и ЮMoney — картой или из электронного кошелька. Оба способа безопасны и работают мгновенно.',
  },
];

const HowItWorksPage = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main>
        <div className="mx-auto max-w-7xl px-5 pt-10 md:px-8">
          <h1 className="font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-5xl">
            Как это работает
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Простой путь от выбора товара до запуска проекта — без лишних шагов и ожидания.
          </p>
        </div>

        <div className="[&>section]:border-t-0">
          <HowItWorks />
        </div>

        <section className="mx-auto max-w-3xl px-5 py-20 md:px-8 md:py-28">
          <div className="mb-10 text-center">
            <p className="mb-3 font-head text-xs font-medium uppercase tracking-[0.14em] text-brand-cyan">
              Вопросы и ответы
            </p>
            <h2 className="font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-4xl">
              Частые вопросы о покупке
            </h2>
          </div>

          <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-6">
            {FAQ.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`} className={i === FAQ.length - 1 ? 'border-b-0' : ''}>
                <AccordionTrigger className="text-left font-head text-base font-semibold uppercase tracking-wide text-foreground hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-10 flex justify-center">
            <Link
              to="/#catalog"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-head text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <Icon name="LayoutGrid" size={18} />
              Перейти в каталог
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorksPage;
