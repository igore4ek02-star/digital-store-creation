import Icon from '@/components/ui/icon';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

const FAQ = [
  {
    q: 'Можно ли вернуть деньги за купленный товар?',
    a: 'Так как товары цифровые и выдаются сразу после оплаты, возврат возможен только в случае, если товар не соответствует описанию или не был выдан по техническим причинам. Напишите в поддержку с описанием проблемы.',
  },
  {
    q: 'В какие сроки отвечает поддержка?',
    a: 'Мы отвечаем на обращения в течение рабочего дня, обычно быстрее. По срочным вопросам старайтесь писать с подробным описанием — это ускоряет решение.',
  },
  {
    q: 'Можно ли заказать доработку кода?',
    a: 'Да, мы дорабатываем купленные скрипты под ваши задачи. Опишите, что нужно изменить или добавить, и мы оценим стоимость и сроки.',
  },
  {
    q: 'Поможете ли вы с установкой на хостинг?',
    a: 'Да, у нас есть услуга «Установка под ключ» — специалисты разместят и настроят скрипт на вашем хостинге. Подробнее на странице услуги установки.',
  },
  {
    q: 'Могу ли я скачать купленный товар повторно?',
    a: 'Да, все ваши покупки сохраняются в личном кабинете и доступны для повторного скачивания в любое время без ограничений.',
  },
  {
    q: 'Что делать, если возникла ошибка при использовании скрипта?',
    a: 'Опишите проблему в обращении в поддержку — укажите название товара и что именно не работает. Мы поможем разобраться или устраним ошибку.',
  },
];

const CONTACTS = [
  {
    icon: 'Mail',
    label: 'E-mail поддержки',
    value: 'support@php-skript.ru',
    desc: 'Пишите по любым вопросам о покупках, установке и доработке',
  },
  {
    icon: 'Send',
    label: 'Telegram-канал',
    value: '@phpskript_support',
    desc: 'Новости, обновления каталога и ответы на частые вопросы',
  },
];

const Support = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <h1 className="font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-5xl">
          Поддержка
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Ответы на частые вопросы и способы связаться с нами, если понадобится помощь.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {CONTACTS.map((c) => (
            <div
              key={c.label}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand-cyan/40"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan">
                <Icon name={c.icon} size={24} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="mt-1 font-head text-lg font-semibold text-foreground">{c.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 max-w-3xl">
          <h2 className="mb-6 font-head text-2xl font-bold uppercase tracking-wide text-foreground">
            Частые вопросы
          </h2>
          <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-6">
            {FAQ.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`item-${i}`}
                className={i === FAQ.length - 1 ? 'border-b-0' : ''}
              >
                <AccordionTrigger className="text-left font-head text-base font-semibold uppercase tracking-wide text-foreground hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
