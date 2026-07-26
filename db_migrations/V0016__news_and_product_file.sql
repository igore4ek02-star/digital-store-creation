CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    tag VARCHAR(100) NOT NULL DEFAULT 'Новость',
    text TEXT NOT NULL,
    full_text TEXT NOT NULL DEFAULT '',
    icon VARCHAR(100) NOT NULL DEFAULT 'Newspaper',
    cover_image TEXT,
    published_at TIMESTAMP NOT NULL DEFAULT now(),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE news_comments (
    id SERIAL PRIMARY KEY,
    news_id INTEGER NOT NULL REFERENCES news(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_comments_news ON news_comments(news_id);
CREATE INDEX idx_news_published ON news(published_at);

ALTER TABLE products ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
