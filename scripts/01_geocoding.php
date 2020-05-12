<?php
$config = require __DIR__ . '/config.php';
$json = json_decode(file_get_contents(dirname(__DIR__) . '/tabula.json'));
$result = array();
$ref = array(
    '高雄市梓官區禮蚵里光明路79巷7號' => array(
        120.249795,22.731158,'梓官區','禮蚵里'
    ),
    '高雄市左營區聖西里蓮潭路47號' => array(
        120.292896,22.683542,'左營區','聖西里'
    ),
    '高雄市鳥松區大華里本館路44-7號' => array(
        120.342461502963,22.6507885038431,'鳥松區','大華里'
    ),
    '高雄市鹽埕區江南里2鄰五褔四路183號' => array(
        120.282912,22.623692,'鹽埕區','江南里'
    ),
    '高雄市苓雅區意誠里城西街17號旁(意誠堂停車場)' => array(
        120.300136,22.612572,'苓雅區','城北里'
    ),
    '高雄市前鎮區德昌里新衙路17號' => array(
        120.321031,22.583367,'前鎮區','明道里'
    ),
    '高雄市前鎮區明禮里新衙路17號(東側門進入)' => array(
        120.321031,22.583367,'前鎮區','明道里'
    ),
    '高雄市大寮區光武里民生路317之1號' => array(
        120.388987,22.612395,'大寮區','光武里'
    ),
);
foreach($json AS $page) {
    foreach($page->data AS $line) {
        $dataLine = array();
        foreach($line AS $row) {
            $dataLine[] = str_replace(chr(13), '', $row->text);
        }
        if($dataLine[0] !== '投開票所編號') {
            $tgosFile = dirname(__DIR__) . '/tgos/' . $dataLine[2] . '.json';
            if(!file_exists($tgosFile)) {
                $apiUrl = $config['tgos']['url'] . '?' . http_build_query(array(
                    'oAPPId' => $config['tgos']['APPID'], //應用程式識別碼(APPId)
                    'oAPIKey' => $config['tgos']['APIKey'], // 應用程式介接驗證碼(APIKey)
                    'oAddress' => $dataLine[2], //所要查詢的門牌位置
                    'oSRS' => 'EPSG:4326', //回傳的坐標系統
                    'oFuzzyType' => '2', //模糊比對的代碼
                    'oResultDataType' => 'JSON', //回傳的資料格式
                    'oFuzzyBuffer' => '0', //模糊比對回傳門牌號的許可誤差範圍
                    'oIsOnlyFullMatch' => 'false', //是否只進行完全比對
                    'oIsLockCounty' => 'true', //是否鎖定縣市
                    'oIsLockTown' => 'false', //是否鎖定鄉鎮市區
                    'oIsLockVillage' => 'false', //是否鎖定村里
                    'oIsLockRoadSection' => 'false', //是否鎖定路段
                    'oIsLockLane' => 'false', //是否鎖定巷
                    'oIsLockAlley' => 'false', //是否鎖定弄
                    'oIsLockArea' => 'false', //是否鎖定地區
                    'oIsSameNumber_SubNumber' => 'true', //號之、之號是否視為相同
                    'oCanIgnoreVillage' => 'true', //找不時是否可忽略村里
                    'oCanIgnoreNeighborhood' => 'true', //找不時是否可忽略鄰
                    'oReturnMaxCount' => '0', //如為多筆時，限制回傳最大筆數
                ));
                $content = file_get_contents($apiUrl);
                file_put_contents($tgosFile, $content);
            }
            $content = file_get_contents($tgosFile);
            $pos = strpos($content, '{');
            $posEnd = strrpos($content, '}');
            $json = json_decode(substr($content, $pos, $posEnd - $pos + 1), true);
            if(isset($json['AddressList'][0])) {
                $dataLine[] = $json['AddressList'][0]['X'];
                $dataLine[] = $json['AddressList'][0]['Y'];
                $dataLine[] = $json['AddressList'][0]['TOWN'];
                $dataLine[] = $json['AddressList'][0]['VILLAGE'];
            } elseif(isset($ref[$dataLine[2]])) {
                $dataLine = array_merge($dataLine, $ref[$dataLine[2]]);
            }
            $key = preg_replace('/[^0-9]/', '', $dataLine[0]);
            $result[$key] = array_combine($header, $dataLine);
        } else {
            $header = $dataLine;
            $header[] = 'X';
            $header[] = 'Y';
            $header[] = '系統區';
            $header[] = '系統村里';
        }
    }
}
ksort($result);
file_put_contents(dirname(__DIR__) . '/data.json', json_encode($result, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));