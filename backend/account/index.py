import json
import os
import base64
import hashlib
import urllib.request
import urllib.parse
import uuid
import psycopg2
import boto3

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

AZVOX_SHOP_ID = os.environ.get('AZVOX_SHOP_ID', '')
AZVOX_SECRET_KEY = os.environ.get('AZVOX_SECRET_KEY', '')
AZVOX_PAYOUT_ACCOUNT = os.environ.get('AZVOX_PAYOUT_ACCOUNT', '')
AZVOX_PAYOUT_API_ID = os.environ.get('AZVOX_PAYOUT_API_ID', '')
AZVOX_PAYOUT_API_PASS = os.environ.get('AZVOX_PAYOUT_API_PASS', '')


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
    d = {
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
        'adType': row[10] if len(row) > 10 else 'text',
        'imageUrl': row[11] if len(row) > 11 else None,
    }
    if len(row) > 13:
        d['impressions'] = row[12]
        d['clicks'] = row[13]
    return d


def upload_banner_image(image_base64: str) -> str:
    if ',' in image_base64:
        header, image_base64 = image_base64.split(',', 1)
    else:
        header = ''
    ext = 'png'
    if 'jpeg' in header or 'jpg' in header:
        ext = 'jpg'
    elif 'webp' in header:
        ext = 'webp'
    data = base64.b64decode(image_base64)
    key = f"banners/{uuid.uuid4().hex}.{ext}"
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    content_type = {'png': 'image/png', 'jpg': 'image/jpeg', 'webp': 'image/webp'}[ext]
    s3.put_object(Bucket='files', Key=key, Body=data, ContentType=content_type)
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


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
            ad_type = params.get('type')
            if ad_type:
                cur.execute(
                    f"SELECT id, text, link, days, price_per_day, total_price, status, starts_at, ends_at, created_at, ad_type, image_url "
                    f"FROM {SCHEMA}.ads WHERE status = 'active' AND ends_at > now() AND ad_type = %s ORDER BY starts_at ASC",
                    (ad_type,),
                )
            else:
                cur.execute(
                    f"SELECT id, text, link, days, price_per_day, total_price, status, starts_at, ends_at, created_at, ad_type, image_url "
                    f"FROM {SCHEMA}.ads WHERE status = 'active' AND ends_at > now() ORDER BY created_at DESC"
                )
            return resp(200, {'ads': [ad_dict(r) for r in cur.fetchall()]}, headers_common)
        cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'ad_price_per_day'")
        row = cur.fetchone()
        price = float(row[0]) if row else 150.0
        cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'banner_price_per_day'")
        row2 = cur.fetchone()
        banner_price = float(row2[0]) if row2 else 300.0
        return resp(200, {'pricePerDay': price, 'bannerPricePerDay': banner_price}, headers_common)

    user_id = (get_user(cur, token) or [None])[0]
    if not user_id:
        return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)

    body = json.loads(event.get('body') or '{}')
    if method == 'POST':
        ad_type = body.get('adType', 'text')
        if ad_type not in ('text', 'banner'):
            return resp(400, {'error': 'Неизвестный тип рекламы'}, headers_common)
        link = (body.get('link') or '').strip() or None
        days = int(body.get('days') or 0)
        if days < 1:
            return resp(400, {'error': 'Укажите срок показа'}, headers_common)

        image_url = None
        if ad_type == 'banner':
            image_b64 = body.get('image')
            if not image_b64:
                return resp(400, {'error': 'Загрузите изображение баннера 468×60'}, headers_common)
            try:
                image_url = upload_banner_image(image_b64)
            except Exception:
                return resp(400, {'error': 'Не удалось загрузить изображение'}, headers_common)
            text = (body.get('text') or '').strip() or 'Баннер'
            settings_key = 'banner_price_per_day'
            default_price = 300.0
            notif_text = f"Баннер 468×60 на {days} дн."
        else:
            text = (body.get('text') or '').strip()
            if len(text) < 3:
                return resp(400, {'error': 'Заполните текст объявления'}, headers_common)
            settings_key = 'ad_price_per_day'
            default_price = 150.0
            notif_text = f"«{text}» на {days} дн."

        cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = %s", (settings_key,))
        row = cur.fetchone()
        price_per_day = float(row[0]) if row else default_price
        total = price_per_day * days
        cur.execute(f"SELECT balance FROM {SCHEMA}.users WHERE id = %s FOR UPDATE", (user_id,))
        balance = float(cur.fetchone()[0])
        if balance < total:
            return resp(400, {'error': f'Недостаточно средств на балансе. Нужно {total:.0f} ₽'}, headers_common)
        cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance - %s WHERE id = %s", (total, user_id))
        cur.execute(
            f"INSERT INTO {SCHEMA}.transactions (user_id, type, amount, description) VALUES (%s, 'ad_purchase', %s, %s)",
            (user_id, -total, notif_text),
        )

        cur.execute(f"SELECT value FROM {SCHEMA}.site_settings WHERE key = 'ads_auto_publish'")
        auto_row = cur.fetchone()
        auto_publish = auto_row and auto_row[0] == 'true'

        if auto_publish:
            cur.execute(
                f"INSERT INTO {SCHEMA}.ads (user_id, text, link, days, price_per_day, total_price, status, "
                f"ad_type, image_url, starts_at, ends_at) "
                f"VALUES (%s, %s, %s, %s, %s, %s, 'active', %s, %s, now(), now() + (%s || ' days')::interval) "
                f"RETURNING id, text, link, days, price_per_day, total_price, status, starts_at, ends_at, created_at, ad_type, image_url",
                (user_id, text, link, days, price_per_day, total, ad_type, image_url, days),
            )
        else:
            cur.execute(
                f"INSERT INTO {SCHEMA}.ads (user_id, text, link, days, price_per_day, total_price, status, ad_type, image_url) "
                f"VALUES (%s, %s, %s, %s, %s, %s, 'pending', %s, %s) "
                f"RETURNING id, text, link, days, price_per_day, total_price, status, starts_at, ends_at, created_at, ad_type, image_url",
                (user_id, text, link, days, price_per_day, total, ad_type, image_url),
            )
        row = cur.fetchone()

        if auto_publish:
            cur.execute(
                f"INSERT INTO {SCHEMA}.admin_notifications (type, title, message, entity_id, is_read) "
                f"VALUES ('ad_moderation', 'Реклама опубликована автоматически', %s, %s, TRUE)",
                (notif_text, row[0]),
            )
        else:
            cur.execute(
                f"INSERT INTO {SCHEMA}.admin_notifications (type, title, message, entity_id) "
                f"VALUES ('ad_moderation', 'Новая заявка на рекламу', %s, %s)",
                (notif_text, row[0]),
            )
        conn.commit()
        return resp(200, {'ad': ad_dict(row)}, headers_common)

    return resp(405, {'error': 'Метод не поддерживается'}, headers_common)


