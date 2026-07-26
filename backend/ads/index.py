import json
import os
import datetime
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


def ad_dict(row) -> dict:
    return {
        'id': row[0],
        'text': row[1],
        'link': row[2],
        'days': row[3],
        'pricePerDay': float(row[4]),
        'totalPrice': float(row[5]),
        'status': row[6],
        'startsAt': row[7].strftime('%d.%m.%Y') if row[7] else None,
        'endsAt': row[8].strftime('%d.%m.%Y') if row[8] else None,
        'createdAt': row[9].strftime('%d.%m.%Y'),
    }


def handler(event: dict, context):
    """Текстовая реклама в карусели сайта: заказ со списанием с баланса, список активных объявлений, модерация"""
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
        params = event.get('queryStringParameters') or {}

        if method == 'GET':
            if params.get('active') == '1':
                cur.execute(
                    f"SELECT id, text, link, days, price_per_day, total_price, status, starts_at, ends_at, created_at "
                    f"FROM {SCHEMA}.ads WHERE status = 'active' AND ends_at > now() ORDER BY created_at DESC"
                )
                return resp(200, {'ads': [ad_dict(r) for r in cur.fetchall()]}, headers_common)

            cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'ad_price_per_day'")
            row = cur.fetchone()
            price = float(row[0]) if row else 150.0
            return resp(200, {'pricePerDay': price}, headers_common)

        token = (event.get('headers') or {}).get('X-Authorization', '').replace('Bearer ', '').strip()
        user_id = get_user_id(cur, token)
        if not user_id:
            return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)

        body = json.loads(event.get('body') or '{}')

        if method == 'POST':
            text = (body.get('text') or '').strip()
            link = (body.get('link') or '').strip() or None
            days = int(body.get('days') or 0)
            if len(text) < 3 or days < 1:
                return resp(400, {'error': 'Заполните текст объявления и срок показа'}, headers_common)

            cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'ad_price_per_day'")
            row = cur.fetchone()
            price_per_day = float(row[0]) if row else 150.0
            total = price_per_day * days

            cur.execute(f"SELECT balance FROM {SCHEMA}.users WHERE id = %s FOR UPDATE", (user_id,))
            balance = float(cur.fetchone()[0])
            if balance < total:
                return resp(400, {'error': f'Недостаточно средств на балансе. Нужно {total:.0f} ₽'}, headers_common)

            cur.execute(
                f"UPDATE {SCHEMA}.users SET balance = balance - %s WHERE id = %s",
                (total, user_id),
            )
            cur.execute(
                f"INSERT INTO {SCHEMA}.transactions (user_id, type, amount, description) VALUES (%s, 'ad_purchase', %s, %s)",
                (user_id, -total, f'Реклама на {days} дн.'),
            )
            cur.execute(
                f"INSERT INTO {SCHEMA}.ads (user_id, text, link, days, price_per_day, total_price, status) "
                f"VALUES (%s, %s, %s, %s, %s, %s, 'pending') "
                f"RETURNING id, text, link, days, price_per_day, total_price, status, starts_at, ends_at, created_at",
                (user_id, text, link, days, price_per_day, total),
            )
            row = cur.fetchone()
            conn.commit()
            return resp(200, {'ad': ad_dict(row)}, headers_common)

        return resp(405, {'error': 'Метод не поддерживается'}, headers_common)
    finally:
        cur.close()
        conn.close()
