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
    """Баланс личного кабинета: пополнение и создание заявки на вывод средств через AZVOX/ЮMoney"""
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
        user_id = get_user_id(cur, token)
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
    finally:
        cur.close()
        conn.close()
