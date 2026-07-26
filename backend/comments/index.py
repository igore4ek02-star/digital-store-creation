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


def get_user_id(cur, token: str):
    if not token:
        return None
    cur.execute(
        f"SELECT user_id FROM {SCHEMA}.sessions WHERE token = %s AND expires_at > now()",
        (token,),
    )
    row = cur.fetchone()
    return row[0] if row else None


def handler(event: dict, context):
    """Комментарии к товару: список комментариев и добавление нового (только для авторизованных пользователей)"""
    method = event.get('httpMethod', 'GET')
    headers_common = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
        'Access-Control-Max-Age': '86400',
    }
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers_common, 'body': ''}

    conn = get_conn()
    cur = conn.cursor()
    try:
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            product_id = params.get('productId')
            if not product_id:
                return resp(400, {'error': 'Не указан товар'}, headers_common)
            cur.execute(
                f"SELECT c.id, c.text, c.created_at, u.name FROM {SCHEMA}.comments c "
                f"JOIN {SCHEMA}.users u ON u.id = c.user_id "
                f"WHERE c.product_id = %s ORDER BY c.created_at DESC",
                (product_id,),
            )
            comments = [
                {
                    'id': r[0],
                    'text': r[1],
                    'createdAt': r[2].strftime('%d.%m.%Y %H:%M'),
                    'userName': r[3],
                }
                for r in cur.fetchall()
            ]
            return resp(200, {'comments': comments}, headers_common)

        if method == 'POST':
            token = (event.get('headers') or {}).get('X-Authorization', '').replace('Bearer ', '').strip()
            user_id = get_user_id(cur, token)
            if not user_id:
                return resp(401, {'error': 'Войдите в аккаунт, чтобы оставить комментарий'}, headers_common)
            body = json.loads(event.get('body') or '{}')
            text = (body.get('text') or '').strip()
            product_id = body.get('productId')
            if len(text) < 2 or not product_id:
                return resp(400, {'error': 'Введите текст комментария'}, headers_common)
            cur.execute(
                f"INSERT INTO {SCHEMA}.comments (product_id, user_id, text) VALUES (%s, %s, %s) "
                f"RETURNING id, text, created_at",
                (product_id, user_id, text),
            )
            row = cur.fetchone()
            cur.execute(f"SELECT name FROM {SCHEMA}.users WHERE id = %s", (user_id,))
            name = cur.fetchone()[0]
            conn.commit()
            return resp(200, {
                'comment': {
                    'id': row[0],
                    'text': row[1],
                    'createdAt': row[2].strftime('%d.%m.%Y %H:%M'),
                    'userName': name,
                }
            }, headers_common)

        return resp(405, {'error': 'Метод не поддерживается'}, headers_common)
    finally:
        cur.close()
        conn.close()
