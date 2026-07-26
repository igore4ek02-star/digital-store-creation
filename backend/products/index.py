import json
import os
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def resp(status: int, data, headers: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {**headers, 'Content-Type': 'application/json'},
        'body': json.dumps(data),
    }


def get_user(cur, token: str):
    if not token:
        return None
    cur.execute(
        f"SELECT u.id, u.is_admin FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
        f"WHERE s.token = %s AND s.expires_at > now()",
        (token,),
    )
    return cur.fetchone()


def product_dict(row) -> dict:
    return {
        'id': row[0],
        'title': row[1],
        'slug': row[2],
        'desc': row[3],
        'fullDescription': row[4],
        'price': float(row[5]),
        'category': row[6],
        'icon': row[7],
        'tag': row[8],
        'rating': float(row[9]),
        'sales': row[10],
        'coverImage': row[11],
        'status': row[12] if len(row) > 12 else 'approved',
    }


def handler(event: dict, context):
    """Каталог товаров: список (только одобренные), карточка товара по slug (с галереей), CRUD в админке, предложение товара пользователем на модерацию"""
    method = event.get('httpMethod', 'GET')
    headers_common = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
        'Access-Control-Max-Age': '86400',
    }
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers_common, 'body': ''}

    params = event.get('queryStringParameters') or {}
    conn = get_conn()
    cur = conn.cursor()
    try:
        if method == 'GET':
            slug = params.get('slug')
            if slug:
                cur.execute(
                    f"SELECT id, title, slug, description, full_description, price, category, "
                    f"icon, tag, rating, sales, cover_image, status FROM {SCHEMA}.products WHERE slug = %s",
                    (slug,),
                )
                row = cur.fetchone()
                if not row:
                    return resp(404, {'error': 'Товар не найден'}, headers_common)
                product = product_dict(row)
                cur.execute(
                    f"SELECT image_url FROM {SCHEMA}.product_images WHERE product_id = %s ORDER BY sort_order",
                    (product['id'],),
                )
                product['images'] = [r[0] for r in cur.fetchall()]
                return resp(200, {'product': product}, headers_common)

            cur.execute(
                f"SELECT id, title, slug, description, full_description, price, category, "
                f"icon, tag, rating, sales, cover_image, status FROM {SCHEMA}.products "
                f"WHERE status = 'approved' ORDER BY id"
            )
            products = [product_dict(r) for r in cur.fetchall()]
            return resp(200, {'products': products}, headers_common)

        body = json.loads(event.get('body') or '{}')
        token = (event.get('headers') or {}).get('X-Authorization', '').replace('Bearer ', '').strip()

        if method == 'POST':
            user_row = get_user(cur, token)
            is_admin = bool(user_row and user_row[1])
            seller_id = user_row[0] if user_row else None

            slug_base = body['title'].lower().replace(' ', '-').replace('«', '').replace('»', '')
            slug = ''.join(c for c in slug_base if c.isalnum() or c == '-') or f"product-{os.urandom(3).hex()}"
            status = 'approved' if is_admin else 'pending'
            if not is_admin and not seller_id:
                return resp(401, {'error': 'Войдите в аккаунт, чтобы предложить товар'}, headers_common)

            cur.execute(
                f"INSERT INTO {SCHEMA}.products (title, slug, description, full_description, price, "
                f"category, icon, tag, cover_image, seller_id, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
                f"RETURNING id, title, slug, description, full_description, price, category, icon, tag, rating, sales, cover_image, status",
                (
                    body['title'], slug, body.get('desc', ''), body.get('fullDescription', ''),
                    body['price'], body['category'], body.get('icon', 'Package'), body.get('tag'),
                    body.get('coverImage'), seller_id, status,
                ),
            )
            row = cur.fetchone()
            images = body.get('images') or []
            for i, url in enumerate(images):
                cur.execute(
                    f"INSERT INTO {SCHEMA}.product_images (product_id, image_url, sort_order) VALUES (%s,%s,%s)",
                    (row[0], url, i),
                )
            if status == 'pending':
                cur.execute(
                    f"INSERT INTO {SCHEMA}.admin_notifications (type, title, message, entity_id) "
                    f"VALUES ('product_moderation', 'Новый товар на модерацию', %s, %s)",
                    (f"«{row[1]}» ждёт проверки", row[0]),
                )
            conn.commit()
            return resp(200, {'product': product_dict(row)}, headers_common)

        if method == 'PUT':
            pid = body['id']
            cur.execute(
                f"UPDATE {SCHEMA}.products SET title=%s, description=%s, full_description=%s, "
                f"price=%s, category=%s, icon=%s, tag=%s WHERE id=%s "
                f"RETURNING id, title, slug, description, full_description, price, category, icon, tag, rating, sales, cover_image, status",
                (
                    body['title'], body.get('desc', ''), body.get('fullDescription', ''),
                    body['price'], body['category'], body.get('icon', 'Package'), body.get('tag'), pid,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return resp(404, {'error': 'Товар не найден'}, headers_common)
            return resp(200, {'product': product_dict(row)}, headers_common)

        if method == 'DELETE':
            pid = params.get('id') or body.get('id')
            cur.execute(f"DELETE FROM {SCHEMA}.products WHERE id = %s", (pid,))
            conn.commit()
            return resp(200, {'ok': True}, headers_common)

        return resp(405, {'error': 'Метод не поддерживается'}, headers_common)
    finally:
        cur.close()
        conn.close()