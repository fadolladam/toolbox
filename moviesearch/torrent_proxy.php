<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if (isset($_GET['hash'])) {
    $hash = preg_replace('/[^a-fA-F0-9]/', '', $_GET['hash']);
    if (!empty($hash)) {
        $url = "https://itorrents.org/torrent/" . strtoupper($hash) . ".torrent";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $data = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && !empty($data)) {
            header('Content-Type: application/x-bittorrent');
            header('Content-Disposition: attachment; filename="' . strtoupper($hash) . '.torrent"');
            echo $data;
            exit;
        }
    }
}

http_response_code(404);
header('Content-Type: text/plain');
echo 'Torrent file not found';
