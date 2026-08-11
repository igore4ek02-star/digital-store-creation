import json
import os
import base64
import uuid
import psycopg2
import boto3

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


def make_unique_slug(cur, title: str) -> str:
    slug_base = title.lower().replace(' ', '-').replace('«', '').replace('»', '')
    slug_base = ''.join(c for c in slug_base if c.isalnum() or c == '-').strip('-')
    if not slug_base:
        slug_base = f"product-{uuid.uuid4().hex[:6]}"
    slug = slug_base
    suffix = 1
    while True:
        cur.execute(f"SELECT 1 FROM {SCHEMA}.products WHERE slug = %s", (slug,))
        if not cur.fetchone():
            return slug
        suffix += 1
        slug = f"{slug_base}-{suffix}"


def product_dict(row) -> dict:
    return {
        'id': row[0],
        'title': row[1],
        'slug': row[2],
        'desc': row[3],
        'fullDescription': row[4],
        'price': float(row[5]),
        'category': row[6],
        'icon': row[7],
        'tag': row[8],
        'rating': float(row[9]),
        'sales': row[10],
        'coverImage': row[11],
        'status': row[12] if len(row) > 12 else 'approved',
        'fileUrl': row[13] if len(row) > 13 else None,
        'fileName': row[14] if len(row) > 14 else None,
        'fileSource': row[15] if len(row) > 15 else 'upload',
    }


PRODUCT_FIELDS = (
    "id, title, slug, description, full_description, price, category, "
    "icon, tag, rating, sales, cover_image, status, file_url, file_name, file_source"
)


def upload_to_s3(data_base64: str, folder: str, default_ext: str, content_types: dict) -> tuple:
    if ',' in data_base64:
        header, data_base64 = data_base64.split(',', 1)
    else:
        header = ''
    ext = default_ext
    for k in content_types:
        if k in header:
            ext = k
            break
    data = base64.b64decode(data_base64)
    key = f"{folder}/{uuid.uuid4().hex}.{ext}"
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=data, ContentType=content_types.get(ext, 'application/octet-stream'))
    url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    return url, len(data)


def upload_screenshot(image_base64: str) -> str:
    url, _ = upload_to_s3(
        image_base64, 'products/screenshots', 'png',
        {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'webp': 'image/webp'},
    )
    return url


def upload_product_file(file_base64: str, file_name: str) -> str:
    ext = (file_name.rsplit('.', 1)[-1] if '.' in file_name else 'zip').lower()
    content_types = {
        'zip': 'application/zip', 'rar': 'application/vnd.rar', '7z': 'application/x-7z-compressed',
    }
    if ',' in file_base64:
        _, file_base64 = file_base64.split(',', 1)
    data = base64.b64decode(file_base64)
    key = f"products/files/{uuid.uuid4().hex}-{file_name}"
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(
        Bucket='files', Key=key, Body=data,
        ContentType=content_types.get(ext, 'application/octet-stream'),
    )
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


FILE_CONTENT_TYPES = {
    'zip': 'application/zip', 'rar': 'application/vnd.rar', '7z': 'application/x-7z-compressed',
}