def handle_ad_track(event, cur, conn, headers_common):
    body = json.loads(event.get('body') or '{}')
    ad_id = body.get('adId')
    action = body.get('action')
    if not ad_id or action not in ('impression', 'click'):
        return resp(400, {'error': 'Некорректные данные'}, headers_common)
    column = 'impressions' if action == 'impression' else 'clicks'
    cur.execute(f"UPDATE {SCHEMA}.ads SET {column} = {column} + 1 WHERE id = %s", (ad_id,))
    conn.commit()
    return resp(200, {'ok': True}, headers_common)


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
        cur.execute(
            f"INSERT INTO {SCHEMA}.admin_notifications (type, title, message, entity_id) "
            f"VALUES ('support_ticket', 'Новое обращение в поддержку', %s, %s)",
            (subject, row[0]),
        )
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
        cur.execute(f"SELECT name, email FROM {SCHEMA}.users WHERE id = %s", (user_id,))
        uname, uemail = cur.fetchone()
        cur.execute(
            f"INSERT INTO {SCHEMA}.admin_notifications (type, title, message, entity_id, is_read) "
            f"VALUES ('topup', 'Пополнение баланса', %s, %s, TRUE)",
            (f"{uname} ({uemail}) пополнил баланс на {amount:.0f} ₽ через {method_name}", user_id),
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
            f"INSERT INTO {SCHEMA}.payouts (user_id, amount, method, wallet, status) VALUES (%s, %s, %s, %s, 'pending') "
            f"RETURNING id",
            (user_id, amount, method_name, wallet),
        )
        payout_id = cur.fetchone()[0]
        cur.execute(
            f"INSERT INTO {SCHEMA}.admin_notifications (type, title, message, entity_id) "
            f"VALUES ('payout_request', 'Заявка на вывод средств', %s, %s)",
            (f'{amount:.0f} ₽ через {method_name}', payout_id),
        )
        conn.commit()
        return resp(200, {'ok': True}, headers_common)

    return resp(400, {'error': 'Неизвестное действие'}, headers_common)


