import json
import os
import hashlib
import urllib.request
import urllib.parse
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

AZVOX_PAYOUT_ACCOUNT = os.environ.get('AZVOX_PAYOUT_ACCOUNT', '')
AZVOX_PAYOUT_API_ID = os.environ.get('AZVOX_PAYOUT_API_ID', '')
AZVOX_PAYOUT_API_PASS = os.environ.get('AZVOX_PAYOUT_API_PASS', '')


def azvox_transfer(to_wallet: str, amount: float, comment: str):
    payload = {
        'account': AZVOX_PAYOUT_ACCOUNT,
        'apiId': AZVOX_PAYOUT_API_ID,
        'apiPass': AZVOX_PAYOUT_API_PASS,
        'action': 'transfer',
        'to_wallet': to_wallet,
        'amount': f"{amount:.2f}",
        'cur': 'RUB',
        'comment': comment[:50],
    }
    data = urllib.parse.urlencode(payload).encode('utf-8')
    req = urllib.request.Request('https://azvox.cash/api/v3.6/', data=data, method='POST')
    with urllib.request.urlopen(req, timeout=20) as f:
        return json.loads(f.read().decode('utf-8'))


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
                    f"SELECT id, text, link, days, total_price, status, created_at, ad_type, image_url FROM {SCHEMA}.ads "
                    f"WHERE status = 'pending' ORDER BY created_at DESC"
                )
                ads = [
                    {
                        'id': r[0], 'text': r[1], 'link': r[2], 'days': r[3], 'totalPrice': float(r[4]),
                        'status': r[5], 'createdAt': r[6].strftime('%d.%m.%Y'),
                        'adType': r[7], 'imageUrl': r[8],
                    }
                    for r in cur.fetchall()
                ]
                return resp(200, {'products': products, 'ads': ads}, headers_common)

            if section == 'banners':
                cur.execute(
                    f"SELECT a.id, a.text, a.link, a.days, a.price_per_day, a.total_price, a.status, "
                    f"a.starts_at, a.ends_at, a.created_at, a.ad_type, a.image_url, a.impressions, a.clicks, "
                    f"u.name, u.email "
                    f"FROM {SCHEMA}.ads a JOIN {SCHEMA}.users u ON u.id = a.user_id "
                    f"ORDER BY a.created_at DESC LIMIT 300"
                )
                items = [
                    {
                        'id': r[0], 'text': r[1], 'link': r[2], 'days': r[3],
                        'pricePerDay': float(r[4]), 'totalPrice': float(r[5]), 'status': r[6],
                        'startsAt': r[7].strftime('%d.%m.%Y') if r[7] else None,
                        'endsAt': r[8].strftime('%d.%m.%Y') if r[8] else None,
                        'createdAt': r[9].strftime('%d.%m.%Y'),
                        'adType': r[10], 'imageUrl': r[11],
                        'impressions': r[12], 'clicks': r[13],
                        'ctr': round(r[13] / r[12] * 100, 1) if r[12] else 0,
                        'userName': r[14], 'userEmail': r[15],
                    }
                    for r in cur.fetchall()
                ]
                return resp(200, {'ads': items}, headers_common)

            if section == 'ad-settings':
                cur.execute(
                    f"SELECT key, value FROM {SCHEMA}.site_settings "
                    f"WHERE key IN ('ad_price_per_day', 'banner_price_per_day', 'ads_auto_publish')"
                )
                settings = {r[0]: r[1] for r in cur.fetchall()}
                return resp(200, {
                    'adPricePerDay': float(settings.get('ad_price_per_day', 150)),
                    'bannerPricePerDay': float(settings.get('banner_price_per_day', 300)),
                    'autoPublish': settings.get('ads_auto_publish') == 'true',
                }, headers_common)

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

                if new_status == 'completed':
                    cur.execute(
                        f"SELECT amount, method, wallet, status FROM {SCHEMA}.payouts WHERE id = %s",
                        (payout_id,),
                    )
                    payout = cur.fetchone()
                    if not payout:
                        return resp(404, {'error': 'Заявка не найдена'}, headers_common)
                    if payout[3] != 'pending':
                        return resp(400, {'error': 'Заявка уже обработана'}, headers_common)

                    if payout[1] == 'AZVOX':
                        if not AZVOX_PAYOUT_ACCOUNT or not AZVOX_PAYOUT_API_ID or not AZVOX_PAYOUT_API_PASS:
                            return resp(500, {'error': 'AZVOX выплаты не настроены'}, headers_common)
                        try:
                            result = azvox_transfer(payout[2], float(payout[0]), f'Выплата #{payout_id}')
                        except Exception as e:
                            cur.execute(
                                f"UPDATE {SCHEMA}.payouts SET status = 'rejected', error = %s WHERE id = %s",
                                (str(e), payout_id),
                            )
                            conn.commit()
                            return resp(502, {'error': 'Ошибка связи с AZVOX'}, headers_common)

                        if result.get('status') == 'ok':
                            history_id = result.get('data', {}).get('history_operation_id')
                            cur.execute(
                                f"UPDATE {SCHEMA}.payouts SET status = 'completed', external_id = %s WHERE id = %s",
                                (str(history_id), payout_id),
                            )
                        else:
                            error_msg = result.get('error', 'Неизвестная ошибка AZVOX')
                            cur.execute(
                                f"UPDATE {SCHEMA}.payouts SET status = 'rejected', error = %s WHERE id = %s",
                                (error_msg, payout_id),
                            )
                            conn.commit()
                            return resp(400, {'error': f'AZVOX: {error_msg}'}, headers_common)
                    else:
                        cur.execute(f"UPDATE {SCHEMA}.payouts SET status = 'completed' WHERE id = %s", (payout_id,))
                else:
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

            if action == 'update-ad-settings':
                ad_price = body.get('adPricePerDay')
                banner_price = body.get('bannerPricePerDay')
                auto_publish = body.get('autoPublish')
                if ad_price is not None:
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.site_settings (key, value) VALUES ('ad_price_per_day', %s) "
                        f"ON CONFLICT (key) DO UPDATE SET value = %s",
                        (str(ad_price), str(ad_price)),
                    )
                if banner_price is not None:
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.site_settings (key, value) VALUES ('banner_price_per_day', %s) "
                        f"ON CONFLICT (key) DO UPDATE SET value = %s",
                        (str(banner_price), str(banner_price)),
                    )
                if auto_publish is not None:
                    val = 'true' if auto_publish else 'false'
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.site_settings (key, value) VALUES ('ads_auto_publish', %s) "
                        f"ON CONFLICT (key) DO UPDATE SET value = %s",
                        (val, val),
                    )
                conn.commit()
                return resp(200, {'ok': True}, headers_common)

            if action == 'update-ad':
                aid = body['id']
                text = (body.get('text') or '').strip()
                link = (body.get('link') or '').strip() or None
                days = body.get('days')
                if len(text) < 2:
                    return resp(400, {'error': 'Введите текст объявления'}, headers_common)
                cur.execute(
                    f"UPDATE {SCHEMA}.ads SET text = %s, link = %s, days = COALESCE(%s, days) WHERE id = %s",
                    (text, link, days, aid),
                )
                conn.commit()
                return resp(200, {'ok': True}, headers_common)

            if action == 'toggle-ad-status':
                aid = body['id']
                new_status = body['status']
                if new_status == 'active':
                    cur.execute(
                        f"UPDATE {SCHEMA}.ads SET status = 'active', "
                        f"starts_at = COALESCE(starts_at, now()), "
                        f"ends_at = COALESCE(ends_at, now() + (days || ' days')::interval) WHERE id = %s",
                        (aid,),
                    )
                else:
                    cur.execute(f"UPDATE {SCHEMA}.ads SET status = %s WHERE id = %s", (new_status, aid))
                conn.commit()
                return resp(200, {'ok': True}, headers_common)

            if action == 'delete-ad':
                aid = body['id']
                cur.execute(f"UPDATE {SCHEMA}.ads SET status = 'deleted' WHERE id = %s", (aid,))
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