import { API } from '@/lib/api';

export type Category = 'Скрипты' | 'Шаблоны' | 'Плагины' | 'Проекты';

export interface Product {
  id: number;
  title: string;
  slug: string;
  desc: string;
  fullDescription?: string;
  price: number;
  category: Category;
  icon: string;
  tag?: string;
  rating: number;
  sales: number;
  coverImage?: string;
  images?: string[];
  status?: string;
  fileUrl?: string;
  fileName?: string;
  isVip?: boolean;
  vipUntil?: string | null;
}

export const CATEGORIES: (Category | 'Все')[] = ['Все', 'Скрипты', 'Шаблоны', 'Плагины', 'Проекты'];

export const fetchProducts = async (): Promise<Product[]> => {
  const res = await fetch(API.products);
  const data = await res.json();
  return data.products || [];
};

export const fetchProductBySlug = async (slug: string): Promise<Product | null> => {
  const res = await fetch(`${API.products}?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.product || null;
};

export const formatPrice = (n: number) =>
  new Intl.NumberFormat('ru-RU').format(n) + ' ₽';