def azvox_sign(parts: list) -> str:
    joined = ':'.join(str(p) for p in parts)
    return hashlib.sha256(joined.encode('utf-8')).hexdigest().upper()


def build_azvox_form(order_id: int, amount: float, description: str) -> dict:
    m_shop = AZVOX_SHOP_ID
    m_orderid = order_id
    m_amount = f"{amount:.2f}"
    m_curr = 'RUB'
    m_desc = base64.b64encode(description.encode('utf-8')).decode('ascii')
    m_params = base64.b64encode(json.dumps(False).encode('utf-8')).decode('ascii')
    sign = azvox_sign([m_shop, m_orderid, m_amount, m_curr, m_desc, m_params, AZVOX_SECRET_KEY])
    return {
        'm_shop': m_shop,
        'm_orderid': m_orderid,
        'm_amount': m_amount,
        'm_curr': m_curr,
        'm_desc': m_desc,
        'm_params': m_params,
        'm_sign': sign,
        'payUrl': 'https://azvox.cash/pay/',
    }


def handle_payment_create(event, cur, conn, headers_common, token):
    body = json.loads(event.get('body') or '{}')
    product_id = body.get('productId')
    method = body.get('method', 'AZVOX')

    user_row = get_user(cur, token)
    user_id = user_row[0] if user_row else None

    if method == 'BALANCE':
        if not user_id:
            return resp(401, {'error': 'Войдите в аккаунт, чтобы оплатить с баланса'}, headers_common)

        cur.execute(
            f"SELECT id, title, price, file_url, file_name FROM {SCHEMA}.products "
            f"WHERE id = %s AND status = 'approved'",
            (product_id,),
        )
        product = cur.fetchone()
        if not product:
            return resp(404, {'error': 'Товар не найден'}, headers_common)
        if not product[3]:
            return resp(400, {'error': 'Файл товара ещё не загружен продавцом'}, headers_common)

        cur.execute(f"SELECT balance, email FROM {SCHEMA}.users WHERE id = %s FOR UPDATE", (user_id,))
        balance, user_email = cur.fetchone()
        price = float(product[2])
        if float(balance) < price:
            return resp(400, {'error': f'Недостаточно средств на балансе. Нужно {price:.0f} ₽'}, headers_common)

        cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance - %s WHERE id = %s", (price, user_id))
        cur.execute(
            f"INSERT INTO {SCHEMA}.orders (product_id, user_id, email, method, amount, status) "
            f"VALUES (%s, %s, %s, 'BALANCE', %s, 'paid') RETURNING id",
            (product_id, user_id, user_email, price),
        )
        order_id = cur.fetchone()[0]
        cur.execute(
            f"INSERT INTO {SCHEMA}.transactions (user_id, type, amount, description) VALUES (%s, 'purchase', %s, %s)",
            (user_id, -price, f'Покупка «{product[1]}»'),
        )
        cur.execute(
            f"INSERT INTO {SCHEMA}.payment_transactions (kind, user_id, order_id, method, amount, status) "
            f"VALUES ('order', %s, %s, 'BALANCE', %s, 'paid')",
            (user_id, order_id, price),
        )
        cur.execute(
            f"INSERT INTO {SCHEMA}.admin_notifications (type, title, message, entity_id) "
            f"VALUES ('purchase', 'Новая покупка', %s, %s)",
            (f"Заказ #{order_id} на {price:.0f} ₽ оплачен с баланса", order_id),
        )
        conn.commit()
        return resp(200, {
            'orderId': order_id, 'provider': 'BALANCE', 'paid': True,
            'fileUrl': product[3], 'fileName': product[4],
        }, headers_common)

    email = (body.get('email') or '').strip().lower()
    if not product_id or '@' not in email:
        return resp(400, {'error': 'Укажите товар и корректный e-mail'}, headers_common)

    cur.execute(
        f"SELECT id, title, price FROM {SCHEMA}.products WHERE id = %s AND status = 'approved'",
        (product_id,),
    )
    product = cur.fetchone()
    if not product:
        return resp(404, {'error': 'Товар не найден'}, headers_common)

    access_token = uuid.uuid4().hex
    cur.execute(
        f"INSERT INTO {SCHEMA}.orders (product_id, user_id, email, method, amount, status, access_token) "
        f"VALUES (%s, %s, %s, %s, %s, 'pending', %s) RETURNING id",
        (product_id, user_id, email, method, product[2], access_token),
    )
    order_id = cur.fetchone()[0]
    conn.commit()

    if method == 'AZVOX':
        if not AZVOX_SHOP_ID or not AZVOX_SECRET_KEY:
            return resp(500, {'error': 'AZVOX не настроен. Обратитесь к администратору'}, headers_common)
        form = build_azvox_form(order_id, float(product[2]), product[1])
        return resp(200, {
            'orderId': order_id, 'provider': 'AZVOX', 'form': form, 'accessToken': access_token,
        }, headers_common)

    return resp(400, {'error': 'Этот способ оплаты скоро будет доступен'}, headers_common)