def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def handler(event: dict, context):
    """Каталог товаров: список (только одобренные), карточка товара, мастер добавления (черновик → медиа → модерация), CRUD в админке"""
    method = event.get('httpMethod', 'GET')
    headers_common = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
        'Access-Control-Max-Age': '86400',
    }
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers_common, 'body': ''}

    params = event.get('queryStringParameters') or {}
    conn = get_conn()
    cur = conn.cursor()
    try:
        token = (event.get('headers') or {}).get('X-Authorization', '').replace('Bearer ', '').strip()

        if method == 'GET':
            slug = params.get('slug')
            pid = params.get('id')
            if slug or pid:
                if slug:
                    cur.execute(f"SELECT {PRODUCT_FIELDS} FROM {SCHEMA}.products WHERE slug = %s", (slug,))
                else:
                    user_row = get_user(cur, token)
                    if not user_row:
                        return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
                    cur.execute(f"SELECT {PRODUCT_FIELDS} FROM {SCHEMA}.products WHERE id = %s", (pid,))
                row = cur.fetchone()
                if not row:
                    return resp(404, {'error': 'Товар не найден'}, headers_common)
                product = product_dict(row)
                cur.execute(
                    f"SELECT id, image_url FROM {SCHEMA}.product_images WHERE product_id = %s ORDER BY sort_order",
                    (product['id'],),
                )
                image_rows = cur.fetchall()
                product['images'] = [r[1] for r in image_rows]
                product['imageIds'] = [{'id': r[0], 'url': r[1]} for r in image_rows]
                return resp(200, {'product': product}, headers_common)

            if params.get('all') == '1':
                user_row = get_user(cur, token)
                if not user_row or not user_row[1]:
                    return resp(403, {'error': 'Доступ только для администратора'}, headers_common)
                cur.execute(
                    f"SELECT {PRODUCT_FIELDS} FROM {SCHEMA}.products WHERE status != 'draft' ORDER BY id DESC"
                )
                products = [product_dict(r) for r in cur.fetchall()]
                return resp(200, {'products': products}, headers_common)

            if params.get('mine') == '1':
                user_row = get_user(cur, token)
                if not user_row:
                    return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
                cur.execute(
                    f"SELECT {PRODUCT_FIELDS} FROM {SCHEMA}.products WHERE seller_id = %s AND status != 'draft' "
                    f"ORDER BY id DESC",
                    (user_row[0],),
                )
                products = [product_dict(r) for r in cur.fetchall()]
                return resp(200, {'products': products}, headers_common)

            cur.execute(
                f"SELECT {PRODUCT_FIELDS} FROM {SCHEMA}.products WHERE status = 'approved' ORDER BY id"
            )
            products = [product_dict(r) for r in cur.fetchall()]
            return resp(200, {'products': products}, headers_common)

        body = json.loads(event.get('body') or '{}')

        if method == 'POST':
            action = body.get('action', 'create')

            if action == 'create-draft':
                user_row = get_user(cur, token)
                if not user_row:
                    return resp(401, {'error': 'Войдите в аккаунт, чтобы добавить товар'}, headers_common)
                seller_id, is_admin = user_row
                title = (body.get('title') or '').strip()
                price = body.get('price')
                if len(title) < 2 or not price:
                    return resp(400, {'error': 'Заполните название и цену'}, headers_common)
                slug = make_unique_slug(cur, title)
                cur.execute(
                    f"INSERT INTO {SCHEMA}.products (title, slug, description, full_description, price, "
                    f"category, icon, seller_id, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'draft') "
                    f"RETURNING {PRODUCT_FIELDS}",
                    (
                        title, slug, body.get('desc', ''), body.get('fullDescription', ''),
                        price, body.get('category', 'Скрипты'), body.get('icon', 'Package'), seller_id,
                    ),
                )
                row = cur.fetchone()
                conn.commit()
                return resp(200, {'product': product_dict(row)}, headers_common)

            if action == 'upload-image':
                user_row = get_user(cur, token)
                if not user_row:
                    return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
                product_id = body.get('productId')
                image_b64 = body.get('image')
                if not product_id or not image_b64:
                    return resp(400, {'error': 'Не хватает данных для загрузки'}, headers_common)
                try:
                    url = upload_screenshot(image_b64)
                except Exception:
                    return resp(400, {'error': 'Не удалось загрузить изображение'}, headers_common)
                cur.execute(
                    f"SELECT COALESCE(max(sort_order), -1) + 1 FROM {SCHEMA}.product_images WHERE product_id = %s",
                    (product_id,),
                )
                next_order = cur.fetchone()[0]
                cur.execute(
                    f"INSERT INTO {SCHEMA}.product_images (product_id, image_url, sort_order) VALUES (%s,%s,%s) "
                    f"RETURNING id",
                    (product_id, url, next_order),
                )
                image_id = cur.fetchone()[0]
                cur.execute(
                    f"UPDATE {SCHEMA}.products SET cover_image = COALESCE(cover_image, %s) WHERE id = %s",
                    (url, product_id),
                )
                conn.commit()
                return resp(200, {'image': {'id': image_id, 'url': url}}, headers_common)

            if action == 'remove-image':
                user_row = get_user(cur, token)
                if not user_row:
                    return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
                image_id = body.get('imageId')
                cur.execute(f"DELETE FROM {SCHEMA}.product_images WHERE id = %s", (image_id,))
                conn.commit()
                return resp(200, {'ok': True}, headers_common)

            if action == 'upload-file':
                user_row = get_user(cur, token)
                if not user_row:
                    return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
                product_id = body.get('productId')
                file_b64 = body.get('file')
                file_name = (body.get('fileName') or 'archive.zip').strip()
                if not product_id or not file_b64:
                    return resp(400, {'error': 'Не хватает данных для загрузки'}, headers_common)
                try:
                    url = upload_product_file(file_b64, file_name)
                except Exception:
                    return resp(400, {'error': 'Не удалось загрузить файл'}, headers_common)
                cur.execute(
                    f"UPDATE {SCHEMA}.products SET file_url = %s, file_name = %s, file_source = 'upload' WHERE id = %s",
                    (url, file_name, product_id),
                )
                conn.commit()
                return resp(200, {'fileUrl': url, 'fileName': file_name}, headers_common)

            if action == 'set-file-link':
                user_row = get_user(cur, token)
                if not user_row:
                    return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
                product_id = body.get('productId')
                link = (body.get('link') or '').strip()
                if not product_id or not link:
                    return resp(400, {'error': 'Укажите товар и ссылку на файл'}, headers_common)
                if not (link.startswith('http://') or link.startswith('https://')):
                    return resp(400, {'error': 'Ссылка должна начинаться с http:// или https://'}, headers_common)
                cur.execute(
                    f"UPDATE {SCHEMA}.products SET file_url = %s, file_name = %s, file_source = 'link' WHERE id = %s",
                    (link, 'Ссылка на скачивание', product_id),
                )
                conn.commit()
                return resp(200, {'fileUrl': link, 'fileName': 'Ссылка на скачивание'}, headers_common)

            if action == 'upload-file-init':
                user_row = get_user(cur, token)
                if not user_row:
                    return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
                product_id = body.get('productId')
                file_name = (body.get('fileName') or 'archive.zip').strip()
                if not product_id:
                    return resp(400, {'error': 'Не указан товар'}, headers_common)
                ext = (file_name.rsplit('.', 1)[-1] if '.' in file_name else 'zip').lower()
                key = f"products/files/{uuid.uuid4().hex}-{file_name}"
                s3 = get_s3()
                try:
                    mp = s3.create_multipart_upload(
                        Bucket='files', Key=key,
                        ContentType=FILE_CONTENT_TYPES.get(ext, 'application/octet-stream'),
                    )
                except Exception:
                    return resp(500, {'error': 'Не удалось начать загрузку файла в хранилище'}, headers_common)
                return resp(200, {'uploadId': mp['UploadId'], 'key': key}, headers_common)

            if action == 'upload-file-part':
                user_row = get_user(cur, token)
                if not user_row:
                    return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
                upload_id = body.get('uploadId')
                key = body.get('key')
                part_number = body.get('partNumber')
                part_b64 = body.get('data')
                if not upload_id or not key or not part_number or not part_b64:
                    return resp(400, {'error': 'Не хватает данных части файла'}, headers_common)
                if ',' in part_b64:
                    _, part_b64 = part_b64.split(',', 1)
                data = base64.b64decode(part_b64)
                s3 = get_s3()
                try:
                    part = s3.upload_part(
                        Bucket='files', Key=key, UploadId=upload_id,
                        PartNumber=int(part_number), Body=data,
                    )
                except Exception:
                    return resp(400, {'error': f'Не удалось загрузить часть файла {part_number}'}, headers_common)
                return resp(200, {'partNumber': int(part_number), 'etag': part['ETag']}, headers_common)

            if action == 'upload-file-complete':
                user_row = get_user(cur, token)
                if not user_row:
                    return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
                product_id = body.get('productId')
                upload_id = body.get('uploadId')
                key = body.get('key')
                parts = body.get('parts') or []
                file_name = (body.get('fileName') or 'archive.zip').strip()
                if not product_id or not upload_id or not key or not parts:
                    return resp(400, {'error': 'Не хватает данных для завершения загрузки'}, headers_common)
                s3 = get_s3()
                try:
                    s3.complete_multipart_upload(
                        Bucket='files', Key=key, UploadId=upload_id,
                        MultipartUpload={'Parts': [{'PartNumber': p['partNumber'], 'ETag': p['etag']} for p in parts]},
                    )
                except Exception:
                    try:
                        s3.abort_multipart_upload(Bucket='files', Key=key, UploadId=upload_id)
                    except Exception:
                        pass
                    return resp(400, {'error': 'Не удалось завершить загрузку файла'}, headers_common)
                url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
                cur.execute(
                    f"UPDATE {SCHEMA}.products SET file_url = %s, file_name = %s, file_source = 'upload' WHERE id = %s",
                    (url, file_name, product_id),
                )
                conn.commit()
                return resp(200, {'fileUrl': url, 'fileName': file_name}, headers_common)

            if action == 'upload-file-abort':
                user_row = get_user(cur, token)
                if not user_row:
                    return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
                key = body.get('key')
                upload_id = body.get('uploadId')
                if key and upload_id:
                    s3 = get_s3()
                    try:
                        s3.abort_multipart_upload(Bucket='files', Key=key, UploadId=upload_id)
                    except Exception:
                        pass
                return resp(200, {'ok': True}, headers_common)

            if action == 'submit-for-moderation':
                user_row = get_user(cur, token)
                if not user_row:
                    return resp(401, {'error': 'Войдите в аккаунт'}, headers_common)
                is_admin = bool(user_row[1])
                product_id = body.get('productId')
                cur.execute(
                    f"SELECT title, file_url FROM {SCHEMA}.products WHERE id = %s",
                    (product_id,),
                )
                prod = cur.fetchone()
                if not prod:
                    return resp(404, {'error': 'Товар не найден'}, headers_common)
                cur.execute(
                    f"SELECT count(*) FROM {SCHEMA}.product_images WHERE product_id = %s", (product_id,)
                )
                images_count = cur.fetchone()[0]
                if images_count < 1:
                    return resp(400, {'error': 'Загрузите хотя бы один скриншот'}, headers_common)
                if not prod[1]:
                    return resp(400, {'error': 'Загрузите файл товара (архив)'}, headers_common)

                new_status = 'approved' if is_admin else 'pending'
                cur.execute(
                    f"UPDATE {SCHEMA}.products SET status = %s WHERE id = %s "
                    f"RETURNING {PRODUCT_FIELDS}",
                    (new_status, product_id),
                )
                row = cur.fetchone()
                if not is_admin:
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.admin_notifications (type, title, message, entity_id) "
                        f"VALUES ('product_moderation', 'Новый товар на модерацию', %s, %s)",
                        (f"«{prod[0]}» ждёт проверки", product_id),
                    )
                conn.commit()
                return resp(200, {'product': product_dict(row)}, headers_common)

            # legacy/simple create (kept for backward compatibility)
            user_row = get_user(cur, token)
            is_admin = bool(user_row and user_row[1])
            seller_id = user_row[0] if user_row else None

            slug = make_unique_slug(cur, body['title'])
            status = 'approved' if is_admin else 'pending'
            if not is_admin and not seller_id:
                return resp(401, {'error': 'Войдите в аккаунт, чтобы предложить товар'}, headers_common)

            cur.execute(
                f"INSERT INTO {SCHEMA}.products (title, slug, description, full_description, price, "
                f"category, icon, tag, cover_image, seller_id, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
                f"RETURNING {PRODUCT_FIELDS}",
                (
                    body['title'], slug, body.get('desc', ''), body.get('fullDescription', ''),
                    body['price'], body['category'], body.get('icon', 'Package'), body.get('tag'),
                    body.get('coverImage'), seller_id, status,
                ),
            )
            row = cur.fetchone()
            images = body.get('images') or []
            for i, url in enumerate(images):
                cur.execute(
                    f"INSERT INTO {SCHEMA}.product_images (product_id, image_url, sort_order) VALUES (%s,%s,%s)",
                    (row[0], url, i),
                )
            if status == 'pending':
                cur.execute(
                    f"INSERT INTO {SCHEMA}.admin_notifications (type, title, message, entity_id) "
                    f"VALUES ('product_moderation', 'Новый товар на модерацию', %s, %s)",
                    (f"«{row[1]}» ждёт проверки", row[0]),
                )
            conn.commit()
            return resp(200, {'product': product_dict(row)}, headers_common)

        if method == 'PUT':
            user_row = get_user(cur, token)
            if not user_row or not user_row[1]:
                return resp(403, {'error': 'Доступ только для администратора'}, headers_common)
            pid = body['id']
            cur.execute(
                f"UPDATE {SCHEMA}.products SET title=%s, description=%s, full_description=%s, "
                f"price=%s, category=%s, icon=%s, tag=%s WHERE id=%s "
                f"RETURNING {PRODUCT_FIELDS}",
                (
                    body['title'], body.get('desc', ''), body.get('fullDescription', ''),
                    body['price'], body['category'], body.get('icon', 'Package'), body.get('tag'), pid,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return resp(404, {'error': 'Товар не найден'}, headers_common)
            return resp(200, {'product': product_dict(row)}, headers_common)

        if method == 'DELETE':
            user_row = get_user(cur, token)
            if not user_row or not user_row[1]:
                return resp(403, {'error': 'Доступ только для администратора'}, headers_common)
            pid = params.get('id') or body.get('id')
            cur.execute(f"SELECT count(*) FROM {SCHEMA}.orders WHERE product_id = %s", (pid,))
            orders_count = cur.fetchone()[0]
            if orders_count > 0:
                cur.execute(
                    f"UPDATE {SCHEMA}.products SET status = 'archived' WHERE id = %s "
                    f"RETURNING {PRODUCT_FIELDS}",
                    (pid,),
                )
                row = cur.fetchone()
                conn.commit()
                if not row:
                    return resp(404, {'error': 'Товар не найден'}, headers_common)
                return resp(200, {
                    'ok': True,
                    'archived': True,
                    'product': product_dict(row),
                    'message': 'У товара есть оформленные заказы, поэтому он не удалён из базы, а скрыт из каталога (архивирован)',
                }, headers_common)
            cur.execute(f"DELETE FROM {SCHEMA}.comments WHERE product_id = %s", (pid,))
            cur.execute(f"DELETE FROM {SCHEMA}.product_images WHERE product_id = %s", (pid,))
            cur.execute(f"DELETE FROM {SCHEMA}.products WHERE id = %s", (pid,))
            conn.commit()
            return resp(200, {'ok': True, 'archived': False}, headers_common)

        return resp(405, {'error': 'Метод не поддерживается'}, headers_common)
    finally:
        cur.close()
        conn.close()