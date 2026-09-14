<?php
/**
 * Прокси-обработчик уведомлений FreeKassa.
 *
 * Разместите этот файл на хостинге вашего домена (php-store.ru), например:
 * https://php-store.ru/freekassa-notify.php
 *
 * Он просто пересылает POST-запрос от FreeKassa на облачную функцию
 * платформы poehali.dev, которая проверяет подпись и зачисляет платёж,
 * и возвращает обратно тот же ответ (YES / ERROR).
 *
 * Используйте этот адрес как "URL оповещения" в настройках кассы FreeKassa,
 * метод — POST.
 */

$targetUrl = 'https://functions.poehali.dev/20c1b1ea-4023-4f55-809c-ab97bb099da0?resource=payment&action=freekassa-result';

// Собираем те же параметры, что пришли от FreeKassa (POST или GET)
$params = $_SERVER['REQUEST_METHOD'] === 'POST' ? $_POST : $_GET;

$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
} else {
    curl_setopt($ch, CURLOPT_URL, $targetUrl . '&' . http_build_query($params));
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo 'ERROR';
    error_log('FreeKassa proxy error: ' . $error);
    exit;
}

http_response_code($httpCode ?: 200);
header('Content-Type: text/plain');
echo $response;