def handle_order_status(params, cur, headers_common):
    order_id = params.get('orderId')
    access_token = params.get('token')
    if not order_id or not access_token:
        return resp(400, {'error': 'Не указан заказ'}, headers_common)
    cur.execute(
        f"SELECT o.status, p.title, p.file_url, p.file_name FROM {SCHEMA}.orders o "
        f"JOIN {SCHEMA}.products p ON p.id = o.product_id "
        f"WHERE o.id = %s AND o.access_token = %s",
        (order_id, access_token),
    )
    row = cur.fetchone()
    if not row:
        return resp(404, {'error': 'Заказ не найден'}, headers_common)
    status, title, file_url, file_name = row
    return resp(200, {
        'status': status,
        'paid': status == 'paid',
        'title': title,
        'fileUrl': file_url if status == 'paid' else None,
        'fileName': file_name if status == 'paid' else None,
    }, headers_common)


def handle_my_orders(cur, headers_common, token):
    user_row = get_user(cur, token)
    if not user_row:
        return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
    user_id = user_row[0]
    cur.execute(
        f"SELECT o.id, p.title, o.amount, o.method, o.created_at, p.file_url, p.file_name "
        f"FROM {SCHEMA}.orders o JOIN {SCHEMA}.products p ON p.id = o.product_id "
        f"WHERE o.user_id = %s AND o.status = 'paid' ORDER BY o.created_at DESC",
        (user_id,),
    )
    purchases = [
        {
            'id': r[0], 'title': r[1], 'amount': float(r[2]), 'method': r[3],
            'date': r[4].strftime('%d.%m.%Y'), 'fileUrl': r[5], 'fileName': r[6],
        }
        for r in cur.fetchall()
    ]
    return resp(200, {'purchases': purchases}, headers_common)


