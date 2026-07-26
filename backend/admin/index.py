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


def require_admin(cur, token: str):
    if not token:
        return None
    cur.execute(
        f"SELECT u.id, u.is_admin FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
        f"WHERE s.token = %s AND s.expires_at > now()",
        (token,),
    )
    row = cur.fetchone()
    if not row or not row[1]:
        return None
    return row[0]


def handler(event: dict, context):
    """Разделы админ-панели: активность пользователей, финансы, история авторизаций, вывод средств, управление пользователями, модерация товаров и рекламы"""
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
        admin_id = require_admin(cur, token)
        if not admin_id:
            return resp(403, {'error': 'Доступ только для администратора'}, headers_common)

        params = event.get('queryStringParameters') or {}
        section = params.get('section', '')

        if method == 'GET':

            if section == 'users-activity':
                cur.execute(
                    f"SELECT u.id, u.name, u.email, u.created_at, "
                    f"(SELECT max(last_seen) FROM {SCHEMA}.presence p WHERE p.user_id = u.id) as last_seen, "
                    f"(SELECT count(*) FROM {SCHEMA}.orders o WHERE o.user_id = u.id) as orders_count "
                    f"FROM {SCHEMA}.users u ORDER BY last_seen DESC NULLS LAST"
                )
                data = [
                    {
                        'id': r[0], 'name': r[1], 'email': r[2],
                        'createdAt': r[3].strftime('%d.%m.%Y'),
                        'lastSeen': r[4].strftime('%d.%m.%Y %H:%M') if r[4] else None,
                        'ordersCount': r[5],
                    }
                    for r in cur.fetchall()
                ]
                return resp(200, {'users': data}, headers_common)

            if section == 'finance':
                cur.execute(
                    f"SELECT t.id, t.type, t.amount, t.description, t.created_at, u.name, u.email "
                    f"FROM {SCHEMA}.transactions t JOIN {SCHEMA}.users u ON u.id = t.user_id "
                    f"ORDER BY t.created_at DESC LIMIT 200"
                )
                items = [
                    {
                        'id': r[0], 'type': r[1], 'amount': float(r[2]), 'description': r[3],
                        'createdAt': r[4].strftime('%d.%m.%Y %H:%M'), 'userName': r[5], 'userEmail': r[6],
                    }
                    for r in cur.fetchall()
                ]
                cur.execute(f"SELECT COALESCE(sum(amount),0) FROM {SCHEMA}.transactions WHERE type = 'topup'")
                topups = float(cur.fetchone()[0])
                cur.execute(f"SELECT COALESCE(sum(-amount),0) FROM {SCHEMA}.transactions WHERE type = 'ad_purchase'")
                ad_revenue = float(cur.fetchone()[0])
                cur.execute(f"SELECT COALESCE(sum(amount),0) FROM {SCHEMA}.orders WHERE status = 'paid'")
                orders_revenue = float(cur.fetchone()[0])
                return resp(200, {
                    'transactions': items,
                    'totals': {'topups': topups, 'adRevenue': ad_revenue, 'ordersRevenue': orders_revenue},
                }, headers_common)

            if section == 'auth-history':
                cur.execute(
                    f"SELECT h.id, h.action, h.ip, h.user_agent, h.created_at, u.name, u.email "
                    f"FROM {SCHEMA}.auth_history h JOIN {SCHEMA}.users u ON u.id = h.user_id "
                    f"ORDER BY h.created_at DESC LIMIT 200"
                )
                items = [
                    {
                        'id': r[0], 'action': r[1], 'ip': r[2], 'userAgent': r[3],
                        'createdAt': r[4].strftime('%d.%m.%Y %H:%M'), 'userName': r[5], 'userEmail': r[6],
                    }
                    for r in cur.fetchall()
                ]
                return resp(200, {'history': items}, headers_common)

            if section == 'payouts':
                cur.execute(
                    f"SELECT p.id, p.amount, p.method, p.wallet, p.status, p.created_at, u.name, u.email "
                    f"FROM {SCHEMA}.payouts p JOIN {SCHEMA}.users u ON u.id = p.user_id "
                    f"ORDER BY p.created_at DESC"
                )
                items = [
                    {
                        'id': r[0], 'amount': float(r[1]), 'method': r[2], 'wallet': r[3], 'status': r[4],
                        'createdAt': r[5].strftime('%d.%m.%Y %H:%M'), 'userName': r[6], 'userEmail': r[7],
                    }
                    for r in cur.fetchall()
                ]
                return resp(200, {'payouts': items}, headers_common)

            if section == 'users':
                cur.execute(
                    f"SELECT id, name, email, balance, is_admin, is_banned, created_at FROM {SCHEMA}.users ORDER BY id"
                )
                items = [
                    {
                        'id': r[0], 'name': r[1], 'email': r[2], 'balance': float(r[3]),
                        'isAdmin': r[4], 'isBanned': r[5], 'createdAt': r[6].strftime('%d.%m.%Y'),
                    }
                    for r in cur.fetchall()
                ]
                return resp(200, {'users': items}, headers_common)

            if section == 'moderation':
                cur.execute(
                    f"SELECT p.id, p.title, p.description, p.price, p.category, p.status, p.created_at, u.name, u.email "
                    f"FROM {SCHEMA}.products p LEFT JOIN {SCHEMA}.users u ON u.id = p.seller_id "
                    f"WHERE p.status = 'pending' ORDER BY p.created_at DESC"
                )
                products = [
                    {
                        'id': r[0], 'title': r[1], 'desc': r[2], 'price': float(r[3]), 'category': r[4],
                        'status': r[5], 'createdAt': r[6].strftime('%d.%m.%Y'),
                        'sellerName': r[7], 'sellerEmail': r[8],
                    }
                    for r in cur.fetchall()
                ]
                cur.execute(
                    f"SELECT id, text, link, days, total_price, status, created_at FROM {SCHEMA}.ads "
                    f"WHERE status = 'pending' ORDER BY created_at DESC"
                )
                ads = [
                    {
                        'id': r[0], 'text': r[1], 'link': r[2], 'days': r[3], 'totalPrice': float(r[4]),
                        'status': r[5], 'createdAt': r[6].strftime('%d.%m.%Y'),
                    }
                    for r in cur.fetchall()
                ]
                return resp(200, {'products': products, 'ads': ads}, headers_common)

            if section == 'notifications':
                cur.execute(
                    f"SELECT id, type, title, message, entity_id, is_read, created_at "
                    f"FROM {SCHEMA}.admin_notifications ORDER BY created_at DESC LIMIT 50"
                )
                items = [
                    {
                        'id': r[0], 'type': r[1], 'title': r[2], 'message': r[3], 'entityId': r[4],
                        'isRead': r[5], 'createdAt': r[6].strftime('%d.%m.%Y %H:%M'),
                    }
                    for r in cur.fetchall()
                ]
                cur.execute(f"SELECT count(*) FROM {SCHEMA}.admin_notifications WHERE is_read = FALSE")
                unread = cur.fetchone()[0]
                return resp(200, {'notifications': items, 'unreadCount': unread}, headers_common)

            return resp(400, {'error': 'Неизвестный раздел'}, headers_common)

        body = json.loads(event.get('body') or '{}')

        if method == 'POST':
            action = body.get('action')

            if action == 'moderate-product':
                pid = body['id']
                new_status = body['status']
                cur.execute(f"UPDATE {SCHEMA}.products SET status = %s WHERE id = %s", (new_status, pid))
                cur.execute(
                    f"UPDATE {SCHEMA}.admin_notifications SET is_read = TRUE "
                    f"WHERE type = 'product_moderation' AND entity_id = %s",
                    (pid,),
                )
                conn.commit()
                return resp(200, {'ok': True}, headers_common)

            if action == 'moderate-ad':
                aid = body['id']
                new_status = body['status']
                if new_status == 'active':
                    cur.execute(
                        f"UPDATE {SCHEMA}.ads SET status = 'active', starts_at = now(), "
                        f"ends_at = now() + (days || ' days')::interval WHERE id = %s",
                        (aid,),
                    )
                else:
                    cur.execute(f"UPDATE {SCHEMA}.ads SET status = %s WHERE id = %s", (new_status, aid))
                cur.execute(
                    f"UPDATE {SCHEMA}.admin_notifications SET is_read = TRUE "
                    f"WHERE type = 'ad_moderation' AND entity_id = %s",
                    (aid,),
                )
                conn.commit()
                return resp(200, {'ok': True}, headers_common)

            if action == 'process-payout':
                payout_id = body['id']
                new_status = body['status']
                cur.execute(f"UPDATE {SCHEMA}.payouts SET status = %s WHERE id = %s", (new_status, payout_id))
                cur.execute(
                    f"UPDATE {SCHEMA}.admin_notifications SET is_read = TRUE "
                    f"WHERE type = 'payout_request' AND entity_id = %s",
                    (payout_id,),
                )
                conn.commit()
                return resp(200, {'ok': True}, headers_common)

            if action == 'update-user':
                uid = body['id']
                is_banned = body.get('isBanned')
                is_admin = body.get('isAdmin')
                balance = body.get('balance')
                if is_banned is not None:
                    cur.execute(f"UPDATE {SCHEMA}.users SET is_banned = %s WHERE id = %s", (is_banned, uid))
                if is_admin is not None:
                    cur.execute(f"UPDATE {SCHEMA}.users SET is_admin = %s WHERE id = %s", (is_admin, uid))
                if balance is not None:
                    cur.execute(f"UPDATE {SCHEMA}.users SET balance = %s WHERE id = %s", (balance, uid))
                conn.commit()
                return resp(200, {'ok': True}, headers_common)

            if action == 'mark-notifications-read':
                ids = body.get('ids')
                if ids:
                    cur.execute(
                        f"UPDATE {SCHEMA}.admin_notifications SET is_read = TRUE WHERE id = ANY(%s)",
                        (ids,),
                    )
                else:
                    cur.execute(f"UPDATE {SCHEMA}.admin_notifications SET is_read = TRUE WHERE is_read = FALSE")
                conn.commit()
                return resp(200, {'ok': True}, headers_common)

            return resp(400, {'error': 'Неизвестное действие'}, headers_common)

        return resp(405, {'error': 'Метод не поддерживается'}, headers_common)
    finally:
        cur.close()
        conn.close()