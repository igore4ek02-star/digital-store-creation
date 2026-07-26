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


def ticket_dict(row, with_user=False) -> dict:
    d = {
        'id': row[0],
        'subject': row[1],
        'message': row[2],
        'status': row[3],
        'adminReply': row[4],
        'createdAt': row[5].strftime('%d.%m.%Y %H:%M'),
    }
    if with_user:
        d['userName'] = row[6]
        d['userEmail'] = row[7]
    return d


def handle_presence(event, cur, conn, method, headers_common, token):
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        visitor_id = body.get('visitorId')
        page = body.get('page', '/')
        if not visitor_id:
            return resp(400, {'error': 'Не указан visitorId'}, headers_common)
        user_row = get_user(cur, token) if token else None
        user_id = user_row[0] if user_row else None
        cur.execute(
            f"INSERT INTO {SCHEMA}.presence (id, user_id, page, last_seen) VALUES (%s, %s, %s, now()) "
            f"ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, page = EXCLUDED.page, last_seen = now()",
            (visitor_id, user_id, page),
        )
        conn.commit()
        cur.execute(f"SELECT count(*) FROM {SCHEMA}.presence WHERE last_seen > now() - interval '60 seconds'")
        online_count = cur.fetchone()[0]
        return resp(200, {'ok': True, 'onlineCount': online_count}, headers_common)

    if method == 'GET':
        user_row = get_user(cur, token)
        cur.execute(f"SELECT count(*) FROM {SCHEMA}.presence WHERE last_seen > now() - interval '60 seconds'")
        online_count = cur.fetchone()[0]
        if not user_row or not user_row[1]:
            return resp(200, {'onlineCount': online_count}, headers_common)
        cur.execute(
            f"SELECT p.id, p.page, p.last_seen, u.name FROM {SCHEMA}.presence p "
            f"LEFT JOIN {SCHEMA}.users u ON u.id = p.user_id "
            f"WHERE p.last_seen > now() - interval '60 seconds' ORDER BY p.last_seen DESC"
        )
        visitors = [
            {'id': r[0], 'page': r[1], 'lastSeen': r[2].strftime('%H:%M:%S'), 'name': r[3] or 'Гость'}
            for r in cur.fetchall()
        ]
        return resp(200, {'onlineCount': online_count, 'visitors': visitors}, headers_common)

    return resp(405, {'error': 'Метод не поддерживается'}, headers_common)


def handle_ads(event, cur, conn, method, headers_common, token, params):
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

    user_id = (get_user(cur, token) or [None])[0]
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
        cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance - %s WHERE id = %s", (total, user_id))
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


def handle_support(event, cur, conn, method, headers_common, token, params):
    user_row = get_user(cur, token)
    if not user_row:
        return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
    user_id, is_admin = user_row

    if method == 'GET':
        if is_admin and params.get('all') == '1':
            cur.execute(
                f"SELECT t.id, t.subject, t.message, t.status, t.admin_reply, t.created_at, u.name, u.email "
                f"FROM {SCHEMA}.support_tickets t JOIN {SCHEMA}.users u ON u.id = t.user_id ORDER BY t.created_at DESC"
            )
            return resp(200, {'tickets': [ticket_dict(r, True) for r in cur.fetchall()]}, headers_common)
        cur.execute(
            f"SELECT id, subject, message, status, admin_reply, created_at FROM {SCHEMA}.support_tickets "
            f"WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,),
        )
        return resp(200, {'tickets': [ticket_dict(r) for r in cur.fetchall()]}, headers_common)

    body = json.loads(event.get('body') or '{}')

    if method == 'POST':
        subject = (body.get('subject') or '').strip()
        message = (body.get('message') or '').strip()
        if len(subject) < 2 or len(message) < 5:
            return resp(400, {'error': 'Заполните тему и сообщение'}, headers_common)
        cur.execute(
            f"INSERT INTO {SCHEMA}.support_tickets (user_id, subject, message) VALUES (%s, %s, %s) "
            f"RETURNING id, subject, message, status, admin_reply, created_at",
            (user_id, subject, message),
        )
        row = cur.fetchone()
        conn.commit()
        return resp(200, {'ticket': ticket_dict(row)}, headers_common)

    if method == 'PUT':
        if not is_admin:
            return resp(403, {'error': 'Нет прав'}, headers_common)
        ticket_id = body.get('id')
        reply = body.get('adminReply')
        status = body.get('status')
        cur.execute(
            f"UPDATE {SCHEMA}.support_tickets SET admin_reply = COALESCE(%s, admin_reply), "
            f"status = COALESCE(%s, status), updated_at = now() WHERE id = %s "
            f"RETURNING id, subject, message, status, admin_reply, created_at",
            (reply, status, ticket_id),
        )
        row = cur.fetchone()
        conn.commit()
        if not row:
            return resp(404, {'error': 'Обращение не найдено'}, headers_common)
        return resp(200, {'ticket': ticket_dict(row)}, headers_common)

    return resp(405, {'error': 'Метод не поддерживается'}, headers_common)


