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
    }


def handler(event: dict, context):
    """Каталог товаров: список, карточка товара по slug (с галереей), CRUD в админке"""
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
                    f"icon, tag, rating, sales, cover_image FROM {SCHEMA}.products WHERE slug = %s",
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
                f"icon, tag, rating, sales, cover_image FROM {SCHEMA}.products ORDER BY id"
            )
            products = [product_dict(r) for r in cur.fetchall()]
            return resp(200, {'products': products}, headers_common)

        body = json.loads(event.get('body') or '{}')

        if method == 'POST':
            slug_base = body['title'].lower().replace(' ', '-').replace('«', '').replace('»', '')
            slug = ''.join(c for c in slug_base if c.isalnum() or c == '-') or f"product-{os.urandom(3).hex()}"
            cur.execute(
                f"INSERT INTO {SCHEMA}.products (title, slug, description, full_description, price, "
                f"category, icon, tag, cover_image) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) "
                f"RETURNING id, title, slug, description, full_description, price, category, icon, tag, rating, sales, cover_image",
                (
                    body['title'], slug, body.get('desc', ''), body.get('fullDescription', ''),
                    body['price'], body['category'], body.get('icon', 'Package'), body.get('tag'),
                    body.get('coverImage'),
                ),
            )
            row = cur.fetchone()
            images = body.get('images') or []
            for i, url in enumerate(images):
                cur.execute(
                    f"INSERT INTO {SCHEMA}.product_images (product_id, image_url, sort_order) VALUES (%s,%s,%s)",
                    (row[0], url, i),
                )
            conn.commit()
            return resp(200, {'product': product_dict(row)}, headers_common)

        if method == 'PUT':
            pid = body['id']
            cur.execute(
                f"UPDATE {SCHEMA}.products SET title=%s, description=%s, full_description=%s, "
                f"price=%s, category=%s, icon=%s, tag=%s WHERE id=%s "
                f"RETURNING id, title, slug, description, full_description, price, category, icon, tag, rating, sales, cover_image",
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
