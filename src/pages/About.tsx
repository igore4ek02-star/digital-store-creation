import Icon from '@/components/ui/icon';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';

const STATS = [
  { icon: 'CalendarDays', value: '8+ лет', label: 'на рынке цифровых товаров' },
  { icon: 'PackageCheck', value: '1500+', label: 'товаров продано' },
  { icon: 'MessageSquareText', value: '1200+', label: 'отзывов клиентов' },
  { icon: 'Star', value: '4.9', label: 'средний рейтинг' },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <h1 className="font-head text-3xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-5xl">
          О нас
        </h1>

        <div className="mt-6 max-w-3xl space-y-4 text-muted-foreground">
          <p className="leading-relaxed">
            Php-Skript — магазин цифровых товаров для тех, кто создаёт сайты и веб-сервисы.
            В каталоге собраны PHP-скрипты, шаблоны, плагины и готовые проекты, которые можно
            купить, скачать и запустить за минуты — без долгой разработки с нуля.
          </p>
          <p className="leading-relaxed">
            Наша миссия — помогать разработчикам, фрилансерам и владельцам бизнеса быстро
            запускать сайты и цифровые продукты. Мы тщательно проверяем каждый товар в каталоге,
            следим за качеством кода и актуальностью решений.
          </p>
          <p className="leading-relaxed">
            Помимо готовых товаров, мы предлагаем услугу установки «под ключ» — если вы не
            хотите разбираться с настройкой самостоятельно, наши специалисты сделают это за вас.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/12 text-brand-cyan">
                <Icon name={s.icon} size={20} />
              </span>
              <p className="font-head text-xl font-bold text-foreground">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;
