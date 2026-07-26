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


def get_user(cur, token: str):
    if not token:
        return None
    cur.execute(
        f"SELECT u.id, u.name, u.is_admin FROM {SCHEMA}.sessions s "
        f"JOIN {SCHEMA}.users u ON u.id = s.user_id "
        f"WHERE s.token = %s AND s.expires_at > now()",
        (token,),
    )
    return cur.fetchone()


def handler(event: dict, context):
    """Онлайн-присутствие: heartbeat от посетителя и список активных пользователей для админки"""
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
        token = (event.get('headers') or {}).get('X-Authorization', '').replace('Bearer ', '').strip()

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
            cur.execute(
                f"SELECT count(*) FROM {SCHEMA}.presence WHERE last_seen > now() - interval '60 seconds'"
            )
            online_count = cur.fetchone()[0]
            return resp(200, {'ok': True, 'onlineCount': online_count}, headers_common)

        if method == 'GET':
            user_row = get_user(cur, token)
            cur.execute(
                f"SELECT count(*) FROM {SCHEMA}.presence WHERE last_seen > now() - interval '60 seconds'"
            )
            online_count = cur.fetchone()[0]

            if not user_row or not user_row[2]:
                return resp(200, {'onlineCount': online_count}, headers_common)

            cur.execute(
                f"SELECT p.id, p.page, p.last_seen, u.name FROM {SCHEMA}.presence p "
                f"LEFT JOIN {SCHEMA}.users u ON u.id = p.user_id "
                f"WHERE p.last_seen > now() - interval '60 seconds' "
                f"ORDER BY p.last_seen DESC"
            )
            visitors = [
                {
                    'id': r[0],
                    'page': r[1],
                    'lastSeen': r[2].strftime('%H:%M:%S'),
                    'name': r[3] or 'Гость',
                }
                for r in cur.fetchall()
            ]
            return resp(200, {'onlineCount': online_count, 'visitors': visitors}, headers_common)

        return resp(405, {'error': 'Метод не поддерживается'}, headers_common)
    finally:
        cur.close()
        conn.close()
