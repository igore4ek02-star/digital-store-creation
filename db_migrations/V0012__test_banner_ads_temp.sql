INSERT INTO ads (user_id, text, link, days, price_per_day, total_price, status, ad_type, image_url, starts_at, ends_at)
VALUES 
(2, 'Тестовый баннер 1', 'https://example.com', 3, 300, 900, 'active', 'banner', 'https://cdn.poehali.dev/projects/test/bucket/banners/test1.png', now(), now() + interval '3 days'),
(2, 'Тестовый баннер 2', NULL, 3, 300, 900, 'active', 'banner', 'https://cdn.poehali.dev/projects/test/bucket/banners/test2.png', now(), now() + interval '3 days');