def handle_wallet(event, cur, conn, method, headers_common, token):
    user_id = (get_user(cur, token) or [None])[0]
    if not user_id:
        return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)

    if method == 'GET':
        cur.execute(
            f"SELECT id, type, amount, description, created_at FROM {SCHEMA}.transactions "
            f"WHERE user_id = %s ORDER BY created_at DESC LIMIT 50",
            (user_id,),
        )
        transactions = [
            {'id': r[0], 'type': r[1], 'amount': float(r[2]), 'description': r[3], 'createdAt': r[4].strftime('%d.%m.%Y %H:%M')}
            for r in cur.fetchall()
        ]
        cur.execute(
            f"SELECT id, amount, method, wallet, status, created_at FROM {SCHEMA}.payouts "
            f"WHERE user_id = %s ORDER BY created_at DESC LIMIT 50",
            (user_id,),
        )
        payouts = [
            {'id': r[0], 'amount': float(r[1]), 'method': r[2], 'wallet': r[3], 'status': r[4], 'createdAt': r[5].strftime('%d.%m.%Y %H:%M')}
            for r in cur.fetchall()
        ]
        return resp(200, {'transactions': transactions, 'payouts': payouts}, headers_common)

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')

    if action == 'topup':
        amount = float(body.get('amount') or 0)
        method_name = body.get('method', 'AZVOX')
        if amount < 1:
            return resp(400, {'error': 'Укажите сумму пополнения'}, headers_common)
        cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance + %s WHERE id = %s", (amount, user_id))
        cur.execute(
            f"INSERT INTO {SCHEMA}.transactions (user_id, type, amount, description) VALUES (%s, 'topup', %s, %s)",
            (user_id, amount, f'Пополнение через {method_name}'),
        )
        conn.commit()
        return resp(200, {'ok': True}, headers_common)

    if action == 'payout':
        amount = float(body.get('amount') or 0)
        method_name = body.get('method', 'AZVOX')
        wallet = (body.get('wallet') or '').strip()
        if amount < 1 or len(wallet) < 4:
            return resp(400, {'error': 'Укажите сумму и реквизиты для выплаты'}, headers_common)
        cur.execute(f"SELECT balance FROM {SCHEMA}.users WHERE id = %s FOR UPDATE", (user_id,))
        balance = float(cur.fetchone()[0])
        if balance < amount:
            return resp(400, {'error': 'Недостаточно средств на балансе'}, headers_common)
        cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance - %s WHERE id = %s", (amount, user_id))
        cur.execute(
            f"INSERT INTO {SCHEMA}.transactions (user_id, type, amount, description) VALUES (%s, 'payout', %s, %s)",
            (user_id, -amount, f'Заявка на выплату через {method_name}'),
        )
        cur.execute(
            f"INSERT INTO {SCHEMA}.payouts (user_id, amount, method, wallet, status) VALUES (%s, %s, %s, %s, 'pending')",
            (user_id, amount, method_name, wallet),
        )
        conn.commit()
        return resp(200, {'ok': True}, headers_common)

    return resp(400, {'error': 'Неизвестное действие'}, headers_common)


def handler(event: dict, context):
    """Личный кабинет пользователя: онлайн-присутствие, заказ рекламы, обращения в поддержку, баланс (пополнение/вывод). Раздел выбирается параметром resource"""
    method = event.get('httpMethod', 'GET')
    headers_common = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
        'Access-Control-Max-Age': '86400',
    }
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers_common, 'body': ''}

    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', '')
    token = (event.get('headers') or {}).get('X-Authorization', '').replace('Bearer ', '').strip()

    conn = get_conn()
    cur = conn.cursor()
    try:
        if resource == 'presence':
            return handle_presence(event, cur, conn, method, headers_common, token)
        if resource == 'ads':
            return handle_ads(event, cur, conn, method, headers_common, token, params)
        if resource == 'support':
            return handle_support(event, cur, conn, method, headers_common, token, params)
        if resource == 'wallet':
            return handle_wallet(event, cur, conn, method, headers_common, token)
        return resp(400, {'error': 'Не указан или неизвестен resource'}, headers_common)
    finally:
        cur.close()
        conn.close()
