import json
import os
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def resp(status: int, data: dict, headers: dict) -> dict:
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


def message_dict(row) -> dict:
    return {
        'id': row[0],
        'senderId': row[1],
        'receiverId': row[2],
        'text': row[3],
        'createdAt': row[4].strftime('%d.%m.%Y %H:%M'),
        'isRead': bool(row[5]),
    }


def handle_profile(params, cur, headers_common):
    user_id = params.get('userId')
    if not user_id:
        return resp(400, {'error': 'Не указан пользователь'}, headers_common)
    cur.execute(
        f"SELECT id, name, created_at FROM {SCHEMA}.users WHERE id = %s",
        (user_id,),
    )
    row = cur.fetchone()
    if not row:
        return resp(404, {'error': 'Пользователь не найден'}, headers_common)
    cur.execute(
        f"SELECT count(*) FROM {SCHEMA}.products WHERE seller_id = %s AND status = 'approved'",
        (user_id,),
    )
    products_count = cur.fetchone()[0]
    return resp(200, {
        'profile': {
            'id': row[0],
            'name': row[1],
            'createdAt': row[2].strftime('%d.%m.%Y'),
            'productsCount': products_count,
        }
    }, headers_common)


def handle_conversations(user_id, cur, headers_common):
    cur.execute(
        f"""
        WITH convo AS (
            SELECT CASE WHEN sender_id = %s THEN receiver_id ELSE sender_id END AS other_id,
                   text, created_at
            FROM {SCHEMA}.messages
            WHERE sender_id = %s OR receiver_id = %s
        ),
        ranked AS (
            SELECT other_id, text, created_at,
                   ROW_NUMBER() OVER (PARTITION BY other_id ORDER BY created_at DESC) AS rn
            FROM convo
        )
        SELECT r.other_id, u.name, r.text, r.created_at,
               (SELECT count(*) FROM {SCHEMA}.messages m2
                WHERE m2.sender_id = r.other_id AND m2.receiver_id = %s AND m2.is_read = FALSE) AS unread
        FROM ranked r
        JOIN {SCHEMA}.users u ON u.id = r.other_id
        WHERE r.rn = 1
        ORDER BY r.created_at DESC
        """,
        (user_id, user_id, user_id, user_id),
    )
    conversations = [
        {
            'userId': r[0],
            'userName': r[1],
            'lastText': r[2],
            'lastCreatedAt': r[3].strftime('%d.%m.%Y %H:%M'),
            'unreadCount': r[4],
        }
        for r in cur.fetchall()
    ]
    return resp(200, {'conversations': conversations}, headers_common)


def handle_thread(user_id, params, cur, conn, headers_common):
    other_id = params.get('withUserId')
    if not other_id:
        return resp(400, {'error': 'Не указан собеседник'}, headers_common)
    cur.execute(f"SELECT id, name FROM {SCHEMA}.users WHERE id = %s", (other_id,))
    other = cur.fetchone()
    if not other:
        return resp(404, {'error': 'Пользователь не найден'}, headers_common)

    cur.execute(
        f"SELECT id, sender_id, receiver_id, text, created_at, is_read FROM {SCHEMA}.messages "
        f"WHERE (sender_id = %s AND receiver_id = %s) OR (sender_id = %s AND receiver_id = %s) "
        f"ORDER BY created_at ASC",
        (user_id, other_id, other_id, user_id),
    )
    messages = [message_dict(r) for r in cur.fetchall()]

    cur.execute(
        f"UPDATE {SCHEMA}.messages SET is_read = TRUE "
        f"WHERE sender_id = %s AND receiver_id = %s AND is_read = FALSE",
        (other_id, user_id),
    )
    conn.commit()

    return resp(200, {
        'messages': messages,
        'otherUser': {'id': other[0], 'name': other[1]},
    }, headers_common)


def handle_send(user_id, event, cur, conn, headers_common):
    body = json.loads(event.get('body') or '{}')
    receiver_id = body.get('receiverId')
    text = (body.get('text') or '').strip()
    if not receiver_id or len(text) < 1:
        return resp(400, {'error': 'Введите текст сообщения'}, headers_common)
    if int(receiver_id) == user_id:
        return resp(400, {'error': 'Нельзя написать самому себе'}, headers_common)
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE id = %s", (receiver_id,))
    if not cur.fetchone():
        return resp(404, {'error': 'Пользователь не найден'}, headers_common)
    cur.execute(
        f"INSERT INTO {SCHEMA}.messages (sender_id, receiver_id, text) VALUES (%s, %s, %s) "
        f"RETURNING id, sender_id, receiver_id, text, created_at, is_read",
        (user_id, receiver_id, text),
    )
    row = cur.fetchone()
    conn.commit()
    return resp(200, {'message': message_dict(row)}, headers_common)


def handler(event: dict, context):
    """Личные сообщения между пользователями и публичный профиль (имя, дата регистрации, число товаров)"""
    method = event.get('httpMethod', 'GET')
    headers_common = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
        if resource == 'profile':
            return handle_profile(params, cur, headers_common)

        user_row = get_user(cur, token)
        if not user_row:
            return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
        user_id = user_row[0]

        if resource == 'conversations' and method == 'GET':
            return handle_conversations(user_id, cur, headers_common)
        if resource == 'thread' and method == 'GET':
            return handle_thread(user_id, params, cur, conn, headers_common)
        if method == 'POST':
            return handle_send(user_id, event, cur, conn, headers_common)

        return resp(400, {'error': 'Не указан или неизвестен resource'}, headers_common)
    finally:
        cur.close()
        conn.close()