def handle_azvox_status(event, cur, conn):
    text_headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain'}
    body = event.get('body') or ''
    if event.get('isBase64Encoded'):
        body = base64.b64decode(body).decode('utf-8')
    if event.get('httpMethod') == 'GET':
        params = event.get('queryStringParameters') or {}
    else:
        params = dict(urllib.parse.parse_qsl(body))

    required = ['m_status', 'm_shop', 'm_orderid', 'm_operation_id', 'm_sign']
    if not all(k in params for k in required):
        return {'statusCode': 400, 'headers': text_headers, 'body': 'ERROR'}

    arHash = [
        params.get('m_status', ''),
        params.get('m_operation_id', ''),
        params.get('m_operation_amount', ''),
        params.get('m_operation_curr', ''),
        params.get('m_operation_timestamp', ''),
        params.get('m_wallet', ''),
        params.get('m_shop', ''),
        params.get('m_orderid', ''),
        params.get('m_amount', ''),
        params.get('m_curr', ''),
        params.get('m_desc', ''),
        params.get('m_params', ''),
        AZVOX_SECRET_KEY,
    ]
    sign_hash = azvox_sign(arHash)

    m_status = params.get('m_status')
    m_shop_ok = str(params.get('m_shop')) == str(AZVOX_SHOP_ID)

    if params.get('m_sign') != sign_hash or not m_shop_ok or m_status not in ('success', 'fail'):
        return {'statusCode': 400, 'headers': text_headers, 'body': 'ERROR'}

    order_id = int(params.get('m_orderid'))
    operation_id = params.get('m_operation_id')

    cur.execute(f"SELECT id, status, amount, user_id FROM {SCHEMA}.orders WHERE id = %s", (order_id,))
    order = cur.fetchone()
    if not order:
        return {'statusCode': 400, 'headers': text_headers, 'body': 'ERROR'}

    if order[1] == 'pending':
        new_status = 'paid' if m_status == 'success' else 'failed'
        cur.execute(
            f"UPDATE {SCHEMA}.orders SET status = %s, external_id = %s WHERE id = %s",
            (new_status, operation_id, order_id),
        )
        cur.execute(
            f"INSERT INTO {SCHEMA}.payment_transactions (kind, user_id, order_id, method, amount, status, external_id) "
            f"VALUES ('order', %s, %s, 'AZVOX', %s, %s, %s)",
            (order[3], order_id, order[2], new_status, operation_id),
        )
        if new_status == 'paid':
            cur.execute(
                f"INSERT INTO {SCHEMA}.admin_notifications (type, title, message, entity_id) "
                f"VALUES ('purchase', 'Новая покупка', %s, %s)",
                (f"Заказ #{order_id} на {float(order[2]):.0f} ₽ оплачен", order_id),
            )
        conn.commit()

    return {'statusCode': 200, 'headers': text_headers, 'body': f'{order_id}|success'}


def news_dict(row) -> dict:
    return {
        'id': row[0],
        'slug': row[1],
        'title': row[2],
        'tag': row[3],
        'text': row[4],
        'fullText': row[5],
        'icon': row[6],
        'coverImage': row[7],
        'publishedAt': row[8].strftime('%d.%m.%Y'),
    }


def news_comment_dict(row) -> dict:
    return {
        'id': row[0],
        'text': row[1],
        'createdAt': row[2].strftime('%d.%m.%Y %H:%M'),
        'userName': row[3],
    }


def handle_news(event, cur, conn, method, headers_common, token, params):
    if method == 'GET':
        slug = params.get('slug')
        if slug:
            cur.execute(
                f"SELECT id, slug, title, tag, text, full_text, icon, cover_image, published_at "
                f"FROM {SCHEMA}.news WHERE slug = %s",
                (slug,),
            )
            row = cur.fetchone()
            if not row:
                return resp(404, {'error': 'Новость не найдена'}, headers_common)
            return resp(200, {'news': news_dict(row)}, headers_common)
        cur.execute(
            f"SELECT id, slug, title, tag, text, full_text, icon, cover_image, published_at "
            f"FROM {SCHEMA}.news ORDER BY published_at DESC"
        )
        return resp(200, {'news': [news_dict(r) for r in cur.fetchall()]}, headers_common)

    admin_id = None
    if method in ('POST', 'PUT', 'DELETE'):
        user_row = get_user(cur, token)
        if not user_row or not user_row[1]:
            return resp(403, {'error': 'Доступ только для администратора'}, headers_common)
        admin_id = user_row[0]

    body = json.loads(event.get('body') or '{}')

    if method == 'POST':
        title = (body.get('title') or '').strip()
        text = (body.get('text') or '').strip()
        if len(title) < 2 or len(text) < 2:
            return resp(400, {'error': 'Заполните заголовок и текст новости'}, headers_common)
        slug_base = title.lower().replace(' ', '-').replace('«', '').replace('»', '')
        slug = ''.join(c for c in slug_base if c.isalnum() or c == '-') or f"news-{uuid.uuid4().hex[:6]}"
        cur.execute(
            f"INSERT INTO {SCHEMA}.news (slug, title, tag, text, full_text, icon, cover_image) "
            f"VALUES (%s,%s,%s,%s,%s,%s,%s) "
            f"RETURNING id, slug, title, tag, text, full_text, icon, cover_image, published_at",
            (
                slug, title, body.get('tag', 'Новость'), text,
                body.get('fullText', text), body.get('icon', 'Newspaper'), body.get('coverImage'),
            ),
        )
        row = cur.fetchone()
        conn.commit()
        return resp(200, {'news': news_dict(row)}, headers_common)

    if method == 'PUT':
        nid = body.get('id')
        cur.execute(
            f"UPDATE {SCHEMA}.news SET title=%s, tag=%s, text=%s, full_text=%s, icon=%s, cover_image=%s "
            f"WHERE id=%s RETURNING id, slug, title, tag, text, full_text, icon, cover_image, published_at",
            (
                body.get('title'), body.get('tag'), body.get('text'), body.get('fullText'),
                body.get('icon'), body.get('coverImage'), nid,
            ),
        )
        row = cur.fetchone()
        conn.commit()
        if not row:
            return resp(404, {'error': 'Новость не найдена'}, headers_common)
        return resp(200, {'news': news_dict(row)}, headers_common)

    if method == 'DELETE':
        nid = params.get('id') or body.get('id')
        cur.execute(f"DELETE FROM {SCHEMA}.news_comments WHERE news_id = %s", (nid,))
        cur.execute(f"DELETE FROM {SCHEMA}.news WHERE id = %s", (nid,))
        conn.commit()
        return resp(200, {'ok': True}, headers_common)

    return resp(405, {'error': 'Метод не поддерживается'}, headers_common)


