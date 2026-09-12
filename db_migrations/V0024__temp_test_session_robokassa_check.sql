-- Временная тестовая сессия для проверки интеграции Робокассы (будет удалена после теста)
INSERT INTO t_p58443255_digital_store_creati.sessions (token, user_id, created_at, expires_at)
VALUES ('20efbedb6fbaf09045065c46e7930ec90619ffd395c8fd79b91e7e8957742e3', 1, now(), now() + interval '1 hour')
ON CONFLICT (token) DO NOTHING;