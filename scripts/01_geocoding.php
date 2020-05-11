<?php
$config = require __DIR__ . '/config.php';
$json = json_decode(file_get_contents(dirname(__DIR__) . '/tabula.json'));
$result = array();
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
            } else {
                $dataLine[] = '';
                $dataLine[] = '';
                $dataLine[] = '';
                $dataLine[] = '';
            }
            $result[] = array_combine($header, $dataLine);
        } else {
            $header = $dataLine;
            $header[] = 'X';
            $header[] = 'Y';
            $header[] = '系統區';
            $header[] = '系統村里';
        }
    }
}
file_put_contents(dirname(__DIR__) . '/data.json', json_encode($result, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));