def handle_news_comments(event, cur, conn, method, headers_common, token, params):
    if method == 'GET':
        news_id = params.get('newsId')
        if not news_id:
            return resp(400, {'error': 'Не указана новость'}, headers_common)
        cur.execute(
            f"SELECT c.id, c.text, c.created_at, u.name FROM {SCHEMA}.news_comments c "
            f"JOIN {SCHEMA}.users u ON u.id = c.user_id WHERE c.news_id = %s ORDER BY c.created_at DESC",
            (news_id,),
        )
        return resp(200, {'comments': [news_comment_dict(r) for r in cur.fetchall()]}, headers_common)

    if method == 'POST':
        user_row = get_user(cur, token)
        if not user_row:
            return resp(401, {'error': 'Войдите в аккаунт, чтобы оставить комментарий'}, headers_common)
        user_id = user_row[0]
        body = json.loads(event.get('body') or '{}')
        text = (body.get('text') or '').strip()
        news_id = body.get('newsId')
        if len(text) < 2 or not news_id:
            return resp(400, {'error': 'Введите текст комментария'}, headers_common)
        cur.execute(
            f"INSERT INTO {SCHEMA}.news_comments (news_id, user_id, text) VALUES (%s, %s, %s) "
            f"RETURNING id, text, created_at",
            (news_id, user_id, text),
        )
        row = cur.fetchone()
        cur.execute(f"SELECT name FROM {SCHEMA}.users WHERE id = %s", (user_id,))
        name = cur.fetchone()[0]
        conn.commit()
        return resp(200, {'comment': news_comment_dict((row[0], row[1], row[2], name))}, headers_common)

    return resp(405, {'error': 'Метод не поддерживается'}, headers_common)


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
        if resource == 'ad-track' and method == 'POST':
            return handle_ad_track(event, cur, conn, headers_common)
        if resource == 'support':
            return handle_support(event, cur, conn, method, headers_common, token, params)
        if resource == 'wallet':
            return handle_wallet(event, cur, conn, method, headers_common, token)
        if resource == 'news':
            return handle_news(event, cur, conn, method, headers_common, token, params)
        if resource == 'news-comments':
            return handle_news_comments(event, cur, conn, method, headers_common, token, params)
        if resource == 'payment':
            payment_action = params.get('action', '')
            if payment_action == 'create-order' and method == 'POST':
                return handle_payment_create(event, cur, conn, headers_common, token)
            if payment_action == 'azvox-status':
                return handle_azvox_status(event, cur, conn)
            return resp(400, {'error': 'Неизвестное действие оплаты'}, headers_common)
        if resource == 'orders' and method == 'GET':
            return handle_my_orders(cur, headers_common, token)
        if resource == 'order-status' and method == 'GET':
            return handle_order_status(params, cur, headers_common)
        return resp(400, {'error': 'Не указан или неизвестен resource'}, headers_common)
    finally:
        cur.close()
        conn.close()