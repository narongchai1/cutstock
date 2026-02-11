<?php

return [
    'publish_url' => env('REALTIME_WS_PUBLISH_URL'),
    'secret' => env('REALTIME_WS_SECRET'),
    'timeout_seconds' => env('REALTIME_WS_TIMEOUT_SECONDS', 1),
];

