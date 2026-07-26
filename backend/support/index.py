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


def handler(event: dict, context):
    """Обращения в поддержку: создание пользователем, просмотр своих тикетов, ответ и статус от администратора"""
    method = event.get('httpMethod', 'GET')
    headers_common = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
        'Access-Control-Max-Age': '86400',
    }
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers_common, 'body': ''}

    conn = get_conn()
    cur = conn.cursor()
    try:
        token = (event.get('headers') or {}).get('X-Authorization', '').replace('Bearer ', '').strip()
        user_row = get_user(cur, token)
        if not user_row:
            return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
        user_id, is_admin = user_row

        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            if is_admin and params.get('all') == '1':
                cur.execute(
                    f"SELECT t.id, t.subject, t.message, t.status, t.admin_reply, t.created_at, u.name, u.email "
                    f"FROM {SCHEMA}.support_tickets t JOIN {SCHEMA}.users u ON u.id = t.user_id "
                    f"ORDER BY t.created_at DESC"
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
    finally:
        cur.close()
        conn.close()
