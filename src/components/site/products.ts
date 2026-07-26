export type Category = 'Скрипты' | 'Шаблоны' | 'Плагины' | 'Проекты';

export interface Product {
  id: number;
  title: string;
  desc: string;
  price: number;
  category: Category;
  icon: string;
  tag?: string;
  rating: number;
  sales: number;
}

export const CATEGORIES: (Category | 'Все')[] = ['Все', 'Скрипты', 'Шаблоны', 'Плагины', 'Проекты'];

export const PRODUCTS: Product[] = [
  {
    id: 1,
    title: 'CMS интернет-магазина',
    desc: 'Готовая система управления магазином на PHP: каталог, корзина, заказы, админка.',
    price: 3490,
    category: 'Скрипты',
    icon: 'ShoppingCart',
    tag: 'Хит',
    rating: 5,
    sales: 214,
  },
  {
    id: 2,
    title: 'Скрипт доски объявлений',
    desc: 'Исходники доски объявлений с модерацией, тарифами и поиском по категориям.',
    price: 1290,
    category: 'Скрипты',
    icon: 'LayoutList',
    rating: 4.8,
    sales: 138,
  },
  {
    id: 3,
    title: 'Шаблон лендинга «Про»',
    desc: 'Адаптивный HTML/CSS-шаблон посадочной страницы с анимациями и формой заявки.',
    price: 890,
    category: 'Шаблоны',
    icon: 'MonitorSmartphone',
    tag: 'Новинка',
    rating: 4.9,
    sales: 302,
  },
  {
    id: 4,
    title: 'Плагин приёма платежей',
    desc: 'Модуль оплаты AZVOX и ЮMoney с мгновенной выдачей ссылки на скачивание.',
    price: 590,
    category: 'Плагины',
    icon: 'CreditCard',
    tag: 'AZVOX · ЮMoney',
    rating: 5,
    sales: 421,
  },
  {
    id: 5,
    title: 'Скрипт онлайн-курсов',
    desc: 'Платформа для продажи курсов: уроки, доступы, прогресс и приём оплаты.',
    price: 4290,
    category: 'Проекты',
    icon: 'GraduationCap',
    rating: 4.7,
    sales: 76,
  },
  {
    id: 6,
    title: 'Шаблон корпоративного сайта',
    desc: 'Многостраничный адаптивный шаблон компании: услуги, блог, контакты.',
    price: 1490,
    category: 'Шаблоны',
    icon: 'Building2',
    rating: 4.8,
    sales: 189,
  },
  {
    id: 7,
    title: 'Плагин SEO-оптимизации',
    desc: 'Мета-теги, карта сайта, микроразметка и человекопонятные URL для PHP-сайтов.',
    price: 690,
    category: 'Плагины',
    icon: 'Search',
    rating: 4.6,
    sales: 154,
  },
  {
    id: 8,
    title: 'Готовый проект «Каталог услуг»',
    desc: 'Полный исходный код каталога с личным кабинетом, заявками и админкой.',
    price: 3990,
    category: 'Проекты',
    icon: 'Package',
    tag: 'Под ключ',
    rating: 4.9,
    sales: 63,
  },
];

export const formatPrice = (n: number) =>
  new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
