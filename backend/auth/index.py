import json
import os
import hashlib
import secrets
import datetime
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def hash_password(password: str, salt: str) -> str:
    secret = os.environ.get('AUTH_SECRET', '')
    dk = hashlib.pbkdf2_hmac('sha256', (password + secret).encode(), salt.encode(), 100000)
    return dk.hex()


def create_session(cur, user_id: int) -> str:
    token = secrets.token_hex(32)
    expires = datetime.datetime.utcnow() + datetime.timedelta(days=30)
    cur.execute(
        f"INSERT INTO {SCHEMA}.sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
        (token, user_id, expires),
    )
    return token


def log_auth(cur, user_id: int, action: str, event: dict):
    headers = event.get('headers') or {}
    ip = (
        headers.get('X-Forwarded-For', '').split(',')[0].strip()
        or (event.get('requestContext', {}).get('identity', {}) or {}).get('sourceIp', '')
    )
    user_agent = headers.get('User-Agent', '')
    cur.execute(
        f"INSERT INTO {SCHEMA}.auth_history (user_id, action, ip, user_agent) VALUES (%s, %s, %s, %s)",
        (user_id, action, ip, user_agent),
    )


def user_dict(row) -> dict:
    return {
        'id': row[0],
        'name': row[1],
        'email': row[2],
        'balance': float(row[3]),
        'createdAt': row[4].strftime('%d.%m.%Y'),
        'isAdmin': bool(row[5]) if len(row) > 5 else False,
    }


def resp(status: int, data: dict, headers: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {**headers, 'Content-Type': 'application/json'},
        'body': json.dumps(data),
    }


def handler(event: dict, context):
    """Регистрация, вход, получение текущего пользователя и выход из личного кабинета"""
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
            token = (event.get('headers') or {}).get('X-Authorization', '').replace('Bearer ', '').strip()
            if not token:
                return resp(401, {'error': 'Не авторизован'}, headers_common)
            cur.execute(
                f"SELECT u.id, u.name, u.email, u.balance, u.created_at, u.is_admin "
                f"FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
                f"WHERE s.token = %s AND s.expires_at > now()",
                (token,),
            )
            row = cur.fetchone()
            if not row:
                return resp(401, {'error': 'Сессия истекла'}, headers_common)
            return resp(200, {'user': user_dict(row)}, headers_common)

        body = json.loads(event.get('body') or '{}')
        action = body.get('action')

        if action == 'register':
            name = (body.get('name') or '').strip()
            email = (body.get('email') or '').strip().lower()
            password = body.get('password') or ''
            if len(name) < 2 or '@' not in email or len(password) < 6:
                return resp(400, {'error': 'Проверьте введённые данные'}, headers_common)
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
            if cur.fetchone():
                return resp(409, {'error': 'Пользователь с таким e-mail уже существует'}, headers_common)
            salt = secrets.token_hex(16)
            pw_hash = f"{salt}${hash_password(password, salt)}"
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (name, email, password_hash) VALUES (%s, %s, %s) "
                f"RETURNING id, name, email, balance, created_at, is_admin",
                (name, email, pw_hash),
            )
            row = cur.fetchone()
            token = create_session(cur, row[0])
            log_auth(cur, row[0], 'register', event)
            conn.commit()
            return resp(200, {'token': token, 'user': user_dict(row)}, headers_common)

        if action == 'login':
            email = (body.get('email') or '').strip().lower()
            password = body.get('password') or ''
            cur.execute(
                f"SELECT id, name, email, balance, created_at, password_hash, is_admin, is_banned "
                f"FROM {SCHEMA}.users WHERE email = %s",
                (email,),
            )
            row = cur.fetchone()
            if not row:
                return resp(401, {'error': 'Неверный e-mail или пароль'}, headers_common)
            salt, stored_hash = row[5].split('$')
            if hash_password(password, salt) != stored_hash:
                return resp(401, {'error': 'Неверный e-mail или пароль'}, headers_common)
            if row[7]:
                return resp(403, {'error': 'Аккаунт заблокирован. Обратитесь в поддержку'}, headers_common)
            token = create_session(cur, row[0])
            log_auth(cur, row[0], 'login', event)
            conn.commit()
            user_row = (row[0], row[1], row[2], row[3], row[4], row[6])
            return resp(200, {'token': token, 'user': user_dict(user_row)}, headers_common)

        if action == 'logout':
            token = (event.get('headers') or {}).get('X-Authorization', '').replace('Bearer ', '').strip()
            if token:
                cur.execute(
                    f"SELECT user_id FROM {SCHEMA}.sessions WHERE token = %s", (token,)
                )
                row = cur.fetchone()
                if row:
                    log_auth(cur, row[0], 'logout', event)
                cur.execute(f"DELETE FROM {SCHEMA}.sessions WHERE token = %s", (token,))
                conn.commit()
            return resp(200, {'ok': True}, headers_common)

        return resp(400, {'error': 'Неизвестное действие'}, headers_common)
    finally:
        cur.close()
        conn.close()
